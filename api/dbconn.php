<?php
session_start();
// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Credentials: true");

// Set security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Database connection parameters
$host = 'localhost'; // Your database host (usually localhost)
$dbname = 'isladelcoffee'; // The name of your database
$username = 'root'; // Database username
$password = ''; // Database password

// For OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header("HTTP/1.1 200 OK");
  exit;
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}


try {
  // Create a new PDO instance
  $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);

  // Set the PDO error mode to exception
  $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
  error_log("Connection failed: " . $e->getMessage());
  die("Connection failed. Please try again later.");
}

// Function to get database connection
function getConnection() {
  global $conn;
  return $conn;
}
