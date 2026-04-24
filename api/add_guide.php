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

    $name = trim($data['name'] ?? '');
    $city = trim($data['city'] ?? '');
    $languages = trim($data['languages'] ?? '');

    if (empty($name) || empty($city) || empty($languages)) {
        throw new Exception('Veuillez remplir tous les champs (Nom, Ville, Langues).');
    }

    $stmt = $pdo->prepare('INSERT INTO guides (name, city, languages, status) VALUES (?, ?, ?, "active")');
    $stmt->execute([$name, $city, $languages]);

    echo json_encode([
        'success' => true,
        'message' => 'Guide ajouté avec succès',
        'id' => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>