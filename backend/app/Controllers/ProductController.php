<?php

namespace App\Controller;

use App\Database\Database;
use App\Utils\Helpers;
use PDO;

class ProductController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function createProduct(array $data) {
        $requiredFields = ['name', 'type', 'subtype', 'image', 'description', 'temperature', 'rating', 'caffeine_level', 'small_price', 'medium_price', 'large_price'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty(trim($data[$field]))) {
                Helpers::sendResponse(false, "Missing or empty field: $field", [], 400);
                return;
            }
        }

        $name = Helpers::sanitizeInput($data['name']);
        $type = Helpers::sanitizeInput($data['type']);
        $subtype = Helpers::sanitizeInput($data['subtype']);
        $image = Helpers::sanitizeInput($data['image']);
        $description = Helpers::sanitizeInput($data['description']);
        $temperature = Helpers::sanitizeInput($data['temperature']);
        $rating = floatval($data['rating']);
        $caffeine_level = Helpers::sanitizeInput($data['caffeine_level']);
        $small_price = floatval($data['small_price']);
        $medium_price = floatval($data['medium_price']);
        $large_price = floatval($data['large_price']);
        $small_quantity = isset($data['small_quantity']) ? intval($data['small_quantity']) : 10;
        $medium_quantity = isset($data['medium_quantity']) ? intval($data['medium_quantity']) : 10;
        $large_quantity = isset($data['large_quantity']) ? intval($data['large_quantity']) : 10;
        $low_stock_threshold = isset($data['low_stock_threshold']) ? intval($data['low_stock_threshold']) : 5;
        $status = isset($data['status']) && in_array($data['status'], ['active', 'inactive']) ? $data['status'] : 'active';

        // Validate numeric fields
        if ($rating < 0 || $rating > 5) {
            Helpers::sendResponse(false, 'Rating must be between 0 and 5', [], 400);
            return;
        }
        if ($small_price < 0 || $medium_price < 0 || $large_price < 0) {
            Helpers::sendResponse(false, 'Prices cannot be negative', [], 400);
            return;
        }
        if ($small_quantity < 0 || $medium_quantity < 0 || $large_quantity < 0) {
            Helpers::sendResponse(false, 'Quantities cannot be negative', [], 400);
            return;
        }

        try {
            $stmt = $this->pdo->prepare(
                "INSERT INTO products (name, type, subtype, image, description, temperature, rating, caffeine_level, small_price, medium_price, large_price, small_quantity, medium_quantity, large_quantity, low_stock_threshold, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $name,
                $type,
                $subtype,
                $image,
                $description,
                $temperature,
                $rating,
                $caffeine_level,
                $small_price,
                $medium_price,
                $large_price,
                $small_quantity,
                $medium_quantity,
                $large_quantity,
                $low_stock_threshold,
                $status
            ]);
            $productId = $this->pdo->lastInsertId();
            $product = $this->getProductById($productId);

            Helpers::sendResponse(true, 'Product created', ['product' => $product]);
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Failed to create product: ' . $e->getMessage(), [], 500);
        }
    }

    public function updateProduct(array $data) {
        if (!isset($data['product_id']) || !is_numeric($data['product_id'])) {
            Helpers::sendResponse(false, 'Invalid or missing product_id', [], 400);
            return;
        }

        $productId = intval($data['product_id']);
        $updates = [];
        $params = [];
        $allowedFields = [
            'name' => 'string',
            'type' => 'string',
            'subtype' => 'string',
            'image' => 'string',
            'description' => 'string',
            'temperature' => 'string',
            'rating' => 'float',
            'caffeine_level' => 'string',
            'small_price' => 'float',
            'medium_price' => 'float',
            'large_price' => 'float',
            'small_quantity' => 'int',
            'medium_quantity' => 'int',
            'large_quantity' => 'int',
            'low_stock_threshold' => 'int',
            'status' => 'enum'
        ];

        foreach ($allowedFields as $field => $type) {
            if (isset($data[$field]) && !empty(trim($data[$field]))) {
                if ($type === 'string') {
                    $updates[] = "$field = ?";
                    $params[] = Helpers::sanitizeInput($data[$field]);
                } elseif ($type === 'float') {
                    $updates[] = "$field = ?";
                    $params[] = floatval($data[$field]);
                } elseif ($type === 'int') {
                    $updates[] = "$field = ?";
                    $params[] = intval($data[$field]);
                } elseif ($type === 'enum' && in_array($data[$field], ['active', 'inactive'])) {
                    $updates[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
        }

        if (empty($updates)) {
            Helpers::sendResponse(false, 'No valid fields provided for update', [], 400);
            return;
        }

        // Validate numeric fields if provided
        if (isset($data['rating']) && ($data['rating'] < 0 || $data['rating'] > 5)) {
            Helpers::sendResponse(false, 'Rating must be between 0 and 5', [], 400);
            return;
        }
        if (isset($data['small_price']) && $data['small_price'] < 0 ||
            isset($data['medium_price']) && $data['medium_price'] < 0 ||
            isset($data['large_price']) && $data['large_price'] < 0) {
            Helpers::sendResponse(false, 'Prices cannot be negative', [], 400);
            return;
        }
        if (isset($data['small_quantity']) && $data['small_quantity'] < 0 ||
            isset($data['medium_quantity']) && $data['medium_quantity'] < 0 ||
            isset($data['large_quantity']) && $data['large_quantity'] < 0) {
            Helpers::sendResponse(false, 'Quantities cannot be negative', [], 400);
            return;
        }

        try {
            $updates[] = "updated_at = CURRENT_TIMESTAMP";
            $params[] = $productId;
            $query = "UPDATE products SET " . implode(', ', $updates) . " WHERE product_id = ?";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            if ($stmt->rowCount() === 0) {
                Helpers::sendResponse(false, 'Product not found or no changes made', [], 404);
                return;
            }
            $product = $this->getProductById($productId);

            Helpers::sendResponse(true, 'Product updated', ['product' => $product]);
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Failed to update product: ' . $e->getMessage(), [], 500);
        }
    }

    public function deleteProduct(array $data) {
        if (!isset($data['product_id']) || !is_numeric($data['product_id'])) {
            Helpers::sendResponse(false, 'Invalid or missing product_id', [], 400);
            return;
        }

        $productId = intval($data['product_id']);
        try {
            $stmt = $this->pdo->prepare("UPDATE products SET status = 'inactive' WHERE product_id = ?");
            $stmt->execute([$productId]);
            if ($stmt->rowCount() === 0) {
                Helpers::sendResponse(false, 'Product not found', [], 404);
                return;
            }

            Helpers::sendResponse(true, 'Product deleted (marked as inactive)');
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Failed to delete product: ' . $e->getMessage(), [], 500);
        }
    }

    public function getProduct(array $data) {
        if (!isset($data['product_id']) || !is_numeric($data['product_id'])) {
            Helpers::sendResponse(false, 'Invalid or missing product_id', [], 400);
            return;
        }

        $productId = intval($data['product_id']);
        $product = $this->getProductById($productId);
        if (!$product) {
            Helpers::sendResponse(false, 'Product not found', [], 404);
            return;
        }

        Helpers::sendResponse(true, 'Product fetched', ['product' => $product]);
    }

    public function getAllProducts() {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM products WHERE status = 'active'");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Helpers::sendResponse(true, 'All products fetched', ['products' => $products]);
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Failed to fetch products: ' . $e->getMessage(), [], 500);
        }
    }

    public function getProducts(array $data) {
        $limit = isset($data['limit']) && is_numeric($data['limit']) ? intval($data['limit']) : 10;
        $page = isset($data['page']) && is_numeric($data['page']) ? intval($data['page']) : 1;
        $offset = ($page - 1) * $limit;
        $type = isset($data['type']) ? Helpers::sanitizeInput($data['type']) : null;
        $subtype = isset($data['subtype']) ? Helpers::sanitizeInput($data['subtype']) : null;
        $lowStock = isset($data['low_stock']) && $data['low_stock'] === 'true';

        $conditions = ["status = 'active'"];
        $params = [];

        if ($type) {
            $conditions[] = "type = ?";
            $params[] = $type;
        }
        if ($subtype) {
            $conditions[] = "subtype = ?";
            $params[] = $subtype;
        }
        if ($lowStock) {
            $conditions[] = "total_stock <= low_stock_threshold";
        }

        $whereClause = !empty($conditions) ? "WHERE " . implode(' AND ', $conditions) : "";
        $query = "SELECT * FROM products $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        try {
            $stmt = $this->pdo->prepare($query);
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM products $whereClause");
            $countStmt->execute(array_slice($params, 0, -2));
            $total = $countStmt->fetchColumn();

            Helpers::sendResponse(true, 'Products fetched', [
                'products' => $products,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        } catch (\PDOException $e) {
            Helpers::sendResponse(false, 'Failed to fetch products: ' . $e->getMessage(), [], 500);
        }
    }

    private function getProductById($productId) {
        $stmt = $this->pdo->prepare("SELECT * FROM products WHERE product_id = ? AND status = 'active'");
        $stmt->execute([$productId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>
