<?php

namespace App;

require_once __DIR__ . '/public/index.php';
require_once __DIR__ . '/vendor/autoload.php';
use Dotenv\Dotenv;

// -----------------------------
// Load environment
// -----------------------------
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

date_default_timezone_set($_ENV['TIMEZONE'] ?? 'Asia/Manila');

$appEnv = $_ENV['APP_ENV'] ?? 'production';
$appDebug = $_ENV['APP_DEBUG'] ?? 'false';
if ($appEnv === 'local' && $appDebug === 'true') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// -----------------------------
// Start session
// -----------------------------
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// -----------------------------
// ✅ CORS Headers
// -----------------------------
$allowedOrigins = [
    $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS preflight early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// -----------------------------
// Security headers
// -----------------------------
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");

// -----------------------------
// Firebase / OAuth2 headers
// -----------------------------
header("Cross-Origin-Opener-Policy: unsafe-none");
header("Cross-Origin-Embedder-Policy: unsafe-none");
