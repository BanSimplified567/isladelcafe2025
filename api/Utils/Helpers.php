<?php

// ----------------------
// Utility functions
// ----------------------
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function isStrongPassword($password) {
    return strlen($password) >= 12 &&
        preg_match('/[A-Z]/', $password) &&
        preg_match('/[a-z]/', $password) &&
        preg_match('/[0-9]/', $password);
}

function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// ----------------------
// Token retrieval
// ----------------------
function getBearerToken() {
    $headers = function_exists('apache_request_headers') ? apache_request_headers() : [];

    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function getTokenFromCookie() {
    return $_COOKIE['auth_token'] ?? null;
}

function getAuthToken() {
    $token = getBearerToken();
    if (!$token) {
        $token = getTokenFromCookie();
    }
    return $token;
}

// ----------------------
// JWT utilities (HS256)
// ----------------------
if (!defined('JWT_SECRET')) {
    define('JWT_SECRET', ''); // Replace with a secure secret from config
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload, $secret = JWT_SECRET, $alg = 'HS256') {
    $header = ['typ' => 'JWT', 'alg' => $alg];
    $segments = [];
    $segments[] = base64url_encode(json_encode($header));
    $segments[] = base64url_encode(json_encode($payload));
    $signing_input = implode('.', $segments);

    switch ($alg) {
        case 'HS256':
            $signature = hash_hmac('sha256', $signing_input, $secret, true);
            break;
        default:
            throw new Exception('Unsupported JWT alg');
    }

    $segments[] = base64url_encode($signature);
    return implode('.', $segments);
}

function jwt_decode($jwt, $secret = JWT_SECRET, $alg = 'HS256') {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        throw new Exception('Invalid JWT structure');
    }

    list($header64, $payload64, $sig64) = $parts;
    $header = json_decode(base64url_decode($header64), true);
    $payload = json_decode(base64url_decode($payload64), true);
    $signature = base64url_decode($sig64);

    if (!is_array($header) || !isset($header['alg']) || $header['alg'] !== $alg) {
        throw new Exception('Invalid JWT header');
    }

    $signing_input = $header64 . '.' . $payload64;
    $expected = '';
    switch ($alg) {
        case 'HS256':
            $expected = hash_hmac('sha256', $signing_input, $secret, true);
            break;
        default:
            throw new Exception('Unsupported JWT alg');
    }

    if (!hash_equals($expected, $signature)) {
        throw new Exception('Invalid JWT signature');
    }

    if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
        throw new Exception('JWT expired');
    }

    return $payload;
}

function generateJwtForUser($userId, $role, $username, $rememberMe = false, $storeInCookie = false) {
    $issuedAt = time();
    $expiresAt = $rememberMe ? $issuedAt + (30 * 24 * 60 * 60) : $issuedAt + (24 * 60 * 60);
    $payload = [
        'sub'      => (int)$userId,
        'role'     => $role,
        'username' => $username,
        'iat'      => $issuedAt,
        'exp'      => $expiresAt,
    ];
    $jwt = jwt_encode($payload);

    if ($storeInCookie) {
        setcookie("auth_token", $jwt, [
            "expires"  => $expiresAt,
            "path"     => "/",
            "secure"   => true,
            "httponly" => true,
            "samesite" => "Strict"
        ]);
    }

    return [$jwt, date('Y-m-d H:i:s', $expiresAt)];
}
