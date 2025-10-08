<?php

namespace App\Controller;

use App\Auth\FirebaseAuth;
use App\Database\Database;
use App\Utils\Helpers;
use App\Model\UserModel;
use PDO;

class AuthController {
    private $pdo;
    private $auth;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->auth = new FirebaseAuth();
    }

    public function checkAuth() {
        try {
            $claims = $this->auth->verifyIdToken();
            $userModel = new UserModel($this->pdo);
            $user = $userModel->getByFirebaseUid($claims['sub']);
            if (!$user) {
                // Sync user to database if not found
                $this->auth->syncUserToDb($claims, $this->pdo);
                $user = $userModel->getByFirebaseUid($claims['sub']);
            }
            if ($user) {
                $_SESSION['user'] = $user;
                Helpers::sendResponse(true, 'Authenticated', ['user' => $user]);
            } else {
                Helpers::sendResponse(false, 'User not found', [], 404);
            }
        } catch (\Exception $e) {
            Helpers::sendResponse(false, 'Authentication failed: ' . $e->getMessage(), [], 401);
        }
    }

    public function login(array $data) {
        $email = Helpers::sanitizeInput($data['email'] ?? '');
        $password = $data['password'] ?? '';
        if (!Helpers::isValidEmail($email)) {
            Helpers::sendResponse(false, 'Invalid email format', [], 400);
        }
        if (!Helpers::isStrongPassword($password)) {
            Helpers::sendResponse(false, 'Password must be at least 12 characters with uppercase, lowercase, and numbers', [], 400);
        }

        $userModel = new UserModel($this->pdo);
        $user = $userModel->getByEmail($email);
        if ($user && password_verify($password, $user['password'])) {
            list($jwt, $expiresAt) = Helpers::generateJwtForUser(
                $user['user_id'],
                $user['role'],
                $user['username'],
                $data['rememberMe'] ?? false,
                true
            );
            $_SESSION['user'] = $user;
            Helpers::sendResponse(true, 'Login successful', ['user' => $user, 'token' => $jwt, 'expires_at' => $expiresAt]);
        } else {
            $userModel->incrementFailedAttempts($user['firebase_uid'] ?? '');
            if ($user && $user['failed_attempts'] >= 5) {
                $userModel->blockUser($user['firebase_uid']);
                Helpers::sendResponse(false, 'Account blocked due to too many failed attempts', [], 403);
            }
            Helpers::sendResponse(false, 'Invalid credentials', [], 401);
        }
    }

    public function logout() {
        session_destroy();
        setcookie('auth_token', '', time() - 3600, '/', '', true, true);
        Helpers::sendResponse(true, 'Logged out');
    }

    public function register(array $data) {
        try {
            $claims = $this->auth->verifyIdToken();
            $userModel = new UserModel($this->pdo);
            $existingUser = $userModel->getByFirebaseUid($claims['sub']);
            if ($existingUser) {
                $_SESSION['user'] = $existingUser;
                Helpers::sendResponse(true, 'User already registered', ['user' => $existingUser, 'token' => Helpers::getBearerToken()]);
                return;
            }

            $this->auth->syncUserToDb($claims, $this->pdo);
            $user = $userModel->getByFirebaseUid($claims['sub']);
            if ($user) {
                list($jwt, $expiresAt) = Helpers::generateJwtForUser(
                    $user['user_id'],
                    $user['role'],
                    $user['username'] ?? $user['email'],
                    false,
                    true
                );
                $_SESSION['user'] = $user;
                Helpers::sendResponse(true, 'User registered', ['user' => $user, 'token' => $jwt, 'expires_at' => $expiresAt]);
            } else {
                Helpers::sendResponse(false, 'Failed to register user', [], 500);
            }
        } catch (\Exception $e) {
            Helpers::sendResponse(false, 'Registration failed: ' . $e->getMessage(), [], 401);
        }
    }
}
?>
