const https = require('https');

const API_KEY = 're_jSCBfK4y_N2iNcEJrWcwLfAodxX6qzBAs';
const TO_EMAIL = 'nzlogistics9@gmail.com';

const postData = JSON.stringify({
    from: 'N&Z Logistics Notifications <onboarding@resend.dev>',
    to: [TO_EMAIL],
    subject: 'Test Email from Node.js (Admin Notification)',
    html: '<h2>This is a test email</h2><p>Testing the Resend API from Node.js.</p>'
});

const options = {
    hostname: 'api.resend.com',
    port: 443,
    path: '/emails',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`RESPONSE: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
