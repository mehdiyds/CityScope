document.addEventListener('DOMContentLoaded', () => {
    // === TABS LOGIC ===
    const tabPhotos = document.getElementById('tab-photos');
    const tabGuides = document.getElementById('tab-guides');
    const tabAddGuide = document.getElementById('tab-add-guide');
    
    const secPhotos = document.getElementById('admin-photos');
    const secGuides = document.getElementById('admin-guides');
    const secAddGuide = document.getElementById('admin-add-guide');

    function hideAllTabs() {
        [secPhotos, secGuides, secAddGuide].forEach(sec => {
            sec.classList.add('hidden');
            sec.classList.remove('active-section');
        });
        [tabPhotos, tabGuides, tabAddGuide].forEach(tab => tab.classList.remove('active-tab'));
    }

    tabPhotos.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllTabs();
        secPhotos.classList.remove('hidden');
        secPhotos.classList.add('active-section');
        tabPhotos.classList.add('active-tab');
    });

    tabGuides.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllTabs();
        secGuides.classList.remove('hidden');
        secGuides.classList.add('active-section');
        tabGuides.classList.add('active-tab');
        loadGuideRequests();
    });

    tabAddGuide.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllTabs();
        secAddGuide.classList.remove('hidden');
        secAddGuide.classList.add('active-section');
        tabAddGuide.classList.add('active-tab');
    });

    // Initial state
    tabPhotos.click();

    // === GESTION PHOTOS ===
    const cityInput = document.getElementById('admin-city-input');
    const searchBtn = document.getElementById('admin-search-btn');
    const photosContainer = document.getElementById('admin-photos-container');

    searchBtn.addEventListener('click', () => {
        if(cityInput.value) {
            fetchCityPhotos(cityInput.value);
        }
    });

    // Enter key to search
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    async function fetchCityPhotos(city) {
        photosContainer.innerHTML = '<p>Chargement des photos...</p>';
        try {
            const resp = await fetch(`api/get_photos.php?city=${encodeURIComponent(city)}`);
            const photos = await resp.json();
            
            photosContainer.innerHTML = '';
            if(!photos || photos.length === 0) {
                photosContainer.innerHTML = '<p>Aucune photo trouvée pour cette ville.</p>';
                return;
            }

            photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                // L'image est stockée en base avec juste son nom (ex: ma_photo.jpg).
                // Il faut lui rajouter le préfixe 'uploads/' pour l'afficher.
                let imagePath = `uploads/${photo.image}`;

                item.innerHTML = `
                    <img src="${imagePath}" alt="Photo de ${photo.city}" onerror="this.src='https://via.placeholder.com/200x150?text=Image+Introuvable'">
                    <button class="delete-btn material-symbols-rounded" data-id="${photo.id}" title="Supprimer">delete</button>
                    <div class="gallery-info">
                        <strong>${photo.username}</strong><br>
                        ${photo.description || '<i>Pas de description</i>'}
                    </div>
                `;
                item.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('Voulez-vous vraiment supprimer cette photo ?')) {
                        await deletePhoto(id, item);
                    }
                });
                photosContainer.appendChild(item);
            });
        } catch(e) {
            photosContainer.innerHTML = '<p>Erreur lors du chargement.</p>';
        }
    }

    async function deletePhoto(id, element) {
        try {
            const resp = await fetch('api/delete_photo.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const result = await resp.json();
            if (result.success) {
                element.remove();
            } else {
                alert('Erreur: ' + result.error);
            }
        } catch(e) {
            alert('Erreur serveur.');
        }
    }


    // === GESTION DEMANDES GUIDES ===
    const tbody = document.getElementById('guide-requests-body');

    async function loadGuideRequests() {
        tbody.innerHTML = '<tr><td colspan="8">Chargement...</td></tr>';
        try {
            const resp = await fetch('api/get_guide_requests.php');
            const data = await resp.json();
            if(!data.success) throw new Error(data.error);

            tbody.innerHTML = '';
            if(data.requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8">Aucune demande trouvée.</td></tr>';
                return;
            }

            for (const req of data.requests) {
                const tr = document.createElement('tr');
                let statusClass = req.status === 'assigned' ? 'status-assigned' : 'status-pending';
                let statusText = req.status === 'assigned' ? 'Assigné' : 'En attente';

                tr.innerHTML = `
                    <td>#${req.id}</td>
                    <td>${req.tour_date}</td>
                    <td>${req.city}</td>
                    <td>${req.email}</td>
                    <td>${req.party_size}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${req.assigned_guide_name || '-'}</td>
                    <td class="action-cell">
                        ${req.status === 'pending' ? `<button class="assign-btn" data-req='${JSON.stringify(req)}'>Assigner un guide</button>` : ''}
                    </td>
                `;

                if(req.status === 'pending') {
                    tr.querySelector('.assign-btn').addEventListener('click', (e) => showAssignOptions(e, req, tr));
                }

                tbody.appendChild(tr);
            }
        } catch(e) {
            tbody.innerHTML = `<tr><td colspan="8">Erreur: ${e.message}</td></tr>`;
        }
    }

    async function showAssignOptions(e, req, tr) {
        const btn = e.target;
        const cell = btn.parentElement;
        btn.innerHTML = 'Chargement guides...';
        btn.disabled = true;

        try {
            const resp = await fetch(`api/get_available_guides.php?date=${req.tour_date}&city=${encodeURIComponent(req.city)}`);
            const data = await resp.json();
            
            if(!data.success) {
                alert("Erreur base de données : " + data.error + "\n\nAvez-vous bien exécuté le code SQL pour créer 'guide_unavailabilities' et 'status' ?");
                cell.innerHTML = '<span style="color:red; font-size:12px;">Erreur SQL</span>';
                return;
            }

            if(data.guides.length === 0) {
                cell.innerHTML = '<span style="color:red; font-size:12px;">Aucun guide dispo</span>';
                return;
            }

            let selectHtml = `<select class="assign-select" id="sel-${req.id}">
                <option value="">-- Choisir --</option>`;
            data.guides.forEach(g => {
                selectHtml += `<option value="${g.id}">${g.name} (${g.languages})</option>`;
            });
            selectHtml += `</select><button class="assign-btn btn-confirm" data-id="${req.id}">OK</button>`;

            cell.innerHTML = selectHtml;

            cell.querySelector('.btn-confirm').addEventListener('click', async () => {
                const sel = document.getElementById(`sel-${req.id}`);
                if(!sel.value) return alert('Choisissez un guide');
                
                await assignGuide(req.id, sel.value);
            });

        } catch(err) {
            cell.innerHTML = 'Erreur';
        }
    }

    async function assignGuide(requestId, guideId) {
        try {
            const resp = await fetch('api/assign_guide.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, guide_id: guideId })
            });
            const result = await resp.json();
            if(result.success) {
                loadGuideRequests(); // Recharger la table
            } else {
                alert('Erreur: ' + result.error);
            }
        } catch(e) {
            alert('Erreur serveur');
        }
    }

    // === AJOUT D'UN NOUVEAU GUIDE ===
    const addGuideForm = document.getElementById('add-guide-form');
    const addGuideMsg = document.getElementById('add-guide-msg');

    addGuideForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('new-guide-name').value.trim();
        const city = document.getElementById('new-guide-city').value.trim();
        const languages = document.getElementById('new-guide-lang').value.trim();
        const btnSubmit = document.getElementById('btn-submit-guide');

        if (!name || !city || !languages) return;

        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Ajout en cours...';
        addGuideMsg.innerText = '';
        addGuideMsg.style.color = '';

        try {
            const resp = await fetch('api/add_guide.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, city, languages })
            });
            const data = await resp.json();

            if (data.success) {
                addGuideMsg.style.color = '#0f0';
                addGuideMsg.innerText = 'Guide ajouté avec succès !';
                addGuideForm.reset();
            } else {
                addGuideMsg.style.color = '#f55';
                addGuideMsg.innerText = 'Erreur : ' + data.error;
            }
        } catch (err) {
            addGuideMsg.style.color = '#f55';
            addGuideMsg.innerText = 'Erreur serveur.';
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Ajouter le guide';
        }
    });
});