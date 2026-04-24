<?php
// ============================================================
// CityScope — api/upload.php
// Gestion sécurisée de l'upload de photos
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Inclusion de la configuration ────────────────────────────
require 'config.php';

// ── Constantes de sécurité ──────────────────────────────────
const MAX_FILE_SIZE = 2 * 1024 * 1024;  // 2MB en bytes
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/jpg'];
const UPLOAD_DIR = __DIR__ . '/../uploads/';

// ── Vérifier que le dossier uploads existe ──────────────────
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

try {
    // ── ÉTAPE 1 : Validations des données ────────────────────
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Méthode non autorisée');
    }

    // Vérifier les champs obligatoires
    if (empty($_POST['city']) || empty($_POST['username']) || empty($_FILES['photo'])) {
        throw new Exception('Champs obligatoires manquants');
    }

    $city = trim($_POST['city']);
    $username = trim($_POST['username']);
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $file = $_FILES['photo'];

    // ── Validations des entrées ─────────────────────────────
    if (strlen($city) < 2 || strlen($city) > 100) {
        throw new Exception('Nom de ville invalide');
    }

    if (strlen($username) < 2 || strlen($username) > 100) {
        throw new Exception('Nom d\'utilisateur invalide (2-100 caractères)');
    }

    if (strlen($description) > 500) {
        throw new Exception('Description trop longue (max 500 caractères)');
    }

    // ── ÉTAPE 2 : Validations du fichier ─────────────────────
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (limité par le serveur)',
            UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux (dépasst la limite du formulaire)',
            UPLOAD_ERR_PARTIAL => 'Fichier partiellement uploadé',
            UPLOAD_ERR_NO_FILE => 'Aucun fichier fourni',
            UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire manquant',
            UPLOAD_ERR_CANT_WRITE => 'Impossible d\'écrire le fichier',
            UPLOAD_ERR_EXTENSION => 'Extension non autorisée',
        ];
        $message = $errorMessages[$file['error']] ?? 'Erreur d\'upload inconnue';
        throw new Exception($message);
    }

    // Vérifier la taille du fichier
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('L\'image dépasse 2MB');
    }

    if ($file['size'] === 0) {
        throw new Exception('Le fichier est vide');
    }

    // Vérifier le type MIME
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, ALLOWED_MIMES)) {
        throw new Exception('Format de fichier non autorisé. Utilisez JPG ou PNG.');
    }

    // Vérifier l'extension du fichier
    $pathInfo = pathinfo($file['name']);
    $extension = strtolower($pathInfo['extension']);
    if (!in_array($extension, ['jpg', 'jpeg', 'png'])) {
        throw new Exception('Extension de fichier non autorisée');
    }

    // ── ÉTAPE 3 : Générer un nom de fichier sécurisé ────────
    // Format : city_timestamp_randomstring.ext
    $safeName = preg_replace('/[^a-zA-Z0-9]/', '_', $city);
    $timestamp = time();
    $randomStr = bin2hex(random_bytes(4));
    $newFilename = $safeName . '_' . $timestamp . '_' . $randomStr . '.' . $extension;
    $uploadPath = UPLOAD_DIR . $newFilename;

    // ── ÉTAPE 4 : Déplacer le fichier uploadé ───────────────
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        throw new Exception('Erreur lors du déplacement du fichier');
    }

    // ── ÉTAPE 5 : Enregistrer dans la base de données ────────
    try {
        $sql = "INSERT INTO photos (city, username, description, image) VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$city, $username, $description, $newFilename]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Photo ajoutée avec succès !',
            'filename' => $newFilename
        ]);

    } catch (PDOException $e) {
        // Si l'insertion échoue, supprimer le fichier uploadé
        @unlink($uploadPath);
        throw new Exception('Erreur base de données : ' . $e->getMessage());
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>
