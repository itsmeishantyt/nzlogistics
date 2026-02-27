<?php
/**
 * GET /api/check-auth.php
 * Endpoint to verify if an admin session token is still valid.
 */
require_once __DIR__ . '/config.php';
sendHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

// requireAdmin() automatically checks the Authorization header
// and dies with a 401 if the token is invalid or expired.
requireAdmin();

// If we pass requireAdmin(), the token is completely valid.
jsonResponse([
    'success' => true,
    'message' => 'Token is valid'
]);
