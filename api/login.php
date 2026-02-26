<?php
/**
 * POST /api/login.php
 * Validates admin password and returns a session token.
 */
require_once __DIR__ . '/config.php';
sendHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$password = $body['password'] ?? '';

if ($password !== ADMIN_PASSWORD) {
    jsonError('Invalid password', 401);
}

try {
    $db = getDB();

    // Clean up expired sessions
    $db->exec('DELETE FROM admin_sessions WHERE expires_at < NOW()');

    // Generate token
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_HOURS * 3600);

    $stmt = $db->prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)');
    $stmt->execute([$token, $expiresAt]);

    jsonResponse([
        'success' => true,
        'token'   => $token,
        'expires' => $expiresAt,
    ]);
} catch (PDOException $e) {
    error_log('Login error: ' . $e->getMessage());
    jsonError('Login failed', 500);
}
