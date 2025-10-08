<?php

namespace App\Model;

use PDO;

class AuthModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function validateUser(string $username, string $password): ?array {
        $stmt = $this->db->prepare('SELECT id, username, password FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            return ['id' => $user['id'], 'username' => $user['username']];
        }
        return null;
    }
}
?>
