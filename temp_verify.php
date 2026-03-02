<?php
require_once __DIR__ . '/api/config.php';
$db = getDB();
$stmt = $db->query('SELECT config FROM form_config ORDER BY id DESC LIMIT 1');
$row = $stmt->fetch();
if ($row) {
    echo $row['config'];
} else {
    echo "NO_CONFIG";
}
