<?php

/***********************
 * USER MANAGEMENT FUNCTIONS
 ***********************/
function createUser($conn) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    return;
  }

  // Parse JSON input
  $input = json_decode(file_get_contents('php://input'), true);
  if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload']);
    return;
  }

  if (!isset($input['action']) || $input['action'] !== 'create_user') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or missing action']);
    return;
  }

  // Sanitize and validate inputs
  $firstname = isset($input['firstname']) ? sanitizeInput($input['firstname']) : null;
  $middlename = isset($input['middlename']) ? sanitizeInput($input['middlename']) : '';
  $lastname = isset($input['lastname']) ? sanitizeInput($input['lastname']) : null;
  $username = isset($input['username']) ? sanitizeInput($input['username']) : null;
  $email = isset($input['email']) ? sanitizeInput($input['email']) : null;
  $role = isset($input['role']) ? sanitizeInput($input['role']) : 'staff';
  $status = isset($input['status']) ? sanitizeInput($input['status']) : 'active';
  $phone = isset($input['phone']) ? sanitizeInput($input['phone']) : null;
  $address = isset($input['address']) ? sanitizeInput($input['address']) : null;
  $city = isset($input['city']) ? sanitizeInput($input['city']) : null;
  $zipcode = isset($input['zipcode']) ? sanitizeInput($input['zipcode']) : null;
  $password = isset($input['password']) ? $input['password'] : null;

  // Create fullname for user table
  $fullname = trim($firstname . ' ' . ($middlename ? $middlename . ' ' : '') . $lastname);

  // Validate required fields
  if (empty($firstname) || empty($lastname) || empty($username) || empty($email) || empty($password) || empty($fullname)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'First name, last name, username, email, and password are required']);
    return;
  }

  if (!isValidEmail($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    return;
  }

  if (!isStrongPassword($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers']);
    return;
  }

  if (!in_array($role, ['staff', 'manager'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid role. Must be staff or manager']);
    return;
  }

  if (!in_array($status, ['active', 'inactive'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid status. Must be active or inactive']);
    return;
  }

  // Check if username or email exists (case-sensitive username check)
  $checkStmt = $conn->prepare("SELECT user_id FROM user WHERE BINARY username = ? OR email = ?");
  $checkStmt->execute([$username, $email]);
  if ($checkStmt->rowCount() > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
    return;
  }

  // Additional check for case-insensitive username (some systems might not support BINARY)
  $checkStmt2 = $conn->prepare("SELECT user_id FROM user WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)");
  $checkStmt2->execute([$username, $email]);
  if ($checkStmt2->rowCount() > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
    return;
  }

  try {
    // Begin transaction
    $conn->beginTransaction();

    // Hash password and generate token
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $token = generateToken();
    $token_expires = date('Y-m-d H:i:s', strtotime('+1 day'));

    // Insert user
    $stmt = $conn->prepare("
      INSERT INTO user (fullname, username, email, password, role, status, token, token_expired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$fullname, $username, $email, $hashed_password, $role, $status, $token, $token_expires]);

    // Get inserted user_id
    $user_id = $conn->lastInsertId();

    // Insert profile
    $profileStmt = $conn->prepare("
      INSERT INTO profile (user_id, firstname, middlename, lastname, phone, address, email, city, zipcode, loyalty_points, loyalty_points_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
    ");
    $profileStmt->execute([$user_id, $firstname, $middlename, $lastname, $phone, $address, $email, $city, $zipcode]);

    // Fetch created user data
    $userStmt = $conn->prepare("
      SELECT u.user_id, u.fullname, u.username, u.email, u.role, u.status, p.firstname, p.middlename, p.lastname, p.phone, p.address, p.city, p.zipcode, p.loyalty_points, p.loyalty_points_used
      FROM user u
      LEFT JOIN profile p ON u.user_id = p.user_id
      WHERE u.user_id = ?
    ");
    $userStmt->execute([$user_id]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);

    $conn->commit();

    http_response_code(201);
    echo json_encode([
      'success' => true,
      'message' => 'User created successfully',
      'data' => $user
    ]);
  } catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    error_log("createUser error: " . $e->getMessage());
  }
}

function fetchUsers($conn) {
  try {
    // Get the current user's role from the token
    $token = getBearerToken() ?? $_SESSION['token'] ?? null;

    if (!$token) {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Not authenticated']);
      return;
    }

    // Get current user's role
    $stmt = $conn->prepare("SELECT role FROM user WHERE token = ? AND token_expired > NOW()");
    $stmt->execute([$token]);
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentUser) {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
      return;
    }

    $currentUserRole = $currentUser['role'];

    // Build query based on current user's role
    $query = "SELECT u.user_id, u.username, u.email, u.role, u.status, p.firstname, p.middlename, p.lastname, p.phone, p.address, p.city, p.zipcode, p.profileicon, p.loyalty_points, p.loyalty_points_used, u.created_at
              FROM user u
              LEFT JOIN profile p ON u.user_id = p.user_id";

    // Filter users based on current user's role
    if ($currentUserRole === 'manager') {
      // Manager can only see staff and customer users
      $query .= " WHERE u.role IN ('staff', 'customer')";
    } elseif ($currentUserRole === 'admin') {
      // Admin can see all users
      $query .= " WHERE u.role IN ('admin', 'staff', 'manager', 'customer')";
    } else {
      // Staff can only see customer users
      $query .= " WHERE u.role = 'customer'";
    }

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'message' => 'Users fetched successfully',
      'data' => $users
    ]);
  } catch (Exception $e) {
    http_response_code(500);
    error_log("fetchUsers error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch users'
    ]);
  }
}

function fetchUserDetails($conn) {
  $userId = $_GET['user_id'] ?? 0;

  try {
    $query = "
      SELECT
        u.user_id,
        u.username,
        u.email,
        p.firstname,
        p.middlename,
        p.lastname,
        p.phone,
        p.address,
        p.city,
        p.zipcode,
        IFNULL(p.profileicon, '') AS profileicon,
        p.loyalty_points,
        p.loyalty_points_used,
        p.created_at
      FROM user u
      LEFT JOIN profile p ON u.user_id = p.user_id
      WHERE u.user_id = ?
    ";
    $stmt = $conn->prepare($query);
    $stmt->execute([$userId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'User not found']);
      return;
    }

    // Return just the filename for profileicon (frontend will use serve_image.php)
    if ($profile['profileicon']) {
      $profile['profileicon'] = basename($profile['profileicon']);
    }

    echo json_encode([
      'success' => true,
      'data' => ['profile' => $profile]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchUserDetails error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}

function fetchUserOrders($conn) {
  $userId = $_GET['user_id'] ?? 0;

  try {
    $query = "SELECT * FROM `order` WHERE user_id = ? ORDER BY created_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->execute([$userId]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'data' => ['orders' => $orders]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchUserOrders error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}

function fetchUserOrderItems($conn) {
  $orderId = $_GET['order_id'] ?? 0;

  try {
    $query = "SELECT oi.*, p.name as product_name
              FROM orderitems oi
              JOIN products p ON oi.product_id = p.product_id
              WHERE oi.order_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'data' => ['items' => $items]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchUserOrderItems error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}

function fetchUserHistory($conn) {
  $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
  $status = isset($_GET['status']) ? trim($_GET['status']) : 'All';

  if (!$user_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    return;
  }

  try {
    $query = "SELECT h.history_id, h.order_id, h.user_id, h.status, h.notes, h.created_at, h.updated_at,
                     o.order_number, o.total_amount, o.status as order_status,
                     o.delivery_firstname as first_name, o.delivery_lastname as last_name, o.delivery_email as email
              FROM orderhistory h
              JOIN `order` o ON h.order_id = o.order_id
              WHERE h.user_id = :user_id";

    $params = [':user_id' => $user_id];

    if ($status !== 'All') {
      if ($status === 'Refund') {
        $query .= " AND o.status IN ('Refund', 'Refunded')";
      } else {
        $query .= " AND o.status = :status";
        $params[':status'] = $status;
      }
    }

    $query .= " ORDER BY h.created_at DESC";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'data' => ['history' => $history]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchUserHistory error for user_id $user_id: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Failed to fetch user history: ' . $e->getMessage()
    ]);
  }
}

function fetchRefunds($conn) {
  $userId = $_GET['user_id'] ?? 0;
  try {
    $query = "SELECT * FROM refunds WHERE user_id = ? ORDER BY created_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->execute([$userId]);
    $refunds = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode([
      'success' => true,
      'data' => ['refunds' => $refunds]
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("fetchRefunds error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}

function updateUserStatus($conn) {
  $data = json_decode(file_get_contents('php://input'), true);
  $userId = $data['user_id'] ?? 0;
  $status = $data['status'] ?? '';

  try {
    $query = "UPDATE user SET status = ? WHERE user_id = ?";
    $stmt = $conn->prepare($query);
    $success = $stmt->execute([$status, $userId]);

    if ($success) {
      echo json_encode(['success' => true, 'message' => 'Status updated successfully']);
    } else {
      echo json_encode(['success' => false, 'message' => 'Failed to update status']);
    }
  } catch (PDOException $e) {
    http_response_code(500);
    error_log("updateUserStatus error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}

function deleteUser($conn) {
  $data = json_decode(file_get_contents('php://input'), true);
  $userId = $data['user_id'] ?? 0;

  try {
    $conn->beginTransaction();

    $query = "DELETE FROM profile WHERE user_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->execute([$userId]);

    $query = "DELETE FROM user WHERE user_id = ?";
    $stmt = $conn->prepare($query);
    $success = $stmt->execute([$userId]);

    if ($success) {
      $conn->commit();
      echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
      $conn->rollBack();
      echo json_encode(['success' => false, 'message' => 'Failed to delete user']);
    }
  } catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    error_log("deleteUser error: " . $e->getMessage());
    echo json_encode([
      'success' => false,
      'message' => 'Database error: ' . $e->getMessage()
    ]);
  }
}



function updateUser($conn) {
  $data = $_POST;
  $userId = $data['user_id'] ?? 0;

  if (!$userId) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'User ID is required']);
      return;
  }

  // Validate email if provided
  if (!empty($data['email'])) {
      if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => 'Invalid email address']);
          return;
      }

      // Check if email already exists for another user
      $checkStmt = $conn->prepare("SELECT user_id FROM user WHERE email = ? AND user_id != ?");
      $checkStmt->execute([$data['email'], $userId]);
      if ($checkStmt->rowCount() > 0) {
          http_response_code(409); // Conflict
          echo json_encode(['success' => false, 'message' => 'Email already in use']);
          return;
      }
  }

  // Validate username if provided
  if (!empty($data['username'])) {
      if (strlen($data['username']) < 3) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters']);
          return;
      }
      $checkStmt = $conn->prepare("SELECT user_id FROM user WHERE username = ? AND user_id != ?");
      $checkStmt->execute([$data['username'], $userId]);
      if ($checkStmt->rowCount() > 0) {
          http_response_code(409); // Conflict
          echo json_encode(['success' => false, 'message' => 'Username already in use']);
          return;
      }
  }

  // Validate required fields
  $requiredFields = ['firstname', 'lastname', 'phone'];
  foreach ($requiredFields as $field) {
      if (empty($data[$field])) {
          http_response_code(400);
          echo json_encode(['success' => false, 'message' => ucfirst($field) . ' is required']);
          return;
      }
  }

  // Validate phone format
  if (!preg_match('/^\+?\d{10,12}$/', $data['phone'])) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid phone number format (10-12 digits)']);
      return;
  }

  // Validate zipcode if provided
  if (!empty($data['zipcode']) && !preg_match('/^\d{4,5}$/', $data['zipcode'])) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid ZIP code format (4-5 digits)']);
      return;
  }

  try {
      $profileIconPath = null;
      if (isset($_FILES['profileicon']) && $_FILES['profileicon']['error'] === UPLOAD_ERR_OK) {
          $file = $_FILES['profileicon'];
          $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
          $maxSize = 2 * 1024 * 1024; // 2MB

          if (!in_array($file['type'], $allowedTypes)) {
              http_response_code(400);
              echo json_encode(['success' => false, 'message' => 'Invalid profile icon file type. Use JPEG, PNG, or GIF']);
              return;
          }
          if ($file['size'] > $maxSize) {
              http_response_code(400);
              echo json_encode(['success' => false, 'message' => 'Profile icon file size exceeds 2MB']);
              return;
          }

          $uploadDir = __DIR__ . '/../Uploads/profile/';
          if (!is_dir($uploadDir)) {
              mkdir($uploadDir, 0755, true);
          }

          $fileName = uniqid() . '-' . basename($file['name']);
          $filePath = $uploadDir . $fileName;

          if (!move_uploaded_file($file['tmp_name'], $filePath)) {
              http_response_code(500);
              echo json_encode(['success' => false, 'message' => 'Failed to upload profile icon']);
              return;
          }

          $profileIconPath = '../Uploads/profile/' . $fileName;
      }

      $conn->beginTransaction();

      // Update user table
      $userFields = [];
      $userParams = [];
      if (!empty($data['username'])) {
          $userFields[] = "username = ?";
          $userParams[] = filter_var($data['username'], FILTER_SANITIZE_STRING);
      }
      if (!empty($data['email'])) {
          $userFields[] = "email = ?";
          $userParams[] = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
      }
      if (!empty($userFields)) {
          $query = "UPDATE user SET " . implode(', ', $userFields) . " WHERE user_id = ?";
          $userParams[] = $userId;
          $stmt = $conn->prepare($query);
          $stmt->execute($userParams);
      }

      // Update or insert profile
      $profileFields = [];
      $profileParams = [];
      $profileColumns = [
          'firstname', 'middlename', 'lastname', 'phone', 'address',
          'email', 'city', 'zipcode', 'profileicon', 'loyalty_points', 'loyalty_points_used'
      ];

      foreach ($profileColumns as $column) {
          if ($column === 'profileicon' && $profileIconPath) {
              $profileFields[] = "profileicon = ?";
              $profileParams[] = $profileIconPath;
          } elseif (isset($data[$column]) && $data[$column] !== '') {
              $profileFields[] = "$column = ?";
              $profileParams[] = filter_var($data[$column], FILTER_SANITIZE_STRING);
          }
      }

      if (!empty($profileFields)) {
          $stmt = $conn->prepare("SELECT COUNT(*) FROM profile WHERE user_id = ?");
          $stmt->execute([$userId]);
          $profileExists = $stmt->fetchColumn();

          if ($profileExists) {
              $query = "UPDATE profile SET " . implode(', ', $profileFields) . " WHERE user_id = ?";
          } else {
              $query = "INSERT INTO profile SET " . implode(', ', $profileFields) . ", user_id = ?";
          }
          $profileParams[] = $userId;
          $stmt = $conn->prepare($query);
          $stmt->execute($profileParams);
      }

      // Fetch updated data
      $stmt = $conn->prepare(
          "SELECT u.user_id, u.username, u.email, p.firstname, p.middlename, p.lastname,
                  p.phone, p.address, p.city, p.zipcode, p.profileicon,
                  p.loyalty_points, p.loyalty_points_used, u.created_at
           FROM user u
           LEFT JOIN profile p ON u.user_id = p.user_id
           WHERE u.user_id = ?"
      );
      $stmt->execute([$userId]);
      $updatedData = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$updatedData) {
          $conn->rollBack();
          http_response_code(404);
          echo json_encode(['success' => false, 'message' => 'User not found after update']);
          return;
      }

      // Process profile icon for frontend
      if (!empty($updatedData['profileicon'])) {
          $updatedData['profileicon'] = basename($updatedData['profileicon']);
      }

      $conn->commit();

      echo json_encode([
          'success' => true,
          'message' => 'Profile updated successfully',
          'data' => $updatedData
      ]);
  } catch (Exception $e) {
      $conn->rollBack();
      http_response_code(500);
      $errorMessage = strpos($e->getMessage(), 'Duplicate entry') !== false
          ? 'Account already exists with this username or email'
          : 'Failed to update profile: ' . $e->getMessage();
      echo json_encode(['success' => false, 'message' => $errorMessage]);
  }
}


function updateUsers($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    // Check if form data is present
    if (empty($_POST) && empty($_FILES)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No data provided']);
        return;
    }

    // Debug logging
    error_log("updateUser - Received POST data: " . json_encode($_POST));
    if (!empty($_FILES)) {
        error_log("updateUser - Received FILES: " . json_encode($_FILES));
    }

    // Extract and sanitize inputs
    $userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
    $firstname = isset($_POST['firstname']) ? sanitizeInput($_POST['firstname']) : null;
    $middlename = isset($_POST['middlename']) ? sanitizeInput($_POST['middlename']) : '';
    $lastname = isset($_POST['lastname']) ? sanitizeInput($_POST['lastname']) : null;
    $username = isset($_POST['username']) ? sanitizeInput($_POST['username']) : null;
    $email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : null;
    $status = isset($_POST['status']) ? sanitizeInput($_POST['status']) : 'active';
    $phone = isset($_POST['phone']) ? sanitizeInput($_POST['phone']) : null;
    $address = isset($_POST['address']) ? sanitizeInput($_POST['address']) : null;
    $zipcode = isset($_POST['zipcode']) ? sanitizeInput($_POST['zipcode']) : null;
    $password = isset($_POST['password']) && !empty($_POST['password']) ? $_POST['password'] : null;

    // Validate required fields
    if (!$userId || empty($firstname) || empty($lastname) || empty($username) || empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID, first name, last name, username, and email are required']);
        return;
    }

    if (!isValidEmail($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        return;
    }

    if ($password && !isStrongPassword($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers']);
        return;
    }

    if (!in_array($status, ['active', 'inactive'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid status. Must be active or inactive']);
        return;
    }

    // Handle profile icon upload
    $profileIcon = null;
    if (isset($_FILES['profileicon']) && $_FILES['profileicon']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['profileicon'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $maxFileSize = 2 * 1024 * 1024; // 2MB

        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid profile icon file type. Use JPEG, PNG, or GIF.']);
            return;
        }

        if ($file['size'] > $maxFileSize) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Profile icon file size must be under 2MB']);
            return;
        }

        $uploadDir = __DIR__ . '/../Uploads/profile/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $uniqueFileName = uniqid('profile_') . '.' . $fileExtension;
        $uploadPath = $uploadDir . $uniqueFileName;

        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to upload profile icon']);
            return;
        }

        $profileIcon = '../Uploads/profile/' . $uniqueFileName;
    }

    // Create fullname
    $fullname = trim($firstname . ' ' . ($middlename ? $middlename . ' ' : '') . $lastname);

    try {
        // Get current user data to check for changes
        $currentUserStmt = $conn->prepare("SELECT email, username FROM user WHERE user_id = ?");
        $currentUserStmt->execute([$userId]);
        $currentUser = $currentUserStmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentUser) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            return;
        }

        // Check for duplicate username or email
        $emailChanged = strtolower($currentUser['email']) !== strtolower($email);
        $usernameChanged = $currentUser['username'] !== $username;

        if ($emailChanged || $usernameChanged) {
            $checkStmt = $conn->prepare("SELECT user_id FROM user WHERE (BINARY username = ? OR email = ?) AND user_id != ?");
            $checkStmt->execute([$username, $email, $userId]);
            if ($checkStmt->rowCount() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
                return;
            }

            $checkStmt2 = $conn->prepare("SELECT user_id FROM user WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND user_id != ?");
            $checkStmt2->execute([$username, $email, $userId]);
            if ($checkStmt2->rowCount() > 0) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
                return;
            }
        }

        $conn->beginTransaction();

        // Update user table
        $userFields = ["fullname = ?", "username = ?", "email = ?", "status = ?"];
        $userParams = [$fullname, $username, $email, $status];

        if ($password) {
            $userFields[] = "password = ?";
            $userParams[] = password_hash($password, PASSWORD_DEFAULT);
        }

        $userQuery = "UPDATE user SET " . implode(', ', $userFields) . " WHERE user_id = ?";
        $userParams[] = $userId;
        $stmt = $conn->prepare($userQuery);
        $stmt->execute($userParams);

        // Check if profile exists
        $profileExistsStmt = $conn->prepare("SELECT COUNT(*) FROM profile WHERE user_id = ?");
        $profileExistsStmt->execute([$userId]);
        $profileExists = $profileExistsStmt->fetchColumn() > 0;

        // Update or insert profile
        $profileFields = [
            "firstname = ?",
            "middlename = ?",
            "lastname = ?",
            "email = ?",
            "phone = ?",
            "address = ?",
            "city = ?",
            "zipcode = ?"
        ];
        $profileParams = [
            $firstname,
            $middlename,
            $lastname,
            $email,
            $phone,
            $address,
            $zipcode
        ];

        if ($profileIcon) {
            $profileFields[] = "profileicon = ?";
            $profileParams[] = $profileIcon;
        }

        if ($profileExists) {
            $profileQuery = "UPDATE profile SET " . implode(', ', $profileFields) . " WHERE user_id = ?";
            $profileParams[] = $userId;
            $stmt = $conn->prepare($profileQuery);
            $stmt->execute($profileParams);
        } else {
            $profileFields[] = "user_id = ?";
            $profileParams[] = $userId;
            $profileFields[] = "loyalty_points = ?";
            $profileParams[] = 0;
            $profileFields[] = "loyalty_points_used = ?";
            $profileParams[] = 0;
            $profileFields[] = "created_at = NOW()";
            $profileQuery = "INSERT INTO profile SET " . implode(', ', $profileFields);
            $stmt = $conn->prepare($profileQuery);
            $stmt->execute($profileParams);
        }

        // Fetch updated user data
        $selectStmt = $conn->prepare("
            SELECT
                u.user_id,
                u.fullname,
                u.username,
                u.email,
                u.role,
                u.status,
                p.firstname,
                p.middlename,
                p.lastname,
                p.phone,
                p.address,
                p.zipcode,
                p.loyalty_points,
                p.loyalty_points_used,
                IFNULL(p.profileicon, '') AS profileicon,
                p.created_at
            FROM user u
            LEFT JOIN profile p ON u.user_id = p.user_id
            WHERE u.user_id = ?
        ");
        $selectStmt->execute([$userId]);
        $updatedUser = $selectStmt->fetch(PDO::FETCH_ASSOC);

        $conn->commit();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => $updatedUser
        ]);
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        error_log("updateUser error: " . $e->getMessage());
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update user: ' . $e->getMessage()]);
        }
    }
}
