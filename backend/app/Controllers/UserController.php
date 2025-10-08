<?php

namespace App\Controller;

use App\Database\Database;
use App\Model\UserModel;
use App\Utils\Helpers;
use PDO;

class UserController {
    private $pdo;
    private $userModel;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->userModel = new UserModel($pdo);
    }

    public function createUser() {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = Helpers::sanitizeInput($data['email'] ?? '');
        // Use UserModel to create user
        Helpers::sendResponse(true, 'User created');
    }

    public function getQuestion() {
        // Fetch security questions
        Helpers::sendResponse(true, 'Questions fetched', []);
    }

    public function fetchUsers() {
        $users = $this->userModel->getAllUsers(); // Add method to UserModel
        Helpers::sendResponse(true, 'Users fetched', $users);
    }

    public function fetchUserDetails() {
        $data = json_decode(file_get_contents('php://input'), true);
        $uid = Helpers::sanitizeInput($data['firebase_uid'] ?? '');
        $user = $this->userModel->getByFirebaseUid($uid);
        Helpers::sendResponse(true, 'User details fetched', $user);
    }

    public function fetchUserOrders() {
        Helpers::sendResponse(true, 'User orders fetched', []);
    }

    public function fetchUserOrderItems() {
        Helpers::sendResponse(true, 'User order items fetched', []);
    }

    public function fetchUserHistory() {
        Helpers::sendResponse(true, 'User history fetched', []);
    }

    public function fetchRefunds() {
        Helpers::sendResponse(true, 'Refunds fetched', []);
    }

    public function updateUserStatus() {
        Helpers::sendResponse(true, 'User status updated');
    }

    public function deleteUser() {
        Helpers::sendResponse(true, 'User deleted');
    }

    public function updateUser() {
        Helpers::sendResponse(true, 'User updated');
    }

    public function updatedUsers() {
        Helpers::sendResponse(true, 'Users updated');
    }
}
?>
