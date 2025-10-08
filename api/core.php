<?php
require_once './dbconn.php';
require_once './AccountManagement/AccountManagement.php';
require_once './AccountManagement/CredentialsManagement.php';
require_once './AccountManagement/ResetManagement.php';
require_once './OrderManagement/OrderManagement.php';
require_once './ProductManagement/ProductManage.php';
require_once './UserManagement/UserManagement.php';
require_once './Utils/Helpers.php';



// Helper function for standardized JSON responses
function sendResponse($success, $message, $data = [], $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendResponse(true, 'CORS preflight successful', [], 200);
}

// Get PDO connection
$pdo = getConnection();

// Parse input (prefer JSON for POST/PUT, query params for GET)
$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PUT'])) {
    // Check if it's a multipart/form-data request
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;

    if ($isMultipart) {
        // For multipart requests, action comes from POST data or query params
        $action = isset($_POST['action']) ? sanitizeInput($_POST['action']) : null;
        if (!$action) {
            $action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : null;
        }
        $data = $_POST;
    } else {
        // For JSON requests
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            sendResponse(false, 'Invalid JSON input', [], 400);
        }
        $action = isset($data['action']) ? sanitizeInput($data['action']) : null;
    }
} else {
    $action = isset($_GET['action']) ? sanitizeInput($_GET['action']) : null;
}

if (empty($action)) {
    sendResponse(false, 'Action parameter is required', [], 400);
}

// Validate function existence
$actionMap = [
    // Authentication Actions
    'check-auth' => 'checkAuth',
    'login' => 'login',
    'logout' => 'logout',
    'register' => 'registerUser',
    'forgot_password' => 'forgotPassword',
    'reset_password' => 'resetPassword',


    // Account Management Actions
    'reset_username' => 'resetUsername',
    'reset_username_by_answers' => 'resetUsernameByAnswers',
    'reset_username_admin_by_answers' => 'resetUsernameAdminByAnswers',
    'reset_password_admin_by_answers' => 'resetPasswordAdminByAnswers',
    'reset_password_by_answers' => 'resetPasswordByAnswers',
    'auto_update_pending_orders' => 'autoUpdatePendingOrders',


    // Security Actions
    'verify_security_answers_admin' => 'verifySecurityAnswersAdmin',
    'verify_security_answers_only' => 'verifySecurityAnswersOnly',
    'verify_user' => 'verifyUser',
    'verify_security_answers' => 'verifySecurityAnswers',


    // User Management Actions
    'create_user' => 'createUser',
    'fetch_questions' => 'getQuestion',
    'get_questions' => 'getQuestion',
    'fetch_users' => 'fetchUsers',
    'fetch_user_details' => 'fetchUserDetails',
    'fetch_user_orders' => 'fetchUserOrders',
    'fetch_user_order_items' => 'fetchUserOrderItems',
    'fetch_user_history' => 'fetchUserHistory',
    'fetch_refunds' => 'fetchRefunds',
    'update_status' => 'updateUserStatus',
    'delete_user' => 'deleteUser',
    'update_user' => 'updateUser',
    'updated_users' => 'updatedUsers',


    // Order Management Actions
    'order_fetch' => 'fetchOrders',
    'order_history' => 'fetchOrderHistory',
    'order_items' => 'getOrderItems',
    'order_update_status' => 'updateOrderStatus',
    'get_status_history' => 'getStatusHistory',
    'order_create' => 'createOrder',
    'order_delete' => 'deleteOrder',


    // Product Management Actions
    'product_create' => 'createProduct',
    'product_update' => 'updateProduct',
    'product_delete' => 'deleteProduct',
    'product_get' => 'getProduct',
    'product_get_all' => 'getAllProducts',
    'products_get' => 'getProducts',


];

if (!isset($actionMap[$action]) || !function_exists($actionMap[$action])) {
    sendResponse(false, "Invalid or unsupported action: $action", [], 400);
}

try {
    // Call the mapped function
    $actionMap[$action]($pdo);
} catch (PDOException $e) {
    sendResponse(false, 'Database error: ' . $e->getMessage(), [], 500);
} catch (InvalidArgumentException $e) {
    sendResponse(false, $e->getMessage(), [], 400);
} catch (Exception $e) {
    sendResponse(false, 'Server error: ' . $e->getMessage(), [], 500);
}







