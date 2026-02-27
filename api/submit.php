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

$body = [];

// Check if content is multipart (file uploads included)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'multipart/form-data') !== false) {
    // Read the text data payload
    if (!isset($_POST['data'])) {
        jsonError('Missing JSON data payload in multipart request', 400);
    }
    
    $body = json_decode($_POST['data'], true);
    if (!is_array($body)) {
        jsonError('Invalid JSON data inside multipart request', 400);
    }

    // Process file uploads
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    foreach ($_FILES as $key => $file) {
        if ($file['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = uniqid('upload_') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $targetPath = $uploadDir . $filename;
            
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $body[$key] = '/uploads/' . $filename; // Store relative path in JSON
            }
        }
    }
} else {
    // Normal JSON body
    $body = getJsonBody();
}

if (empty($body)) {
    jsonError('Invalid application data', 400);
}

try {
    $db = getDB();
    $stmt = $db->prepare('INSERT INTO applications (data, status) VALUES (?, ?)');
    $stmt->execute([json_encode($body, JSON_UNESCAPED_UNICODE), 'pending']);

    $insertId = $db->lastInsertId();

    // Trigger Email Notification
    $applicantName = trim(($body['first_name'] ?? '') . ' ' . ($body['last_name'] ?? ''));
    if ($applicantName === '') $applicantName = 'A new applicant';
    $position = $body['position'] ?? 'Unknown Position';

    $htmlBody = "<h2>New Application Received</h2>
<p><strong>Applicant:</strong> " . htmlspecialchars($applicantName) . "</p>
<p><strong>Position:</strong> " . htmlspecialchars($position) . "</p>
<p>Log in to your Admin Dashboard to view their full details, attached licenses, and download their resume.</p>";

    sendResendEmail(ADMIN_EMAIL, "New Application Notification — $applicantName", $htmlBody);

    jsonResponse([
        'success' => true,
        'message' => 'Application submitted successfully',
        'id'      => $insertId,
    ], 201);
} catch (PDOException $e) {
    error_log('Submit error: ' . $e->getMessage());
    jsonError('Failed to submit application', 500);
}
