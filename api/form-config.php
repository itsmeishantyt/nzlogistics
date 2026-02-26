<?php
/**
 * GET  /api/form-config.php  → Returns current form configuration
 * POST /api/form-config.php  → Saves form configuration (requires admin password)
 */
require_once __DIR__ . '/config.php';
sendHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $db = getDB();
        $stmt = $db->query('SELECT config FROM form_config ORDER BY id DESC LIMIT 1');
        $row = $stmt->fetch();

        if ($row) {
            // Return the raw JSON config array
            echo $row['config'];
        } else {
            echo '[]';
        }
    } catch (PDOException $e) {
        error_log('Form config GET error: ' . $e->getMessage());
        jsonError('Failed to read configuration', 500);
    }
    exit;
}

if ($method === 'POST') {
    $body = getJsonBody();

    // Validate password
    if (($body['password'] ?? '') !== ADMIN_PASSWORD) {
        jsonError('Unauthorized', 401);
    }

    if (!isset($body['config']) || !is_array($body['config'])) {
        jsonError('Invalid configuration format. Must be an array.', 400);
    }

    try {
        $db = getDB();
        $configJson = json_encode($body['config'], JSON_UNESCAPED_UNICODE);

        // Check if a config row already exists
        $existing = $db->query('SELECT id FROM form_config ORDER BY id DESC LIMIT 1')->fetch();

        if ($existing) {
            $stmt = $db->prepare('UPDATE form_config SET config = ? WHERE id = ?');
            $stmt->execute([$configJson, $existing['id']]);
        } else {
            $stmt = $db->prepare('INSERT INTO form_config (config) VALUES (?)');
            $stmt->execute([$configJson]);
        }

        jsonResponse(['success' => true, 'message' => 'Configuration saved successfully']);
    } catch (PDOException $e) {
        error_log('Form config POST error: ' . $e->getMessage());
        jsonError('Failed to save configuration', 500);
    }
    exit;
}

jsonError('Method not allowed', 405);
