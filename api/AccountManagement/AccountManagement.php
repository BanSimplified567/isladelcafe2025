<?php
// ----------------------
// Authentication functions
// ----------------------
function checkAuth($pdo) {
  if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
      http_response_code(405);
      echo json_encode(['success' => false, 'message' => 'Method not allowed']);
      exit();
  }

  $token = getAuthToken() ?? $_SESSION['token'] ?? null;

  if (!$token) {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Not authenticated']);
      exit();
  }

  try {
      $payload = jwt_decode($token);
  } catch (Exception $e) {
      session_unset();
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
      exit();
  }

  $userId = isset($payload['sub']) ? (int)$payload['sub'] : 0;
  if ($userId <= 0) {
      session_unset();
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Invalid token subject']);
      exit();
  }

  // Ensure token not revoked and still valid per DB
  $stmt = $pdo->prepare("
      SELECT user_id, email, username, role, token_expired
      FROM user
      WHERE user_id = ? AND token = ? AND token_expired > NOW()
  ");
  $stmt->execute([$userId, $token]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
      session_unset();
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Session expired']);
      exit();
  }

  $stmt = $pdo->prepare("
      SELECT
          u.user_id,
          u.email,
          u.username,
          u.role,
          p.profile_id,
          p.firstname,
          p.middlename,
          p.lastname,
          CONCAT(p.firstname, ' ', p.lastname) as fullname,
          p.phone,
          p.address,
          p.city,
          p.zipcode,
          p.profileicon,
          p.loyalty_points,
          p.created_at
      FROM user u
      LEFT JOIN profile p ON u.user_id = p.user_id
      WHERE u.user_id = ?
  ");
  $stmt->execute([$user['user_id']]);
  $userData = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$userData) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'User data not found']);
      exit();
  }

  // Update session (optional, can be removed for stateless JWT)
  $_SESSION['user_id'] = $userData['user_id'];
  $_SESSION['username'] = $userData['username'];
  $_SESSION['role'] = $userData['role'];
  $_SESSION['token'] = $token;

  echo json_encode([
      'success' => true,
      'user' => [
          'user_id' => $userData['user_id'],
          'email' => $userData['email'],
          'username' => $userData['username'],
          'role' => $userData['role'],
          'firstname' => $userData['firstname'] ?? '',
          'middlename' => $userData['middlename'] ?? '',
          'lastname' => $userData['lastname'] ?? '',
          'fullname' => $userData['fullname'] ?? '',
          'phone' => $userData['phone'] ?? '',
          'address' => $userData['address'] ?? '',
          'city' => $userData['city'] ?? '',
          'zipcode' => $userData['zipcode'] ?? '',
          'profileicon' => $userData['profileicon'] ?? '',
          'loyalty_points' => $userData['loyalty_points'] ?? 0,
          'created_at' => $userData['created_at'] ?? ''
      ],
      'token' => $token // Include the validated token
  ]);
}

function login($pdo) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'message' => 'Method not allowed']);
      exit();
  }

  $data = json_decode(file_get_contents('php://input'), true);

  if (!$data) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid input']);
      exit();
  }

  $username = sanitizeInput($data['username']);
  $password = $data['password'];
  $remember_me = isset($data['remember_me']) ? filter_var($data['remember_me'], FILTER_VALIDATE_BOOLEAN) : false;

  if (empty($username) || empty($password)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Username and password are required']);
      exit();
  }

  $stmt = $pdo->prepare("
      SELECT user_id, email, username, password, role, fullname, failed_attempts, blocked_at, status
      FROM user
      WHERE BINARY username = ? AND role IN ('customer', 'admin', 'manager', 'staff')
  ");
  $stmt->execute([$username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
      exit();
  }

  if ($user['status'] !== 'active') {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'This account has been deactivated']);
      exit();
  }

  if ($user['blocked_at'] !== null) {
      date_default_timezone_set('Asia/Manila');
      $blockTime = strtotime($user['blocked_at']);
      $currentTime = time();
      $timeDiff = $currentTime - $blockTime;

      if ($timeDiff < 300) {
          $remainingTime = 300 - $timeDiff;
          $minutes = floor($remainingTime / 60);
          $seconds = $remainingTime % 60;
          http_response_code(403);
          echo json_encode([
              'success' => false,
              'message' => sprintf('Account is temporarily blocked. Try again in %d minute(s) and %d second(s).', $minutes, $seconds)
          ]);
          exit();
      } else {
          try {
              $pdo->beginTransaction();
              $stmt = $pdo->prepare("UPDATE user SET blocked_at = NULL, failed_attempts = 0 WHERE user_id = ?");
              $success = $stmt->execute([$user['user_id']]);
              if (!$success) {
                  error_log("Failed to unblock user ID: {$user['user_id']}, Rows affected: {$stmt->rowCount()}");
                  throw new PDOException("Failed to update user");
              }
              $pdo->commit();

              $stmt = $pdo->prepare("
                  SELECT user_id, email, username, password, role, fullname, failed_attempts, blocked_at, status
                  FROM user
                  WHERE user_id = ?
              ");
              $stmt->execute([$user['user_id']]);
              $user = $stmt->fetch(PDO::FETCH_ASSOC);

              if ($user['blocked_at'] !== null) {
                  error_log("User ID: {$user['user_id']} still blocked after update attempt");
                  http_response_code(500);
                  echo json_encode(['success' => false, 'message' => 'Failed to unblock account']);
                  exit();
              }
          } catch (PDOException $e) {
              $pdo->rollBack();
              error_log("Database error for user ID: {$user['user_id']}: " . $e->getMessage());
              http_response_code(500);
              echo json_encode(['success' => false, 'message' => 'Internal server error']);
              exit();
          }
      }
  }

  if (password_verify($password, $user['password'])) {
      if ($user['failed_attempts'] > 0) {
          $stmt = $pdo->prepare("UPDATE user SET failed_attempts = 0, blocked_at = NULL WHERE user_id = ?");
          $stmt->execute([$user['user_id']]);
      }

      list($token, $token_expires) = generateJwtForUser($user['user_id'], $user['role'], $user['username'], $remember_me, true);

      $stmt = $pdo->prepare("UPDATE user SET token = ?, token_expired = ? WHERE user_id = ?");
      $stmt->execute([$token, $token_expires, $user['user_id']]);

      $_SESSION['user_id'] = $user['user_id'];
      $_SESSION['username'] = $user['username'];
      $_SESSION['role'] = $user['role'];
      $_SESSION['token'] = $token;

      $redirectUrl = ($user['role'] === 'customer') ? '/index' : '/dashboard';

      echo json_encode([
          'success' => true,
          'message' => 'Login successful',
          'user' => [
              'user_id' => $user['user_id'],
              'email' => $user['email'],
              'username' => $user['username'],
              'role' => $user['role'],
              'fullname' => $user['fullname']
          ],
          'token' => $token,
          'redirectTo' => $redirectUrl
      ]);
  } else {
      $newFailedAttempts = $user['failed_attempts'] + 1;

      if ($newFailedAttempts >= 5) {
          $stmt = $pdo->prepare("UPDATE user SET failed_attempts = ?, blocked_at = CURRENT_TIMESTAMP WHERE user_id = ?");
          $stmt->execute([$newFailedAttempts, $user['user_id']]);

          http_response_code(401);
          echo json_encode([
              'success' => false,
              'message' => 'Account has been temporarily blocked due to too many failed attempts. Please try again in 5 minutes.'
          ]);
      } else {
          $stmt = $pdo->prepare("UPDATE user SET failed_attempts = ? WHERE user_id = ?");
          $stmt->execute([$newFailedAttempts, $user['user_id']]);

          $remainingAttempts = 5 - $newFailedAttempts;
          http_response_code(401);
          echo json_encode([
              'success' => false,
              'message' => "Invalid password. You have {$remainingAttempts} attempts remaining before your account is temporarily blocked."
          ]);
      }
  }
}

function logout($pdo) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'message' => 'Method not allowed']);
      exit();
  }

  $user_id = $_SESSION['user_id'] ?? null;
  $token = getAuthToken() ?? ($_SESSION['token'] ?? null);

  if ($token) {
      try {
          $payload = jwt_decode($token);
          $user_id = (int)($payload['sub'] ?? 0) ?: $user_id;
      } catch (Exception $e) {
          $stmt = $pdo->prepare("SELECT user_id FROM user WHERE token = ?");
          $stmt->execute([$token]);
          $result = $stmt->fetch(PDO::FETCH_ASSOC);
          if ($result) {
              $user_id = (int)$result['user_id'];
          }
      }
  }

  if ($user_id) {
      $stmt = $pdo->prepare("UPDATE user SET token = NULL, token_expired = NULL WHERE user_id = ?");
      $stmt->execute([$user_id]);
  }

  if (isset($_COOKIE['auth_token'])) {
      setcookie("auth_token", "", time() - 3600, "/", "", true, true);
  }

  session_unset();
  session_destroy();

  echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}


function registerUser($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit();
    }

    $fullname = isset($data['fullname']) ? sanitizeInput($data['fullname']) : null;
    $email = isset($data['email']) ? sanitizeInput($data['email']) : null;
    $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
    $password = isset($data['password']) ? $data['password'] : null;
    $role = isset($data['role']) ? sanitizeInput($data['role']) : 'customer';
    $security_id_1 = isset($data['security_id_1']) ? (int) $data['security_id_1'] : null;
    $answer_1 = isset($data['answer_1']) ? sanitizeInput($data['answer_1']) : null;
    $security_id_2 = isset($data['security_id_2']) ? (int) $data['security_id_2'] : null;
    $answer_2 = isset($data['answer_2']) ? sanitizeInput($data['answer_2']) : null;
    $security_id_3 = isset($data['security_id_3']) ? (int) $data['security_id_3'] : null;
    $answer_3 = isset($data['answer_3']) ? sanitizeInput($data['answer_3']) : null;
    $security_id_4 = isset($data['security_id_4']) ? (int) $data['security_id_4'] : null;
    $answer_4 = isset($data['answer_4']) ? sanitizeInput($data['answer_4']) : null;
    $security_id_5 = isset($data['security_id_5']) ? (int) $data['security_id_5'] : null;
    $answer_5 = isset($data['answer_5']) ? sanitizeInput($data['answer_5']) : null;

    if (empty($fullname) || empty($email) || empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Full name, email, username, and password are required']);
        exit();
    }

    if (!isValidEmail($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        exit();
    }

    if (!isStrongPassword($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 12 characters long and contain uppercase, lowercase, and numbers']);
        exit();
    }

    if (!in_array($role, ['admin', 'staff', 'manager', 'customer'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid role']);
        exit();
    }

    if (
        empty($security_id_1) || empty($answer_1) ||
        empty($security_id_2) || empty($answer_2) ||
        empty($security_id_3) || empty($answer_3) ||
        empty($security_id_4) || empty($answer_4) ||
        empty($security_id_5) || empty($answer_5)
    ) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All security questions and answers are required']);
        exit();
    }

    $question_ids = [$security_id_1, $security_id_2, $security_id_3, $security_id_4, $security_id_5];
    $expected_ids = [1, 2, 3, 4, 5];
    if ($question_ids !== $expected_ids) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Security question IDs must be 1 through 5 in order']);
        exit();
    }

    try {
        $duplicateAnswersStmt = $pdo->prepare("SELECT user_id FROM user WHERE answer_1 = ? AND answer_2 = ? AND answer_3 = ? AND answer_4 = ? AND answer_5 = ?");
        $duplicateAnswersStmt->execute([$answer_1, $answer_2, $answer_3, $answer_4, $answer_5]);
        if ($duplicateAnswersStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'A user with these security answers already exists']);
            exit();
        }

        $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE BINARY username = ? OR email = ?");
        $checkStmt->execute([$username, $email]);
        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
            exit();
        }

        $pdo->beginTransaction();

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO user (
                fullname, email, username, password, role, status,
                security_id_1, answer_1, security_id_2, answer_2,
                security_id_3, answer_3, security_id_4, answer_4,
                security_id_5, answer_5, token, token_expired
            ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
        ");
        $stmt->execute([
            $fullname,
            $email,
            $username,
            $hashed_password,
            $role,
            $security_id_1,
            $answer_1,
            $security_id_2,
            $answer_2,
            $security_id_3,
            $answer_3,
            $security_id_4,
            $answer_4,
            $security_id_5,
            $answer_5
        ]);

        $user_id = $pdo->lastInsertId();

        // Generate JWT after user_id is available
        list($jwtToken, $jwtExp) = generateJwtForUser($user_id, $role, $username, false, true);

        // Update user with JWT token and expiration
        $updateStmt = $pdo->prepare("UPDATE user SET token = ?, token_expired = ? WHERE user_id = ?");
        $updateStmt->execute([$jwtToken, $jwtExp, $user_id]);

        $profileStmt = $pdo->prepare("
            INSERT INTO profile (user_id, email, loyalty_points, profileicon, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $profileStmt->execute([$user_id, $email, $role === 'customer' ? 0 : null, '']);

        $userStmt = $pdo->prepare("
            SELECT u.user_id, u.fullname, u.email, u.username, u.role, COALESCE(p.loyalty_points, 0) as loyalty_points
            FROM user u
            LEFT JOIN profile p ON u.user_id = p.user_id
            WHERE u.user_id = ?
        ");
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new Exception('Failed to retrieve user data');
        }

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful',
            'redirectTo' => '/loginadmin',
            'user' => [
                'user_id' => $user['user_id'],
                'fullname' => $user['fullname'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'],
                'loyalty_points' => $user['loyalty_points']
            ],
            'token' => $jwtToken
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Registration error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Internal server error']);
        exit();
    }
}

function forgotPassword($pdo) {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
      http_response_code(405);
      echo json_encode(['success' => false, 'message' => 'Method not allowed']);
      exit();
  }

  $data = json_decode(file_get_contents('php://input'), true);

  $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
  $email = isset($data['email']) ? sanitizeInput($data['email']) : null;
  $answers = [];
  for ($i = 1; $i <= 5; $i++) {
      $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
  }

  if (empty($username) || empty($email) || in_array(null, $answers, true)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'All fields are required']);
      exit();
  }

  if (!isValidEmail($email)) {
      http_response_code(400);
      echo json_encode(['success' => false, 'message' => 'Invalid email address']);
      exit();
  }

  $stmt = $pdo->prepare("
      SELECT user_id, fullname, email, username, password, role, status,
             security_id_1, answer_1, security_id_2, answer_2,
             security_id_3, answer_3, security_id_4, answer_4,
             security_id_5, answer_5
      FROM user
      WHERE BINARY username = ? AND email = ? AND role = 'customer' AND status = 'active'
  ");
  $stmt->execute([$username, $email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'No matching customer found']);
      exit();
  }

  $allCorrect =
      $user['answer_1'] === $answers[1] &&
      $user['answer_2'] === $answers[2] &&
      $user['answer_3'] === $answers[3] &&
      $user['answer_4'] === $answers[4] &&
      $user['answer_5'] === $answers[5];

  if (!$allCorrect) {
      http_response_code(401);
      echo json_encode(['success' => false, 'message' => 'Security answers do not match']);
      exit();
  }

  $passwordToReturn = $user['password'];
  if (password_get_info($passwordToReturn)['algo'] !== 0) {
      $passwordToReturn = '********';
  }

  echo json_encode([
      'success' => true,
      'user' => [
          'fullname' => $user['fullname'],
          'email' => $user['email'],
          'username' => $user['username'],
          'password' => $passwordToReturn
      ]
  ]);
}



function updatedUsers($conn) {
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

  // Debug logging
  error_log("updatedUsers - Received data: " . json_encode($data));

  $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
  if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    return;
  }

  // Sanitize and validate inputs
  $firstname = isset($data['firstname']) ? sanitizeInput($data['firstname']) : null;
  $middlename = isset($data['middlename']) ? sanitizeInput($data['middlename']) : '';
  $lastname = isset($data['lastname']) ? sanitizeInput($data['lastname']) : null;
  $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
  $email = isset($data['email']) ? sanitizeInput($data['email']) : null;
  $status = isset($data['status']) ? sanitizeInput($data['status']) : 'active';
  $phone = isset($data['phone']) ? sanitizeInput($data['phone']) : null;
  $address = isset($data['address']) ? sanitizeInput($data['address']) : null;
  $city = isset($data['city']) ? sanitizeInput($data['city']) : null;
  $zipcode = isset($data['zipcode']) ? sanitizeInput($data['zipcode']) : null;
  $password = isset($data['password']) && !empty($data['password']) ? $data['password'] : null;

  // Create fullname for user table
  $fullname = trim($firstname . ' ' . ($middlename ? $middlename . ' ' : '') . $lastname);

  // Validate required fields
  if (empty($firstname) || empty($lastname) || empty($username) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'First name, last name, username, and email are required']);
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

  try {
    // First, get the current user data to check for changes
    $currentUserStmt = $conn->prepare("SELECT email, username FROM user WHERE user_id = ?");
    $currentUserStmt->execute([$userId]);
    $currentUser = $currentUserStmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentUser) {
      http_response_code(404);
      echo json_encode(['success' => false, 'message' => 'User not found']);
      return;
    }

    // Only check for duplicates if email or username has changed
    $emailChanged = strtolower($currentUser['email']) !== strtolower($email);
    $usernameChanged = $currentUser['username'] !== $username;

    error_log("updatedUsers - Email changed: " . ($emailChanged ? 'true' : 'false') . ", Username changed: " . ($usernameChanged ? 'true' : 'false'));
    error_log("updatedUsers - Current email: " . $currentUser['email'] . ", New email: " . $email);

    if ($emailChanged || $usernameChanged) {
      // Check if username or email exists for other users (case-sensitive username check)
      $checkStmt = $conn->prepare("SELECT user_id FROM user WHERE (BINARY username = ? OR email = ?) AND user_id != ?");
      $checkStmt->execute([$username, $email, $userId]);
      if ($checkStmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
        return;
      }

      // Additional check for case-insensitive username (some systems might not support BINARY)
      $checkStmt2 = $conn->prepare("SELECT user_id FROM user WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND user_id != ?");
      $checkStmt2->execute([$username, $email, $userId]);
      if ($checkStmt2->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
        return;
      }
    }

    $conn->beginTransaction();

    // Update user table
    $userFields = [];
    $userParams = [];
    $userFields[] = "fullname = ?";
    $userParams[] = $fullname;
    $userFields[] = "username = ?";
    $userParams[] = $username;
    $userFields[] = "email = ?";
    $userParams[] = $email;
    $userFields[] = "status = ?";
    $userParams[] = $status;

    if ($password) {
      $hashed_password = password_hash($password, PASSWORD_DEFAULT);
      $userFields[] = "password = ?";
      $userParams[] = $hashed_password;
    }

    $userQuery = "UPDATE user SET " . implode(', ', $userFields) . " WHERE user_id = ?";
    $userParams[] = $userId;
    $stmt = $conn->prepare($userQuery);
    $stmt->execute($userParams);

    // Check if profile exists, if not create it
    $profileExistsStmt = $conn->prepare("SELECT COUNT(*) FROM profile WHERE user_id = ?");
    $profileExistsStmt->execute([$userId]);
    $profileExists = $profileExistsStmt->fetchColumn() > 0;

    if ($profileExists) {
      // Update existing profile
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
        $city,
        $zipcode,
        $userId
      ];

      $profileQuery = "UPDATE profile SET " . implode(', ', $profileFields) . " WHERE user_id = ?";
      $profileStmt = $conn->prepare($profileQuery);
      $profileStmt->execute($profileParams);
    } else {
      // Create new profile
      $profileInsertStmt = $conn->prepare("
        INSERT INTO profile (user_id, firstname, middlename, lastname, email, phone, address, city, zipcode, loyalty_points, loyalty_points_used, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
      ");
      $profileInsertStmt->execute([
        $userId, $firstname, $middlename, $lastname, $email, $phone, $address, $city, $zipcode
      ]);
    }

    // Fetch updated user data for response
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
        p.city,
        p.zipcode,
        p.loyalty_points,
        p.loyalty_points_used,
        p.profileicon,
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
    error_log("updatedUsers error: " . $e->getMessage());

    // Check for specific database errors
    if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
      echo json_encode(['success' => false, 'message' => 'Account already exists with this username or email']);
    } else {
      echo json_encode(['success' => false, 'message' => 'Failed to update user: ' . $e->getMessage()]);
    }
  }
}
