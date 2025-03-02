document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadDroneInfo();
});

function initializeMap() {
    // Initialize the map centered on a default location
    const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        minZoom: 3,
        maxZoom: 18
    }).setView([0, 0], 13);

    // Add satellite tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // Get selected warehouse and drone information
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);

    if (warehouse) {
        // Center map on warehouse location
        map.setView([warehouse.lat, warehouse.lng], 15);

        // Add warehouse marker
        const warehouseIcon = L.divIcon({
            className: 'warehouse-marker',
            html: '<i class="fas fa-warehouse"></i>',
            iconSize: [30, 30]
        });

        L.marker([warehouse.lat, warehouse.lng], {
            icon: warehouseIcon
        }).addTo(map);

        // If drone has packages with DDTs, show them on the map
        if (drone && drone.packages) {
            const allDDTs = JSON.parse(localStorage.getItem('ddts') || '[]');
            drone.packages.forEach(pkg => {
                if (pkg.active && pkg.selectedDDT) {
                    const ddt = allDDTs.find(d => d.id == pkg.selectedDDT);
                    if (ddt) {
                        // Add DDT marker
                        const ddtIcon = L.divIcon({
                            className: 'ddt-marker',
                            html: '<i class="fas fa-location-dot"></i>',
                            iconSize: [24, 24]
                        });

                        L.marker([ddt.lat, ddt.lng], {
                            icon: ddtIcon
                        }).addTo(map);

                        // Draw route line from warehouse to DDT
                        L.polyline([
                            [warehouse.lat, warehouse.lng],
                            [ddt.lat, ddt.lng]
                        ], {
                            color: '#ffffff',
                            weight: 2,
                            opacity: 0.8
                        }).addTo(map);

                        // Add direction arrow
                        const arrowIcon = L.divIcon({
                            className: 'route-arrow',
                            html: '<i class="fas fa-chevron-right"></i>',
                            iconSize: [20, 20]
                        });

                        // Calculate midpoint for arrow
                        const midLat = (warehouse.lat + ddt.lat) / 2;
                        const midLng = (warehouse.lng + ddt.lng) / 2;

                        // Add arrow marker at midpoint
                        L.marker([midLat, midLng], {
                            icon: arrowIcon,
                            rotationAngle: calculateBearing(warehouse.lat, warehouse.lng, ddt.lat, ddt.lng)
                        }).addTo(map);
                    }
                }
            });

            // Fit bounds to show all markers
            const bounds = L.latLngBounds([warehouse.lat, warehouse.lng]);
            drone.packages.forEach(pkg => {
                if (pkg.active && pkg.selectedDDT) {
                    const ddt = allDDTs.find(d => d.id == pkg.selectedDDT);
                    if (ddt) {
                        bounds.extend([ddt.lat, ddt.lng]);
                    }
                }
            });
            map.fitBounds(bounds.pad(0.1));
        }
    }
}

function calculateBearing(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => deg * Math.PI / 180;
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return bearing;
}

function loadDroneInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));

    if (drone) {
        document.querySelector('.drone-info-card').innerHTML = `
            <h3><i class="fas fa-drone"></i> ${drone.name}</h3>
            <div class="drone-status">
                <p><i class="fas fa-box"></i> Package System: 
                    <span class="${drone.hasPackage ? 'text-success' : 'text-danger'}">
                        ${drone.hasPackage ? 'Enabled' : 'Disabled'}
                    </span>
                </p>
                <p><i class="fas fa-power-off"></i> Status: 
                    <span class="${drone.isActive ? 'text-success' : 'text-danger'}">
                        ${drone.isActive ? 'Active' : 'Inactive'}
                    </span>
                </p>
                <p><i class="fas fa-camera"></i> Camera: 
                    <span class="${drone.hasCamera ? 'text-success' : 'text-danger'}">
                        ${drone.hasCamera ? 'Enabled' : 'Disabled'}
                    </span>
                </p>
            </div>
        `;

        // Load route information if packages exist
        if (drone.packages && warehouse) {
            loadRouteInformation(drone.packages, warehouse);
        }
    }
}

function loadRouteInformation(packages, warehouse) {
    if (!packages || !warehouse) return;

    // Clear existing routes
    routeLayer.clearLayers();

    // Add route markers and lines for each package
    packages.forEach(package => {
        if (package.ddt && package.ddt.lat && package.ddt.lng) {
            // Add DDT marker
            const ddtIcon = L.icon({
                iconUrl: 'images/DDt.jpg',
                iconSize: [25, 25],
                iconAnchor: [12.5, 12.5],
                popupAnchor: [0, -12.5],
                className: 'ddt-marker'
            });

            L.marker([package.ddt.lat, package.ddt.lng], {
                icon: ddtIcon
            }).addTo(routeLayer);

            // Draw route line
            const routeLine = L.polyline([
                [warehouse.lat, warehouse.lng],
                [package.ddt.lat, package.ddt.lng]
            ], {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.6,
                dashArray: '10, 10'
            }).addTo(routeLayer);
        }
    });

    // Fit map bounds to show all markers
    const bounds = routeLayer.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function setupSelectionHandlers() {
    // Route selection
    document.querySelectorAll('.route-card').forEach(card => {
        card.addEventListener('click', () => {
            selectRoute(card.dataset.route);
        });
    });

    // Schedule selection
    document.querySelectorAll('.schedule-card').forEach(card => {
        card.addEventListener('click', () => {
            selectSchedule(card.dataset.schedule);
        });
    });

    // Priority selection
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectPriority(btn.dataset.priority);
        });
    });
}

function selectRoute(route) {
    document.querySelectorAll('.route-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.route === route);
    });
}

function selectSchedule(schedule) {
    document.querySelectorAll('.schedule-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.schedule === schedule);
    });
}

function selectPriority(priority) {
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.priority === priority);
    });
}

function saveAndReturn() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const droneIndex = drones.findIndex(d => d.id == droneId);

    if (droneIndex !== -1) {
        // Set the drone as assigned
        drones[droneIndex].isAssigned = true;
        
        // Save the updated drones array back to localStorage
        localStorage.setItem('availableDrones', JSON.stringify(drones));
        
        // Return to the drone assignment page
        window.location.href = 'drone-assignment.html';
    }
}

function loadPackageInfo() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));

    if (drone && drone.packages) {
        const activePackages = drone.packages.filter(p => p.active);
        
        // Create package info section if it doesn't exist
        if (!document.querySelector('.package-info')) {
            const packageSection = document.createElement('div');
            packageSection.className = 'package-info';
            document.querySelector('.drone-info-card').appendChild(packageSection);
        }

        const packageSection = document.querySelector('.package-info');
        
        if (activePackages.length > 0) {
            packageSection.innerHTML = `
                <h3><i class="fas fa-boxes"></i> Assigned Packages</h3>
                <div class="package-list">
                    ${activePackages.map(pkg => {
                        const ddt = getDDTInfo(pkg.selectedDDT, warehouse);
                        return `
                            <div class="package-item">
                                <div class="package-header">
                                    <h4>Package ${pkg.number}</h4>
                                    <span class="status-badge">Active</span>
                                </div>
                                <div class="ddt-details">
                                    <p><i class="fas fa-route"></i> ${ddt.name}</p>
                                    <p><i class="fas fa-map-marker-alt"></i> ${ddt.location}</p>
                                    <p><i class="fas fa-clock"></i> Est. Time: ${ddt.estimatedTime} min</p>
                                    <p><i class="fas fa-road"></i> Distance: ${ddt.distance.toFixed(1)} km</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            packageSection.innerHTML = `
                <div class="no-packages">
                    <i class="fas fa-box-open"></i>
                    <p>No packages assigned</p>
                </div>
            `;
        }
    }
}

function getDDTInfo(ddtId, warehouse) {
    // This should match the DDT generation logic from package-system.js
    const locations = [
        { name: 'City Center', lat: warehouse.lat + 0.01, lng: warehouse.lng + 0.01 },
        { name: 'Shopping Mall', lat: warehouse.lat - 0.01, lng: warehouse.lng + 0.02 },
        { name: 'Business District', lat: warehouse.lat + 0.02, lng: warehouse.lng - 0.01 },
        { name: 'Residential Area', lat: warehouse.lat - 0.015, lng: warehouse.lng - 0.015 },
        { name: 'Industrial Park', lat: warehouse.lat + 0.025, lng: warehouse.lng + 0.02 }
    ];

    const location = locations[ddtId - 1];
    const distance = calculateDistance(warehouse.lat, warehouse.lng, location.lat, location.lng);
    
    return {
        id: ddtId,
        name: `DDT-${ddtId.toString().padStart(3, '0')}`,
        location: location.name,
        lat: location.lat,
        lng: location.lng,
        distance: distance,
        estimatedTime: Math.round(distance * 3)
    };
}

function startMission() {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);

    if (drone && drone.packages) {
        const activePackages = drone.packages.filter(p => p.active);
        if (activePackages.length > 0) {
            // Save mission data to localStorage for tower page
            const missionData = {
                droneId: droneId,
                warehouse: JSON.parse(localStorage.getItem('selectedWarehouse')),
                packages: activePackages,
                status: 'starting'
            };
            localStorage.setItem('currentMission', JSON.stringify(missionData));
            
            // Redirect to tower page
            window.location.href = 'tower.html';
        } else {
            alert('No active packages found. Please assign packages before starting the mission.');
        }
    }
}

function loadRouteInformation(packages, warehouse) {
    const activePackages = packages.filter(p => p.active);
    const routeSection = document.querySelector('.route-options');
    
    // Clear existing route layer
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    routeLayer = L.layerGroup().addTo(map);
    
    if (activePackages.length > 0) {
        routeSection.innerHTML = activePackages.map(pkg => {
            const ddt = getDDTInfo(pkg.selectedDDT, warehouse);
            
            // Add DDT marker to map
            L.marker([ddt.lat, ddt.lng], {
                icon: L.divIcon({
                    className: 'ddt-marker',
                    html: '<i class="fas fa-box-open"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(routeLayer);
            
            // Draw route line
            routeLayer.clearLayers(); // Remove previous lines

            L.polyline([
                [warehouse.lat, warehouse.lng],
                [ddt.lat, ddt.lng]
            ], {
                color: 'white',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(routeLayer);
            
            
            return `
                <div class="route-card" data-route="package${pkg.number}" data-package-id="${pkg.number}">
                    <div class="route-header">
                        <div class="route-title">
                            <i class="fas fa-box"></i>
                            <h4>Package ${pkg.number}</h4>
                        </div>
                        <div class="route-actions">
                            <span class="status-badge">Active</span>
                            <button class="edit-route-btn" onclick="editRoute(${pkg.number})">
                                <i class="fas fa-edit"></i> Edit Route
                            </button>
                        </div>
                    </div>
                    <div class="route-content">
                        <div class="ddt-info">
                            <h5><i class="fas fa-map-marker-alt"></i> DDT-${pkg.selectedDDT.toString().padStart(3, '0')}</h5>
                            <p class="location"><i class="fas fa-location-dot"></i> ${ddt.location}</p>
                        </div>
                        <div class="route-metrics">
                            <div class="metric">
                                <i class="fas fa-road"></i>
                                <span>${ddt.distance.toFixed(1)} km</span>
                            </div>
                            <div class="metric">
                                <i class="fas fa-clock"></i>
                                <span>${ddt.estimatedTime} min</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Fit map bounds to show all markers
        const bounds = L.latLngBounds([warehouse.lat, warehouse.lng]);
        activePackages.forEach(pkg => {
            const ddt = getDDTInfo(pkg.selectedDDT, warehouse);
            bounds.extend([ddt.lat, ddt.lng]);
        });
        map.fitBounds(bounds.pad(0.1));
    } else {
        routeSection.innerHTML = `
            <div class="no-routes">
                <i class="fas fa-route"></i>
                <p>No package routes available</p>
                <p class="sub-text">Please assign packages in the package system first</p>
            </div>
        `;
    }
}

function editRoute(packageNumber) {
    const droneId = localStorage.getItem('selectedDroneId');
    const drones = JSON.parse(localStorage.getItem('availableDrones') || '[]');
    const drone = drones.find(d => d.id == droneId);
    const warehouse = JSON.parse(localStorage.getItem('selectedWarehouse'));

    if (!drone || !drone.packages) return;

    const package = drone.packages.find(p => p.number == packageNumber);
    if (!package) return;

    // Create DDT selection popup
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.className = 'ddt-selector-popup';
    
    // Get nearby DDTs
    const allDDTs = Array.from({ length: 5 }, (_, i) => {
        const location = {
            name: ['City Center', 'Shopping Mall', 'Business District', 'Residential Area', 'Industrial Park'][i],
            lat: warehouse.lat + [-0.01, 0.01, 0.02, -0.015, 0.025][i],
            lng: warehouse.lng + [0.01, 0.02, -0.01, -0.015, 0.02][i]
        };
        const distance = calculateDistance(warehouse.lat, warehouse.lng, location.lat, location.lng);
        return {
            id: i + 1,
            name: `DDT-${(i + 1).toString().padStart(3, '0')}`,
            location: location.name,
            lat: location.lat,
            lng: location.lng,
            distance: distance,
            estimatedTime: Math.round(distance * 3)
        };
    });

    popup.innerHTML = `
        <h3>Edit Route for Package ${packageNumber}</h3>
        <div class="ddt-list">
            ${allDDTs.map(ddt => `
                <div class="ddt-item ${ddt.id === package.selectedDDT ? 'selected' : ''}" data-ddt-id="${ddt.id}">
                    <div class="ddt-header">
                        <h4>${ddt.name}</h4>
                        <span class="distance-badge">${ddt.distance.toFixed(1)} km</span>
                    </div>
                    <div class="ddt-details">
                        <p>${ddt.location}</p>
                        <div class="ddt-info">
                            <span><i class="fas fa-map-marker-alt"></i> Location: ${ddt.lat.toFixed(4)}, ${ddt.lng.toFixed(4)}</span>
                            <span><i class="fas fa-clock"></i> Est. Time: ${ddt.estimatedTime} min</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="popup-actions">
            <button class="save-btn">Save Changes</button>
            <button class="cancel-btn">Cancel</button>
        </div>
    `;
    document.body.appendChild(popup);

    // Add click handlers for DDT selection
    popup.querySelectorAll('.ddt-item').forEach(item => {
        item.addEventListener('click', () => {
            popup.querySelectorAll('.ddt-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    // Add button handlers
    popup.querySelector('.save-btn').addEventListener('click', () => {
        const selectedDDT = popup.querySelector('.ddt-item.selected');
        if (selectedDDT) {
            const ddtId = parseInt(selectedDDT.dataset.ddtId);
            package.selectedDDT = ddtId;
            
            // Update drone data in localStorage
            localStorage.setItem('availableDrones', JSON.stringify(drones));
            
            // Refresh route display
            loadRouteInformation(drone.packages, warehouse);
        }
        closePopup();
    });

    popup.querySelector('.cancel-btn').addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);

    function closePopup() {
        overlay.remove();
        popup.remove();
    }
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