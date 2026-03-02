<?php
require_once __DIR__ . '/api/config.php';

$to = ADMIN_EMAIL;
$subject = 'Test Email from N&Z Logistics';
$htmlBody = '<h2>This is a test email</h2><p>Testing the Resend API configuration.</p>';

echo "Testing email sending to $to...\n";

// Function copied from config.php to view output
function testResendEmail(string $to, string $subject, string $htmlBody) {
    if (empty(RESEND_API_KEY)) {
        echo "Error: RESEND_API_KEY is empty.\n";
        return;
    }

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
        echo 'Resend cURL error: ' . curl_error($ch) . "\n";
    } else {
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        echo "HTTP Status Code: $httpCode\n";
        echo "Response: $result\n";
    }
    curl_close($ch);
}

testResendEmail($to, $subject, $htmlBody);
