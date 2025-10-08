<?php

namespace App\Model;

use PDO;

class UserModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getByFirebaseUid(string $uid) {
        $stmt = $this->db->prepare("SELECT * FROM user WHERE firebase_uid = ?");
        $stmt->execute([$uid]);
        return $stmt->fetch();
    }

    public function getByEmail(string $email) {
        $stmt = $this->db->prepare("SELECT * FROM user WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function getAllUsers() {
        $stmt = $this->db->query("SELECT * FROM user");
        return $stmt->fetchAll();
    }

    public function incrementFailedAttempts(string $firebase_uid) {
        $stmt = $this->db->prepare("UPDATE user SET failed_attempts = failed_attempts + 1 WHERE firebase_uid = ?");
        $stmt->execute([$firebase_uid]);
    }

    public function blockUser(string $firebase_uid) {
        $stmt = $this->db->prepare("UPDATE user SET status = 'inactive', blocked_at = CURRENT_TIMESTAMP WHERE firebase_uid = ?");
        $stmt->execute([$firebase_uid]);
    }
}
?>
