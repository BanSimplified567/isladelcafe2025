<?php


function getQuestion($conn) {
  try {
    $stmt = $conn->query("SELECT * FROM secretquestion");
    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode($questions);
  } catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(["message" => "Unable to fetch security questions"]);
  }
}

function verifySecurityAnswersAdmin($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All security answers are required']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, fullname, email, username, role, status
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

    echo json_encode([
        'success' => true,
        'message' => 'Security answers verified',
        'user' => [
            'fullname' => $user['fullname'],
            'email' => $user['email'],
            'username' => $user['username'],
            'role' => $user['role']
        ]
    ]);
}

function verifySecurityAnswersOnly($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $answers = [];
    for ($i = 1; $i <= 5; $i++) {
        $answers[$i] = isset($data['answer_' . $i]) ? sanitizeInput($data['answer_' . $i]) : null;
    }

    if (in_array(null, $answers, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All security answers are required']);
        exit();
    }

    $stmt = $pdo->prepare("
        SELECT user_id, fullname, email, username, role, status
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

    echo json_encode([
        'success' => true,
        'message' => 'Security answers verified',
        'user' => [
            'fullname' => $user['fullname'],
            'email' => $user['email'],
            'username' => $user['username']
        ]
    ]);
}

function verifyUser($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $username = isset($data['username']) ? sanitizeInput($data['username']) : null;
    $email = isset($data['email']) ? sanitizeInput($data['email']) : null;

    if (empty($username) || empty($email)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username and email are required']);
        exit();
    }

    $stmt = $pdo->prepare("SELECT user_id FROM user WHERE BINARY username = ? AND email = ? AND role = 'customer' AND status = 'active'");
    $stmt->execute([$username, $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No matching customer found']);
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'User verified']);
}

function verifySecurityAnswers($pdo) {
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

    echo json_encode(['success' => true, 'message' => 'Security answers verified']);
}

?>
