<?php
require_once '../dbconn.php';

header('Content-Type: application/json');
$pdo = getConnection();

$action = $_GET['action'] ?? '';

function getBearerToken() {
  $headers = getallheaders();
  if (isset($headers['Authorization'])) {
    if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
      return $matches[1];
    }
  }
  return null;
}

switch ($action) {
  case 'get_current_order':
    $user_id = $_GET['user_id'] ?? null;
    if (!$user_id) {
      echo json_encode(['success' => false, 'message' => 'User ID required']);
      exit;
    }
    try {
      $stmt = $pdo->prepare("SELECT * FROM `order` WHERE user_id = ? AND status NOT IN ('Completed', 'Cancelled') ORDER BY created_at DESC LIMIT 1");
      $stmt->execute([$user_id]);
      $order = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($order) {
        echo json_encode(['success' => true, 'order' => $order]);
      } else {
        echo json_encode(['success' => true, 'order' => null]);
      }
    } catch (Exception $e) {
      echo json_encode(['success' => false, 'message' => 'Failed to fetch current order']);
    }
    break;

  case 'update_order':
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $order_id = $input['order_id'] ?? null;
    if (!$order_id) {
      echo json_encode(['success' => false, 'message' => 'Order ID required']);
      exit;
    }
    try {
      $pdo->beginTransaction();

      // Check if order exists and belongs to user
      $stmt = $pdo->prepare("SELECT user_id, status FROM `order` WHERE order_id = ?");
      $stmt->execute([$order_id]);
      $order = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$order) {
        throw new Exception('Order not found');
      }

      if ($order['status'] === 'Completed' || $order['status'] === 'Cancelled') {
        throw new Exception('Cannot edit completed or cancelled orders');
      }

      $fields = [
        'payment_method', 'delivery_firstname', 'delivery_lastname', 'delivery_phone',
        'delivery_email', 'delivery_address', 'delivery_city', 'delivery_zipcode'
      ];
      $set = [];
      $params = [];
      foreach ($fields as $field) {
        if (isset($input[$field])) {
          $set[] = "$field = ?";
          $params[] = $input[$field];
        }
      }
      if (empty($set)) {
        throw new Exception('No fields to update');
      }
      $params[] = $order_id;
      $sql = "UPDATE `order` SET " . implode(', ', $set) . " WHERE order_id = ?";
      $stmt = $pdo->prepare($sql);
      $stmt->execute($params);

      // Add to order history
      $stmt = $pdo->prepare("INSERT INTO orderhistory (order_id, user_id, status, notes) VALUES (?, ?, ?, ?)");
      $stmt->execute([$order_id, $order['user_id'], 'Updated', 'Order information updated by customer']);

      $pdo->commit();
      echo json_encode(['success' => true, 'message' => 'Order updated successfully']);
    } catch (Exception $e) {
      $pdo->rollBack();
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  case 'delete_order':
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $order_id = $input['order_id'] ?? null;
    if (!$order_id) {
      echo json_encode(['success' => false, 'message' => 'Order ID required']);
      exit;
    }
    try {
      $pdo->beginTransaction();

      // Get order details including loyalty points used and total amount
      $stmt = $pdo->prepare("SELECT user_id, loyalty_points_used, status, total_amount FROM `order` WHERE order_id = ?");
      $stmt->execute([$order_id]);
      $order = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$order) {
        throw new Exception('Order not found');
      }

      if ($order['status'] === 'Completed') {
        throw new Exception('Cannot delete completed orders');
      }

      // Get order items to restore product quantities
      $stmt = $pdo->prepare("SELECT product_id, quantity, size FROM orderitems WHERE order_id = ?");
      $stmt->execute([$order_id]);
      $orderItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

      // Restore product quantities
      foreach ($orderItems as $item) {
        $sizeColumn = $item['size'] . '_quantity';
        $stmt = $pdo->prepare("UPDATE products SET $sizeColumn = $sizeColumn + ? WHERE product_id = ?");
        $stmt->execute([$item['quantity'], $item['product_id']]);
      }

      // Handle loyalty points restoration properly
      if (!empty($order['user_id'])) {
        $orderTotal = floatval($order['total_amount']);
        $pointsEarned = floor($orderTotal / 10); // 1 point per ₱10 spent
        $pointsUsed = isset($order['loyalty_points_used']) ? intval($order['loyalty_points_used']) : 0;
        $netPointChange = $pointsUsed - $pointsEarned;

        error_log("Order {$order_id} deleted: Points used={$pointsUsed}, Points earned={$pointsEarned}, Net change={$netPointChange}");

        if ($netPointChange !== 0) {
          // Get current loyalty points
          $checkPoints = $pdo->prepare("SELECT loyalty_points FROM profile WHERE user_id = ?");
          $checkPoints->execute([$order['user_id']]);
          $currentPoints = $checkPoints->fetch(PDO::FETCH_ASSOC);

          // Update loyalty points: add back points used, subtract points earned
          $updateProfileQuery = "UPDATE profile SET
            loyalty_points = GREATEST(0, COALESCE(loyalty_points,0) + ?),
            loyalty_points_used = GREATEST(0, COALESCE(loyalty_points_used,0) - ?)
            WHERE user_id = ?";
          $updateProfileStmt = $pdo->prepare($updateProfileQuery);
          $updateProfileStmt->execute([$netPointChange, $pointsUsed, $order['user_id']]);

          // Log the change
          $checkPoints->execute([$order['user_id']]);
          $newPoints = $checkPoints->fetch(PDO::FETCH_ASSOC);
          error_log("User {$order['user_id']} points updated: Before={$currentPoints['loyalty_points']}, After={$newPoints['loyalty_points']}");
        }
      }

      // Delete order items
      $stmt = $pdo->prepare('DELETE FROM orderitems WHERE order_id = ?');
      $stmt->execute([$order_id]);

      // Delete order history
      $stmt = $pdo->prepare('DELETE FROM orderhistory WHERE order_id = ?');
      $stmt->execute([$order_id]);

      // Delete the order
      $stmt = $pdo->prepare('DELETE FROM `order` WHERE order_id = ?');
      $stmt->execute([$order_id]);

      $pdo->commit();
      echo json_encode(['success' => true, 'message' => 'Order deleted successfully']);
    } catch (Exception $e) {
      $pdo->rollBack();
      echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    break;
}
