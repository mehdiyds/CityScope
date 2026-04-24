<?php
header('Content-Type: application/json');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id = $data['id'] ?? 0;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID photo manquant']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT image FROM photos WHERE id = ?');
    $stmt->execute([$id]);
    $photo = $stmt->fetch();

    if (!$photo) {
        throw new Exception('Photo introuvable');
    }

    // Le nom en DB est stocké sans préfixe (ex: mac_ville_123.jpg).
    // Sur le serveur depuis api/, le dossier est ../uploads/
    $filepath = '../uploads/' . $photo['image'];
    if (file_exists($filepath)) {
        unlink($filepath);
    }

    $stmt = $pdo->prepare('DELETE FROM photos WHERE id = ?');
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>