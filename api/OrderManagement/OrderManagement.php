<?php
/***********************
 * ORDER MANAGEMENT FUNCTIONS
 ***********************/

// Helper function to get current authenticated user ID
function getCurrentUserId($conn) {
    $token = getAuthToken();
    if (!$token) {
        return null;
    }

    try {
        $payload = jwt_decode($token);
        $userId = isset($payload['sub']) ? (int)$payload['sub'] : 0;

        if ($userId <= 0) {
            return null;
        }

        // Verify token is still valid in DB
        $stmt = $conn->prepare("SELECT user_id FROM user WHERE user_id = ? AND token = ? AND token_expired > NOW()");
        $stmt->execute([$userId, $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        return $user ? $userId : null;
    } catch (Exception $e) {
        return null;
    }
}

function createOrder($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        return;
    }

    // Log input data for debugging
    error_log("createOrder input: " . json_encode($data));

    $requiredFields = ['user_id', 'order_number', 'total_amount', 'payment_method', 'delivery_firstname', 'delivery_lastname', 'delivery_phone', 'delivery_email', 'delivery_address', 'delivery_zipcode', 'items'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            return;
        }
    }

    // Validate numeric fields
    if (!is_numeric($data['user_id']) && !is_null($data['user_id']) || !is_numeric($data['total_amount'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid user_id or total_amount']);
        return;
    }

    $validPaymentMethods = ['GCash', 'Pickup'];
    if (!in_array($data['payment_method'], $validPaymentMethods)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid payment method']);
        return;
    }

    $validCities = ['Carcar'];
    $delivery_city = $data['delivery_city'] ?? 'Carcar';
    if (!in_array($delivery_city, $validCities)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid delivery city']);
        return;
    }

    foreach ($data['items'] as $item) {
        if (
            !isset($item['product_id'], $item['quantity'], $item['price'], $item['size']) ||
            !is_numeric($item['product_id']) || !is_numeric($item['quantity']) || !is_numeric($item['price'])
        ) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid item data']);
            return;
        }
    }

    $useLoyaltyPoints = isset($data['use_loyalty_points']) ? filter_var($data['use_loyalty_points'], FILTER_VALIDATE_BOOLEAN) : false;
    $pointsToUse = $useLoyaltyPoints ? 100 : 0;

    try {
        $conn->beginTransaction();

        // Calculate subtotal and coffee-based subtotal for loyalty points
        $subtotal = 0;
        $coffeeSubtotal = 0;
        $coffeeTypes = ['coffee', 'hot', 'latte', 'espresso', 'cappuccino'];

        foreach ($data['items'] as $item) {
            $itemTotal = floatval($item['price']) * intval($item['quantity']);
            $subtotal += $itemTotal;

            // Check if this item is coffee-based for loyalty points calculation
            $stmt = $conn->prepare("SELECT type, name FROM products WHERE product_id = :product_id AND status = 'active'");
            $stmt->execute([':product_id' => $item['product_id']]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($product) {
                $productType = strtolower($product['type'] ?? '');
                $productName = strtolower($product['name'] ?? '');
                $isCoffee = false;
                foreach ($coffeeTypes as $type) {
                    if (strpos($productType, $type) !== false || strpos($productName, $type) !== false) {
                        $isCoffee = true;
                        break;
                    }
                }

                if ($isCoffee) {
                    $coffeeSubtotal += $itemTotal;
                }
            }
        }

  // Log coffee subtotal for debugging
  error_log("Calculated coffeeSubtotal: $coffeeSubtotal, hasCoffee: " . ($coffeeSubtotal > 0 ? 'true' : 'false'));

  // Calculate points earned (1 point per 10 pesos spent on the total order amount)
  // 1 point == ₱10 based on final total passed from frontend (total_amount)
  $pointsEarned = $data['user_id'] ? floor(floatval($data['total_amount']) / 10) : 0;

        // Validate loyalty points if used
        $cheapestCoffeePrice = 0;
        $redeemedProductId = null;
        $redeemedProductName = null;
        $hasCoffeeInCart = false;
        if ($useLoyaltyPoints) {
            // Check loyalty points in profile table
            $stmt = $conn->prepare("SELECT loyalty_points FROM profile WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $data['user_id']]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$profile || intval($profile['loyalty_points']) < 100) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Insufficient loyalty points (need 100 points)']);
                return;
            }

            // Find cheapest coffee unit price and check for coffee items
            foreach ($data['items'] as $item) {
                $stmt = $conn->prepare("SELECT type, {$item['size']}_price as price, name FROM products WHERE product_id = :product_id AND status = 'active'");
                $stmt->execute([':product_id' => $item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($product) {
                    $productType = strtolower($product['type'] ?? '');
                    $productName = strtolower($product['name'] ?? '');
                    $isCoffee = false;
                    foreach ($coffeeTypes as $type) {
                        if (strpos($productType, $type) !== false || strpos($productName, $type) !== false) {
                            $isCoffee = true;
                            break;
                        }
                    }

                    if ($isCoffee) {
                        $hasCoffeeInCart = true;
                        $price = floatval($product['price']);
                        if ($cheapestCoffeePrice === 0 || $price < $cheapestCoffeePrice) {
                            $cheapestCoffeePrice = $price;
                            $redeemedProductId = $item['product_id'];
                            $redeemedProductName = $product['name'];
                        }
                    }
                }
            }

        }

        // Validate discount_amount - only promo discount affects total
        $totalDiscount = floatval($data['discount_amount'] ?? 0);
        $promoDiscount = $data['promo_code'] ? floatval($totalDiscount) : 0;
        $expectedDiscount = $promoDiscount;

        if (abs($totalDiscount - $expectedDiscount) > 0.01) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid discount amount']);
            return;
        }

        // Check stock availability and update quantities
        $lowStockProducts = [];
        foreach ($data['items'] as $item) {
            $size = $item['size'] ?? 'medium';
            $quantityField = $size . '_quantity';

            $stmt = $conn->prepare("SELECT $quantityField, low_stock_threshold FROM products WHERE product_id = :product_id AND status = 'active'");
            $stmt->execute([':product_id' => $item['product_id']]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Product not found or inactive']);
                return;
            }

            $availableStock = intval($product[$quantityField]);
            $requestedQuantity = intval($item['quantity']);

            if ($availableStock < $requestedQuantity) {
                $conn->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Insufficient stock for product ID {$item['product_id']} ({$size} size)"]);
                return;
            }

            if ($availableStock <= intval($product['low_stock_threshold'])) {
                $lowStockProducts[] = $item['product_id'];
            }
        }

        // Handle payment reference for GCash
        $paymentReference = null;
        if ($data['payment_method'] === 'GCash' && isset($data['payment_reference'])) {
            $paymentReference = sanitizeInput($data['payment_reference']);
        }

        // Insert order
        $sql = "INSERT INTO `order` (
                user_id, order_number, total_amount, status, payment_method, payment_reference,
                delivery_firstname, delivery_lastname, delivery_phone,
                delivery_email, delivery_address, delivery_city, delivery_zipcode,
                discount_amount, promo_code, loyalty_points_used
            ) VALUES (
                :user_id, :order_number, :total_amount, :status, :payment_method, :payment_reference,
                :first_name, :last_name, :phone, :email, :address, :city, :zipcode,
                :discount_amount, :promo_code, :loyalty_points_used
            )";
        $stmt = $conn->prepare($sql);
        $orderParams = [
            ':user_id' => $data['user_id'] ? (int) $data['user_id'] : null,
            ':order_number' => sanitizeInput($data['order_number']),
            ':total_amount' => round(floatval($data['total_amount']), 2),
            ':status' => 'Pending',
            ':payment_method' => sanitizeInput($data['payment_method']),
            ':payment_reference' => $paymentReference,
            ':first_name' => sanitizeInput($data['delivery_firstname']),
            ':last_name' => sanitizeInput($data['delivery_lastname']),
            ':phone' => sanitizeInput($data['delivery_phone']),
            ':email' => sanitizeInput($data['delivery_email']),
            ':address' => sanitizeInput($data['delivery_address']),
            ':city' => sanitizeInput($delivery_city),
            ':zipcode' => sanitizeInput($data['delivery_zipcode']),
            ':discount_amount' => round($totalDiscount, 2),
            ':promo_code' => $data['promo_code'] ? sanitizeInput($data['promo_code']) : null,
            ':loyalty_points_used' => (int) $pointsToUse
        ];
        error_log("Order Insert Query: $sql");
        error_log("Order Insert Params: " . json_encode($orderParams));
        $stmt->execute($orderParams);

        $order_id = $conn->lastInsertId();

        // Insert order items
        $sql = "INSERT INTO orderitems (order_id, product_id, quantity, price, size)
                  VALUES (:order_id, :product_id, :quantity, :price, :size)";
        $stmt = $conn->prepare($sql);

        foreach ($data['items'] as $item) {
            $size = $item['size'] ?? 'medium';
            $quantityField = $size . '_quantity';

            $itemParams = [
                ':order_id' => $order_id,
                ':product_id' => (int) $item['product_id'],
                ':quantity' => (int) $item['quantity'],
                ':price' => round(floatval($item['price']), 2),
                ':size' => $size
            ];
            error_log("Order Item Insert Params: " . json_encode($itemParams));
            $stmt->execute($itemParams);

            $updateQuantitySql = "UPDATE products SET $quantityField = $quantityField - :quantity WHERE product_id = :product_id";
            $updateStmt = $conn->prepare($updateQuantitySql);
            $updateStmt->execute([
                ':quantity' => (int) $item['quantity'],
                ':product_id' => (int) $item['product_id']
            ]);
        }

        // Update loyalty points in profile table
        if ($data['user_id'] && $useLoyaltyPoints) {
            $pointsUpdate = $pointsEarned - 100;
            $stmt = $conn->prepare("UPDATE profile SET loyalty_points = loyalty_points + :points, loyalty_points_used = loyalty_points_used + :points_used WHERE user_id = :user_id");
            $stmt->execute([
                ':points' => (int) $pointsUpdate,
                ':points_used' => 100,
                ':user_id' => (int) $data['user_id']
            ]);
        } elseif ($data['user_id']) {
            // Only add earned points if no redemption
            $stmt = $conn->prepare("UPDATE profile SET loyalty_points = loyalty_points + :points WHERE user_id = :user_id");
            $stmt->execute([
                ':points' => (int) $pointsEarned,
                ':user_id' => (int) $data['user_id']
            ]);
        }

    // Insert order history
        $historyQuery = "INSERT INTO orderhistory (order_id, user_id, status, notes, created_at)
                           VALUES (:order_id, :user_id, :status, :notes, NOW())";
        $historyStmt = $conn->prepare($historyQuery);
    $notes = "Order placed with {$pointsEarned} loyalty points earned (1 point per ₱10 of total order)";
        if ($useLoyaltyPoints && $hasCoffeeInCart && $redeemedProductName) {
            $notes = "Order placed with loyalty points redemption (100 points, 1 free coffee: {$redeemedProductName})";
        }
        $historyParams = [
            ':order_id' => $order_id,
            ':user_id' => $data['user_id'] ? (int) $data['user_id'] : null,
            ':status' => 'Pending',
            ':notes' => $notes
        ];
        error_log("Order History Insert Query: $historyQuery");
        error_log("Order History Insert Params: " . json_encode($historyParams));
        $historyStmt->execute($historyParams);

        $conn->commit();

        $response = [
            'success' => true,
            'message' => 'Order created successfully',
            'order_id' => $order_id,
            'points_earned' => $pointsEarned
        ];

        if (!empty($lowStockProducts)) {
            $response['low_stock_products'] = $lowStockProducts;
            $response['message'] .= '. Warning: Some products are low in stock.';
        }

        if ($useLoyaltyPoints && $hasCoffeeInCart) {
            $response['loyalty_points_redeemed'] = $pointsToUse;
            $response['free_coffee_included'] = true;
            $response['redeemed_product_id'] = $redeemedProductId;
            $response['redeemed_product_name'] = $redeemedProductName;
        } else {
            $response['loyalty_points_redeemed'] = 0;
            $response['free_coffee_included'] = false;
        }

        // Fetch and return the latest loyalty points for the user
        if ($data['user_id']) {
            $stmt = $conn->prepare("SELECT loyalty_points FROM profile WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $data['user_id']]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            $response['loyalty_points'] = $profile ? intval($profile['loyalty_points']) : 0;
        }

        echo json_encode($response);
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        error_log("createOrder error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to create order: ' . $e->getMessage()]);
    }
}


function fetchOrders($conn) {
  $order_id = isset($_GET['order_id']) ? (int) $_GET['order_id'] : null;
  $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
  $limit = isset($_GET['limit']) ? max(1, (int) $_GET['limit']) : 10;
  $offset = ($page - 1) * $limit;
  $search = isset($_GET['search']) ? trim($_GET['search']) : '';

  try {
    if ($order_id) {
      $query = "SELECT o.order_id, o.user_id, o.order_number, o.total_amount, o.status, o.payment_method, o.payment_reference,
                       o.created_at, o.delivery_firstname as first_name,
                       o.delivery_lastname as last_name, o.delivery_email as email,
                       o.delivery_phone as phone, o.delivery_address as address,
                       o.delivery_city as city, o.delivery_zipcode as zipcode,
                       (SELECT COUNT(*) FROM orderitems oi WHERE oi.order_id = o.order_id) as items_count
                FROM `order` o WHERE o.order_id = :order_id";
      $stmt = $conn->prepare($query);
      $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
      $stmt->execute();
      $order = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$order) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Order not found']);
        return;
      }

      echo json_encode([
        'success' => true,
        'order' => $order
      ]);
    } else {
      $whereConditions = [];
      $params = [];
      if ($search !== '') {
        // Sanitize search input
        $search = htmlspecialchars($search, ENT_QUOTES, 'UTF-8');
        if ($search === false || strlen($search) > 100) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => 'Invalid search query']);
          return;
        }
        $whereConditions[] = '('
          . 'o.order_number LIKE :search1 OR '
          . 'o.user_id LIKE :search2 OR '
          . 'o.delivery_firstname LIKE :search3 OR '
          . 'o.delivery_lastname LIKE :search4 OR '
          . 'o.delivery_email LIKE :search5 OR '
          . 'o.delivery_phone LIKE :search6 OR '
          . 'o.delivery_address LIKE :search7 OR '
          . 'o.delivery_city LIKE :search8 OR '
          . 'o.delivery_zipcode LIKE :search9 OR '
          . 'o.status LIKE :search10 OR '
          . 'o.payment_method LIKE :search11 OR '
          . 'o.promo_code LIKE :search12 OR '
          . 'o.payment_reference LIKE :search13 OR '
          . 'EXISTS (SELECT 1 FROM orderitems oi JOIN products p ON oi.product_id = p.product_id
                   WHERE oi.order_id = o.order_id AND p.name LIKE :search14) OR '
          . 'EXISTS (SELECT 1 FROM orderhistory oh WHERE oh.order_id = o.order_id AND oh.notes LIKE :search15) OR '
          . 'EXISTS (SELECT 1 FROM user u WHERE u.user_id = o.user_id AND (u.username LIKE :search16 OR u.fullname LIKE :search17))'
          . ')';
        $searchWildcard = "%$search%";
        $params[':search1'] = $searchWildcard;
        $params[':search2'] = $searchWildcard;
        $params[':search3'] = $searchWildcard;
        $params[':search4'] = $searchWildcard;
        $params[':search5'] = $searchWildcard;
        $params[':search6'] = $searchWildcard;
        $params[':search7'] = $searchWildcard;
        $params[':search8'] = $searchWildcard;
        $params[':search9'] = $searchWildcard;
        $params[':search10'] = $searchWildcard;
        $params[':search11'] = $searchWildcard;
        $params[':search12'] = $searchWildcard;
        $params[':search13'] = $searchWildcard;
        $params[':search14'] = $searchWildcard;
        $params[':search15'] = $searchWildcard;
        $params[':search16'] = $searchWildcard;
        $params[':search17'] = $searchWildcard;
      }

      // Count total orders for pagination
      $countQuery = "SELECT COUNT(DISTINCT o.order_id) as total FROM `order` o";
      if (!empty($whereConditions)) {
        $countQuery .= ' LEFT JOIN orderitems oi ON o.order_id = oi.order_id';
        $countQuery .= ' LEFT JOIN products p ON oi.product_id = p.product_id';
        $countQuery .= ' LEFT JOIN orderhistory oh ON o.order_id = oh.order_id';
        $countQuery .= ' LEFT JOIN user u ON o.user_id = u.user_id';
        $countQuery .= ' WHERE ' . implode(' AND ', $whereConditions);
      }
      $countStmt = $conn->prepare($countQuery);
      foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
      }
      $countStmt->execute();
      $totalOrders = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

      // Main query to fetch orders
      $query = "SELECT o.order_id, o.user_id, o.order_number, o.total_amount, o.status, o.payment_method, o.payment_reference,
                       o.created_at, o.delivery_firstname as first_name,
                       o.delivery_lastname as last_name, o.delivery_email as email,
                       o.delivery_phone as phone, o.delivery_address as address,
                       o.delivery_city as city, o.delivery_zipcode as zipcode,
                       (SELECT COUNT(*) FROM orderitems oi WHERE oi.order_id = o.order_id) as items_count
                FROM `order` o";
      if (!empty($whereConditions)) {
        $query .= ' LEFT JOIN orderitems oi ON o.order_id = oi.order_id';
        $query .= ' LEFT JOIN products p ON oi.product_id = p.product_id';
        $query .= ' LEFT JOIN orderhistory oh ON o.order_id = oh.order_id';
        $query .= ' LEFT JOIN user u ON o.user_id = u.user_id';
        $query .= ' WHERE ' . implode(' AND ', $whereConditions);
      }
      $query .= " GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset";

      $stmt = $conn->prepare($query);
      $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
      $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
      foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
      }
      $stmt->execute();
      $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

      echo json_encode([
        'success' => true,
        'orders' => $orders,
        'total_orders' => $totalOrders
      ]);
    }
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchOrders error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch orders: ' . $e->getMessage()
    ]);
  }
}
function fetchOrderHistory($conn) {
  $status = isset($_GET['status']) ? trim($_GET['status']) : 'All';
  $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
  $offset = ($page - 1) * $limit;
  $search = isset($_GET['search']) ? trim($_GET['search']) : '';

  try {
    // Base query for counting total records
    $countQuery = "SELECT COUNT(DISTINCT h.history_id) as total
                   FROM orderhistory h
                   JOIN `order` o ON h.order_id = o.order_id
                   JOIN user u ON h.user_id = u.user_id";
    $countParams = [];

    $whereConditions = [];
    if ($status !== 'All') {
      if ($status === 'Refund') {
        $whereConditions[] = "h.status IN ('Refund', 'Refunded')";
      } else {
        $whereConditions[] = "h.status = :status";
        $countParams[':status'] = $status;
      }
    }

    if ($search) {
      $whereConditions[] = "(
        o.order_number LIKE :search1 OR
        CONCAT(o.delivery_firstname, ' ', o.delivery_lastname) LIKE :search2 OR
        o.delivery_email LIKE :search3 OR
        h.status LIKE :search4 OR
        o.payment_method LIKE :search5 OR
        h.notes LIKE :search6 OR
        o.total_amount LIKE :search7 OR
        h.created_at LIKE :search8 OR
        u.username LIKE :search9 OR
        u.fullname LIKE :search10
      )";
      $searchWildcard = "%$search%";
      $countParams[':search1'] = $searchWildcard;
      $countParams[':search2'] = $searchWildcard;
      $countParams[':search3'] = $searchWildcard;
      $countParams[':search4'] = $searchWildcard;
      $countParams[':search5'] = $searchWildcard;
      $countParams[':search6'] = $searchWildcard;
      $countParams[':search7'] = $searchWildcard;
      $countParams[':search8'] = $searchWildcard;
      $countParams[':search9'] = $searchWildcard;
      $countParams[':search10'] = $searchWildcard;
    }

    if (!empty($whereConditions)) {
      $countQuery .= " WHERE " . implode(" AND ", $whereConditions);
    }

    $countStmt = $conn->prepare($countQuery);
    $countStmt->execute($countParams);
    $totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Main query for fetching order history
    $query = "SELECT h.history_id, h.order_id, h.user_id, h.status, h.notes, h.created_at, h.updated_at,
                     o.order_number, o.total_amount, o.status as order_status, o.payment_method,
                     o.delivery_firstname as first_name, o.delivery_lastname as last_name, o.delivery_email as email,
                     u.username, u.fullname
              FROM orderhistory h
              JOIN `order` o ON h.order_id = o.order_id
              JOIN user u ON h.user_id = u.user_id";

    $params = [];
    if (!empty($whereConditions)) {
      $query .= " WHERE " . implode(" AND ", $whereConditions);
      $params = $countParams;
    }

    $query .= " ORDER BY h.created_at DESC LIMIT :limit OFFSET :offset";

    $stmt = $conn->prepare($query);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    foreach ($params as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'data' => [
        'history' => $history,
        'total_records' => $totalRecords,
        'page' => $page,
        'limit' => $limit,
        'total_pages' => ceil($totalRecords / $limit)
      ]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchOrderHistory error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch order history: ' . $e->getMessage()
    ]);
  }
}


function getOrderItems($conn) {
  $order_id = isset($_GET['order_id']) ? (int) $_GET['order_id'] : 0;

  if (!$order_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID is required']);
    return;
  }

  try {
    $orderCheck = $conn->prepare("SELECT order_id FROM `order` WHERE order_id = :order_id");
    $orderCheck->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderCheck->execute();
    if (!$orderCheck->fetch()) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Order not found']);
      return;
    }

    $query = "SELECT oi.orderitem_id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.size,
                         COALESCE(p.name, 'Unknown Product') as product_name,
                         COALESCE(p.image, '') as product_image
                         FROM orderitems oi
                         LEFT JOIN products p ON oi.product_id = p.product_id
                         WHERE oi.order_id = :order_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'items' => $items
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("getOrderItems error for order_id $order_id: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch order items: ' . $e->getMessage()
    ]);
  }
}

function updateOrderStatus($conn) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    return;
  }

  $data = json_decode(file_get_contents('php://input'), true);
  $order_id = isset($data['order_id']) ? (int) $data['order_id'] : 0;
  $status = isset($data['status']) ? $data['status'] : '';
  $notes = isset($data['notes']) ? $data['notes'] : '';

  if (!$order_id || !$status) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID and status are required']);
    return;
  }

  $validStatuses = [
    'Pending',
    'Confirmed',
    'Processing',
    'Ready for Pickup',
    'Ready for Delivery',
    'Out for Delivery',
    'Delivered',
    'Completed',
    'Refund',
    'Cancelled',
    'Failed Delivery',
    'Returned'
  ];
  if (!in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid status']);
    return;
  }

  try {
    $conn->beginTransaction();

    // Get current order details
    $orderCheck = $conn->prepare("SELECT order_id, user_id, status as current_status, loyalty_points_used FROM `order` WHERE order_id = :order_id");
    $orderCheck->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderCheck->execute();
    $order = $orderCheck->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
      $conn->rollBack();
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Order not found']);
      return;
    }

    $currentStatus = $order['current_status'];

    // Validate status transition
    if (!isValidStatusTransition($currentStatus, $status)) {
      $conn->rollBack();
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => "Invalid status transition from $currentStatus to $status"]);
      return;
    }

    // Handle cancellation - restore inventory and deduct loyalty points
    if ($status === 'Cancelled' && $currentStatus !== 'Cancelled') {
      // Get order items to restore inventory
      $itemsQuery = "SELECT oi.product_id, oi.quantity, oi.size FROM orderitems oi WHERE oi.order_id = :order_id";
      $itemsStmt = $conn->prepare($itemsQuery);
      $itemsStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
      $itemsStmt->execute();
      $orderItems = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

      // Restore inventory for each item
      foreach ($orderItems as $item) {
        $size = $item['size'] ?? 'medium';
        $quantityField = $size . '_quantity';

        $updateQuantitySql = "UPDATE products SET $quantityField = $quantityField + :quantity WHERE product_id = :product_id";
        $updateStmt = $conn->prepare($updateQuantitySql);
        $updateStmt->execute([
          ':quantity' => (int) $item['quantity'],
          ':product_id' => (int) $item['product_id']
        ]);
      }

      // Deduct loyalty points if they were used and get the original points
      if ($order['user_id'] && $order['loyalty_points_used'] > 0) {
        $pointsToDeduct = $order['loyalty_points_used'];

        // First get current points to ensure we don't go negative
        $checkPoints = $conn->prepare("SELECT loyalty_points FROM profile WHERE user_id = :user_id");
        $checkPoints->execute([':user_id' => (int) $order['user_id']]);
        $currentPoints = $checkPoints->fetch(PDO::FETCH_ASSOC);

        // Ensure points don't go negative
        $pointsToDeduct = min($pointsToDeduct, $currentPoints['loyalty_points'] ?? 0);

        $stmt = $conn->prepare("UPDATE profile SET loyalty_points = GREATEST(0, loyalty_points - :points), loyalty_points_used = GREATEST(0, loyalty_points_used - :points_used) WHERE user_id = :user_id");
        $stmt->execute([
          ':points' => (int) $pointsToDeduct,
          ':points_used' => (int) $pointsToDeduct,
          ':user_id' => (int) $order['user_id']
        ]);

        error_log("Order {$order_id} cancelled: Deducted {$pointsToDeduct} loyalty points from user {$order['user_id']}");
      }
    }

    // Update order status
    $query = "UPDATE `order` SET status = :status WHERE order_id = :order_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':status', $status, PDO::PARAM_STR);
    $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $stmt->execute();

    // Add to order history
    $currentUserId = getCurrentUserId($conn);
    $historyQuery = "INSERT INTO orderhistory (order_id, user_id, status, notes, created_at)
                         VALUES (:order_id, :user_id, :status, :notes, NOW())";
    $historyStmt = $conn->prepare($historyQuery);
    $historyStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    if ($currentUserId) {
      $historyStmt->bindParam(':user_id', $currentUserId, PDO::PARAM_INT);
    } else {
      $historyStmt->bindValue(':user_id', null, PDO::PARAM_NULL);
    }
    $historyStmt->bindParam(':status', $status, PDO::PARAM_STR);
    $historyStmt->bindParam(':notes', $notes, PDO::PARAM_STR);
    $historyStmt->execute();

    // Get updated order details
    $orderQuery = "SELECT o.*, o.delivery_firstname as first_name,
                              o.delivery_lastname as last_name, o.delivery_email as email,
                              o.delivery_phone as phone, o.delivery_address as address,
                              o.delivery_city as city, o.delivery_zipcode as zipcode
                       FROM `order` o
                       WHERE o.order_id = :order_id";
    $orderStmt = $conn->prepare($orderQuery);
    $orderStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderStmt->execute();
    $updatedOrder = $orderStmt->fetch(PDO::FETCH_ASSOC);

    $conn->commit();

    echo json_encode([
      'success' => true,
      'message' => 'Order status updated successfully',
      'order' => $updatedOrder
    ]);
  } catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    error_log("updateOrderStatus error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to update order status: ' . $e->getMessage()
    ]);
  }
}

function getStatusHistory($conn) {
  $order_id = isset($_GET['order_id']) ? (int) $_GET['order_id'] : 0;

  if (!$order_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID is required']);
    return;
  }

  try {
    $orderCheck = $conn->prepare("SELECT order_id FROM `order` WHERE order_id = :order_id");
    $orderCheck->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderCheck->execute();
    if (!$orderCheck->fetch()) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Order not found']);
      return;
    }

    $historyQuery = "SELECT h.history_id, h.order_id, h.status, h.notes, h.created_at, h.updated_at,
                                o.order_number, o.total_amount,
                                o.delivery_firstname as first_name, o.delivery_lastname as last_name, o.delivery_email as email
                         FROM orderhistory h
                         JOIN `order` o ON h.order_id = o.order_id
                         WHERE h.order_id = :order_id
                         ORDER BY h.created_at DESC";
    $historyStmt = $conn->prepare($historyQuery);
    $historyStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $historyStmt->execute();
    $statusHistory = $historyStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'status_history' => $statusHistory
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("getStatusHistory error for order_id $order_id: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch status history: ' . $e->getMessage()
    ]);
  }
}
function deleteOrder($conn) {
  $order_id = isset($_GET['order_id']) ? (int) $_GET['order_id'] : 0;

  if (!$order_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID is required']);
    return;
  }

  try {
    $conn->beginTransaction();

    // Determine if the order has any items
    $itemsCountQuery = "SELECT COUNT(*) as item_count FROM orderitems WHERE order_id = :order_id";
    $itemsCountStmt = $conn->prepare($itemsCountQuery);
    $itemsCountStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $itemsCountStmt->execute();
    $itemsCount = (int) ($itemsCountStmt->fetch(PDO::FETCH_ASSOC)['item_count'] ?? 0);

    // Get order details to check status
    $orderQuery = "SELECT status FROM `order` WHERE order_id = :order_id";
    $orderStmt = $conn->prepare($orderQuery);
    $orderStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderStmt->execute();
    $orderDetails = $orderStmt->fetch(PDO::FETCH_ASSOC);

    if (!$orderDetails) {
      throw new PDOException("Order not found");
    }

    // Check if order status is Cancelled or Completed (only enforce if order has items)
    // If there are no items in the order, allow deletion regardless of status
    if ($itemsCount > 0 && !in_array($orderDetails['status'], ['Cancelled', 'Completed'])) {
      throw new PDOException("Order can only be deleted if status is Cancelled or Completed");
    }

    // Get order details for loyalty points
    $orderQuery = "SELECT o.*, p.loyalty_points as current_points
                  FROM `order` o
                  LEFT JOIN profile p ON o.user_id = p.user_id
                  WHERE o.order_id = :order_id";
    $orderStmt = $conn->prepare($orderQuery);
    $orderStmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $orderStmt->execute();
    $orderDetails = $orderStmt->fetch(PDO::FETCH_ASSOC);

    // Handle loyalty points if user exists and order is not cancelled
    // Only adjust points when the order actually has items
    if ($itemsCount > 0 && !empty($orderDetails['user_id']) && $orderDetails['status'] !== 'Cancelled') {
      $orderTotal = floatval($orderDetails['total_amount']);
      $pointsEarned = floor($orderTotal / 10);
      $pointsUsed = isset($orderDetails['loyalty_points_used']) ? intval($orderDetails['loyalty_points_used']) : 0;
      $netPointChange = $pointsUsed - $pointsEarned;

      error_log("Order {$order_id} deleted: Points used={$pointsUsed}, Points earned={$pointsEarned}, Net change={$netPointChange}");

      if ($netPointChange !== 0) {
        $checkPoints = $conn->prepare("SELECT loyalty_points FROM profile WHERE user_id = :user_id");
        $checkPoints->execute([':user_id' => (int) $orderDetails['user_id']]);
        $currentPoints = $checkPoints->fetch(PDO::FETCH_ASSOC);

        $updateProfileQuery = "UPDATE profile SET loyalty_points = GREATEST(0, COALESCE(loyalty_points,0) + :change), loyalty_points_used = GREATEST(0, COALESCE(loyalty_points_used,0) - :points_used) WHERE user_id = :user_id";
        $updateProfileStmt = $conn->prepare($updateProfileQuery);
        $updateProfileStmt->bindParam(':change', $netPointChange, PDO::PARAM_INT);
        $updateProfileStmt->bindParam(':points_used', $pointsUsed, PDO::PARAM_INT);
        $updateProfileStmt->bindParam(':user_id', $orderDetails['user_id'], PDO::PARAM_INT);
        $updateProfileStmt->execute();

        $checkPoints->execute([':user_id' => (int) $orderDetails['user_id']]);
        $newPoints = $checkPoints->fetch(PDO::FETCH_ASSOC);
        error_log("User {$orderDetails['user_id']} points updated: Before={$currentPoints['loyalty_points']}, After={$newPoints['loyalty_points']}");
      }
    }

    // Delete order items
    $query = "DELETE FROM orderitems WHERE order_id = :order_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $stmt->execute();

    // Delete order history
    $query = "DELETE FROM orderhistory WHERE order_id = :order_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $stmt->execute();

    // Delete the order
    $query = "DELETE FROM `order` WHERE order_id = :order_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':order_id', $order_id, PDO::PARAM_INT);
    $stmt->execute();

    $conn->commit();

    echo json_encode([
      'success' => true,
      'message' => 'Order deleted successfully'
    ]);
  } catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    error_log("deleteOrder error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to delete order: ' . $e->getMessage()
    ]);
  }
}


function autoUpdatePendingOrders($conn) {
  try {
    // Get orders that have been pending for more than 30 minutes
    $query = "SELECT o.order_id, o.user_id, o.order_number, o.status, o.created_at
              FROM `order` o
              WHERE o.status = 'Pending'
              AND o.created_at <= DATE_SUB(NOW(), INTERVAL 30 MINUTE)";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $pendingOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updatedCount = 0;
    $errors = [];

    foreach ($pendingOrders as $order) {
      try {
        $conn->beginTransaction();

        // Update order status to Confirmed
        $updateQuery = "UPDATE `order` SET status = 'Confirmed' WHERE order_id = :order_id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':order_id', $order['order_id'], PDO::PARAM_INT);
        $updateStmt->execute();

        // Add to order history
        $historyQuery = "INSERT INTO orderhistory (order_id, user_id, status, notes, created_at)
                        VALUES (:order_id, :user_id, :status, :notes, NOW())";
        $historyStmt = $conn->prepare($historyQuery);
        $historyStmt->bindParam(':order_id', $order['order_id'], PDO::PARAM_INT);
        if (!empty($order['user_id'])) {
          $historyStmt->bindParam(':user_id', $order['user_id'], PDO::PARAM_INT);
        } else {
          $historyStmt->bindValue(':user_id', null, PDO::PARAM_NULL);
        }
        $status = 'Confirmed';
        $historyStmt->bindParam(':status', $status, PDO::PARAM_STR);
        $notes = 'Order automatically confirmed after 30 minutes of pending status';
        $historyStmt->bindParam(':notes', $notes, PDO::PARAM_STR);
        $historyStmt->execute();

        $conn->commit();
        $updatedCount++;

        // Log the automatic update
        error_log("Auto-updated order {$order['order_number']} from Pending to Confirmed after 30 minutes");

      } catch (PDOException $e) {
        $conn->rollBack();
        $errors[] = "Failed to update order {$order['order_number']}: " . $e->getMessage();
        error_log("Auto-update error for order {$order['order_number']}: " . $e->getMessage());
      }
    }

    echo json_encode([
      'success' => true,
      'message' => "Auto-updated $updatedCount pending orders to confirmed status",
      'updated_count' => $updatedCount,
      'errors' => $errors
    ]);

  } catch (PDOException $e) {
    http_response_code(500);
    error_log("autoUpdatePendingOrders error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to auto-update pending orders: ' . $e->getMessage()
    ]);
  }
}

// Helper function to validate status transitions
function isValidStatusTransition($currentStatus, $newStatus) {
  if ($currentStatus === $newStatus) {
    return false; // Cannot update to the same status
  }

  // Define valid status transitions
  $validTransitions = [
    'Pending' => ['Confirmed', 'Cancelled'],
    'Confirmed' => ['Processing', 'Cancelled'],
    'Processing' => ['Ready for Pickup', 'Ready for Delivery', 'Cancelled'],
    'Ready for Pickup' => ['Completed', 'Cancelled'],
    'Ready for Delivery' => ['Out for Delivery', 'Cancelled'],
    'Out for Delivery' => ['Delivered', 'Failed Delivery', 'Cancelled'],
    'Delivered' => ['Completed', 'Returned'],
    'Completed' => [], // Final status - no further transitions
    'Refund' => ['Completed'], // Refund can be marked as completed
    'Cancelled' => [], // Final status - no further transitions
    'Failed Delivery' => ['Out for Delivery', 'Cancelled'],
    'Returned' => ['Refund', 'Completed']
  ];

  // Check if the transition is valid
  return isset($validTransitions[$currentStatus]) &&
         in_array($newStatus, $validTransitions[$currentStatus]);
}
