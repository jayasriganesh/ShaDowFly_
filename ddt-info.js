// Check authentication
function checkAuth() {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
}

checkAuth();

// Load locations from localStorage
const warehouses = JSON.parse(localStorage.getItem('warehouses')) || [];
const ddts = JSON.parse(localStorage.getItem('ddts')) || [];
let selectedWarehouseId = null;
const WAREHOUSE_RANGE = 10; // 10 km range for DDTs

// Initialize page
function initializePage() {
    populateWarehouses();
    populateDDTs();
}

// Calculate distance between two points
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

// Get DDTs within range of a warehouse
function getDDTsInRange(warehouse) {
    return ddts.filter(ddt => {
        const distance = calculateDistance(warehouse.lat, warehouse.lng, ddt.lat, ddt.lng);
        return distance <= WAREHOUSE_RANGE;
    });
}

// Populate warehouses
function populateWarehouses() {
    const warehouseList = document.getElementById('warehouse-list');
    warehouseList.innerHTML = warehouses.map(warehouse => `
        <div class="location-item ${warehouse.id === selectedWarehouseId ? 'selected' : ''}" 
             onclick="selectWarehouse(${warehouse.id})">
            <div class="location-info">
                <div class="location-name">${warehouse.name}</div>
                <div class="location-coords">
                    <i class="fas fa-location-dot"></i> 
                    ${warehouse.lat.toFixed(6)}, ${warehouse.lng.toFixed(6)}
                </div>
            </div>
            <div class="location-actions">
                <button class="action-btn edit-btn" onclick="editWarehouse(${warehouse.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteWarehouse(${warehouse.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Select warehouse and show relevant DDTs
function selectWarehouse(id) {
    selectedWarehouseId = id;
    populateWarehouses(); // Update selected state
    populateDDTs(); // Update DDT list
}

// Populate DDTs
function populateDDTs() {
    const ddtList = document.getElementById('ddt-list');
    const ddtsToShow = selectedWarehouseId 
        ? getDDTsInRange(warehouses.find(w => w.id === selectedWarehouseId))
        : ddts;

    const ddtSection = document.querySelector('.ddts-section h2');
    ddtSection.innerHTML = selectedWarehouseId 
        ? `<i class="fas fa-map-marker-alt"></i> DDTs (Within ${WAREHOUSE_RANGE}km range)`
        : `<i class="fas fa-map-marker-alt"></i> All DDTs`;

    ddtList.innerHTML = ddtsToShow.map(ddt => `
        <div class="location-item ${!ddt.active ? 'inactive' : ''}">
            <div class="location-info">
                <div class="location-name">${ddt.name}</div>
                <div class="location-coords">
                    <i class="fas fa-location-dot"></i> 
                    ${ddt.lat.toFixed(6)}, ${ddt.lng.toFixed(6)}
                    ${selectedWarehouseId ? `
                        <div class="distance-info">
                            <i class="fas fa-route"></i> 
                            ${calculateDistance(
                                warehouses.find(w => w.id === selectedWarehouseId).lat,
                                warehouses.find(w => w.id === selectedWarehouseId).lng,
                                ddt.lat,
                                ddt.lng
                            ).toFixed(2)} km
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="location-actions">
                <button class="action-btn edit-btn" onclick="editDDT(${ddt.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteDDT(${ddt.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Edit warehouse
function editWarehouse(id) {
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse) {
        const newName = prompt('Enter new name for warehouse:', warehouse.name);
        if (newName && newName.trim()) {
            warehouse.name = newName.trim();
            localStorage.setItem('warehouses', JSON.stringify(warehouses));
            populateWarehouses();
        }
    }
}

// Delete warehouse
function deleteWarehouse(id) {
    if (confirm('Are you sure you want to delete this warehouse?')) {
        const index = warehouses.findIndex(w => w.id === id);
        if (index !== -1) {
            warehouses.splice(index, 1);
            localStorage.setItem('warehouses', JSON.stringify(warehouses));
            populateWarehouses();
        }
    }
}

// Edit DDT
function editDDT(id) {
    const ddt = ddts.find(d => d.id === id);
    if (ddt) {
        const newName = prompt('Enter new name for DDT:', ddt.name);
        if (newName && newName.trim()) {
            ddt.name = newName.trim();
            localStorage.setItem('ddts', JSON.stringify(ddts));
            populateDDTs();
        }
    }
}

// Delete DDT
function deleteDDT(id) {
    if (confirm('Are you sure you want to delete this DDT?')) {
        const index = ddts.findIndex(d => d.id === id);
        if (index !== -1) {
            ddts.splice(index, 1);
            localStorage.setItem('ddts', JSON.stringify(ddts));
            populateDDTs();
        }
    }
}

// Initialize the page
initializePage(); 