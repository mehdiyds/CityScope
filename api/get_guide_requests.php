<?php
header('Content-Type: application/json');
require_once 'config.php';

try {
    $stmt = $pdo->query('
        SELECT gr.*, g.name AS assigned_guide_name
        FROM guide_requests gr
        LEFT JOIN guides g ON gr.assigned_guide_id = g.id
        ORDER BY gr.created_at DESC
    ');
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'requests' => $requests]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>