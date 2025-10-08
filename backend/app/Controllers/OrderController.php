<?php

namespace App\Controller;

use App\Database\Database;
use App\Utils\Helpers;
use PDO;

class OrderController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function fetchOrders() {
        Helpers::sendResponse(true, 'Orders fetched', []);
    }

    public function fetchOrderHistory() {
        Helpers::sendResponse(true, 'Order history fetched', []);
    }

    public function getOrderItems() {
        Helpers::sendResponse(true, 'Order items fetched', []);
    }

    public function updateOrderStatus() {
        Helpers::sendResponse(true, 'Order status updated');
    }

    public function getStatusHistory() {
        Helpers::sendResponse(true, 'Status history fetched', []);
    }

    public function createOrder() {
        Helpers::sendResponse(true, 'Order created');
    }

    public function deleteOrder() {
        Helpers::sendResponse(true, 'Order deleted');
    }
}
?>
