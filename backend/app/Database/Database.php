<?php

namespace App\Database;

use PDO;
use PDOException;

class Database {
    private $conn;
    private $host;
    private $dbname;
    private $username;
    private $password;

    public function __construct() {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->dbname = $_ENV['DB_NAME'] ?? 'isladelcoffee';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
    }

    public function getConnection() {
        if ($this->conn !== null) {
            return $this->conn;
        }

        try {
            $this->conn = new PDO(
                "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            return $this->conn;
        } catch (PDOException $e) {
            error_log("Connection failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Connection failed. Please try again later.']);
            exit;
        }
    }
}
?>
