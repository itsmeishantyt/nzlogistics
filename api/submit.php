<?php
/**
 * POST /api/submit.php
 * Accepts JSON application data and inserts into the applications table.
 */
require_once __DIR__ . '/config.php';
sendHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();

if (empty($body)) {
    jsonError('Invalid application data', 400);
}

try {
    $db = getDB();
    $stmt = $db->prepare('INSERT INTO applications (data, status) VALUES (?, ?)');
    $stmt->execute([json_encode($body, JSON_UNESCAPED_UNICODE), 'pending']);

    jsonResponse([
        'success' => true,
        'message' => 'Application submitted successfully',
        'id'      => $db->lastInsertId(),
    ], 201);
} catch (PDOException $e) {
    error_log('Submit error: ' . $e->getMessage());
    jsonError('Failed to submit application', 500);
}
