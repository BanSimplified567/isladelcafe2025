<?php
require_once './dbconn.php';

// Get parameters
$image = $_GET['image'] ?? '';
// Remove any absolute path that might be included
$image = basename(str_replace('\\', '/', $image));
$type = $_GET['type'] ?? '';

// Debug logging
error_log("serve_image.php called with image: '$image', type: '$type'");

// Validate parameters
if (empty($image) || empty($type)) {
    http_response_code(400);
    exit('Missing parameters');
}

// Validate image filename for security
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $image)) {
    http_response_code(400);
    exit('Invalid filename');
}

// Set default images
$defaultImages = [
    'profile' => 'bannie.jpg', // Use existing profile image as default
    'product' => 'Isladelcafe.jpg' // Use existing product image as default
];

// Set path based on type
$basePath = __DIR__ . '/uploads/';
switch ($type) {
    case 'profile':
        $path = $basePath . 'profile/' . $image;
        $defaultPath = $basePath . 'profile/' . $defaultImages['profile'];
        break;
    case 'product':
        $path = $basePath . 'products/' . $image;
        $defaultPath = $basePath . 'products/' . $defaultImages['product'];
        break;
    default:
        http_response_code(400);
        exit('Invalid type');
}

// Check if file exists, if not use default image
if (!file_exists($path)) {
    if (file_exists($defaultPath)) {
        $path = $defaultPath;
    } else {
        // If even default image doesn't exist, try Isladelcafe.jpg as final fallback
        $fallbackPath = $basePath . 'products/Isladelcafe.jpg';
        if (file_exists($fallbackPath)) {
            $path = $fallbackPath;
        } else {
            // Debug information
            error_log("Image not found. Paths checked: " . $path . ", " . $defaultPath . ", " . $fallbackPath);
            http_response_code(404);
            exit('Image not found');
        }
    }
}

// Debug logging for final path
error_log("serve_image.php serving file from path: '$path'");

// Get and validate mime type
$mime = mime_content_type($path);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
    http_response_code(400);
    exit('Invalid image type');
}

// Set headers and output file
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=31536000');
readfile($path);
