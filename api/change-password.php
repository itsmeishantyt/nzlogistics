<?php
/**
 * POST /api/change-password.php
 * Changes the admin password in config.php
 */
require_once __DIR__ . '/config.php';
sendHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

requireAdmin();

$body = getJsonBody();
$newPassword = $body['new_password'] ?? '';

if (empty($newPassword) || strlen($newPassword) < 6) {
    jsonError('Password must be at least 6 characters long', 400);
}

try {
    $configFile = __DIR__ . '/config.php';
    if (!is_writable($configFile)) {
        jsonError('Configuration file is not writable. Please check server permissions.', 500);
    }

    $content = file_get_contents($configFile);
    $escapedPassword = str_replace("'", "\'", $newPassword);
    $content = preg_replace("/define\('ADMIN_PASSWORD',\s*'.*?'\);/", "define('ADMIN_PASSWORD', '" . $escapedPassword . "');", $content);
    
    if (file_put_contents($configFile, $content) === false) {
        jsonError('Failed to write to configuration file', 500);
    }

    jsonResponse(['success' => true, 'message' => 'Password changed successfully']);
} catch (Exception $e) {
    error_log('Change password error: ' . $e->getMessage());
    jsonError('Failed to change password', 500);
}
