<?php
// On autorise l'accès depuis notre application AJAX
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Configuration XAMPP par défaut
$host = 'localhost';
$dbname = 'meteo_app';
$username = 'root';    
$password = '';        

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    // Demander à PDO d'afficher les erreurs si la requête SQL est mauvaise
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // Si la base n'est pas encore créée, on renvoie une erreur propre en JSON
    die(json_encode(["error" => "Base de données non trouvée. N'oubliez pas d'importer database.sql dans phpMyAdmin."]));
}
?>
