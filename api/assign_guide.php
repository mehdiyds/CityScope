<?php
header('Content-Type: application/json');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$request_id = $data['request_id'] ?? 0;
$guide_id = $data['guide_id'] ?? 0;

if (!$request_id || !$guide_id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de demande ou du guide manquant']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE guide_requests SET status = "assigned", assigned_guide_id = ? WHERE id = ?');
    $stmt->execute([$guide_id, $request_id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>