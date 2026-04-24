// ============================================================
// METEOVILE — script.js
// ============================================================
// APIs utilisées :
//  1. OpenWeatherMap  → Météo actuelle + décalage horaire
//  2. RestCountries   → Monnaie, langue, population, continent
//  3. Wikipedia       → Attractions touristiques + images
// ============================================================

// ── CONFIGURATION ───────────────────────────────────────────
const OWM_KEY = '3773389bf74d8841181351a067dfcb83'; // OpenWeatherMap API Key

// ── SÉLECTION DES ÉLÉMENTS DOM ──────────────────────────────
// Ces variables seront initialisées après le DOMContentLoaded
let cityInput, searchBtn, errorMsg, errorText, loader, resultsContainer, favoritesContainer;
let cityNameEl, localTimeEl, favoriteBtn, favIcon;
let weatherIconEl, tempEl, weatherDescEl, humidityEl, windEl, feelsLikeEl, visibilityEl;
let populationEl, regionEl, currencyEl, languagesEl, countryFullEl, continentEl;

// État global
let currentFavorites    = [];
let currentSearchCity   = '';  // Pour passer la ville au formulaire de guide
let clockInterval       = null;  // Pour la mise à jour de l'horloge locale

// ── Initialisation après DOMContentLoaded ──────────────────
function initializeDOMElements() {
    cityInput         = document.getElementById('city-input');
    searchBtn         = document.getElementById('search-btn');
    errorMsg          = document.getElementById('error-message');
    errorText         = document.getElementById('error-text');
    loader            = document.getElementById('loader');
    resultsContainer  = document.getElementById('results-container');
    favoritesContainer= document.getElementById('favorites-container');

    // Héro
    cityNameEl        = document.getElementById('city-name');
    localTimeEl       = document.getElementById('local-time');
    favoriteBtn       = document.getElementById('favorite-btn');
    favIcon           = document.getElementById('fav-icon');

    // Météo
    weatherIconEl     = document.getElementById('weather-icon');
    tempEl            = document.getElementById('temp');
    weatherDescEl     = document.getElementById('weather-desc');
    humidityEl        = document.getElementById('humidity');
    windEl            = document.getElementById('wind');
    feelsLikeEl       = document.getElementById('feels-like');
    visibilityEl      = document.getElementById('visibility');

    // Infos ville
    populationEl      = document.getElementById('population');
    regionEl          = document.getElementById('region');
    currencyEl        = document.getElementById('currency');
    languagesEl       = document.getElementById('languages');
    countryFullEl     = document.getElementById('country-full');
    continentEl       = document.getElementById('continent');
}

// ============================================================
// FONCTION PRINCIPALE DE RECHERCHE
// ============================================================
async function search(city) {
    if (!city) {
        showError('Le champ est vide. Veuillez entrer une ville.');
        return;
    }

    hideError();
    showLoader(true);
    resultsContainer.classList.add('hidden');
    document.getElementById('main-nav')?.classList.add('hidden');

    try {
        // ── ÉTAPE 1 : OpenWeatherMap ────────────────────────
        const weatherData = await fetchWeather(city);

        // ── ÉTAPE 2 : APIs parallèles
        const countryCode = weatherData.sys.country; // ex: "FR"
        const cityName    = weatherData.name;         // Nom normalisé
        // Coordonnées lat/lon de la ville (fournies par OpenWeatherMap)
        const lat = weatherData.coord.lat;
        const lon = weatherData.coord.lon;

        // Stocker la ville pour le formulaire de guide
        currentSearchCity = cityName;

        const countryData = await fetchCountryInfo(countryCode);
        const forecastData = await fetchForecast(lat, lon);

        // ── ÉTAPE 3 : Affichage ─────────────────────────────
        renderWeather(weatherData);
        if (forecastData) renderForecast(forecastData);
        renderCityInfo(countryData, weatherData);
        
        // Afficher les sections complémentaires
        showPhotosSection(cityName);
        showGuidesSection(cityName);
        renderHero(weatherData, cityName);

        // Afficher la section, le menu & vérifier favoris
        showLoader(false);
        resultsContainer.classList.remove('hidden');
        document.getElementById('main-nav')?.classList.remove('hidden');
        checkIfFavorite(cityName);

    } catch (err) {
        showLoader(false);
        showError(err.message);
    }
}

// ============================================================
// API 1 — OpenWeatherMap
// ============================================================
async function fetchWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OWM_KEY}&units=metric&lang=fr`;
    const res  = await fetch(url);

    if (!res.ok) {
        if (res.status === 404) throw new Error("Ville non trouvée. Vérifiez l'orthographe.");
        if (res.status === 401) throw new Error('Clé API OpenWeatherMap invalide.');
        throw new Error('Erreur réseau. Réessayez plus tard.');
    }

    return res.json();
}

// ============================================================
// API 2 — RestCountries (sans clé, 100% gratuit)
// ============================================================
async function fetchCountryInfo(countryCode) {
    try {
        const res  = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
        if (!res.ok) throw new Error('RestCountries: pays non trouvé');
        const data = await res.json();
        return data[0]; // Tableau de 1 élément
    } catch {
        return null; // On ne bloque pas si l'API échoue
    }
}

// ============================================================
// API 1B — OpenWeatherMap Forecast (Prévisions 5 jours)
// ============================================================
async function fetchForecast(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric&lang=fr`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Forecast API échouée');
        return await res.json();
    } catch {
        return null; // On ne bloque pas si les prévisions échouent
    }
}

// (Anciennement Wikipedia Geosearch : fonctionnalité remplacée par la galerie de photos participative)

// ============================================================
// RENDU — Héro (nom ville + heure locale)
// ============================================================
function renderHero(weatherData, cityName) {
    if (!cityNameEl || !localTimeEl || !favoriteBtn) return;
    
    cityNameEl.textContent = `${cityName}, ${weatherData.sys.country}`;

    // weatherData.timezone = décalage en secondes par rapport à UTC
    // Date.now() retourne déjà des ms UTC → on ajoute simplement le timezone
    if (clockInterval) clearInterval(clockInterval);

    const updateClock = () => {
        // Date.now() est UTC en millisecondes
        const localMs = Date.now() + (weatherData.timezone * 1000);
        const local   = new Date(localMs);

        // On utilise getUTC* car on a manuellement décalé le timestamp
        const hh = String(local.getUTCHours()).padStart(2, '0');
        const mm = String(local.getUTCMinutes()).padStart(2, '0');
        const ss = String(local.getUTCSeconds()).padStart(2, '0');
        if (localTimeEl) localTimeEl.textContent = `Heure locale : ${hh}:${mm}:${ss}`;
    };

    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    favoriteBtn.classList.remove('hidden');
}

// ============================================================
// RENDU — Météo
// ============================================================
function renderWeather(data) {
    if (!tempEl || !weatherDescEl || !humidityEl || !windEl || !feelsLikeEl || !visibilityEl || !weatherIconEl) return;
    
    tempEl.textContent          = Math.round(data.main.temp);
    weatherDescEl.textContent   = capitalizeFirst(data.weather[0].description);
    humidityEl.textContent      = data.main.humidity;
    windEl.textContent          = Math.round(data.wind.speed * 3.6);
    feelsLikeEl.textContent     = Math.round(data.main.feels_like);
    visibilityEl.textContent    = data.visibility ? (data.visibility / 1000).toFixed(1) : 'N/A';

    const iconCode              = data.weather[0].icon;
    weatherIconEl.src           = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIconEl.classList.remove('hidden');
}

// ============================================================
// RENDU — Prévisions 5 jours
// ============================================================
function renderForecast(forecastData) {
    const forecastGrid = document.getElementById('forecast-grid');
    if (!forecastGrid || !forecastData || !forecastData.list) return;
    
    // Grouper par jour (on prend une prévision par jour à midi)
    const dayForecasts = {};
    forecastData.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', month: 'numeric', day: 'numeric' });
        
        // Prendre la prévision la plus proche de midi
        if (!dayForecasts[dateStr] || Math.abs(date.getHours() - 12) < Math.abs(new Date(dayForecasts[dateStr].dt * 1000).getHours() - 12)) {
            dayForecasts[dateStr] = forecast;
        }
    });
    
    forecastGrid.innerHTML = '';
    
    // Afficher les 5 premiers jours
    Object.values(dayForecasts).slice(0, 5).forEach(day => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        
        const dateStr = new Date(day.dt * 1000).toLocaleDateString('fr-FR', { weekday: 'short' });
        const tempMax = Math.round(day.main.temp_max);
        const tempMin = Math.round(day.main.temp_min);
        const icon = day.weather[0].icon;
        const desc = capitalizeFirst(day.weather[0].description);
        
        card.innerHTML = `
            <div class="forecast-day">${dateStr}</div>
            <img src="https://openweathermap.org/img/wn/${icon}.png" class="forecast-icon" alt="${desc}">
            <div class="forecast-temp">${tempMax}°</div>
            <div class="forecast-temp-min">${tempMin}°</div>
            <div class="forecast-desc">${desc}</div>
        `;
        
        forecastGrid.appendChild(card);
    });
}

// ============================================================
// RENDU — Infos de la ville / du pays
// ============================================================
function renderCityInfo(countryData, weatherData) {
    if (!populationEl || !regionEl || !currencyEl || !languagesEl || !countryFullEl || !continentEl) return;
    
    if (!countryData) {
        // Valeurs par défaut si RestCountries échoue
        populationEl.textContent = 'N/A';
        regionEl.textContent     = 'N/A';
        currencyEl.textContent   = 'N/A';
        languagesEl.textContent  = 'N/A';
        countryFullEl.textContent= weatherData.sys.country;
        continentEl.textContent  = 'N/A';
        return;
    }

    // Population
    const pop = countryData.population;
    populationEl.textContent = pop ? formatNumber(pop) : 'N/A';

    // Capitale (utilisée comme "Région / Capitale")
    const capitals = countryData.capital;
    regionEl.textContent = capitals ? capitals.join(', ') : 'N/A';

    // Monnaie
    const currencies = countryData.currencies;
    if (currencies) {
        const currencyList = Object.values(currencies)
            .map(c => `${c.name} (${c.symbol || '?'})`)
            .join(', ');
        currencyEl.textContent = currencyList;
    } else {
        currencyEl.textContent = 'N/A';
    }

    // Langues
    const langs = countryData.languages;
    if (langs) {
        languagesEl.textContent = Object.values(langs).join(', ');
    } else {
        languagesEl.textContent = 'N/A';
    }

    // Nom complet du pays
    countryFullEl.textContent = countryData.name?.common || weatherData.sys.country;

    // Continent
    const regions = countryData.continents;
    continentEl.textContent = regions ? regions.join(', ') : 'N/A';
}

// ============================================================
// GESTION DES PHOTOS PARTICIPATIVE (Upload / Galerie)
// ============================================================
function showPhotosSection(cityName) {
    const photosSection = document.getElementById('city-photos-section');
    const photoSectionCityLabel = document.getElementById('photo-section-city-label');
    const photoCityInput = document.getElementById('photo-city');
    
    if (!photosSection || !photoSectionCityLabel || !photoCityInput) return;
    
    photosSection.classList.remove('hidden');
    photoSectionCityLabel.textContent = cityName;
    photoCityInput.value = cityName;
    loadCityPhotos(cityName);
}

// ============================================================
// GESTION DES GUIDES TOURISTIQUES
// ============================================================
function showGuidesSection(cityName) {
    const guidesSection = document.getElementById('guides-section');
    if (!guidesSection) return;
    guidesSection.classList.remove('hidden');
}

async function loadCityPhotos(cityName) {
    const photosGallery = document.getElementById('photos-gallery');
    if (!photosGallery) return;
    
    try {
        photosGallery.innerHTML = '<div class="attractions-loading"><div class="spinner small"></div><p>Chargement des photos...</p></div>';
        const url = `api/get_photos.php?city=${encodeURIComponent(cityName)}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("Erreur réseau");
        const photos = await response.json();
        
        if (photos.error) {
            if (photosGallery) photosGallery.innerHTML = `<p style="color:#f87171; grid-column: 1/-1;">Erreur: ${photos.error}</p>`;
            return;
        }
        
        if (!Array.isArray(photos)) {
            if (photosGallery) photosGallery.innerHTML = "<p style='color:var(--clr-muted); grid-column: 1/-1; text-align:center;'>Aucune photo pour le moment. Soyez le premier à contribuer !</p>";
            return;
        }
        
        if (photos.length === 0) {
            if (photosGallery) photosGallery.innerHTML = "<p style='color:var(--clr-muted); grid-column: 1/-1; text-align:center;'>Aucune photo pour le moment. Soyez le premier à contribuer !</p>";
            return;
        }
        
        if (photosGallery) photosGallery.innerHTML = '';
        photos.forEach(photo => {
            if (!photosGallery) return;
            
            const card = document.createElement('div');
            card.className = 'photo-card';
            
            const img = document.createElement('img');
            img.src = `uploads/${photo.image}`;
            img.onerror = function() { this.style.display = 'none'; };
            
            const body = document.createElement('div');
            body.className = 'photo-card-body';
            
            const user = document.createElement('div');
            user.className = 'photo-card-user';
            user.textContent = "👤 " + photo.username;
            
            const desc = document.createElement('div');
            desc.className = 'photo-card-desc';
            desc.textContent = photo.description || '';
            
            const dateStr = document.createElement('div');
            dateStr.className = 'photo-card-date';
            dateStr.textContent = new Date(photo.created_at).toLocaleDateString('fr-FR');
            
            body.appendChild(user);
            body.appendChild(desc);
            body.appendChild(dateStr);
            
            card.appendChild(img);
            card.appendChild(body);
            
            photosGallery.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erreur loadCityPhotos:', error);
        if (photosGallery) {
           photosGallery.innerHTML = `<p style="color:#f87171; grid-column: 1/-1; text-align:center;">Impossible de charger les photos.</p>`;
        }
    }
}

function showUploadMessage(msg, type) {
    const uploadMessage = document.getElementById('upload-message');
    if (!uploadMessage) return;
    uploadMessage.textContent = msg;
    uploadMessage.className = `upload-message ${type}`;
    uploadMessage.classList.remove('hidden');
    setTimeout(() => { uploadMessage.classList.add('hidden'); }, 5000);
}

function showGuideMessage(msg, type) {
    const guideMessage = document.getElementById('guide-message');
    if (!guideMessage) return;
    guideMessage.textContent = msg;
    guideMessage.className = `guide-message ${type}`;
    guideMessage.classList.remove('hidden');
    setTimeout(() => { guideMessage.classList.add('hidden'); }, 6000);
}

// ============================================================
// UTILITAIRES
// ============================================================

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatNumber(n) {
    return n.toLocaleString('fr-FR');
}

function showLoader(visible) {
    if (loader) loader.classList.toggle('hidden', !visible);
}

function showError(message) {
    if (errorText) errorText.textContent = message;
    if (errorMsg) errorMsg.classList.remove('hidden');
}

function hideError() {
    if (errorMsg) errorMsg.classList.add('hidden');
    if (errorText) errorText.textContent = '';
}

// ============================================================
// GESTION DES FAVORIS (PHP/MySQL Backend)
// ============================================================

async function loadFavorites() {
    try {
        const res = await fetch('api/get_favorites.php');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!Array.isArray(data) && data.error) return;
        currentFavorites = data;
        renderFavorites(currentFavorites);
    } catch {
        // Silencieux si le backend n'est pas disponible
    }
}

async function renderFavorites(favorites) {
    if (!favoritesContainer) return;
    favoritesContainer.innerHTML = '';

    for (const fav of favorites) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(fav.city_name)}&appid=${OWM_KEY}&units=metric&lang=fr`;
            const res  = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();

            const card = document.createElement('div');
            card.classList.add('fav-card');

            const iconCode = data.weather[0].icon;
            card.innerHTML = `
                <img src="https://openweathermap.org/img/wn/${iconCode}.png" class="fav-card-icon" alt="">
                <div>
                    <span class="fav-card-city">${fav.city_name}</span>
                    <span class="fav-card-temp">${Math.round(data.main.temp)}°C</span>
                </div>
                <button class="fav-card-delete" title="Retirer des favoris">✖</button>
            `;

            card.querySelector('.fav-card-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleFavoriteAPI(fav.city_name);
                loadFavorites();
            });

            card.addEventListener('click', () => {
                cityInput.value = fav.city_name;
                search(fav.city_name);
            });

            if (favoritesContainer) favoritesContainer.appendChild(card);
        } catch { /* ignorer */ }
    }
}

function checkIfFavorite(cityName) {
    if (!favoriteBtn || !favIcon) return;
    const isFav = currentFavorites.some(f => f.city_name.toLowerCase() === cityName.toLowerCase());
    if (isFav) {
        favoriteBtn.classList.add('active');
        favIcon.textContent = 'star';
    } else {
        favoriteBtn.classList.remove('active');
        favIcon.textContent = 'star';
    }
}

async function toggleFavoriteAPI(cityName) {
    try {
        const res = await fetch('api/save_favorite.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: cityName }),
        });
        return await res.json();
    } catch (err) {
        console.error('Erreur API favoris :', err);
        return null;
    }
}

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les références DOM
    initializeDOMElements();

    // Event listeners
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const city = cityInput.value.trim();
            search(city);
        });
    }

    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });

        // ── Autocomplétion
        let suggestionTimeout;
        const suggestionsList = document.getElementById('suggestions-list');

        cityInput.addEventListener('input', (e) => {
            clearTimeout(suggestionTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 3) {
                if (suggestionsList) suggestionsList.classList.add('hidden');
                return;
            }

            suggestionTimeout = setTimeout(async () => {
                try {
                    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OWM_KEY}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    
                    if (data && data.length > 0 && suggestionsList) {
                        suggestionsList.innerHTML = data.map(place => {
                            const state = place.state ? `${place.state}` : '';
                            const searchString = `${place.name},${state ? ' ' + state + ',' : ''} ${place.country}`.replace(/'/g, "\\'");
                            
                            return `<li onclick="selectCitySuggestion('${searchString}')">
                                        <span class="suggestion-city">${place.name}</span>
                                        <span class="suggestion-details">${state ? state + ', ' : ''}${place.country}</span>
                                    </li>`;
                        }).join('');
                        suggestionsList.classList.remove('hidden');
                    } else if (suggestionsList) {
                        suggestionsList.classList.add('hidden');
                    }
                } catch (err) {
                    if (suggestionsList) suggestionsList.classList.add('hidden');
                }
            }, 400); // 400ms de debounce
        });
    }

    // Fermer les suggestions si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            const suggestionsList = document.getElementById('suggestions-list');
            if (suggestionsList) suggestionsList.classList.add('hidden');
        }
    });

    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            const cityName = cityNameEl.textContent.split(',')[0].trim();
            try {
                const result = await toggleFavoriteAPI(cityName);
                if (!result) {
                    alert("Impossible de sauvegarder.\n\n1. Vérifiez que l'URL est bien http://localhost/meteo-app/ \n2. Vérifiez que XAMPP (Apache + MySQL) est démarré.");
                    return;
                }
                if (result.error) { alert('Erreur PHP/MySQL : ' + result.error); return; }

                if (result.status === 'added') {
                    favoriteBtn.classList.add('active');
                } else if (result.status === 'removed') {
                    favoriteBtn.classList.remove('active');
                }
                loadFavorites();
            } catch (err) {
                alert('Erreur technique : ' + err.message);
            }
        });
    }

    // Gestionnaire du formulaire d'upload
    const uploadForm = document.getElementById('upload-photo-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('photo-file');
            const file = fileInput.files[0];
            
            if (file && file.size > 2 * 1024 * 1024) {
                showUploadMessage("L'image dépasse 2MB.", "error"); return;
            }
            
            const formData = new FormData(uploadForm);
            const submitBtn = document.getElementById('submit-photo-btn');
            if (!submitBtn) return;
            
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Envoi...';
            submitBtn.disabled = true;
            
            try {
                const res = await fetch('api/upload.php', { method: 'POST', body: formData });
                const result = await res.json();
                
                if (result.error) { showUploadMessage(result.error, "error"); } 
                else {
                    showUploadMessage(result.message, "success");
                    uploadForm.reset();
                    const photoCityInput = document.getElementById('photo-city');
                    const photoSectionCityLabel = document.getElementById('photo-section-city-label');
                    if (photoCityInput && photoSectionCityLabel) {
                        photoCityInput.value = photoSectionCityLabel.textContent; 
                        setTimeout(() => loadCityPhotos(photoCityInput.value), 500);
                    }
                }
            } catch (error) {
                showUploadMessage("Erreur d'upload.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Gestionnaire du formulaire de recherche de guides
    const findGuideForm = document.getElementById('find-guide-form');
    if (findGuideForm) {
        findGuideForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const language = document.getElementById('guide-language').value;
            const type = document.getElementById('guide-type').value;
            const people = document.getElementById('guide-people').value;
            const budget = document.getElementById('guide-budget').value;
            const date = document.getElementById('guide-date').value;
            const duration = document.getElementById('guide-duration').value;
            const email = document.getElementById('guide-email').value;
            const notes = document.getElementById('guide-notes').value;
            
            const submitBtn = findGuideForm.querySelector('.btn-find-guide');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Recherche en cours...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('api/save_guide_request.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        city: currentSearchCity || '',
                        language: language,
                        type: type,
                        people: parseInt(people),
                        budget: parseInt(budget),
                        date: date,
                        duration: duration,
                        email: email,
                        notes: notes
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showGuideMessage(
                        `✅ Recherche lancée ! Un guide spécialisé proposant des visites ${type.split('_').join(' ')} sera bientôt contacté. Nous vous enverrons ses propositions à ${email}.`,
                        'success'
                    );
                    findGuideForm.reset();
                } else {
                    showGuideMessage(`Erreur: ${data.error || 'Erreur lors de la demande.'}`, 'error');
                }
                
            } catch (error) {
                console.error('Guide request error:', error);
                showGuideMessage('Erreur de connexion. Veuillez réessayer.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Charger les favoris initiaux
    loadFavorites();
});

// Choix cliqué depuis l'autocomplétion
window.selectCitySuggestion = function(fullName) {
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const suggestionsList = document.getElementById('suggestions-list');
    
    if (cityInput) cityInput.value = fullName;
    if (suggestionsList) suggestionsList.classList.add('hidden');
    if (searchBtn) searchBtn.click();
};

