document.addEventListener('DOMContentLoaded', function() {
    loadSelectedWarehouse();
    initializeDrones();
});

function loadSelectedWarehouse() {
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    if (warehouse) {
        updateWarehouseDisplay(warehouse);
    }
}

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
    updateWarehouseDisplay(warehouse);
    // Reload drones for the selected warehouse
    initializeDrones();
}

function updateWarehouseDisplay(warehouse) {
    const warehouseInfo = document.querySelector('.selected-warehouse');
    warehouseInfo.innerHTML = `
        <div class="warehouse-info">
            <h3><i class="fas fa-warehouse"></i> ${warehouse.name}</h3>
            <p><i class="fas fa-location-dot"></i> ${warehouse.cityName}</p>
        </div>
        <button class="change-warehouse-btn" onclick="showWarehouseSelector()">
            <i class="fas fa-warehouse"></i> Change Warehouse
        </button>
    `;
}

function initializeDrones() {
    const droneGrid = document.getElementById('drone-grid');
    const selectedWarehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const savedDrones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    
    // Filter drones for selected warehouse or create new ones
    let drones;
    if (savedDrones.length) {
        // Ensure all drones 1–10 are included, even if some are missing in savedDrones
        drones = Array.from({ length: 10 }, (_, i) => {
            const id = i + 1;
            const existingDrone = savedDrones.find(d => d.id === id && (!d.warehouseId || d.warehouseId === selectedWarehouse?.id));
            return existingDrone || {
                id: id,
                name: `Drone ${id}`,
                hasPackage: false,
                isActive: false,
                hasCamera: false,
                isAssigned: false,
                warehouseId: selectedWarehouse?.id
            };
        });
    } else {
        // Generate drones 1 through 10
        drones = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Drone ${i + 1}`,
            hasPackage: false,
            isActive: false,
            hasCamera: false,
            isAssigned: false,
            warehouseId: selectedWarehouse?.id
        }));
    }

    // Update the drone grid with all 10 drones
    droneGrid.innerHTML = drones.map(drone => `
        <div class="drone-card" data-drone-id="${drone.id}">
            <div class="drone-header">
                <div class="drone-icon">
                    <i class="fas fa-drone"></i>
                </div>
                <div class="drone-name">${drone.name}</div>
            </div>
            <div class="drone-controls">
                <div class="control-buttons">
                    <button class="control-btn package-btn ${drone.hasPackage ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'hasPackage', !${drone.hasPackage})">
                        <i class="fas fa-box"></i>
                        Package System
                    </button>
                    <button class="control-btn status-btn ${drone.isActive ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'isActive', !${drone.isActive})">
                        <i class="fas fa-power-off"></i>
                        Active Status
                    </button>
                    <button class="control-btn camera-btn ${drone.hasCamera ? 'active' : ''}"
                            onclick="updateDroneStatus(${drone.id}, 'hasCamera', !${drone.hasCamera})">
                        <i class="fas fa-camera"></i>
                        Camera System
                    </button>
                </div>
                <button class="assign-btn ${drone.isAssigned ? 'assigned' : ''}"
                        onclick="assignDeliveryDuties(${drone.id})">
                    <i class="fas fa-tasks"></i>
                    ${drone.isAssigned ? 'View Assignment' : 'Assign Duties'}
                </button>
                <button class="start-mission-btn ${(drone.isActive && drone.hasPackage && drone.isAssigned) ? '' : 'disabled'}"
                        onclick="startMission(${drone.id})"
                        ${(drone.isActive && drone.hasPackage && drone.isAssigned) ? '' : 'disabled'}>
                    <i class="fas fa-play"></i>
                    Start Mission
                </button>
            </div>
        </div>
    `).join('');
}

function startMission(droneId) {
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id === droneId);
    
    if (!drone || !drone.isActive || !drone.isAssigned) {
        alert('Drone must be active and have assigned duties before starting a mission.');
        return;
    }

    // Get selected DDTs and prepare waypoints
    const selectedDDTs = [];
    if (drone.packages) {
        const allDDTs = JSON.parse(localStorage.getItem('ddts') || '[]');
        drone.packages.forEach(pkg => {
            if (pkg.active && pkg.selectedDDT) {
                const ddt = allDDTs.find(d => d.id == pkg.selectedDDT);
                if (ddt) {
                    selectedDDTs.push(ddt);
                }
            }
        });
    }

    // Store mission data in sessionStorage
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const missionWaypoints = [
        { latitude: warehouse.lat, longitude: warehouse.lng },
        ...selectedDDTs.map(ddt => ({ latitude: ddt.lat, longitude: ddt.lng })),
        // Add return to warehouse waypoint
        { latitude: warehouse.lat, longitude: warehouse.lng }
    ];
    
    sessionStorage.setItem('missionWaypoints', JSON.stringify(missionWaypoints));
    sessionStorage.setItem('missionInfo', JSON.stringify({
        droneId: drone.id,
        droneName: drone.name,
        warehouseName: warehouse.name,
        ddtCount: selectedDDTs.length
    }));
    
    // Store the selected drone ID and navigate to tower page
    localStorage.setItem('selectedDroneId', droneId);
    window.location.href = 'tower.html';
}

function updateDroneStatus(droneId, property, value) {
    const selectedWarehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    
    if (property === 'hasPackage') {
        localStorage.setItem('selectedDroneId', droneId);
        localStorage.setItem('selectedWarehouseId', selectedWarehouse.id);
        window.location.href = 'package-system.html';
        return;
    }
    
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id === droneId);
    
    if (droneIndex === -1) {
        // Ensure all 10 drones are created if a new drone is being updated
        const newDrones = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Drone ${i + 1}`,
            hasPackage: false,
            isActive: false,
            hasCamera: false,
            isAssigned: false,
            warehouseId: selectedWarehouse?.id
        }));
        newDrones[droneId - 1][property] = value;
        localStorage.setItem('availableDrones', JSON.stringify(newDrones));
    } else {
        drones[droneIndex][property] = value;
        drones[droneIndex].warehouseId = selectedWarehouse?.id;
        localStorage.setItem('availableDrones', JSON.stringify(drones));
    }
    
    initializeDrones();
}

function assignDeliveryDuties(droneId) {
    // Store the selected drone ID
    localStorage.setItem('selectedDroneId', droneId);
    // Navigate to the delivery duties page
    window.location.href = 'delivery-duties.html';
}

function saveDronesAndReturn() {
    window.location.href = 'drone.html';
}