<?php
header('Content-Type: application/json');
require_once 'config.php';

$date = $_GET['date'] ?? '';
$city = $_GET['city'] ?? '';

if (!$date || !$city) {
    http_response_code(400);
    echo json_encode(['error' => 'Date ou ville manquante']);
    exit;
}

try {
    // Un guide est dispo s'il n'a pas été assigné à une demande à la même date, 
    // s'il est 'active', et s'il n'a pas déclaré d'indisponibilité ce jour-là.
    // NOTE: On filtre par ville car le guide doit habiter la même ville.
    $stmt = $pdo->prepare('
        SELECT * FROM guides 
        WHERE city LIKE CONCAT("%", ?, "%")
        AND status = "active"
        AND id NOT IN (
            SELECT guide_id 
            FROM guide_unavailabilities 
            WHERE unavailable_date = ?
        )
        AND id NOT IN (
            SELECT assigned_guide_id 
            FROM guide_requests 
            WHERE tour_date = ? 
            AND status = "assigned" 
            AND assigned_guide_id IS NOT NULL
        )
    ');
    $stmt->execute([$city, $date, $date]);
    $guides = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'guides' => $guides]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>