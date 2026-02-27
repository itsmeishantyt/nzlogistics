<?php
/**
 * N&Z Logistics — API Configuration
 * Update these values with your Hostinger MySQL credentials.
 */

// ── Database credentials ──────────────────────────
define('DB_HOST', 'localhost');          // Hostinger uses localhost
define('DB_NAME', 'u350811145_nzlogistics'); // From hPanel → Databases
define('DB_USER', 'u350811145_nz'); // From hPanel → Databases
define('DB_PASS', 'Nzlogistics123#$'); // From hPanel → Databases

// ── Admin password ────────────────────────────────
define('ADMIN_PASSWORD', 'admin123');

// ── Email Notifications (Resend API) ──────────────
define('RESEND_API_KEY', 're_jSCBfK4y_N2iNcEJrWcwLfAodxX6qzBAs');
define('ADMIN_EMAIL', 'nzlogistics9@gmail.com');

// ── Session duration (hours) ──────────────────────
define('SESSION_HOURS', 24);

// ── CORS + JSON headers ──────────────────────────
function sendHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// ── Database connection ───────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── JSON response helpers ─────────────────────────
function jsonResponse($data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400) {
    jsonResponse(['error' => $message], $status);
}

// ── Read JSON body ────────────────────────────────
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonError('Invalid JSON body', 400);
    }
    return $data;
}

// ── Validate admin session token ──────────────────
function requireAdmin(): void {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        $token = $m[1];
    }

    if (empty($token)) {
        jsonError('Unauthorized — no token', 401);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT token FROM admin_sessions WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$token]);

    if (!$stmt->fetch()) {
        jsonError('Unauthorized — invalid or expired token', 401);
    }
}

// ── Send Email via Resend ─────────────────────────
function sendResendEmail(string $to, string $subject, string $htmlBody): void {
    if (empty(RESEND_API_KEY)) return;

    $ch = curl_init('https://api.resend.com/emails');
    
    $payload = json_encode([
        'from'    => 'N&Z Logistics Notifications <onboarding@resend.dev>',
        'to'      => [$to],
        'subject' => $subject,
        'html'    => $htmlBody
    ]);

    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . RESEND_API_KEY,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    
    $result = curl_exec($ch);
    if (curl_errno($ch)) {
        error_log('Resend cURL error: ' . curl_error($ch));
    }
    curl_close($ch);
}
