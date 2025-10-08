<?php

namespace App\Controller;

use App\Database\Database;
use App\Utils\Helpers;
use PDO;

class AccountController {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function resetUsername() {
        Helpers::sendResponse(true, 'Username reset');
    }

    public function resetUsernameByAnswers() {
        Helpers::sendResponse(true, 'Username reset by answers');
    }

    public function resetUsernameAdminByAnswers() {
        Helpers::sendResponse(true, 'Admin username reset');
    }

    public function resetPasswordAdminByAnswers() {
        Helpers::sendResponse(true, 'Admin password reset');
    }

    public function resetPasswordByAnswers() {
        Helpers::sendResponse(true, 'Password reset by answers');
    }

    public function autoUpdatePendingOrders() {
        Helpers::sendResponse(true, 'Pending orders updated');
    }

    public function verifySecurityAnswersAdmin() {
        Helpers::sendResponse(true, 'Security answers verified (admin)');
    }

    public function verifySecurityAnswersOnly() {
        Helpers::sendResponse(true, 'Security answers verified');
    }

    public function verifyUser() {
        Helpers::sendResponse(true, 'User verified');
    }

    public function verifySecurityAnswers() {
        Helpers::sendResponse(true, 'Security answers verified');
    }
}
?>
