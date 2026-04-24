<?php
header('Content-Type: application/json');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        throw new Exception('Données invalides');
    }

    // Validation des données
    $city = trim($data['city'] ?? '');
    $language = trim($data['language'] ?? '');
    $tour_type = trim($data['type'] ?? '');
    $party_size = intval($data['people'] ?? 0);
    $budget = intval($data['budget'] ?? 0);
    $email = trim($data['email'] ?? '');
    $tour_date = trim($data['date'] ?? '');
    $tour_duration = trim($data['duration'] ?? '');
    $notes = trim($data['notes'] ?? '');

    // Vérifications
    if (empty($city) || empty($language) || empty($tour_type) || empty($email)) {
        throw new Exception('Champs requis manquants');
    }

    if ($party_size < 1 || $party_size > 20) {
        throw new Exception('Nombre de personnes invalide');
    }

    if ($budget < 0) {
        throw new Exception('Budget invalide');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email invalide');
    }

    if (empty($tour_date)) {
        throw new Exception('Date de tour manquante');
    }

    // Valider la date
    $date = DateTime::createFromFormat('Y-m-d', $tour_date);
    if (!$date || $date->format('Y-m-d') !== $tour_date) {
        throw new Exception('Format de date invalide');
    }

    // Vérifier que la date n'est pas dans le passé
    $today = new DateTime();
    if ($date < $today) {
        throw new Exception('La date doit être dans le futur');
    }

    if (empty($tour_duration)) {
        throw new Exception('Durée de tour manquante');
    }

    // Insérer dans la base de données
    $stmt = $pdo->prepare('
        INSERT INTO guide_requests (city, language, tour_type, party_size, budget, email, tour_date, tour_duration, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([$city, $language, $tour_type, $party_size, $budget, $email, $tour_date, $tour_duration, $notes ?? '']);

    echo json_encode([
        'success' => true,
        'message' => 'Demande de guide enregistrée avec succès',
        'id' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur base de données: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
