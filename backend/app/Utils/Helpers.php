<?php

namespace App\Utils;

use Exception;

class Helpers {
    /**
     * Send standardized JSON response
     */
    public static function sendResponse(bool $success, string $message, array $data = [], int $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
        exit;
    }

    /**
     * Sanitize input to prevent XSS/SQL injection
     */
    public static function sanitizeInput(?string $input): ?string {
        if ($input === null) {
            return null;
        }
        $input = trim($input);
        $input = stripslashes($input);
        return htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    }

    /**
     * Generate a random token
     */
    public static function generateToken(int $length = 32): string {
        return bin2hex(random_bytes($length));
    }

    /**
     * Validate email format
     */
    public static function isValidEmail(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Validate password strength (min 12 chars, with uppercase, lowercase, and number)
     */
    public static function isStrongPassword(string $password): bool {
        return strlen($password) >= 12 &&
            preg_match('/[A-Z]/', $password) &&
            preg_match('/[a-z]/', $password) &&
            preg_match('/[0-9]/', $password);
    }

    /**
     * Get Bearer token from Authorization header
     */
    public static function getBearerToken(): ?string {
        $headers = function_exists('apache_request_headers') ? apache_request_headers() : [];
        $authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Get token from cookie
     */
    public static function getTokenFromCookie(): ?string {
        return $_COOKIE['auth_token'] ?? null;
    }

    /**
     * Get authentication token (Bearer or cookie)
     */
    public static function getAuthToken(): ?string {
        return self::getBearerToken() ?? self::getTokenFromCookie();
    }

    /**
     * Base64 URL encode
     */
    public static function base64urlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL decode
     */
    public static function base64urlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $padlen = 4 - $remainder;
            $data .= str_repeat('=', $padlen);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Encode JWT with HS256
     */
    public static function jwtEncode(array $payload, string $secret = '', string $alg = 'HS256'): string {
        if (empty($secret)) {
            $secret = $_ENV['JWT_SECRET'] ?? throw new Exception('JWT_SECRET not defined', 500);
        }

        $header = ['typ' => 'JWT', 'alg' => $alg];
        $segments = [];
        $segments[] = self::base64urlEncode(json_encode($header));
        $segments[] = self::base64urlEncode(json_encode($payload));
        $signing_input = implode('.', $segments);

        switch ($alg) {
            case 'HS256':
                $signature = hash_hmac('sha256', $signing_input, $secret, true);
                break;
            default:
                throw new Exception('Unsupported JWT algorithm', 500);
        }

        $segments[] = self::base64urlEncode($signature);
        return implode('.', $segments);
    }

    /**
     * Decode JWT with HS256
     */
    public static function jwtDecode(string $jwt, string $secret = '', string $alg = 'HS256'): array {
        if (empty($secret)) {
            $secret = $_ENV['JWT_SECRET'] ?? throw new Exception('JWT_SECRET not defined', 500);
        }

        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new Exception('Invalid JWT structure', 401);
        }

        list($header64, $payload64, $sig64) = $parts;
        $header = json_decode(self::base64urlDecode($header64), true);
        $payload = json_decode(self::base64urlDecode($payload64), true);
        $signature = self::base64urlDecode($sig64);

        if (!is_array($header) || !isset($header['alg']) || $header['alg'] !== $alg) {
            throw new Exception('Invalid JWT header', 401);
        }

        $signing_input = $header64 . '.' . $payload64;
        $expected = '';
        switch ($alg) {
            case 'HS256':
                $expected = hash_hmac('sha256', $signing_input, $secret, true);
                break;
            default:
                throw new Exception('Unsupported JWT algorithm', 500);
        }

        if (!hash_equals($expected, $signature)) {
            throw new Exception('Invalid JWT signature', 401);
        }

        if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
            throw new Exception('JWT expired', 401);
        }

        return $payload;
    }

    /**
     * Generate JWT for user (HS256)
     */
    public static function generateJwtForUser(int $userId, string $role, string $username, bool $rememberMe = false, bool $storeInCookie = false): array {
        $issuedAt = time();
        $expiresAt = $rememberMe ? $issuedAt + (30 * 24 * 60 * 60) : $issuedAt + (24 * 60 * 60);
        $payload = [
            'sub'      => $userId,
            'role'     => $role,
            'username' => $username,
            'iat'      => $issuedAt,
            'exp'      => $expiresAt,
        ];
        $jwt = self::jwtEncode($payload);

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
}
?>
