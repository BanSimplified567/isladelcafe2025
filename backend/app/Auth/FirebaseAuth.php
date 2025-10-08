<?php

namespace App\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;
use App\Utils\Helpers;

class FirebaseAuth {
    private $projectId;
    private $publicKeys;

    public function __construct() {
        $this->projectId = $_ENV['FIREBASE_PROJECT_ID'] ?? 'isladelcafe-80a7d';
        $this->fetchPublicKeys();
    }

    private function fetchPublicKeys() {
        $url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
        $response = @file_get_contents($url);
        if ($response === false) {
            Helpers::sendResponse(false, 'Failed to fetch public keys', [], 500);
        }
        $this->publicKeys = json_decode($response, true);
        if (!$this->publicKeys) {
            Helpers::sendResponse(false, 'Invalid public keys format', [], 500);
        }
    }

    public function verifyIdToken(): array {
        $idToken = Helpers::getBearerToken();
        if (!$idToken) {
            Helpers::sendResponse(false, 'Missing or invalid Authorization header', [], 401);
        }

        try {
            // Decode header to get kid
            $tks = explode('.', $idToken);
            if (count($tks) !== 3) {
                Helpers::sendResponse(false, 'Wrong number of segments in token', [], 401);
            }
            $headerB64 = $tks[0];
            $headerRaw = JWT::urlsafeB64Decode($headerB64);
            $header = JWT::jsonDecode($headerRaw);

            $kid = $header->kid ?? '';

            if (empty($kid) || !isset($this->publicKeys[$kid])) {
                Helpers::sendResponse(false, 'Invalid or missing token key ID', [], 401);
            }

            // Verify token
            $key = new Key($this->publicKeys[$kid], 'RS256');
            $decoded = JWT::decode($idToken, $key);

            // Validate claims
            if ($decoded->aud !== $this->projectId) {
                Helpers::sendResponse(false, 'Invalid token audience', [], 401);
            }
            if ($decoded->iss !== "https://securetoken.google.com/{$this->projectId}") {
                Helpers::sendResponse(false, 'Invalid token issuer', [], 401);
            }
            if ($decoded->exp < time()) {
                Helpers::sendResponse(false, 'Token expired', [], 401);
            }

            return (array) $decoded;
        } catch (Exception $e) {
            Helpers::sendResponse(false, 'Token verification failed: ' . $e->getMessage(), [], 401);
        }
    }

    public function getUserUid(): string {
        $claims = $this->verifyIdToken();
        return $claims['sub'] ?? '';
    }

    public function syncUserToDb(array $claims, \PDO $conn) {
        $uid = $claims['sub'] ?? '';
        $email = $claims['email'] ?? '';
        $fullname = $claims['name'] ?? 'Unknown User';
        $role = 'customer';
        $status = 'active';

        try {
            $stmt = $conn->prepare(
                "INSERT INTO user (firebase_uid, email, fullname, role, status)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                fullname = VALUES(fullname),
                updated_at = CURRENT_TIMESTAMP"
            );
            $stmt->execute([$uid, $email, $fullname, $role, $status]);
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Database sync failed: ' . $e->getMessage(), [], 500);
        }
    }
}
?>
