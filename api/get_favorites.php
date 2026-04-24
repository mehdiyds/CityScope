<?php
require 'config.php';
header('Content-Type: application/json');

try {
    // Récupérer tous les favoris ajoutés
    $stmt = $pdo->query("SELECT * FROM favorites ORDER BY id DESC");
    $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Renvoyer les résultats au navigateur (JavaScript) en JSON
    echo json_encode($favorites);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erreur lors de la récupération : " . $e->getMessage()]);
}
?>
