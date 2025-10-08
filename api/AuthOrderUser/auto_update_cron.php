<?php
// Include database connection
require_once '../dbconn.php';

try {
    // Get orders that have been pending for more than 30 minutes
    $query = "SELECT o.order_id, o.user_id, o.order_number, o.status, o.created_at
              FROM `order` o
              WHERE o.status = 'Pending'
              AND o.created_at <= DATE_SUB(NOW(), INTERVAL 30 MINUTE)";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $pendingOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updatedCount = 0;
    $errors = [];

    foreach ($pendingOrders as $order) {
        try {
            $pdo->beginTransaction();

            // Update order status to Confirmed
            $updateQuery = "UPDATE `order` SET status = 'Confirmed' WHERE order_id = :order_id";
            $updateStmt = $pdo->prepare($updateQuery);
            $updateStmt->bindParam(':order_id', $order['order_id'], PDO::PARAM_INT);
            $updateStmt->execute();

            // Add to order history
            $historyQuery = "INSERT INTO orderhistory (order_id, user_id, status, notes, created_at)
                            VALUES (:order_id, :user_id, :status, :notes, NOW())";
            $historyStmt = $pdo->prepare($historyQuery);
            $historyStmt->bindParam(':order_id', $order['order_id'], PDO::PARAM_INT);
            $historyStmt->bindParam(':user_id', $order['user_id'], PDO::PARAM_INT);
            $status = 'Confirmed';
            $historyStmt->bindParam(':status', $status, PDO::PARAM_STR);
            $notes = 'Order automatically confirmed after 30 minutes of pending status';
            $historyStmt->bindParam(':notes', $notes, PDO::PARAM_STR);
            $historyStmt->execute();

            $pdo->commit();
            $updatedCount++;

            // Log the automatic update
            error_log("Auto-updated order {$order['order_number']} from Pending to Confirmed after 30 minutes");

        } catch (PDOException $e) {
            $pdo->rollBack();
            $errors[] = "Failed to update order {$order['order_number']}: " . $e->getMessage();
            error_log("Auto-update error for order {$order['order_number']}: " . $e->getMessage());
        }
    }

    $response = [
        'success' => true,
        'message' => "Auto-updated $updatedCount pending orders to confirmed status",
        'updated_count' => $updatedCount,
        'timestamp' => date('Y-m-d H:i:s'),
        'errors' => $errors
    ];

    // If called via CLI (cron), also output to console
    if (php_sapi_name() === 'cli') {
        echo "Cron Job Result: " . json_encode($response, JSON_PRETTY_PRINT) . "\n";
    }

    echo json_encode($response);

} catch (PDOException $e) {
    $errorResponse = [
        'success' => false,
        'message' => 'Failed to auto-update pending orders: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];

    error_log("auto_update_cron error: " . $e->getMessage());

    // If called via CLI (cron), also output to console
    if (php_sapi_name() === 'cli') {
        echo "Cron Job Error: " . json_encode($errorResponse, JSON_PRETTY_PRINT) . "\n";
    }

    http_response_code(500);
    echo json_encode($errorResponse);
}
?>
