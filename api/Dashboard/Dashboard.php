<?php
require_once '../dbconn.php';

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get and validate action
$action = isset($_GET['action']) ? trim($_GET['action']) : '';
if (!in_array($action, ['fetch'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action specified']);
    exit();
}

// Get date range and report type parameters
$startDate = isset($_GET['startDate']) ? trim($_GET['startDate']) : null;
$endDate = isset($_GET['endDate']) ? trim($_GET['endDate']) : null;
$reportType = isset($_GET['reportType']) ? trim($_GET['reportType']) : 'daily';

// Validate date formats
if ($startDate && $endDate) {
    try {
        $startDateObj = new DateTime($startDate);
        $endDateObj = new DateTime($endDate);
        if ($startDateObj > $endDateObj) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Start date cannot be after end date']);
            exit();
        }
        $startDate = $startDateObj->format('Y-m-d');
        $endDate = $endDateObj->format('Y-m-d');
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid date format']);
        exit();
    }
}

switch ($action) {
    case 'fetch':
        try {
            // Initialize system status
            $systemStatus = [
                'totalSales' => 0,
                'averageOrderValue' => 0,
                'totalOrders' => 0,
                'totalCustomers' => 0,
                'monthlyGrowth' => 0,
                'dailyAverageOrders' => 0,
                'totalProducts' => 0,
                'totalEmployees' => 0,
                'totalUsers' => 0
            ];

            // Total products
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM products WHERE status = 'active'");
            $stmt->execute();
            $systemStatus['totalProducts'] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Total employees (admin , manager and staff)
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM user WHERE role IN ('admin','manager', 'staff') AND status = 'active'");
            $stmt->execute();
            $systemStatus['totalEmployees'] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Total users (customers)
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM user WHERE status = 'active' AND role = 'customer'");
            $stmt->execute();
            $systemStatus['totalUsers'] = (int) $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Check if order table has any records
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM `order`");
            $stmt->execute();
            $hasOrders = (int) $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;

            if ($hasOrders) {
                // Total sales, orders, and customers with optional date filter
                $query = "
                    SELECT
                        COUNT(*) as total_orders,
                        COALESCE(SUM(total_amount - COALESCE(discount_amount, 0)), 0) as total_sales,
                        COUNT(DISTINCT user_id) as total_customers
                    FROM `order`
                    WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                ";
                $params = [];
                if ($startDate && $endDate) {
                    $query .= " AND created_at BETWEEN :startDate AND :endDate";
                    $params[':startDate'] = $startDate . ' 00:00:00';
                    $params[':endDate'] = $endDate . ' 23:59:59';
                }
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $systemStatus['totalOrders'] = (int) $result['total_orders'];
                $systemStatus['totalSales'] = (float) $result['total_sales'];
                $systemStatus['totalCustomers'] = (int) $result['total_customers'];
                $systemStatus['averageOrderValue'] = $result['total_orders'] > 0
                    ? round($result['total_sales'] / $result['total_orders'], 2)
                    : 0;

                // Monthly growth - compare current period to previous period of same length
                if ($startDate && $endDate) {
                    $dateDiff = $endDateObj->diff($startDateObj)->days + 1;
                    $previousStartDate = (clone $startDateObj)->modify("-$dateDiff days")->format('Y-m-d');
                    $previousEndDate = (clone $endDateObj)->modify("-$dateDiff days")->format('Y-m-d');
                    $query = "
                        SELECT
                            COALESCE(SUM(CASE WHEN created_at BETWEEN :startDate AND :endDate THEN (total_amount - COALESCE(discount_amount, 0)) ELSE 0 END), 0) as current_period_sales,
                            COALESCE(SUM(CASE WHEN created_at BETWEEN :prevStartDate AND :prevEndDate THEN (total_amount - COALESCE(discount_amount, 0)) ELSE 0 END), 0) as previous_period_sales
                        FROM `order`
                        WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                    ";
                    $stmt = $conn->prepare($query);
                    $stmt->execute([
                        ':startDate' => $startDate . ' 00:00:00',
                        ':endDate' => $endDate . ' 23:59:59',
                        ':prevStartDate' => $previousStartDate . ' 00:00:00',
                        ':prevEndDate' => $previousEndDate . ' 23:59:59'
                    ]);
                } else {
                    $stmt = $conn->prepare("
                        SELECT
                            COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN (total_amount - COALESCE(discount_amount, 0)) ELSE 0 END), 0) as current_month_sales,
                            COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN (total_amount - COALESCE(discount_amount, 0)) ELSE 0 END), 0) as previous_month_sales
                        FROM `order`
                        WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                    ");
                    $stmt->execute();
                }
                $growthResult = $stmt->fetch(PDO::FETCH_ASSOC);
                $currentSales = (float) ($growthResult['current_period_sales'] ?? $growthResult['current_month_sales']);
                $previousSales = (float) ($growthResult['previous_period_sales'] ?? $growthResult['previous_month_sales']);
                $systemStatus['monthlyGrowth'] = $previousSales > 0
                    ? round((($currentSales - $previousSales) / $previousSales) * 100, 2)
                    : ($currentSales > 0 ? 100 : 0);

                // Daily average orders with optional date filter
                $query = "
                    SELECT
                        COUNT(*) as order_count,
                        COUNT(DISTINCT DATE(created_at)) as day_count
                    FROM `order`
                    WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                ";
                $params = [];
                if ($startDate && $endDate) {
                    $query .= " AND created_at BETWEEN :startDate AND :endDate";
                    $params[':startDate'] = $startDate . ' 00:00:00';
                    $params[':endDate'] = $endDate . ' 23:59:59';
                } else {
                    $query .= " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                }
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $avgResult = $stmt->fetch(PDO::FETCH_ASSOC);
                $orderCount = (int) $avgResult['order_count'];
                $dayCount = (int) $avgResult['day_count'];
                $systemStatus['dailyAverageOrders'] = $dayCount > 0 ? round($orderCount / $dayCount, 1) : 0;

                // Sales data with period formatting based on reportType
                $query = "
                    SELECT
                        %s as period,
                        COUNT(*) as orders,
                        SUM(total_amount - COALESCE(discount_amount, 0)) as sales
                    FROM `order`
                    WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                ";
                $params = [];
                if ($startDate && $endDate) {
                    $query .= " AND created_at BETWEEN :startDate AND :endDate";
                    $params[':startDate'] = $startDate . ' 00:00:00';
                    $params[':endDate'] = $endDate . ' 23:59:59';
                } else {
                    $query .= " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                }

                // Format period and group by based on reportType
                $periodFormat = '';
                switch ($reportType) {
                    case 'daily':
                        $periodFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
                        break;
                    case 'weekly':
                     $periodFormat = "MIN(DATE(created_at)) as period_date, CONCAT(YEAR(created_at), '-W', LPAD(WEEK(created_at, 3),2,'0'))";
                        break;
                    case 'monthly':
                        $periodFormat = "DATE_FORMAT(created_at, '%M %Y')";
                        break;
                    case 'yearly':
                        $periodFormat = "DATE_FORMAT(created_at, '%Y')";
                        break;
                    default:
                        $periodFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
                }
                $query = sprintf($query, $periodFormat);
                $query .= " GROUP BY period ORDER BY MIN(created_at)";
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $salesData = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Check if orderitems table has any entries
                $stmt = $conn->prepare("SELECT COUNT(*) as count FROM orderitems");
                $stmt->execute();
                $hasOrderItems = (int) $stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0;

                if ($hasOrderItems) {
                    // Best selling products with optional date filter
                    $query = "
                        SELECT
                            p.name,
                            SUM(oi.quantity) as quantity,
                            SUM(oi.price * oi.quantity) as sales
                        FROM orderitems oi
                        JOIN products p ON oi.product_id = p.product_id
                        JOIN `order` o ON oi.order_id = o.order_id
                        WHERE o.status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                    ";
                    $params = [];
                    if ($startDate && $endDate) {
                        $query .= " AND o.created_at BETWEEN :startDate AND :endDate";
                        $params[':startDate'] = $startDate . ' 00:00:00';
                        $params[':endDate'] = $endDate . ' 23:59:59';
                    }
                    $query .= " GROUP BY p.product_id, p.name ORDER BY sales DESC LIMIT 5";
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                    $bestSellingProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Sales by category with optional date filter
                    $query = "
                        SELECT
                            p.type as name,
                            COUNT(DISTINCT oi.order_id) as orders,
                            SUM(oi.price * oi.quantity) as sales
                        FROM orderitems oi
                        JOIN products p ON oi.product_id = p.product_id
                        JOIN `order` o ON oi.order_id = o.order_id
                        WHERE o.status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                    ";
                    $params = [];
                    if ($startDate && $endDate) {
                        $query .= " AND o.created_at BETWEEN :startDate AND :endDate";
                        $params[':startDate'] = $startDate . ' 00:00:00';
                        $params[':endDate'] = $endDate . ' 23:59:59';
                    }
                    $query .= " GROUP BY p.type ORDER BY sales DESC";
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                    $categorySales = $stmt->fetchAll(PDO::FETCH_ASSOC);
                } else {
                    $bestSellingProducts = [];
                    $categorySales = [];
                }

                // Sales by time of day with optional date filter
                $query = "
                    SELECT
                        HOUR(created_at) as hour,
                        COUNT(*) as orders,
                        SUM(total_amount - COALESCE(discount_amount, 0)) as sales
                    FROM `order`
                    WHERE status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                ";
                $params = [];
                if ($startDate && $endDate) {
                    $query .= " AND created_at BETWEEN :startDate AND :endDate";
                    $params[':startDate'] = $startDate . ' 00:00:00';
                    $params[':endDate'] = $endDate . ' 23:59:59';
                }
                $query .= " GROUP BY HOUR(created_at) ORDER BY hour";
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $timeOfDaySales = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Recent orders with optional date filter
                $query = "
                    SELECT
                        o.order_id,
                        o.order_number,
                        CONCAT(COALESCE(o.delivery_firstname, ''), ' ', COALESCE(o.delivery_lastname, '')) as customer_name,
                        (o.total_amount - COALESCE(o.discount_amount, 0)) as total_amount,
                        o.status,
                        o.created_at as order_date
                    FROM `order` o
                    WHERE o.status IN ('Confirmed', 'Processing', 'Ready for Pickup', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed')
                ";
                $params = [];
                if ($startDate && $endDate) {
                    $query .= " AND o.created_at BETWEEN :startDate AND :endDate";
                    $params[':startDate'] = $startDate . ' 00:00:00';
                    $params[':endDate'] = $endDate . ' 23:59:59';
                }
                $query .= " ORDER BY o.created_at DESC LIMIT 5";
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
                $recentOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $salesData = [];
                $bestSellingProducts = [];
                $categorySales = [];
                $timeOfDaySales = [];
                $recentOrders = [];
            }

            // Top reviewed products
            $stmt = $conn->prepare("
                SELECT
                    name,
                    reviews
                FROM products
                WHERE reviews IS NOT NULL
                ORDER BY reviews DESC
                LIMIT 5
            ");
            $stmt->execute();
            $topReviewedProducts = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $topReviewedProducts[] = [
                    'name' => $row['name'],
                    'reviews' => is_numeric($row['reviews']) ? (int) $row['reviews'] : 0
                ];
            }

            // Get product distribution by category
            $stmt = $conn->prepare("
                SELECT
                    type as category_name,
                    COUNT(*) as product_count
                FROM products
                WHERE status = 'active'
                GROUP BY type
            ");
            $stmt->execute();
            $productByCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Return response
            echo json_encode([
                'success' => true,
                'data' => [
                    'systemStatus' => $systemStatus,
                    'salesData' => array_map(function ($row) {
                        return [
                            'period' => $row['period'],
                            'orders' => (int) $row['orders'],
                            'sales' => (float) $row['sales']
                        ];
                    }, $salesData),
                    'bestSellingProducts' => $bestSellingProducts,
                    'topReviewedProducts' => $topReviewedProducts,
                    'categorySales' => $categorySales,
                    'timeOfDaySales' => $timeOfDaySales,
                    'recentOrders' => $recentOrders,
                    'productByCategory' => $productByCategory
                ]
            ]);
        } catch (PDOException $e) {
            error_log("Dashboard fetch error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        } catch (Exception $e) {
            error_log("Dashboard error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Unexpected error: ' . $e->getMessage()
            ]);
        }
        break;
}
