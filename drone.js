// Check authentication
function checkAuth() {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
}

//checkAuth();

// Ensure the map container exists and is styled
document.addEventListener('DOMContentLoaded', function() {
    const mapContainer = document.getElementById('drone-map');
    if (!mapContainer) {
        const container = document.createElement('div');
        container.id = 'drone-map';
        container.style.width = '100%';
        container.style.height = '500px';
        document.body.appendChild(container);
    }
    checkSelectedWarehouse();
    loadActiveDrones();
});

// Initialize map with Hybrid Layer from Google Maps
const map = L.map('drone-map').setView([0, 0], 2);

const hybridLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Hybrid'
});

hybridLayer.addTo(map);

    
// Drone management
let drones = [];
let selectedDrone = null;
let selectedWarehouse = null;

// Add warehouse selection functionality
document.getElementById('select-warehouse-btn').addEventListener('click', () => {
    window.location.href = 'warehouse-selection.html';
});

// Add function to check for selected warehouse on page load
function checkSelectedWarehouse() {
    const selectedWarehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    if (selectedWarehouse) {
        selectWarehouse(selectedWarehouse);
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    checkSelectedWarehouse();
});

function showWarehouseSelector() {
    // Fetch warehouses from localStorage
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
                <div class="warehouse-option ${selectedWarehouse?.id === w.id ? 'selected' : ''}" 
                     data-warehouse-id="${w.id}">
                    <i class="fas fa-warehouse"></i>
                    <div class="warehouse-details">
                        <span class="warehouse-name">${w.name}</span>
                        <span class="warehouse-location">Lat: ${w.lat.toFixed(4)}, Lng: ${w.lng.toFixed(4)}</span>
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
    const confirmBtn = popup.querySelector('.confirm-btn');
    confirmBtn.addEventListener('click', () => {
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
    selectedWarehouse = warehouse;
    document.getElementById('add-drone-btn').disabled = false;
    
    // Clear existing markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Zoom to warehouse location
    map.setView([warehouse.lat, warehouse.lng], 16);
    
    // Add warehouse marker
    addWarehouseToMap(warehouse);
    
    // Load and display DDTs within warehouse radius
    const allDDTs = JSON.parse(localStorage.getItem('ddts') || '[]');
    const warehouseRadius = 2; // radius in kilometers
    const warehouseDDTs = allDDTs.filter(ddt => {
        // Calculate distance between warehouse and DDT
        const distance = calculateDistance(
            warehouse.lat, 
            warehouse.lng, 
            ddt.lat, 
            ddt.lng
        );
        return distance <= warehouseRadius;
    });
    
    warehouseDDTs.forEach(ddt => addDDTToMap(ddt));
    
    // Update warehouse selection display
    const warehouseDisplay = document.createElement('div');
    warehouseDisplay.className = 'selected-warehouse';
    warehouseDisplay.innerHTML = `
        <div class="warehouse-info">
            <i class="fas fa-warehouse"></i>
            <span>${warehouse.name}</span>
        </div>
        <button class="change-warehouse-btn" onclick="showWarehouseSelector()">
            Change
        </button>
    `;
    
    // Replace or add the warehouse display
    const existingDisplay = document.querySelector('.selected-warehouse');
    if (existingDisplay) {
        existingDisplay.replaceWith(warehouseDisplay);
    } else {
        document.getElementById('select-warehouse-btn').insertAdjacentElement('afterend', warehouseDisplay);
    }
    
    // Hide the select warehouse button
    document.getElementById('select-warehouse-btn').style.display = 'none';

    // Reload active drones for this warehouse
    loadActiveDrones();
}

// Add helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
}

// Add drone handler
document.getElementById('add-drone-btn').addEventListener('click', () => {
    if (!selectedWarehouse) {
        alert('Please select a warehouse first');
        return;
    }
    window.location.href = 'drone-assignment.html';
});

// Update drone list
function updateDroneList() {
    const list = document.getElementById('drone-list');
    list.innerHTML = '<h3>Available Drones</h3>';
    
    drones.forEach(drone => {
        const item = document.createElement('div');
        item.className = `drone-item ${selectedDrone === drone ? 'selected' : ''} ${drone.active ? '' : 'drone-inactive'}`;
        item.innerHTML = `
            <div class="drone-info">
                <strong>${drone.name}</strong>
                <div class="drone-status">Status: ${drone.status}</div>
                <div class="drone-battery">Battery: ${drone.battery}%</div>
                <div class="drone-package">Package: ${drone.package || 'Not assigned'}</div>
            </div>
            <div class="drone-actions">
                <button class="action-btn package-btn" onclick="showPackageSelector(${drone.id})" title="Select Package">
                    <i class="fas fa-box"></i>
                </button>
                <button class="action-btn toggle-btn" onclick="toggleDrone(${drone.id})" title="${drone.active ? 'Disable' : 'Enable'} Drone">
                    <i class="fas fa-${drone.active ? 'eye' : 'eye-slash'}"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteDrone(${drone.id})" title="Delete Drone">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.drone-actions')) {
                selectDrone(drone);
            }
        });
        list.appendChild(item);
    });
}

// Select drone
function selectDrone(drone) {
    selectedDrone = drone;
    updateDroneList();
}

// Add package selector functionality
function showPackageSelector(droneId) {
    const drone = drones.find(d => d.id === droneId);
    
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    const popup = document.createElement('div');
    popup.className = 'package-popup';
    popup.innerHTML = `
        <h3>Select Package</h3>
        <div class="package-options">
            <div class="package-option ${drone.package === '1' ? 'selected' : ''}" data-package="1">
                <i class="fas fa-box"></i> Package 1
            </div>
            <div class="package-option ${drone.package === '2' ? 'selected' : ''}" data-package="2">
                <i class="fas fa-box"></i> Package 2
            </div>
            <div class="package-option ${drone.package === '3' ? 'selected' : ''}" data-package="3">
                <i class="fas fa-box"></i> Package 3
            </div>
            <div class="package-option ${drone.package === '4' ? 'selected' : ''}" data-package="4">
                <i class="fas fa-box"></i> Package 4
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    const options = popup.querySelectorAll('.package-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const packageNumber = option.dataset.package;
            updateDronePackage(droneId, packageNumber);
            closePackageSelector();
        });
    });
    
    overlay.addEventListener('click', closePackageSelector);
}

function closePackageSelector() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.package-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
}

function updateDronePackage(droneId, packageNumber) {
    const drone = drones.find(d => d.id === droneId);
    if (drone) {
        drone.package = packageNumber;
        updateDroneList();
    }
}

// Add toggle drone functionality
function toggleDrone(droneId) {
    const drone = drones.find(d => d.id === droneId);
    if (drone) {
        drone.active = !drone.active;
        updateDroneList();
        // Update drone marker on map
        updateDroneMarker(drone);
        // Save changes to localStorage
        saveDronesToStorage();
    }
}

// Add function to update drone marker
function updateDroneMarker(drone) {
    if (drone.marker) {
        drone.marker.setOpacity(drone.active ? 1 : 0.5);
    } else {
        // Create marker if it doesn't exist
        drone.marker = L.marker([drone.position.lat, drone.position.lng], {
            opacity: drone.active ? 1 : 0.5,
            icon: L.divIcon({
                className: 'drone-marker',
                html: `
                    <div class="drone-point ${drone.active ? '' : 'inactive'}">
                        <i class="fas fa-drone"></i>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);

        // Add popup for drone
        drone.marker.bindPopup(`
            <div class="drone-popup">
                <h4>${drone.name}</h4>
                <p>Status: ${drone.status}</p>
                <p>Battery: ${drone.battery}%</p>
            </div>
        `);
    }
}

// Add function to save drones to localStorage
function saveDronesToStorage() {
    localStorage.setItem('activeDrones', JSON.stringify(drones));
}

// Initialize the page
updateDroneList();

// After map initialization, add these variables
let ddts = [];
let warehouses = [];

// Add function to load DDTs and warehouses
function loadSavedLocations() {
    // Load DDTs
    const savedDDTs = localStorage.getItem('ddts');
    if (savedDDTs) {
        ddts = JSON.parse(savedDDTs);
        ddts.forEach(ddt => addDDTToMap(ddt));
    }

    // Load warehouses
    const savedWarehouses = localStorage.getItem('warehouses');
    if (savedWarehouses) {
        warehouses = JSON.parse(savedWarehouses);
        warehouses.forEach(warehouse => addWarehouseToMap(warehouse));
    }
}

// Add function to display DDTs on map
function addDDTToMap(ddt) {
    const marker = L.marker([ddt.lat, ddt.lng], {
        icon: L.icon({
            iconUrl: 'images/DDt.jpg',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15],
            className: 'ddt-marker'
        })
    });

    marker.bindPopup(`
        <div class="ddt-popup">
            <h4>${ddt.name}</h4>
            <p>Rack: ${ddt.rack || 'Not assigned'}</p>
            <p>Status: ${ddt.active ? 'Active' : 'Inactive'}</p>
            <p>Location: ${ddt.lat.toFixed(6)}, ${ddt.lng.toFixed(6)}</p>
        </div>
    `);

    marker.addTo(map);
}

// Add function to display warehouses on map
function addWarehouseToMap(warehouse) {
    const marker = L.marker([warehouse.lat, warehouse.lng], {
        icon: L.icon({
            iconUrl: 'images/Warehouse.webp',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
            className: 'warehouse-marker'
        })
    });

    marker.bindPopup(`
        <div class="warehouse-popup">
            <h4>${warehouse.name}</h4>
            <p>Location: ${warehouse.lat.toFixed(6)}, ${warehouse.lng.toFixed(6)}</p>
            <p>Status: Active</p>
        </div>
    `);

    marker.addTo(map);
}

// Load active drones from localStorage
function loadActiveDrones() {
    if (!selectedWarehouse) return;
    
    const allDrones = JSON.parse(localStorage.getItem('activeDrones') || '[]');
    drones = allDrones.filter(drone => drone.warehouseId === selectedWarehouse.id);
    
    // Create markers for all drones
    drones.forEach(drone => {
        updateDroneMarker(drone);
    });
    updateDroneList();
}

// Call loadActiveDrones when initializing the page
loadActiveDrones();