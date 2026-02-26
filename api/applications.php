<?php
/**
 * GET   /api/applications.php          → List all applications (requires admin token)
 * GET   /api/applications.php?status=… → Filter by status
 * PATCH /api/applications.php          → Update application status (requires admin token)
 */
require_once __DIR__ . '/config.php';
sendHeaders();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    requireAdmin();

    $status = $_GET['status'] ?? 'all';

    try {
        $db = getDB();

        if ($status !== 'all' && in_array($status, ['pending', 'reviewing', 'accepted', 'rejected'])) {
            $stmt = $db->prepare('SELECT id, data, status, created_at FROM applications WHERE status = ? ORDER BY created_at DESC');
            $stmt->execute([$status]);
        } else {
            $stmt = $db->query('SELECT id, data, status, created_at FROM applications ORDER BY created_at DESC');
        }

        $rows = $stmt->fetchAll();

        // Parse JSON data for each row
        $applications = array_map(function ($row) {
            $data = json_decode($row['data'], true) ?: [];
            return [
                'id'         => (int) $row['id'],
                'data'       => $data,
                'status'     => $row['status'],
                'created_at' => $row['created_at'],
                // Extract common fields for table display
                'first_name' => $data['first_name'] ?? $data['First Name'] ?? '',
                'last_name'  => $data['last_name'] ?? $data['Last Name'] ?? '',
                'email'      => $data['email'] ?? $data['Email'] ?? '',
                'position'   => $data['position'] ?? $data['Position'] ?? '',
            ];
        }, $rows);

        jsonResponse($applications);
    } catch (PDOException $e) {
        error_log('Applications GET error: ' . $e->getMessage());
        jsonError('Failed to fetch applications', 500);
    }
    exit;
}

if ($method === 'PATCH') {
    requireAdmin();

    $body = getJsonBody();
    $id = $body['id'] ?? null;
    $newStatus = $body['status'] ?? null;

    if (!$id || !in_array($newStatus, ['pending', 'reviewing', 'accepted', 'rejected'])) {
        jsonError('Invalid id or status', 400);
    }

    try {
        $db = getDB();
        $stmt = $db->prepare('UPDATE applications SET status = ? WHERE id = ?');
        $stmt->execute([$newStatus, $id]);

        if ($stmt->rowCount() === 0) {
            jsonError('Application not found', 404);
        }

        jsonResponse(['success' => true]);
    } catch (PDOException $e) {
        error_log('Applications PATCH error: ' . $e->getMessage());
        jsonError('Failed to update status', 500);
    }
    exit;
}

jsonError('Method not allowed', 405);
