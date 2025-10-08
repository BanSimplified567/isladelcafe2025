<?php
require_once '../dbconn.php';

// Get action from query string or request body
$action = $_GET['action'] ?? null;
if (!$action && in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PATCH', 'DELETE'])) {
  $input = json_decode(file_get_contents('php://input'), true);
  $action = $input['action'] ?? null;
}

switch ($action) {
  case 'add':
    handleAddFeedback();
    break;
  case 'fetch':
    handleFetchFeedback();
    break;
  case 'delete':
    handleDeleteFeedback();
    break;
  case 'update':
    handleUpdateStatus();
    break;
  default:
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action specified']);
    break;
}

function handleAddFeedback() {
  try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
      exit;
    }

    $required = ['name', 'email', 'message'];
    foreach ($required as $field) {
      if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Field $field is required"]);
        exit;
      }
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare(
      "INSERT INTO feedback (name, email, subject, message, status) VALUES (:name, :email, :subject, :message, 'Pending')"
    );

    $stmt->execute([
      ':name' => $input['name'],
      ':email' => $input['email'],
      ':subject' => $input['subject'] ?? null,
      ':message' => $input['message']
    ]);

    echo json_encode([
      'success' => true,
      'message' => 'Feedback submitted successfully',
      'id' => $pdo->lastInsertId()
    ]);

  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Database error: ' . $e->getMessage()
    ]);
    error_log("Database error: " . $e->getMessage());
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Server error: ' . $e->getMessage()
    ]);
    error_log("Server error: " . $e->getMessage());
  }
}

function handleFetchFeedback() {
  try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit;
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM feedback ORDER BY created_at DESC");
    $stmt->execute();
    $feedback = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'data' => $feedback
    ]);

  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Database error: ' . $e->getMessage()
    ]);
    error_log("Database error: " . $e->getMessage());
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Server error: ' . $e->getMessage()
    ]);
    error_log("Server error: " . $e->getMessage());
  }
}

function handleDeleteFeedback() {
  try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $contact_id = $input['contact_id'] ?? $_GET['contact_id'] ?? null;

    if (empty($contact_id)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Contact ID is required']);
      exit;
    }

    $pdo = getConnection();

    $checkStmt = $pdo->prepare("SELECT * FROM feedback WHERE contact_id = :contact_id");
    $checkStmt->execute([':contact_id' => $contact_id]);

    if ($checkStmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Feedback not found']);
      exit;
    }

    // Delete any user associations (if applicable)
    $userStmt = $pdo->prepare("UPDATE feedback SET user_id = NULL WHERE contact_id = :contact_id");
    $userStmt->execute([':contact_id' => $contact_id]);

    $stmt = $pdo->prepare("DELETE FROM feedback WHERE contact_id = :contact_id");
    $stmt->execute([':contact_id' => $contact_id]);

    echo json_encode([
      'success' => true,
      'message' => 'Feedback deleted successfully'
    ]);

  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Database error: ' . $e->getMessage()
    ]);
    error_log("Database error: " . $e->getMessage());
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Server error: ' . $e->getMessage()
    ]);
    error_log("Server error: " . $e->getMessage());
  }
}

function handleUpdateStatus() {
  try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
      http_response_code(405);
      echo json_encode(['success' => false, 'error' => 'Method not allowed']);
      exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
      exit;
    }

    $required = ['contact_id', 'status'];
    foreach ($required as $field) {
      if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Field $field is required"]);
        exit;
      }
    }

    $allowedStatuses = ['Pending', 'Reviewed', 'In Progress', 'Flagged', 'Resolved', 'Ignored', 'Archived'];
    if (!in_array($input['status'], $allowedStatuses)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'error' => 'Invalid status value']);
      exit;
    }

    $pdo = getConnection();

    // Check if feedback exists
    $checkStmt = $pdo->prepare("SELECT * FROM feedback WHERE contact_id = :contact_id");
    $checkStmt->execute([':contact_id' => $input['contact_id']]);

    if ($checkStmt->rowCount() === 0) {
      http_response_code(404);
      echo json_encode(['success' => false, 'error' => 'Feedback not found']);
      exit;
    }

    // Perform the update
    $stmt = $pdo->prepare(
      "UPDATE feedback SET status = :status WHERE contact_id = :contact_id"
    );

    $stmt->execute([
      ':status' => $input['status'],
      ':contact_id' => $input['contact_id']
    ]);

    // Always return success, even if no rows were updated (e.g., same status)
    echo json_encode([
      'success' => true,
      'message' => 'Status updated successfully'
    ]);

  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Database error: ' . $e->getMessage()
    ]);
    error_log("Database error: " . $e->getMessage());
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
      'success' => false,
      'error' => 'Server error: ' . $e->getMessage()
    ]);
    error_log("Server error: " . $e->getMessage());
  }
}
