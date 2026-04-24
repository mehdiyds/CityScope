<?php
require 'config.php';
header('Content-Type: application/json');

// Lire les données envoyées par notre fetch() en JS (Format JSON attendu)
$data = json_decode(file_get_contents("php://input"));

if (isset($data->city)) {
    // Si la ville a la forme "Paris, FR", on ne garde que le "Paris" (optionnel mais plus propre)
    // Ici on va se contenter de supprimer les espaces invisibles autour avec trim()
    $city = trim($data->city);
    
    try {
        // On vérifie d'abord si la ville est déjà dans nos favoris
        $stmt = $pdo->prepare("SELECT id FROM favorites WHERE LOWER(city_name) = LOWER(:city)");
        $stmt->execute(['city' => $city]);
        $exists = $stmt->fetch();

        if ($exists) {
            // Elle existe : alors l'utilisateur a cliqué sur l'étoile pour la RETIRER !
            $stmtDelete = $pdo->prepare("DELETE FROM favorites WHERE id = :id");
            $stmtDelete->execute(['id' => $exists['id']]);
            echo json_encode(["status" => "removed", "message" => "Retirée des favoris."]);
        } else {
            // Elle n'existe pas : l'utilisateur a cliqué pour l'AJOUTER !
            $stmtInsert = $pdo->prepare("INSERT INTO favorites (city_name) VALUES (:city)");
            $stmtInsert->execute(['city' => $city]);
            echo json_encode(["status" => "added", "message" => "Ajoutée aux favoris."]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Erreur SQL : " . $e->getMessage()]);
    }

} else {
    http_response_code(400);
    echo json_encode(["error" => "Nom de ville manquant dans la requête."]);
}
?>
