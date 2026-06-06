/**
 * Crop Prediction & Recommendation System - JS Logic
 */

const API_BASE = 'http://localhost:5000';

// Global references to Chart.js and Leaflet instances
let confidenceChartInstance = null;
let yieldGaugeInstance = null;
let featureImportanceChartInstance = null;
let cropDistChartInstance = null;
let yieldRangeChartInstance = null;
let leafletMapInstance = null;
let clickMarker = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply initial theme
    const isInitialDark = currentTheme === 'dark';
    if (isInitialDark) {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    }
    updateChartThemeDefaults(isInitialDark);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Toggle icon
            themeToggleBtn.innerHTML = isDark 
                ? '<i class="fa-solid fa-sun"></i>' 
                : '<i class="fa-solid fa-moon"></i>';
            
            // Update map tile layer if Leaflet is loaded and initialized
            if (leafletMapInstance) {
                const tiles = [];
                leafletMapInstance.eachLayer((layer) => {
                    if (layer instanceof L.TileLayer) {
                        tiles.push(layer);
                    }
                });
                tiles.forEach(tile => leafletMapInstance.removeLayer(tile));
                
                const tileUrl = isDark 
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
                L.tileLayer(tileUrl, {
                    maxZoom: 20
                }).addTo(leafletMapInstance);
            }
            
            // Re-render and update all active charts
            reRenderAllCharts();
        });
    }

    // 2. Mobile Menu Toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 3. Initialize Page-Specific Logic
    const path = window.location.pathname;
    const pageName = path.split('/').pop() || 'index.html';

    if (pageName === 'predict.html') {
        initPredictPage();
    } else if (pageName === 'dashboard.html') {
        initDashboardPage();
    }
});

/**
 * THEME COMPATIBILITY HELPERS FOR CHART.JS
 */
function updateChartThemeDefaults(isDark) {
    if (typeof Chart !== 'undefined') {
        const textColor = isDark ? '#ECEFF1' : '#263238';
        const gridColor = isDark ? '#37474F' : '#CFD8DC';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        
        // Update scale defaults if scales exist in Chart.defaults
        if (Chart.defaults.scale) {
            if (Chart.defaults.scale.grid) {
                Chart.defaults.scale.grid.color = gridColor;
            }
            if (Chart.defaults.scale.ticks) {
                Chart.defaults.scale.ticks.color = textColor;
            }
            if (Chart.defaults.scale.title) {
                Chart.defaults.scale.title.color = textColor;
            }
        }
        
        const updateInstanceConfig = (chartInstance) => {
            if (chartInstance && chartInstance.options) {
                // Update scales colors
                if (chartInstance.options.scales) {
                    const scales = chartInstance.options.scales;
                    for (let axis in scales) {
                        if (!scales[axis].grid) scales[axis].grid = {};
                        if (!scales[axis].ticks) scales[axis].ticks = {};
                        if (!scales[axis].title) scales[axis].title = {};
                        
                        scales[axis].grid.color = gridColor;
                        scales[axis].ticks.color = textColor;
                        scales[axis].title.color = textColor;
                    }
                }
                // Update legend color
                if (chartInstance.options.plugins && chartInstance.options.plugins.legend) {
                    if (!chartInstance.options.plugins.legend.labels) {
                        chartInstance.options.plugins.legend.labels = {};
                    }
                    chartInstance.options.plugins.legend.labels.color = textColor;
                }
            }
        };

        // Update all initialized chart instances
        updateInstanceConfig(featureImportanceChartInstance);
        updateInstanceConfig(cropDistChartInstance);
        updateInstanceConfig(yieldRangeChartInstance);
        updateInstanceConfig(confidenceChartInstance);
        updateInstanceConfig(yieldGaugeInstance);
    }
}

function reRenderAllCharts() {
    const isDark = document.body.classList.contains('dark-theme');
    
    // Update defaults and active instances configurations
    updateChartThemeDefaults(isDark);
    
    // Apply specific dataset color overrides if applicable
    if (confidenceChartInstance) {
        const dataset = confidenceChartInstance.data.datasets[0];
        if (dataset && dataset.backgroundColor && dataset.backgroundColor.length === 4) {
            dataset.backgroundColor[3] = isDark ? '#37474F' : '#ECEFF1';
        }
        confidenceChartInstance.update();
    }
    
    if (yieldGaugeInstance) {
        const dataset = yieldGaugeInstance.data.datasets[0];
        if (dataset && dataset.backgroundColor) {
            dataset.backgroundColor[1] = isDark ? '#37474F' : '#ECEFF1';
        }
        yieldGaugeInstance.update();
    }
    
    if (featureImportanceChartInstance) {
        featureImportanceChartInstance.update();
    }
    
    if (cropDistChartInstance) {
        cropDistChartInstance.update();
    }
    
    if (yieldRangeChartInstance) {
        yieldRangeChartInstance.update();
    }
    
    if (document.getElementById('heatmap-grid')) {
        renderWeatherYieldHeatmap();
    }
}

/**
 * PREDICT PAGE LOGIC
 */
function initPredictPage() {
    // 1. Bind slider and manual updates with syncing
    const inputConfigs = [
        { 
            sliderId: 'rainfall_mm', 
            manualId: 'rainfall_mm_manual', 
            displayId: 'val-rainfall', 
            toggleId: 'toggle-rainfall', 
            sliderContainerId: 'rainfall-slider-container', 
            manualContainerId: 'rainfall-manual-container' 
        },
        { 
            sliderId: 'temperature', 
            manualId: 'temperature_manual', 
            displayId: 'val-temp', 
            toggleId: 'toggle-temp', 
            sliderContainerId: 'temp-slider-container', 
            manualContainerId: 'temp-manual-container' 
        },
        { 
            sliderId: 'days_to_harvest', 
            manualId: 'days_to_harvest_manual', 
            displayId: 'val-days', 
            toggleId: 'toggle-days', 
            sliderContainerId: 'days-slider-container', 
            manualContainerId: 'days-manual-container' 
        }
    ];

    inputConfigs.forEach(cfg => {
        const sliderEl = document.getElementById(cfg.sliderId);
        const manualEl = document.getElementById(cfg.manualId);
        const displayEl = document.getElementById(cfg.displayId);
        const toggleEl = document.getElementById(cfg.toggleId);
        const sliderContainer = document.getElementById(cfg.sliderContainerId);
        const manualContainer = document.getElementById(cfg.manualContainerId);

        if (sliderEl && manualEl && displayEl) {
            // Slider input event -> sync to manual and display
            sliderEl.addEventListener('input', (e) => {
                const val = e.target.value;
                displayEl.textContent = val;
                manualEl.value = val;
            });

            // Manual input event -> sync to slider and display (with clamping for slider)
            manualEl.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                
                // Update display
                displayEl.textContent = val;

                // Clamp for slider range
                const min = parseFloat(sliderEl.min);
                const max = parseFloat(sliderEl.max);
                const clamped = Math.max(min, Math.min(max, val));
                sliderEl.value = clamped;
            });
        }

        if (toggleEl && sliderContainer && manualContainer) {
            toggleEl.addEventListener('click', () => {
                const currentMode = toggleEl.dataset.mode; // 'slider' or 'manual'
                
                if (currentMode === 'slider') {
                    // Switch to Manual
                    sliderContainer.classList.add('hidden');
                    manualContainer.classList.remove('hidden');
                    toggleEl.dataset.mode = 'manual';
                    toggleEl.innerHTML = '<i class="fa-solid fa-sliders"></i> <span>Slider Mode</span>';
                    // Sync values
                    manualEl.value = sliderEl.value;
                } else {
                    // Switch to Slider
                    manualContainer.classList.add('hidden');
                    sliderContainer.classList.remove('hidden');
                    toggleEl.dataset.mode = 'slider';
                    toggleEl.innerHTML = '<i class="fa-solid fa-keyboard"></i> <span>Manual Entry</span>';
                    // Sync values (clamped)
                    const min = parseFloat(sliderEl.min);
                    const max = parseFloat(sliderEl.max);
                    const val = parseFloat(manualEl.value) || min;
                    const clamped = Math.max(min, Math.min(max, val));
                    sliderEl.value = clamped;
                    displayEl.textContent = clamped;
                }
            });
        }
    });

    // 2. Weather Condition Selector
    const weatherButtons = document.querySelectorAll('.weather-btn');
    const weatherInput = document.getElementById('weather_condition');
    weatherButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            weatherButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (weatherInput) {
                weatherInput.value = btn.dataset.value;
            }
        });
    });

    // 3. Map Modal Overlay logic with Leaflet Map of India
    const mapModal = document.getElementById('map-modal');
    const btnOpenMap = document.getElementById('btn-open-map');
    const btnCloseMap = document.getElementById('btn-close-map');
    const regionSelect = document.getElementById('region');

    if (mapModal && btnOpenMap && btnCloseMap) {
        // Open Modal and initialize/refresh Leaflet
        btnOpenMap.addEventListener('click', () => {
            mapModal.classList.add('active');
            
            // Wait for modal display animation to finish, then init or invalidate
            setTimeout(() => {
                if (!leafletMapInstance) {
                    initLeafletIndiaMap();
                } else {
                    leafletMapInstance.invalidateSize();
                }
            }, 300);
        });

        // Close Modal via close button
        btnCloseMap.addEventListener('click', () => {
            mapModal.classList.remove('active');
        });

        // Close Modal by clicking outside
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.classList.remove('active');
            }
        });
    }

    function initLeafletIndiaMap() {
        // Center on India (Nagpur) with zoom 4.2
        leafletMapInstance = L.map('india-map', {
            zoomSnap: 0.1,
            attributionControl: false
        }).setView([22.5, 78.9], 4.2);
        
        const isDark = document.body.classList.contains('dark-theme');
        const tileUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            
        L.tileLayer(tileUrl, {
            maxZoom: 20
        }).addTo(leafletMapInstance);

        // Listen for map clicks
        leafletMapInstance.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Classify clicked coordinates into agricultural regions
            let region = 'North';
            if (lat < 18.0) {
                region = 'South';
            } else if (lng > 84.0) {
                region = 'East';
            } else if (lng < 77.0) {
                region = 'West';
            } else {
                region = 'North';
            }
            
            // Place/move marker
            if (clickMarker) {
                clickMarker.setLatLng(e.latlng);
            } else {
                clickMarker = L.marker(e.latlng).addTo(leafletMapInstance);
            }
            
            // Generate clean popup content with confirmation button
            const popupContent = `
                <div style="font-family: 'Poppins', sans-serif; text-align: center; padding: 5px;">
                    <p style="margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 500;">
                        Detected Zone: <strong style="color: var(--primary-color);">${region}</strong>
                    </p>
                    <button type="button" class="btn-confirm-region" data-region="${region}" 
                        style="background-color: var(--primary-color); color: #fff; border: none; border-radius: 6px; 
                               padding: 6px 12px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        Select ${region}
                    </button>
                </div>
            `;
            
            clickMarker.bindPopup(popupContent).openPopup();
            
            // Handle confirmation click (with a tiny delay to ensure HTML is rendered)
            setTimeout(() => {
                const btn = document.querySelector('.btn-confirm-region');
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (regionSelect) {
                            regionSelect.value = btn.dataset.region;
                            // Trigger select change event
                            regionSelect.dispatchEvent(new Event('change'));
                        }
                        // Close map modal
                        mapModal.classList.remove('active');
                        // Remove temporary marker
                        if (clickMarker) {
                            leafletMapInstance.removeLayer(clickMarker);
                            clickMarker = null;
                        }
                    });
                }
            }, 50);
        });
    }

    // 4. Handle Form Submit
    const form = document.getElementById('prediction-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Read active values
            const region = document.getElementById('region').value;
            const soilType = document.getElementById('soil_type').value;
            
            // Read either slider or manual depending on toggle state
            const rainfallMode = document.getElementById('toggle-rainfall').dataset.mode;
            const rainfall = rainfallMode === 'slider'
                ? parseFloat(document.getElementById('rainfall_mm').value)
                : parseFloat(document.getElementById('rainfall_mm_manual').value);

            const tempMode = document.getElementById('toggle-temp').dataset.mode;
            const temp = tempMode === 'slider'
                ? parseFloat(document.getElementById('temperature').value)
                : parseFloat(document.getElementById('temperature_manual').value);

            const fertilizer = document.getElementById('fertilizer_used').checked;
            const irrigation = document.getElementById('irrigation_used').checked;
            const weather = document.getElementById('weather_condition').value;

            const daysMode = document.getElementById('toggle-days').dataset.mode;
            const days = daysMode === 'slider'
                ? parseInt(document.getElementById('days_to_harvest').value)
                : parseInt(document.getElementById('days_to_harvest_manual').value);

            const payload = {
                region: region,
                soil_type: soilType,
                rainfall_mm: rainfall,
                temperature: temp,
                fertilizer_used: fertilizer,
                irrigation_used: irrigation,
                weather_condition: weather,
                days_to_harvest: days
            };

            // Show Loader, Hide Placeholder & Results
            const placeholderCard = document.getElementById('placeholder-results');
            const loaderContainer = document.getElementById('loader-container');
            const resultsContainer = document.getElementById('prediction-results');

            if (placeholderCard) placeholderCard.style.display = 'none';
            if (resultsContainer) resultsContainer.style.display = 'none';
            if (loaderContainer) loaderContainer.style.display = 'flex';

            try {
                const response = await fetch(`${API_BASE}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Server error occurred');
                }

                const result = await response.json();
                
                // Hide Loader and Render Results
                if (loaderContainer) loaderContainer.style.display = 'none';
                if (resultsContainer) {
                    resultsContainer.style.display = 'block';
                    renderPredictionResults(result);
                }

            } catch (err) {
                console.error(err);
                if (loaderContainer) loaderContainer.style.display = 'none';
                if (placeholderCard) {
                    placeholderCard.style.display = 'flex';
                    placeholderCard.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="color: #d32f2f;"></i>
                        <h3>Prediction Failed</h3>
                        <p>${err.message}</p>
                        <p style="font-size: 0.85rem; margin-top: 10px; color: var(--text-muted);">Please verify that the Flask backend server is running on port 5000.</p>
                    `;
                }
            }
        });
    }
}

function renderPredictionResults(data) {
    // 1. Recommended crop display
    const recommendedCropEl = document.getElementById('recommended-crop');
    const recommendedEmojiEl = document.getElementById('recommended-emoji');
    
    if (recommendedCropEl) recommendedCropEl.textContent = data.recommended_crop;
    if (recommendedEmojiEl) {
        const emojis = {
            'Wheat': '🌾',
            'Rice': '🌾',
            'Soybean': '🌿',
            'Barley': '🌾',
            'Maize': '🌽',
            'Cotton': '🌿'
        };
        recommendedEmojiEl.textContent = emojis[data.recommended_crop] || '🌾';
    }

    // 2. Yield Value Display and Category Badge
    const yieldValEl = document.getElementById('yield-val');
    const yieldBadgeEl = document.getElementById('yield-badge');
    
    if (yieldValEl) yieldValEl.textContent = data.predicted_yield_tons_per_ha.toFixed(2);
    if (yieldBadgeEl) {
        yieldBadgeEl.textContent = `${data.yield_category} ✅`;
        yieldBadgeEl.className = 'category-badge ' + data.yield_category.toLowerCase();
    }

    // 3. Top 3 Crops Progress Bars
    const progressListEl = document.getElementById('top3-progress-list');
    if (progressListEl) {
        progressListEl.innerHTML = '';
        data.top3_crops.forEach(item => {
            const pct = (item.prob * 100).toFixed(1);
            const cropItemHTML = `
                <div class="top3-item">
                    <div class="top3-info">
                        <span>${item.crop}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
            `;
            progressListEl.insertAdjacentHTML('beforeend', cropItemHTML);
        });

        // Trigger animation of progress bars after a tiny delay
        setTimeout(() => {
            const fills = progressListEl.querySelectorAll('.progress-bar-fill');
            data.top3_crops.forEach((item, index) => {
                if (fills[index]) {
                    fills[index].style.width = `${item.prob * 100}%`;
                }
            });
        }, 50);
    }

    // 4. Chart 1: Confidence doughnut chart
    const confidenceCtx = document.getElementById('confidenceChart').getContext('2d');
    if (confidenceChartInstance) {
        confidenceChartInstance.destroy();
    }

    // Prepare datasets for Top 3 vs remaining
    const labels = data.top3_crops.map(c => c.crop);
    const probabilities = data.top3_crops.map(c => c.prob * 100);
    
    // Add "Other" class if total is less than 99%
    const totalProb = probabilities.reduce((a, b) => a + b, 0);
    if (totalProb < 99) {
        labels.push('Other');
        probabilities.push(Math.max(0, 100 - totalProb));
    }

    const isDark = document.body.classList.contains('dark-theme');

    confidenceChartInstance = new Chart(confidenceCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: probabilities,
                backgroundColor: ['#1B5E20', '#76C442', '#81C784', isDark ? '#37474F' : '#ECEFF1'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Display top-3 as progress bars instead
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });

    // 5. Chart 2: Semicircular Yield Gauge
    const gaugeCtx = document.getElementById('yieldGauge').getContext('2d');
    if (yieldGaugeInstance) {
        yieldGaugeInstance.destroy();
    }

    const predictedYield = data.predicted_yield_tons_per_ha;
    const maxGaugeVal = 10.0;
    
    yieldGaugeInstance = new Chart(gaugeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Predicted Yield', 'Remaining'],
            datasets: [{
                data: [predictedYield, Math.max(0, maxGaugeVal - predictedYield)],
                backgroundColor: [
                    predictedYield < 3 ? '#e53935' : predictedYield < 6 ? '#fb8c00' : '#43a047',
                    isDark ? '#37474F' : '#ECEFF1'
                ],
                borderWidth: 0
            }]
        },
        options: {
            rotation: -90,
            circumference: 180,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            cutout: '80%'
        }
    });
}

/**
 * DASHBOARD PAGE LOGIC
 */
async function initDashboardPage() {
    try {
        const response = await fetch(`${API_BASE}/model-stats`);
        if (!response.ok) {
            throw new Error('Failed to fetch model statistics');
        }
        
        const stats = await response.json();
        
        // Update metric values
        document.getElementById('stat-accuracy').textContent = `${(stats.classifier_accuracy * 100).toFixed(2)}%`;
        document.getElementById('stat-r2').textContent = stats.regressor_r2.toFixed(4);
        document.getElementById('stat-rmse').textContent = stats.regressor_rmse.toFixed(4);
        document.getElementById('stat-crops').textContent = '6';

        // Render dashboard charts
        renderFeatureImportance(stats.feature_importances);
        renderCropDistribution();
        renderYieldRangeByCrop();
        renderWeatherYieldHeatmap();

    } catch (err) {
        console.error(err);
        const container = document.querySelector('main');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 80px 20px; color: var(--text-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #d32f2f; margin-bottom: 20px;"></i>
                    <h2>Failed to Load Dashboard</h2>
                    <p>${err.message}</p>
                    <p style="margin-top: 15px; color: var(--text-muted);">Please make sure the Flask backend is active and models have been trained by running model scripts.</p>
                </div>
            `;
        }
    }
}

function renderFeatureImportance(importances) {
    const ctx = document.getElementById('featureImportanceChart').getContext('2d');
    if (featureImportanceChartInstance) {
        featureImportanceChartInstance.destroy();
    }

    // Sort features by Classifier Importance descending for display
    const sorted = [...importances].sort((a, b) => b.classifier_importance - a.classifier_importance);
    const labels = sorted.map(item => item.feature.replace('_', ' '));
    const classifierData = sorted.map(item => item.classifier_importance);
    const regressorData = sorted.map(item => item.regressor_importance);

    featureImportanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Crop Classifier',
                    data: classifierData,
                    backgroundColor: 'rgba(27, 94, 32, 0.85)',
                    borderColor: '#1B5E20',
                    borderWidth: 1
                },
                {
                    label: 'Yield Regressor',
                    data: regressorData,
                    backgroundColor: 'rgba(118, 196, 66, 0.85)',
                    borderColor: '#76C442',
                    borderWidth: 1
                }
            ]
        },
        options: {
            indexAxis: 'y', // Makes the bar chart horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 15, font: { family: 'Poppins' } }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Importance Score', font: { family: 'Poppins', weight: 'bold' } }
                },
                y: {
                    ticks: { font: { family: 'Poppins' } }
                }
            }
        }
    });
}

function renderCropDistribution() {
    const ctx = document.getElementById('cropDistributionChart').getContext('2d');
    if (cropDistChartInstance) {
        cropDistChartInstance.destroy();
    }

    // Standard equal distribution representation (~1M balanced dataset)
    cropDistChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Wheat', 'Rice', 'Soybean', 'Barley', 'Maize', 'Cotton'],
            datasets: [{
                data: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
                backgroundColor: [
                    '#1B5E20', // Wheat
                    '#2E7D32', // Rice
                    '#4CAF50', // Soybean
                    '#81C784', // Barley
                    '#C8E6C9', // Maize
                    '#76C442'  // Cotton
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { font: { family: 'Poppins' }, boxWidth: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: Balanced (~16.7%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderYieldRangeByCrop() {
    const ctx = document.getElementById('yieldRangeChart').getContext('2d');
    if (yieldRangeChartInstance) {
        yieldRangeChartInstance.destroy();
    }

    // Standard yields ranges representing min, avg, max based on dataset behavior
    // Wheat: 1.5 - 7.5, Rice: 2.0 - 9.5, Soybean: 1.8 - 8.0, Barley: 1.0 - 6.5, Maize: 1.5 - 9.0, Cotton: 1.2 - 8.5
    yieldRangeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Wheat', 'Rice', 'Soybean', 'Barley', 'Maize', 'Cotton'],
            datasets: [
                {
                    label: 'Min Yield',
                    data: [1.2, 1.8, 1.5, 0.8, 1.4, 1.1],
                    backgroundColor: '#FF8A80',
                    borderRadius: 4
                },
                {
                    label: 'Average Yield',
                    data: [4.8, 5.9, 4.5, 3.8, 5.1, 4.2],
                    backgroundColor: '#81C784',
                    borderRadius: 4
                },
                {
                    label: 'Max Yield',
                    data: [8.5, 9.7, 8.2, 7.8, 9.1, 8.9],
                    backgroundColor: '#1B5E20',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Poppins' }, boxWidth: 12 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Yield (tons/ha)', font: { family: 'Poppins', weight: 'bold' } }
                },
                x: {
                    ticks: { font: { family: 'Poppins' } }
                }
            }
        }
    });
}

function renderWeatherYieldHeatmap() {
    // Generate the weather vs yield heatmap cells dynamically.
    // Cloudy, Rainy, Sunny vs Wheat, Rice, Soybean, Barley, Maize, Cotton.
    // Data values are average yields mock-calculated to follow standard dataset behavior
    const matrix = {
        'Cloudy': { 'Wheat': 4.1, 'Rice': 5.2, 'Soybean': 4.3, 'Barley': 3.6, 'Maize': 4.8, 'Cotton': 4.0 },
        'Rainy':  { 'Wheat': 3.2, 'Rice': 7.6, 'Soybean': 5.8, 'Barley': 4.5, 'Maize': 5.6, 'Cotton': 3.1 },
        'Sunny':  { 'Wheat': 6.2, 'Rice': 4.1, 'Soybean': 3.9, 'Barley': 3.1, 'Maize': 5.2, 'Cotton': 5.8 }
    };

    const conditions = ['Cloudy', 'Rainy', 'Sunny'];
    const crops = ['Wheat', 'Rice', 'Soybean', 'Barley', 'Maize', 'Cotton'];

    const gridWrap = document.getElementById('heatmap-grid');
    if (!gridWrap) return;

    gridWrap.innerHTML = '';
    
    // Create row by row
    conditions.forEach(cond => {
        const rowHTML = document.createElement('div');
        rowHTML.className = 'heatmap-row';
        
        crops.forEach(crop => {
            const yieldVal = matrix[cond][crop];
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // Set cell color based on yield value
            // Sourced from HSL Tailored values: Light green (50% lightness) to Deep green (25% lightness)
            // Range of yields: 3.1 to 7.6
            const minYield = 3.0;
            const maxYield = 8.0;
            const pct = (yieldVal - minYield) / (maxYield - minYield); // 0 to 1
            
            // Interpolate colors between #E8F5E9 (light green) and #1B5E20 (deep green)
            // Using HSL: Light green is HSL(120, 40%, 85%) and Dark green is HSL(120, 70%, 25%)
            const hue = 120;
            const sat = 40 + Math.round(pct * 30); // 40% to 70%
            const light = 75 - Math.round(pct * 50); // 75% down to 25%
            
            cell.style.backgroundColor = `hsl(${hue}, ${sat}%, ${light}%)`;
            // Make text readable
            cell.style.color = light < 50 ? '#FFFFFF' : '#1B5E20';
            
            cell.innerHTML = `
                <span class="val">${yieldVal.toFixed(1)}</span>
                <span class="lbl">${crop}</span>
            `;
            
            cell.title = `Average Yield: ${yieldVal} tons/ha under ${cond} conditions for ${crop}`;
            rowHTML.appendChild(cell);
        });
        
        gridWrap.appendChild(rowHTML);
    });
}
