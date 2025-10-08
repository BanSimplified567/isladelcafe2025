<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Auth\FirebaseAuth;
use App\Controller\AuthController;
use App\Controller\AccountController;
use App\Controller\UserController;
use App\Controller\OrderController;
use App\Controller\ProductController;
use App\Database\Database;
use App\Utils\Helpers;
use App\Model\UserModel;

// Initialize PDO
$pdo = (new Database())->getConnection();

// Parse input
$method = $_SERVER['REQUEST_METHOD'];
$action = null;
$data = [];

if (in_array($method, ['POST', 'PUT'])) {
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
    if ($isMultipart) {
        $action = isset($_POST['action']) ? Helpers::sanitizeInput($_POST['action']) : null;
        if (!$action) {
            $action = isset($_GET['action']) ? Helpers::sanitizeInput($_GET['action']) : null;
        }
        $data = $_POST;
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            Helpers::sendResponse(false, 'Invalid JSON input', [], 400);
        }
        $action = isset($input['action']) ? Helpers::sanitizeInput($input['action']) : null;
        $data = $input;
    }
} else {
    $action = isset($_GET['action']) ? Helpers::sanitizeInput($_GET['action']) : null;
    $data = $_GET;
}

if (empty($action)) {
    Helpers::sendResponse(false, 'Action parameter is required', [], 400);
}
// Action to controller mapping
$actionMap = [
    // Authentication Actions
    'check-auth' => [AuthController::class, 'checkAuth'],
    'login' => [AuthController::class, 'login'],
    'logout' => [AuthController::class, 'logout'],
    'register' => [AuthController::class, 'registerUser'],
    'forgot_password' => [AuthController::class, 'forgotPassword'],
    'reset_password' => [AuthController::class, 'resetPassword'],
    // Account Management Actions
    'reset_username' => [AccountController::class, 'resetUsername'],
    'reset_username_by_answers' => [AccountController::class, 'resetUsernameByAnswers'],
    'reset_username_admin_by_answers' => [AccountController::class, 'resetUsernameAdminByAnswers'],
    'reset_password_admin_by_answers' => [AccountController::class, 'resetPasswordAdminByAnswers'],
    'reset_password_by_answers' => [AccountController::class, 'resetPasswordByAnswers'],
    'auto_update_pending_orders' => [AccountController::class, 'autoUpdatePendingOrders'],
    'verify_security_answers_admin' => [AccountController::class, 'verifySecurityAnswersAdmin'],
    'verify_security_answers_only' => [AccountController::class, 'verifySecurityAnswersOnly'],
    'verify_user' => [AccountController::class, 'verifyUser'],
    'verify_security_answers' => [AccountController::class, 'verifySecurityAnswers'],
    // User Management Actions
    'create_user' => [UserController::class, 'createUser'],
    'fetch_questions' => [UserController::class, 'getQuestion'],
    'get_questions' => [UserController::class, 'getQuestion'],
    'fetch_users' => [UserController::class, 'fetchUsers'],
    'fetch_user_details' => [UserController::class, 'fetchUserDetails'],
    'fetch_user_orders' => [UserController::class, 'fetchUserOrders'],
    'fetch_user_order_items' => [UserController::class, 'fetchUserOrderItems'],
    'fetch_user_history' => [UserController::class, 'fetchUserHistory'],
    'fetch_refunds' => [UserController::class, 'fetchRefunds'],
    'update_status' => [UserController::class, 'updateUserStatus'],
    'delete_user' => [UserController::class, 'deleteUser'],
    'update_user' => [UserController::class, 'updateUser'],
    'updated_users' => [UserController::class, 'updatedUsers'],
    // Order Management Actions
    'order_fetch' => [OrderController::class, 'fetchOrders'],
    'order_history' => [OrderController::class, 'fetchOrderHistory'],
    'order_items' => [OrderController::class, 'getOrderItems'],
    'order_update_status' => [OrderController::class, 'updateOrderStatus'],
    'get_status_history' => [OrderController::class, 'getStatusHistory'],
    'order_create' => [OrderController::class, 'createOrder'],
    'order_delete' => [OrderController::class, 'deleteOrder'],
    // Product Management Actions
    'product_create' => [ProductController::class, 'createProduct'],
    'product_update' => [ProductController::class, 'updateProduct'],
    'product_delete' => [ProductController::class, 'deleteProduct'],
    'product_get' => [ProductController::class, 'getProduct'],
    'product_get_all' => [ProductController::class, 'getAllProducts'],
    'products_get' => [ProductController::class, 'getProducts'],
];

// Validate action
if (!isset($actionMap[$action])) {
    Helpers::sendResponse(false, "Invalid or unsupported action: $action", [], 400);
}

// Protected actions requiring Firebase authentication
$protectedActions = [
    'check-auth', 'logout', 'reset_username', 'reset_username_by_answers',
    'reset_username_admin_by_answers', 'reset_password_admin_by_answers',
    'reset_password_by_answers', 'auto_update_pending_orders',
    'verify_security_answers_admin', 'verify_security_answers_only',
    'verify_user', 'verify_security_answers', 'create_user',
    'fetch_users', 'fetch_user_details', 'fetch_user_orders',
    'fetch_user_order_items', 'fetch_user_history', 'fetch_refunds',
    'update_status', 'delete_user', 'update_user', 'updated_users',
    'order_fetch', 'order_history', 'order_items', 'order_update_status',
    'get_status_history', 'order_create', 'order_delete'
];
try {
    if (in_array($action, $protectedActions)) {
        $auth = new FirebaseAuth();
        $claims = $auth->verifyIdToken();
        $user = (new UserModel($pdo))->getByFirebaseUid($claims['sub']);
        if (!$user || $user['status'] === 'inactive') {
            Helpers::sendResponse(false, 'Unauthorized or inactive user', [], 401);
        }
        // Optionally verify local JWT (HS256) if used
        $localToken = Helpers::getAuthToken();
        if ($localToken) {
            try {
                $payload = Helpers::jwtDecode($localToken);
                // Validate payload if needed
            } catch (Exception $e) {
                // Ignore invalid local token; rely on Firebase
            }
        }
        $_SESSION['user'] = $user;
    }

    // Instantiate controller and call method
    [$controllerClass, $methodName] = $actionMap[$action];
    $controller = new $controllerClass($pdo);
    $controller->$methodName($data);
} catch (Exception $e) {
    Helpers::sendResponse(false, 'Server error: ' . $e->getMessage(), [], $e->getCode() ?: 500);
}
?>
