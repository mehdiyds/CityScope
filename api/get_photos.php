<?php
// ============================================================
// CityScope — api/get_photos.php
// Récupération des photos d'une ville
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Inclusion de la configuration ────────────────────────────
require 'config.php';

try {
    // ── ÉTAPE 1 : Récupérer et valider le paramètre 'city' ───
    if (!isset($_GET['city']) || empty($_GET['city'])) {
        throw new Exception('Paramètre city manquant');
    }

    $city = trim($_GET['city']);

    // Validation basique (même si la requête préparée protège déjà)
    if (strlen($city) < 2 || strlen($city) > 100) {
        throw new Exception('Nom de ville invalide');
    }

    // ── ÉTAPE 2 : Récupérer les photos de la base ───────────
    $sql = "SELECT id, city, username, description, image, created_at 
            FROM photos 
            WHERE city = ? 
            ORDER BY created_at DESC 
            LIMIT 100";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$city]);
    $photos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ── ÉTAPE 3 : Retourner les photos en JSON ───────────────
    http_response_code(200);
    echo json_encode($photos);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
