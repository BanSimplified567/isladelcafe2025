<?php

namespace App\Controller;

use App\Database\Database;
use App\Model\ExampleModel;
use PDO;

class ExampleController {
    private $db;
    private $model;

    public function __construct() {
        $this->db = (new Database())->getConnection();
        $this->model = new ExampleModel($this->db);
    }

    public function getExampleData() {
        try {
            $data = $this->model->fetchAll();
            http_response_code(200);
            echo json_encode(['data' => $data]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch data']);
        }
    }
}
?>
