<?php

namespace App\Model;

use PDO;

class ExampleModel {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function fetchAll() {
        $stmt = $this->db->query('SELECT * FROM example_table');
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
