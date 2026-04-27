CREATE DATABASE IF NOT EXISTS meteo_app;
USE meteo_app;

CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (city)
);

CREATE TABLE IF NOT EXISTS guide_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    tour_type VARCHAR(100) NOT NULL,
    party_size INT NOT NULL,
    budget INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    tour_date DATE NOT NULL,
    tour_duration VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    assigned_guide_id INT NULL,
    INDEX (city),
    INDEX (email)
);

CREATE TABLE IF NOT EXISTS guides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    languages VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS guide_unavailabilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guide_id INT NOT NULL,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(255),
    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
    UNIQUE (guide_id, unavailable_date)
);

