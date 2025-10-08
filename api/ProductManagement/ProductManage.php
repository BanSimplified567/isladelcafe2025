<?php

// Helper function to handle image uploads
function handleImageUpload($isMultipart, $data, $currentImage = null) {
  if ($isMultipart && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/products/';
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0755, true);
    }
    $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($_FILES['image']['name'], PATHINFO_FILENAME));
    $imageFileName = $baseName . '.' . $ext;
    $targetPath = $uploadDir . $imageFileName;
    $counter = 1;
    while (file_exists($targetPath)) {
      $imageFileName = $baseName . '_' . $counter . '.' . $ext;
      $targetPath = $uploadDir . $imageFileName;
      $counter++;
    }
    if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
      return false;
    }
    return $imageFileName;
  }

  // If no new image uploaded, keep the current one or use the provided image name
  return $data['image'] ?? $currentImage ?? '';
}



function createProduct($conn) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    return;
  }

  // Support both JSON and multipart/form-data
  $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
  if ($isMultipart) {
    $data = $_POST;
  } else {
    $data = json_decode(file_get_contents('php://input'), true);
  }

  if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    return;
  }

  // Use helper function to handle image upload
  $imageFileName = handleImageUpload($isMultipart, $data);
  if ($imageFileName === false && $isMultipart && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
      http_response_code(500);
      echo json_encode(['success' => false, 'message' => 'Failed to upload image']);
      return;
  }

  try {
    $sql = "INSERT INTO products (
                    name, type, subtype, image, description, temperature,
                    rating, caffeine_level, small_price, medium_price, large_price,
                    small_quantity, medium_quantity, large_quantity, reviews,
                    low_stock_threshold, status
                ) VALUES (
                    :name, :type, :subtype, :image, :description, :temperature,
                    :rating, :caffeine_level, :small_price, :medium_price, :large_price,
                    :small_quantity, :medium_quantity, :large_quantity, :reviews,
                    :low_stock_threshold, :status
                )";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
      ':name' => sanitizeInput($data['name']),
      ':type' => sanitizeInput($data['type']),
      ':subtype' => sanitizeInput($data['subtype']),
      ':image' => sanitizeInput($imageFileName),
      ':description' => sanitizeInput($data['description']),
      ':temperature' => sanitizeInput($data['temperature']),
      ':rating' => $data['rating'] ?? 0,
      ':caffeine_level' => sanitizeInput($data['caffeine_level']),
      ':small_price' => $data['small_price'] ?? 0,
      ':medium_price' => $data['medium_price'] ?? 0,
      ':large_price' => $data['large_price'] ?? 0,
      ':small_quantity' => $data['small_quantity'] ?? 10,
      ':medium_quantity' => $data['medium_quantity'] ?? 10,
      ':large_quantity' => $data['large_quantity'] ?? 10,
      ':reviews' => $data['reviews'] ?? null,
      ':low_stock_threshold' => $data['low_stock_threshold'] ?? 5,
      ':status' => $data['status'] ?? 'active'
    ]);

    $product_id = $conn->lastInsertId();

    echo json_encode([
      'success' => true,
      'message' => 'Product created successfully',
      'product_id' => $product_id
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("createProduct error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to create product: ' . $e->getMessage()]);
  }
}



function updateProduct($conn) {
  if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    return;
  }

  $product_id = $_GET['product_id'] ?? null;
  if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    return;
  }

  $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
  if ($isMultipart) {
    $data = $_POST;
  } else {
    $data = json_decode(file_get_contents('php://input'), true);
  }
  if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    return;
  }

  try {
    $checkSql = "SELECT * FROM products WHERE product_id = :product_id";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->execute([':product_id' => $product_id]);
    $currentProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentProduct) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Product not found']);
      return;
    }

    // Handle image upload
    $imageFileName = $data['image'] ?? $currentProduct['image'];
    if ($isMultipart && isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
      $uploadDir = __DIR__ . '/../uploads/products/';
      if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
      }
      $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
      $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($_FILES['image']['name'], PATHINFO_FILENAME));
      $imageFileName = $baseName . '.' . $ext;
      $targetPath = $uploadDir . $imageFileName;
      $counter = 1;
      while (file_exists($targetPath)) {
        $imageFileName = $baseName . '_' . $counter . '.' . $ext;
        $targetPath = $uploadDir . $imageFileName;
        $counter++;
      }
      if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to upload image']);
        return;
      }
    }

    $sql = "UPDATE products SET
                    name = :name,
                    type = :type,
                    subtype = :subtype,
                    image = :image,
                    description = :description,
                    temperature = :temperature,
                    rating = :rating,
                    caffeine_level = :caffeine_level,
                    small_price = :small_price,
                    medium_price = :medium_price,
                    large_price = :large_price,
                    small_quantity = :small_quantity,
                    medium_quantity = :medium_quantity,
                    large_quantity = :large_quantity,
                    reviews = :reviews,
                    low_stock_threshold = :low_stock_threshold,
                    status = :status,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = :product_id";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
      ':name' => sanitizeInput($data['name'] ?? $currentProduct['name']),
      ':type' => sanitizeInput($data['type'] ?? $currentProduct['type']),
      ':subtype' => sanitizeInput($data['subtype'] ?? $currentProduct['subtype']),
      ':image' => sanitizeInput($imageFileName),
      ':description' => sanitizeInput($data['description'] ?? $currentProduct['description']),
      ':temperature' => sanitizeInput($data['temperature'] ?? $currentProduct['temperature']),
      ':rating' => $data['rating'] ?? $currentProduct['rating'],
      ':caffeine_level' => sanitizeInput($data['caffeine_level'] ?? $currentProduct['caffeine_level']),
      ':small_price' => $data['small_price'] ?? $currentProduct['small_price'],
      ':medium_price' => $data['medium_price'] ?? $currentProduct['medium_price'],
      ':large_price' => $data['large_price'] ?? $currentProduct['large_price'],
      ':small_quantity' => $data['small_quantity'] ?? $currentProduct['small_quantity'],
      ':medium_quantity' => $data['medium_quantity'] ?? $currentProduct['medium_quantity'],
      ':large_quantity' => $data['large_quantity'] ?? $currentProduct['large_quantity'],
      ':reviews' => $data['reviews'] ?? $currentProduct['reviews'],
      ':low_stock_threshold' => $data['low_stock_threshold'] ?? $currentProduct['low_stock_threshold'],
      ':status' => $data['status'] ?? $currentProduct['status'],
      ':product_id' => $product_id
    ]);

    echo json_encode([
      'success' => true,
      'message' => 'Product updated successfully',
      'product_id' => $product_id
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("updateProduct error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()]);
  }
}

function deleteProduct($conn) {
  if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    return;
  }

  $product_id = $_GET['product_id'] ?? null;
  if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    return;
  }

  try {
    $conn->beginTransaction();

    // Check if product exists
    $stmt = $conn->prepare('SELECT image FROM products WHERE product_id = :product_id');
    $stmt->bindParam(':product_id', $product_id, PDO::PARAM_INT);
    $stmt->execute();
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    $imageFile = $product ? $product['image'] : null;

    if (!$product) {
      $conn->rollBack();
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Product not found']);
      return;
    }

    // Check if product has associated order items in non-terminal orders
    $checkOrderItemsSql = "
      SELECT COUNT(*) as count
      FROM orderitems oi
      JOIN `order` o ON oi.order_id = o.order_id
      WHERE oi.product_id = :product_id
      AND o.status NOT IN ('Completed', 'Cancelled', 'Refund', 'Returned', 'Failed Delivery')
    ";
    $checkStmt = $conn->prepare($checkOrderItemsSql);
    $checkStmt->bindParam(':product_id', $product_id, PDO::PARAM_INT);
    $checkStmt->execute();
    $orderItemsCount = $checkStmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($orderItemsCount > 0) {
      $conn->rollBack();
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'The product is associated with active orders']);
      return;
    }

    // Delete related order items
    $deleteOrderItemsSql = "DELETE FROM orderitems WHERE product_id = :product_id";
    $deleteOrderItemsStmt = $conn->prepare($deleteOrderItemsSql);
    $deleteOrderItemsStmt->bindParam(':product_id', $product_id, PDO::PARAM_INT);
    $deleteOrderItemsStmt->execute();

    // Delete the product
    $sql = "DELETE FROM products WHERE product_id = :product_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':product_id', $product_id, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
      // Delete the image file
      if ($imageFile) {
        $imgPath = __DIR__ . '/../Uploads/products/' . $imageFile;
        if (file_exists($imgPath)) {
          @unlink($imgPath);
        }
      }

      $conn->commit();
      echo json_encode([
        'success' => true,
        'message' => 'Product deleted successfully'
      ]);
    } else {
      $conn->rollBack();
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Product not found']);
    }
  } catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    error_log("deleteProduct error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to delete product: ' . $e->getMessage()]);
  }
}



function getProducts($conn) {
  try {
    $query = "SELECT product_id, name, type, subtype, image, description, temperature,
                         rating, reviews, caffeine_level, small_price, medium_price, large_price,
                         small_quantity, medium_quantity, large_quantity, total_stock, low_stock_threshold
                         FROM products
                         WHERE status = 'active'
                         ORDER BY created_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as &$product) {
      $product['small_price'] = (float) $product['small_price'];
      $product['medium_price'] = (float) $product['medium_price'];
      $product['large_price'] = (float) $product['large_price'];
      $product['rating'] = (float) $product['rating'];
      $product['reviews'] = (int) $product['reviews'];
      $product['small_quantity'] = (int) $product['small_quantity'];
      $product['medium_quantity'] = (int) $product['medium_quantity'];
      $product['large_quantity'] = (int) $product['large_quantity'];
      $product['total_stock'] = (int) $product['total_stock'];
      $product['low_stock_threshold'] = (int) $product['low_stock_threshold'];
    }

    echo json_encode([
      'success' => true,
      'products' => $products
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("getProducts error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch products: ' . $e->getMessage()
    ]);
  }
}

function getProduct($conn) {
  $product_id = $_GET['product_id'] ?? null;

  if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID is required']);
    return;
  }

  try {
    $sql = "SELECT * FROM products
                WHERE product_id = :product_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':product_id', $product_id, PDO::PARAM_INT);
    $stmt->execute();
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'Product not found']);
      return;
    }

    $product['small_price'] = (float) $product['small_price'];
    $product['medium_price'] = (float) $product['medium_price'];
    $product['large_price'] = (float) $product['large_price'];
    $product['small_quantity'] = (int) $product['small_quantity'];
    $product['medium_quantity'] = (int) $product['medium_quantity'];
    $product['large_quantity'] = (int) $product['large_quantity'];
    $product['total_stock'] = (int) $product['total_stock'];
    $product['rating'] = (float) $product['rating'];

    $quantities = [
      'Small' => $product['small_quantity'],
      'Medium' => $product['medium_quantity'],
      'Large' => $product['large_quantity']
    ];

    $available_sizes = [];
    if ($product['small_quantity'] > 0)
      $available_sizes[] = 'Small';
    if ($product['medium_quantity'] > 0)
      $available_sizes[] = 'Medium';
    if ($product['large_quantity'] > 0)
      $available_sizes[] = 'Large';

    $product['quantities'] = $quantities;
    $product['available_sizes'] = $available_sizes;

    echo json_encode(['success' => true, 'product' => $product]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("getProduct error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
  }
}

function getAllProducts($conn) {
  $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
  $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
  $offset = ($page - 1) * $limit;

  try {
    $countSql = "SELECT COUNT(*) as total FROM products";
    $countStmt = $conn->query($countSql);
    $totalProducts = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    $sql = "SELECT * FROM products
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset";

    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as &$product) {
      $product['small_price'] = (float) $product['small_price'];
      $product['medium_price'] = (float) $product['medium_price'];
      $product['large_price'] = (float) $product['large_price'];
      $product['small_quantity'] = (int) $product['small_quantity'];
      $product['medium_quantity'] = (int) $product['medium_quantity'];
      $product['large_quantity'] = (int) $product['large_quantity'];
      $product['total_stock'] = (int) $product['total_stock'];
      $product['rating'] = (float) $product['rating'];

      $quantities = [
        'Small' => $product['small_quantity'],
        'Medium' => $product['medium_quantity'],
        'Large' => $product['large_quantity']
      ];

      $available_sizes = [];
      if ($product['small_quantity'] > 0)
        $available_sizes[] = 'Small';
      if ($product['medium_quantity'] > 0)
        $available_sizes[] = 'Medium';
      if ($product['large_quantity'] > 0)
        $available_sizes[] = 'Large';

      $product['quantities'] = $quantities;
      $product['available_sizes'] = $available_sizes;
    }

    echo json_encode([
      'success' => true,
      'products' => $products,
      'total_products' => $totalProducts,
      'page' => $page,
      'limit' => $limit,
      'total_pages' => ceil($totalProducts / $limit)
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("getAllProducts error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Query failed: ' . $e->getMessage()]);
  }
}
