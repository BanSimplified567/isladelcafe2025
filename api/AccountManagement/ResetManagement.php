<?php


function resetPassword($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
    $email = isset($data['email']) ? sanitizeInput($data['email']) : null;
    $new_password = isset($data['new_password']) ? $data['new_password'] : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($username) || empty($email) || empty($new_password) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (!isStrongPassword($new_password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT user_id, answer_1, answer_2, answer_3, answer_4, answer_5 FROM user WHERE BINARY username = ? AND email = ? AND role = 'customer' AND status = 'active'");
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

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE user SET password = ? WHERE user_id = ?");
    $updateStmt->execute([$hashed_password, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Password updated successfully',
        'reset_type' => 'password',
        'username' => $username,
        'email' => $email
    ]);
}


function resetUsername($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
    $email = isset($data['email']) ? sanitizeInput($data['email']) : null;
    $new_username = isset($data['new_username']) ? sanitizeInput($data['new_username']) : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($username) || empty($email) || empty($new_username) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (strlen($new_username) < 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters long']);
        exit();
    }

    $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE BINARY username = ?");
    $checkStmt->execute([$new_username]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT user_id, answer_1, answer_2, answer_3, answer_4, answer_5 FROM user WHERE BINARY username = ? AND email = ? AND role = 'customer' AND status = 'active'");
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

    $updateStmt = $pdo->prepare("UPDATE user SET username = ? WHERE user_id = ?");
    $updateStmt->execute([$new_username, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Username updated successfully',
        'reset_type' => 'username',
        'new_username' => $new_username,
        'email' => $email
    ]);
}


function resetUsernameByAnswers($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $new_username = isset($data['new_username']) ? sanitizeInput($data['new_username']) : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($new_username) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (strlen($new_username) < 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters long']);
        exit();
    }

    $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE BINARY username = ?");
    $checkStmt->execute([$new_username]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, email
        FROM user
        WHERE answer_1 = ? AND answer_2 = ? AND answer_3 = ? AND answer_4 = ? AND answer_5 = ?
        AND role = 'customer' AND status = 'active'
    ");
    $stmt->execute([$answers[1], $answers[2], $answers[3], $answers[4], $answers[5]]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No user found with these security answers']);
        exit();
    }

    $updateStmt = $pdo->prepare("UPDATE user SET username = ? WHERE user_id = ?");
    $updateStmt->execute([$new_username, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Username updated successfully',
        'reset_type' => 'username',
        'new_username' => $new_username,
        'email' => $user['email']
    ]);
}

function resetUsernameAdminByAnswers($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $new_username = isset($data['new_username']) ? sanitizeInput($data['new_username']) : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($new_username) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (strlen($new_username) < 3) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters long']);
        exit();
    }

    $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE BINARY username = ?");
    $checkStmt->execute([$new_username]);
    if ($checkStmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, email, role
        FROM user
        WHERE answer_1 = ? AND answer_2 = ? AND answer_3 = ? AND answer_4 = ? AND answer_5 = ?
        AND role IN ('admin', 'staff', 'manager') AND status = 'active'
    ");
    $stmt->execute([$answers[1], $answers[2], $answers[3], $answers[4], $answers[5]]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No admin/staff/manager found with these security answers']);
        exit();
    }

    $updateStmt = $pdo->prepare("UPDATE user SET username = ? WHERE user_id = ?");
    $updateStmt->execute([$new_username, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Username updated successfully',
        'reset_type' => 'username',
        'new_username' => $new_username,
        'email' => $user['email'],
        'role' => $user['role']
    ]);
}

function resetPasswordAdminByAnswers($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $new_password = isset($data['new_password']) ? $data['new_password'] : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($new_password) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (!isStrongPassword($new_password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, username, email, role
        FROM user
        WHERE answer_1 = ? AND answer_2 = ? AND answer_3 = ? AND answer_4 = ? AND answer_5 = ?
        AND role IN ('admin', 'staff', 'manager') AND status = 'active'
    ");
    $stmt->execute([$answers[1], $answers[2], $answers[3], $answers[4], $answers[5]]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No admin/staff/manager found with these security answers']);
        exit();
    }

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE user SET password = ? WHERE user_id = ?");
    $updateStmt->execute([$hashed_password, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Password updated successfully',
        'reset_type' => 'password',
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role']
    ]);
}

function resetPasswordByAnswers($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $new_password = isset($data['new_password']) ? $data['new_password'] : null;
    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (empty($new_password) || in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit();
    }

    if (!isStrongPassword($new_password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, username, email
        FROM user
        WHERE answer_1 = ? AND answer_2 = ? AND answer_3 = ? AND answer_4 = ? AND answer_5 = ?
        AND role = 'customer' AND status = 'active'
    ");
    $stmt->execute([$answers[1], $answers[2], $answers[3], $answers[4], $answers[5]]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No user found with these security answers']);
        exit();
    }

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE user SET password = ? WHERE user_id = ?");
    $updateStmt->execute([$hashed_password, $user['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Password updated successfully',
        'reset_type' => 'password',
        'username' => $user['username'],
        'email' => $user['email']
    ]);
}





?>
