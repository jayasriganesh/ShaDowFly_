document.addEventListener('DOMContentLoaded', function() {
    loadInfo();
    setupPackageHandlers();
});

function loadInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);

    if (!warehouse) {
        alert('Please select a warehouse first');
        window.location.href = 'drone-assignment.html';
        return;
    }

    if (!drone) {
        // If no drone is selected, select the first available drone for this warehouse
        const availableDrone = drones.find(d => d.warehouseId === warehouse.id);
        if (availableDrone) {
            localStorage.setItem('selectedDroneId', availableDrone.id);
            loadInfo();
            return;
        } else {
            alert('No drones available for this warehouse');
            window.location.href = 'drone-assignment.html';
            return;
        }
    }

    // Display drone info
    document.querySelector('.drone-info').innerHTML = `
        <div class="drone-details">
            <h3><i class="fas fa-drone"></i> ${drone.name}</h3>
            <p><i class="fas fa-power-off"></i> Status: 
                <span class="${drone.isActive ? 'text-success' : 'text-danger'}">
                    ${drone.isActive ? 'Active' : 'Inactive'}
                </span>
            </p>
        </div>
        <button class="change-drone-btn" onclick="showDroneSelector()">
            <i class="fas fa-drone"></i> Change Drone
        </button>
    `;

    // Display warehouse info
    document.querySelector('.warehouse-info').innerHTML = `
        <div class="warehouse-details">
            <h3><i class="fas fa-warehouse"></i> ${warehouse.name}</h3>
            <p><i class="fas fa-location-dot"></i> ${warehouse.cityName || 'No location'}</p>
        </div>
        <button class="change-warehouse-btn" onclick="showWarehouseSelector()">
            <i class="fas fa-warehouse"></i> Change Warehouse
        </button>
    `;

    // Load existing package configurations if any
    if (drone.packages) {
        loadPackageConfigurations(drone.packages);
    }
}

function setupPackageHandlers() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const packageCard = this.closest('.package-card');
            const ddtSelection = packageCard.querySelector('.ddt-selection');
            
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                this.innerHTML = '<i class="fas fa-power-off"></i><span>Active</span>';
                ddtSelection.classList.remove('hidden');
                loadDDTs(packageCard.dataset.package);
            } else {
                this.innerHTML = '<i class="fas fa-power-off"></i><span>Activate</span>';
                ddtSelection.classList.add('hidden');
            }
        });
    });
}

function loadDDTs(packageNumber) {
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const allDDTs = JSON.parse(localStorage.getItem('ddts') || '[]');
    
    // Filter DDTs within 5km radius of the warehouse
    const nearbyDDTs = allDDTs.filter(ddt => {
        const distance = calculateDistance(
            warehouse.lat,
            warehouse.lng,
            ddt.lat,
            ddt.lng
        );
        ddt.distance = distance; // Add distance to DDT object
        return distance <= 10; // 5km radius
    }).sort((a, b) => a.distance - b.distance);

    const ddtList = document.querySelector(`.package-card[data-package="${packageNumber}"] .ddt-list`);
    ddtList.innerHTML = nearbyDDTs.map(ddt => `
        <div class="ddt-item" data-ddt-id="${ddt.id}">
            <div class="ddt-header">
                <h4>${ddt.name}</h4>
                <span class="distance-badge">${ddt.distance.toFixed(1)} km</span>
            </div>
            <div class="ddt-details">
                <p>${ddt.description || 'No description available'}</p>
                <div class="ddt-info">
                    <span><i class="fas fa-map-marker-alt"></i> Location: ${ddt.lat.toFixed(4)}, ${ddt.lng.toFixed(4)}</span>
                    <span><i class="fas fa-clock"></i> Est. Time: ${Math.round(ddt.distance * 3)} min</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers for DDT selection
    ddtList.querySelectorAll('.ddt-item').forEach(item => {
        item.addEventListener('click', function() {
            ddtList.querySelectorAll('.ddt-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

async function fetchNearbyDDTs(warehouseLat, warehouseLng) {
    // For demonstration, we'll generate DDTs around the warehouse location
    // In a real application, this would be an API call to your backend
    const ddts = [];
    const locations = [
        { name: 'City Center', lat: warehouseLat + 0.01, lng: warehouseLng + 0.01 },
        { name: 'Shopping Mall', lat: warehouseLat - 0.01, lng: warehouseLng + 0.02 },
        { name: 'Business District', lat: warehouseLat + 0.02, lng: warehouseLng - 0.01 },
        { name: 'Residential Area', lat: warehouseLat - 0.015, lng: warehouseLng - 0.015 },
        { name: 'Industrial Park', lat: warehouseLat + 0.025, lng: warehouseLng + 0.02 }
    ];

    locations.forEach((loc, index) => {
        const distance = calculateDistance(warehouseLat, warehouseLng, loc.lat, loc.lng);
        if (distance <= 5) { // Only include DDTs within 5km
            ddts.push({
                id: index + 1,
                name: `DDT-${(index + 1).toString().padStart(3, '0')}`,
                location: loc.name,
                distance: distance,
                description: `Delivery route through ${loc.name}`,
                estimatedTime: Math.round(distance * 3), // Rough estimate: 3 min per km
                coordinates: { lat: loc.lat, lng: loc.lng }
            });
        }
    });

    return ddts.sort((a, b) => a.distance - b.distance);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI/180);
}

function loadPackageConfigurations(packages) {
    packages.forEach(pkg => {
        const packageCard = document.querySelector(`.package-card[data-package="${pkg.number}"]`);
        if (packageCard && pkg.active) {
            // Activate the package
            const toggleBtn = packageCard.querySelector('.toggle-btn');
            toggleBtn.classList.add('active');
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i><span>Active</span>';
            
            // Show DDT selection
            const ddtSelection = packageCard.querySelector('.ddt-selection');
            ddtSelection.classList.remove('hidden');
            
            // Load DDTs and select the previously selected one
            const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
            const allDDTs = JSON.parse(localStorage.getItem('ddts') || '[]');
            
            // Filter and sort DDTs
            const nearbyDDTs = allDDTs.filter(ddt => {
                const distance = calculateDistance(
                    warehouse.lat,
                    warehouse.lng,
                    ddt.lat,
                    ddt.lng
                );
                ddt.distance = distance;
                return distance <= 10;
            }).sort((a, b) => a.distance - b.distance);

            // Update DDT list
            const ddtList = packageCard.querySelector('.ddt-list');
            ddtList.innerHTML = nearbyDDTs.map(ddt => `
                <div class="ddt-item ${ddt.id == pkg.selectedDDT ? 'selected' : ''}" data-ddt-id="${ddt.id}">
                    <div class="ddt-header">
                        <h4>${ddt.name}</h4>
                        <span class="distance-badge">${ddt.distance.toFixed(1)} km</span>
                    </div>
                    <div class="ddt-details">
                        <p>${ddt.description || 'No description available'}</p>
                        <div class="ddt-info">
                            <span><i class="fas fa-map-marker-alt"></i> Location: ${ddt.lat.toFixed(4)}, ${ddt.lng.toFixed(4)}</span>
                            <span><i class="fas fa-clock"></i> Est. Time: ${Math.round(ddt.distance * 3)} min</span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click handlers for DDT selection
            ddtList.querySelectorAll('.ddt-item').forEach(item => {
                item.addEventListener('click', function() {
                    ddtList.querySelectorAll('.ddt-item').forEach(i => i.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });
        }
    });
}

function saveAndReturn() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id == droneId);

    if (droneIndex !== -1) {
        const packages = [];
        let hasError = false;

        document.querySelectorAll('.package-card').forEach(card => {
            const packageNumber = card.dataset.package;
            const isActive = card.querySelector('.toggle-btn').classList.contains('active');
            const selectedDDT = card.querySelector('.ddt-item.selected')?.dataset.ddtId;

            if (isActive && !selectedDDT) {
                alert(`Please select a DDT for Package ${packageNumber}`);
                hasError = true;
                return;
            }

            packages.push({
                number: packageNumber,
                active: isActive,
                selectedDDT: selectedDDT
            });
        });

        if (!hasError) {
            drones[droneIndex].packages = packages;
            drones[droneIndex].hasPackage = packages.some(p => p.active);
            localStorage.setItem('availableDrones', JSON.stringify(drones));
            window.location.href = 'drone-assignment.html';
        }
    } else {
        alert('Error: Drone not found');
    }
}

// Add warehouse selector functionality
function showWarehouseSelector() {
    const warehouses = JSON.parse(localStorage.getItem('warehouses') || '[]');
    
    if (warehouses.length === 0) {
        alert('No warehouses available. Please add warehouses in the admin dashboard first.');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = 'warehouse-selector-popup';
    popup.innerHTML = `
        <h3>Select Warehouse</h3>
        <div class="warehouse-list">
            ${warehouses.map(w => `
                <div class="warehouse-option" data-warehouse-id="${w.id}">
                    <i class="fas fa-warehouse"></i>
                    <div class="warehouse-details">
                        <span class="warehouse-name">${w.name}</span>
                        <span class="warehouse-location">${w.cityName}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="warehouse-selector-actions">
            <button class="confirm-btn">Confirm</button>
            <button class="cancel-btn">Cancel</button>
        </div>
    `;
    document.body.appendChild(popup);

    // Add click handlers for warehouse options
    const options = popup.querySelectorAll('.warehouse-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Add button handlers
    popup.querySelector('.confirm-btn').addEventListener('click', () => {
        const selectedOption = popup.querySelector('.warehouse-option.selected');
        if (selectedOption) {
            const warehouseId = selectedOption.dataset.warehouseId;
            const warehouse = warehouses.find(w => w.id == warehouseId);
            selectWarehouse(warehouse);
        }
        closeWarehouseSelector();
    });

    popup.querySelector('.cancel-btn').addEventListener('click', closeWarehouseSelector);
    overlay.addEventListener('click', closeWarehouseSelector);
}

function closeWarehouseSelector() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.warehouse-selector-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

function selectWarehouse(warehouse) {
    localStorage.setItem('selectedWarehouse', JSON.stringify(warehouse));
    loadInfo();
    
    // Reset all package selections
    document.querySelectorAll('.package-card').forEach(card => {
        const toggleBtn = card.querySelector('.toggle-btn');
        if (toggleBtn.classList.contains('active')) {
            toggleBtn.click(); // Deactivate any active packages
        }
    });
}

// Add drone selector functionality
function showDroneSelector() {
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const allDrones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drones = allDrones.filter(d => d.warehouseId === warehouse.id);
    
    if (drones.length === 0) {
        alert('No drones available for this warehouse.');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = 'drone-selector-popup';
    popup.innerHTML = `
        <h3>Select Drone</h3>
        <div class="drone-list">
            ${drones.map(d => `
                <div class="drone-option" data-drone-id="${d.id}">
                    <i class="fas fa-drone"></i>
                    <div class="drone-details">
                        <span class="drone-name">${d.name}</span>
                        <span class="drone-status ${d.isActive ? 'active' : 'inactive'}">
                            ${d.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="drone-selector-actions">
            <button class="confirm-btn">Confirm</button>
            <button class="cancel-btn">Cancel</button>
        </div>
    `;
    document.body.appendChild(popup);

    // Add click handlers for drone options
    const options = popup.querySelectorAll('.drone-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Add button handlers
    popup.querySelector('.confirm-btn').addEventListener('click', () => {
        const selectedOption = popup.querySelector('.drone-option.selected');
        if (selectedOption) {
            const droneId = selectedOption.dataset.droneId;
            const drone = drones.find(d => d.id == droneId);
            selectDrone(drone);
        }
        closeDroneSelector();
    });

    popup.querySelector('.cancel-btn').addEventListener('click', closeDroneSelector);
    overlay.addEventListener('click', closeDroneSelector);
}

function closeDroneSelector() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.drone-selector-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

function selectDrone(drone) {
    localStorage.setItem('selectedDroneId', drone.id);
    loadInfo();
    
    // Reset all package selections
    document.querySelectorAll('.package-card').forEach(card => {
        const toggleBtn = card.querySelector('.toggle-btn');
        if (toggleBtn.classList.contains('active')) {
            toggleBtn.click(); // Deactivate any active packages
        }
    });
} 