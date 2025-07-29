mapboxgl.accessToken = 'pk.eyJ1IjoibGluZ2x1NjYiLCJhIjoiY21jemNneWtwMHRpazJxcHo4ejE3eWo3MyJ9.jprho4oY5mPdmieXJMa2cg';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-74.0060, 40.7128],
    zoom: 10,
    pitch: 0,
    bearing: 0
});

function goToStep(stepNumber) {
    showStep(stepNumber);
}

// Sample data points
const sampleStories = [
    {
        location: "Brooklyn Bridge, NYC",
        coordinates: [-73.9969, 40.7061],
        story: "We walked here every Sunday morning. Now I take the Manhattan Bridge instead.",
        isDefault: true,
        isActive: true
    },
    {
        location: "Central Park, NYC",
        coordinates: [-73.9654, 40.7829],
        story: "Three years of picnics under that oak tree. I still avoid the reservoir path.",
        isDefault: false,
        isActive: true
    },
    {
        location: "Washington Square Park, NYC", 
        coordinates: [-73.9976, 40.7308],
        story: "Where we had our first fight and our last goodbye. The fountain keeps playing the same song.",
        isDefault: false,
        isActive: true
    },
    // Inert background points
    {
        location: "Times Square, NYC",
        coordinates: [-73.9857, 40.7580],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "High Line, NYC",
        coordinates: [-74.0048, 40.7480],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Coney Island, NYC",
        coordinates: [-73.9779, 40.5755],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Statue of Liberty, NYC",
        coordinates: [-74.0445, 40.6892],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Empire State Building, NYC",
        coordinates: [-73.9857, 40.7484],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Brooklyn Heights, NYC",
        coordinates: [-73.9936, 40.6962],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Williamsburg, NYC",
        coordinates: [-73.9442, 40.7081],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "DUMBO, NYC",
        coordinates: [-73.9893, 40.7033],
        story: "",
        isDefault: false,
        isActive: false
    },
    {
        location: "Greenwich Village, NYC",
        coordinates: [-74.0030, 40.7336],
        story: "",
        isDefault: false,
        isActive: false
    }
];

let currentPopup = null;
let activeStories = [];
let cycleIndex = 0;
let cycleInterval = null;

map.on('load', () => {
    // Collect active stories for cycling
    activeStories = sampleStories.filter(story => story.isActive);
    console.log('Active stories for cycling:', activeStories.length);
    
    // Add markers for each story
    sampleStories.forEach((story, index) => {
        // Create custom marker
        const el = document.createElement('div');
        el.style.width = story.isActive ? '20px' : '12px';
        el.style.height = story.isActive ? '20px' : '12px';
        el.style.borderRadius = '50%';
        el.style.background = story.isActive ? (story.isDefault ? '#e74c3c' : '#3498db') : '#bdc3c7';
        el.style.border = story.isActive ? '3px solid white' : '2px solid white';
        el.style.boxShadow = story.isActive ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)';
        el.style.cursor = story.isActive ? 'pointer' : 'default';
        el.style.transition = story.isActive ? 'box-shadow 0.3s ease' : 'none';
        
        // Only add hover effects and interactions for active stories
        if (story.isActive) {
            // Hover effects
            el.addEventListener('mouseenter', () => {
                el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });

            // Create popup
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false,
                className: 'story-popup'
            }).setHTML(`
                <div class="popup-location">${story.location}</div>
                <div class="popup-story">"${story.story}"</div>
            `);

            // Add event listener to close current popup when this one closes
            popup.on('close', () => {
                if (currentPopup === popup) {
                    currentPopup = null;
                }
            });

            // Store popup reference for cycling
            story.popup = popup;

            // Custom click handler to ensure only one popup is open
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Stop auto-cycling when user interacts
                if (cycleInterval) {
                    clearInterval(cycleInterval);
                    cycleInterval = null;
                }
                
                // Animate out current popup if one is open
                if (currentPopup && currentPopup.isOpen()) {
                    const popupElement = currentPopup.getElement();
                    if (popupElement) {
                        popupElement.classList.add('popup-fade-out');
                        setTimeout(() => {
                            currentPopup.remove();
                            
                            // Open new popup with animation
                            popup.setLngLat(story.coordinates).addTo(map);
                            currentPopup = popup;
                        }, 300);
                    }
                } else {
                    // No current popup, just open this one
                    popup.setLngLat(story.coordinates).addTo(map);
                    currentPopup = popup;
                }
            });

            // Store reference for default popup
            if (story.isDefault) {
                story.isDefaultPopup = true;
            }
        }

        // Create marker
        const marker = new mapboxgl.Marker(el)
            .setLngLat(story.coordinates)
            .addTo(map);
    });

    // Center map on core NYC (Manhattan/Brooklyn/Queens)
    setTimeout(() => {
        map.flyTo({
            center: [-73.95, 40.73], // Center between Manhattan and Brooklyn
            zoom: 11.5,
            duration: 1500
        });

        // Open default popup after map is positioned
        setTimeout(() => {
            const defaultStory = sampleStories.find(story => story.isDefaultPopup);
            console.log('Opening default popup for:', defaultStory?.location);
            if (defaultStory && defaultStory.popup) {
                // Add popup with animation
                defaultStory.popup.setLngLat(defaultStory.coordinates).addTo(map);
                currentPopup = defaultStory.popup;
                console.log('Default popup opened');
                
                // Start auto-cycling after showing default
                setTimeout(() => {
                    console.log('Starting cycling with', activeStories.length, 'stories');
                    startCycling();
                }, 3000);
            }
        }, 1000);
    }, 500);
});

function startCycling() {
    // Find the current story index to continue from there
    const currentStoryIndex = activeStories.findIndex(story => story.popup === currentPopup);
    if (currentStoryIndex !== -1) {
        cycleIndex = currentStoryIndex;
    }
    console.log('Cycling started from index:', cycleIndex);
    
    cycleInterval = setInterval(() => {
        // Animate out current popup
        if (currentPopup && currentPopup.isOpen()) {
            const popupElement = currentPopup.getElement();
            if (popupElement) {
                popupElement.classList.add('popup-fade-out');
                setTimeout(() => {
                    currentPopup.remove();
                    
                    // Move to next story
                    cycleIndex = (cycleIndex + 1) % activeStories.length;
                    const nextStory = activeStories[cycleIndex];
                    console.log('Cycling to story:', nextStory?.location, 'at index:', cycleIndex);
                    
                    // Open next popup with animation
                    if (nextStory && nextStory.popup) {
                        nextStory.popup.setLngLat(nextStory.coordinates).addTo(map);
                        currentPopup = nextStory.popup;
                    }
                }, 300); // Wait for fade out animation
            }
        } else {
            // If no current popup, just open the next one
            cycleIndex = (cycleIndex + 1) % activeStories.length;
            const nextStory = activeStories[cycleIndex];
            console.log('Cycling to story:', nextStory?.location, 'at index:', cycleIndex);
            
            if (nextStory && nextStory.popup) {
                nextStory.popup.setLngLat(nextStory.coordinates).addTo(map);
                currentPopup = nextStory.popup;
            }
        }
    }, 5000); // Change every 5 seconds
}

// Check if we're running locally or on a server
const isLocal = window.location.protocol === 'file:';

function goToSubmit() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('submit-page').style.display = 'block';
    showStep(1);
    
    if (isLocal) {
        // Local development - use hash
        window.location.hash = 'submit';
    } else {
        // Hosted - use proper URL
        history.pushState({page: 'submit'}, 'Submit Your Story', '/submit');
    }
}

function goToLanding() {
    document.getElementById('submit-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'grid';
    
    if (isLocal) {
        // Local development - clear hash
        window.location.hash = '';
    } else {
        // Hosted - use proper URL
        history.pushState({page: 'home'}, 'The Breakup Map', '/');
    }
}

// Handle URL routing
function handleRouting() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    if (isLocal) {
        // Local development - use hash routing
        if (hash === '#submit') {
            showSubmitPage();
        } else {
            showLandingPage();
        }
    } else {
        // Hosted - use path routing
        if (path === '/submit') {
            showSubmitPage();
        } else {
            showLandingPage();
        }
    }
}

function showSubmitPage() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('submit-page').style.display = 'block';
    showStep(1);
}

function showLandingPage() {
    document.getElementById('submit-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'grid';
}

// Listen for browser back/forward
window.addEventListener('popstate', (event) => {
    handleRouting();
});

// Listen for hash changes (local development)
if (isLocal) {
    window.addEventListener('hashchange', handleRouting);
}

// Handle initial load
document.addEventListener('DOMContentLoaded', handleRouting);

function startForm() {
    showStep(2);
    initFormMap();
}

function showStep(stepNumber) {
    console.log('Showing step:', stepNumber);
    // Hide all steps
    for (let i = 1; i <= 8; i++) {
        const step = document.getElementById('step-' + i);
        if (step) step.style.display = 'none';
    }
    // Show current step
    document.getElementById('step-' + stepNumber).style.display = 'block';
    
    // Initialize maps and canvases for steps that need them
    setTimeout(() => {
        if (stepNumber === 2) {
            console.log('Initializing step 2 map');
            initFormMap();
        } else if (stepNumber === 3) {
            console.log('Initializing step 3 map');
            initFormMap2();
        } else if (stepNumber === 4) {
            console.log('Initializing step 4 color picker');
            initColorPicker();
        } else if (stepNumber === 8) {
            console.log('Initializing step 8 timeline');
            initTimelineCanvas();
        }
    }, 200);
}

function goToStep(stepNumber) {
    showStep(stepNumber);
}

let formMap;
let formData = {
    startLocation: null,
    endLocation: null,
    endLocationData: null,
    memoryLocations: [],
    avoidedLocations: [],
    relationshipColor: '#667eea',
    relationshipShape: null,
    duration: 12,
    endSeason: null,
    story: '',
    emotionalJourney: []
};

let formMapMarker = null;

// Helper function for reverse geocoding
async function reverseGeocode(coords, inputId) {
    try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxgl.accessToken}&limit=1`);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const placeName = data.features[0].place_name;
            const input = document.getElementById(inputId);
            if (input) {
                input.value = placeName;
            }
        } else {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
            }
        }
    } catch (error) {
        console.log('Reverse geocoding failed:', error);
        const input = document.getElementById(inputId);
        if (input) {
            input.value = `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
        }
    }
}

// Enhanced autocomplete search functionality using Google Places API for better business coverage
function setupAutocomplete(inputId, map, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let currentTimeout;
    let suggestionsList = null;
    
    // Create suggestions dropdown
    const inputContainer = input.parentNode;
    inputContainer.style.position = 'relative';
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear existing timeout
        if (currentTimeout) {
            clearTimeout(currentTimeout);
        }
        
        // Hide suggestions if query is too short
        if (query.length < 2) {
            hideSuggestions();
            return;
        }
        
        // Debounce the search
        currentTimeout = setTimeout(() => {
            searchGooglePlaces(query, input, map, onSelect);
        }, 300);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!inputContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    function hideSuggestions() {
        if (suggestionsList) {
            suggestionsList.remove();
            suggestionsList = null;
        }
    }
    
    function searchGooglePlaces(query, input, map, onSelect) {
        // NYC bounds for restricting search
        const nycBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(40.4774, -74.2591), // SW
            new google.maps.LatLng(40.9176, -73.7004)  // NE
        );
        
        const service = new google.maps.places.AutocompleteService();
        
        service.getPlacePredictions({
            input: query,
            bounds: nycBounds,
            strictBounds: true,
            types: ['establishment'], // Focus on businesses
            componentRestrictions: { country: 'us' }
        }, (predictions, status) => {
            hideSuggestions();
            
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                // Create suggestions list
                suggestionsList = document.createElement('div');
                suggestionsList.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 6px 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    max-height: 350px;
                    overflow-y: auto;
                `;
                
                // Limit to top 10 results
                predictions.slice(0, 10).forEach(prediction => {
                    const suggestion = document.createElement('div');
                    suggestion.style.cssText = `
                        padding: 12px;
                        cursor: pointer;
                        border-bottom: 1px solid #eee;
                        font-size: 14px;
                        line-height: 1.4;
                    `;
                    
                    // Parse the prediction for better display
                    const mainText = prediction.structured_formatting?.main_text || '';
                    const secondaryText = prediction.structured_formatting?.secondary_text || '';
                    const fullDescription = prediction.description;
                    
                    // Check if this looks like a business name match
                    const isBusinessMatch = mainText.toLowerCase().includes(query.toLowerCase()) || 
                                          query.toLowerCase().includes(mainText.toLowerCase());
                    
                    suggestion.innerHTML = `
                        <div style="font-weight: 600; color: ${isBusinessMatch ? '#e74c3c' : '#333'};">${mainText}</div>
                        <div style="font-size: 12px; color: #666;">${secondaryText}</div>
                    `;
                    
                    suggestion.addEventListener('mouseenter', () => {
                        suggestion.style.backgroundColor = '#f5f5f5';
                    });
                    suggestion.addEventListener('mouseleave', () => {
                        suggestion.style.backgroundColor = 'white';
                    });
                    
                    suggestion.addEventListener('click', () => {
                        input.value = fullDescription;
                        
                        // Get place details including coordinates
                        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
                        placesService.getDetails({
                            placeId: prediction.place_id,
                            fields: ['geometry', 'name', 'formatted_address', 'place_id']
                        }, (place, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK) {
                                const coords = [
                                    place.geometry.location.lng(),
                                    place.geometry.location.lat()
                                ];
                                
                                // Center map on selected location
                                map.flyTo({
                                    center: coords,
                                    zoom: 16,
                                    duration: 1000
                                });
                                
                                // Create a feature object similar to Mapbox format
                                const feature = {
                                    text: place.name,
                                    place_name: place.formatted_address,
                                    center: coords,
                                    context: [],
                                    place_id: place.place_id
                                };
                                
                                onSelect(coords, feature);
                            }
                        });
                        
                        hideSuggestions();
                    });
                    
                    suggestionsList.appendChild(suggestion);
                });
                
                inputContainer.appendChild(suggestionsList);
            }
        });
    }
}

function initFormMap() {
    if (!formMap) {
        formMap = new mapboxgl.Map({
            container: 'form-map',
            style: 'mapbox://styles/mapbox/light-v11',
            center: [-74.0060, 40.7128],
            zoom: 10
        });
        
        formMap.on('click', (e) => {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            
            // Remove existing marker
            if (formMapMarker) {
                formMapMarker.remove();
            }
            
            // Add new marker
            formMapMarker = new mapboxgl.Marker({color: '#e74c3c'})
                .setLngLat(coords)
                .addTo(formMap);
            
            // Zoom in to the clicked location
            formMap.flyTo({
                center: coords,
                zoom: 16,
                duration: 1000
            });
            
            // Update the input field with reverse geocoding
            reverseGeocode(coords, 'end-location');
            formData.endLocation = coords;
            formData.endLocationData = null; // No feature data for manual clicks
        });
        
        // Add enhanced autocomplete search functionality
        setupAutocomplete('end-location', formMap, (coords, feature) => {
            // Remove existing marker
            if (formMapMarker) {
                formMapMarker.remove();
            }
            
            // Add marker at selected location
            formMapMarker = new mapboxgl.Marker({color: '#e74c3c'})
                .setLngLat(coords)
                .addTo(formMap);
            
            formData.endLocation = coords;
            formData.endLocationData = feature; // Store full feature data for step 3
        });
    }
}

let formMap2;
let memoryMarkers = [];
let endLocationMarker = null;

function initFormMap2() {
    console.log('Initializing formMap2...');
    const container = document.getElementById('form-map-2');
    if (!container) {
        console.log('form-map-2 container not found');
        return;
    }
    
    if (!formMap2) {
        formMap2 = new mapboxgl.Map({
            container: 'form-map-2',
            style: 'mapbox://styles/mapbox/light-v11',
            center: [-74.0060, 40.7128],
            zoom: 10
        });
        
        formMap2.on('load', () => {
            console.log('formMap2 loaded successfully');
            // Show the end location from step 2 if it exists
            showEndLocationOnMemoryMap();
        });
        
        formMap2.on('click', (e) => {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            
            // Add marker for memory location
            const marker = new mapboxgl.Marker({color: '#3498db'})
                .setLngLat(coords)
                .addTo(formMap2);
            
            memoryMarkers.push({marker, coords});
            
            // Auto-add a memory location input
            addMemoryLocation(coords);
        });
    } else {
        // Map already exists, just resize and show end location
        setTimeout(() => {
            formMap2.resize();
            showEndLocationOnMemoryMap();
        }, 100);
    }
}

function showEndLocationOnMemoryMap() {
    if (formData.endLocation && formMap2) {
        // Remove existing end location marker
        if (endLocationMarker) {
            endLocationMarker.remove();
        }
        
        // Create non-editable marker for the end location
        const el = document.createElement('div');
        el.style.cssText = `
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #e74c3c;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: default;
        `;
        
        endLocationMarker = new mapboxgl.Marker(el)
            .setLngLat(formData.endLocation)
            .addTo(formMap2);
        
        // Add popup showing this is the end location
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <div style="font-weight: 600; color: #e74c3c; margin-bottom: 5px;">End Location</div>
            <div style="font-size: 12px; color: #666;">From previous step</div>
        `);
        
        endLocationMarker.setPopup(popup);
        
        // Center map to show both end location and any memory locations
        const allCoords = [formData.endLocation];
        if (memoryMarkers.length > 0) {
            memoryMarkers.forEach(m => allCoords.push(m.coords));
        }
        
        if (allCoords.length > 1) {
            // Fit to show all locations
            const bounds = new mapboxgl.LngLatBounds();
            allCoords.forEach(coord => bounds.extend(coord));
            formMap2.fitBounds(bounds, {padding: 50});
        } else {
            // Just center on end location
            formMap2.flyTo({
                center: formData.endLocation,
                zoom: 13,
                duration: 1000
            });
        }
    }
}

function addMemoryLocation(coords = null) {
    const container = document.getElementById('memory-locations');
    const div = document.createElement('div');
    div.style.cssText = `
        padding: 15px;
        margin-bottom: 10px;
        background: rgba(166, 124, 82, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(139, 115, 85, 0.1);
    `;
    
    const memoryId = 'memory-' + Date.now();
    
    div.innerHTML = `
        <div style="margin-bottom: 10px;">
            <input type="text" id="${memoryId}" placeholder="Describe this memory location" 
                   style="width: 100%; padding: 8px; border: 1px solid #d4c4b0; border-radius: 4px; font-size: 14px;">
        </div>
        <div style="display: flex; gap: 15px; align-items: center; margin-top: 8px;">
            <button type="button" class="add-context-btn" onclick="toggleContext(this)" 
                    style="background: none; color: #8b7355; border: none; padding: 0; font-size: 11px; cursor: pointer; text-decoration: underline; opacity: 0.7; transition: opacity 0.2s ease;"
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                + add notes
            </button>
            <button type="button" onclick="removeMemoryLocation(this)" 
                    style="background: none; color: #999; border: none; padding: 0; font-size: 11px; cursor: pointer; text-decoration: underline; opacity: 0.7; transition: opacity 0.2s ease;"
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                remove
            </button>
        </div>
        <div class="context-area" style="display: none; margin-top: 10px;">
            <textarea placeholder="Add additional context or notes about this memory..." 
                      style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #d4c4b0; border-radius: 4px; font-size: 12px; resize: vertical;"></textarea>
        </div>
    `;
    
    container.appendChild(div);
    
    // If coordinates provided, reverse geocode to fill in the location
    if (coords) {
        reverseGeocode(coords, memoryId);
    }
}

function toggleContext(button) {
    const contextArea = button.parentNode.nextElementSibling;
    if (contextArea.style.display === 'none') {
        contextArea.style.display = 'block';
        button.textContent = '- hide notes';
        button.style.color = '#6c757d';
        button.style.opacity = '1';
    } else {
        contextArea.style.display = 'none';
        button.textContent = '+ add notes';
        button.style.color = '#8b7355';
        button.style.opacity = '0.7';
    }
}

function removeMemoryLocation(button) {
    const memoryDiv = button.closest('div').parentNode;
    
    // Find and remove the corresponding marker from map
    const input = memoryDiv.querySelector('input[type="text"]');
    if (input && input.value) {
        // Find marker by comparing locations (approximate)
        for (let i = memoryMarkers.length - 1; i >= 0; i--) {
            // Remove the most recently added marker for now
            // In a more sophisticated implementation, we'd match by coordinates
            memoryMarkers[i].marker.remove();
            memoryMarkers.splice(i, 1);
            break;
        }
    }
    
    memoryDiv.remove();
}

// Color picker functionality
function initColorPicker() {
    const colorCanvas = document.getElementById('color-canvas');
    const colorPicker = document.getElementById('color-picker');
    const colorDisplay = document.getElementById('selected-color');
    
    if (!colorCanvas || !colorPicker) {
        console.log('Color picker elements not found');
        return;
    }
    
    // Set canvas size - ensure container is visible first
    const rect = colorPicker.getBoundingClientRect();
    let width = rect.width > 0 ? rect.width : 300;
    let height = rect.height > 0 ? rect.height : 150;
    
    // Ensure minimum size
    if (width < 100) width = 300;
    if (height < 50) height = 150;
    
    colorCanvas.width = width;
    colorCanvas.height = height;
    
    // Also ensure the selected color display matches the width
    if (colorDisplay) {
        colorDisplay.style.width = width + 'px';
    }
    
    console.log('Color picker canvas size:', width, 'x', height);
    
    const colorCtx = colorCanvas.getContext('2d');
    
    // Create hue gradient (rainbow)
    const hueGradient = colorCtx.createLinearGradient(0, 0, colorCanvas.width, 0);
    hueGradient.addColorStop(0, '#ff0000');    // Red
    hueGradient.addColorStop(0.17, '#ff8800'); // Orange
    hueGradient.addColorStop(0.33, '#ffff00'); // Yellow
    hueGradient.addColorStop(0.5, '#00ff00');  // Green
    hueGradient.addColorStop(0.67, '#0088ff'); // Blue
    hueGradient.addColorStop(0.83, '#8800ff'); // Indigo
    hueGradient.addColorStop(1, '#ff0088');    // Violet
    
    colorCtx.fillStyle = hueGradient;
    colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
    
    // Add saturation/brightness gradient
    const saturationGradient = colorCtx.createLinearGradient(0, 0, 0, colorCanvas.height);
    saturationGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    saturationGradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    saturationGradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    
    colorCtx.fillStyle = saturationGradient;
    colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
    
    // Handle clicks
    colorCanvas.addEventListener('click', function(e) {
        const rect = colorCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const imageData = colorCtx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        
        colorDisplay.style.backgroundColor = rgb;
        document.getElementById('relationship-color').value = hex;
        formData.relationshipColor = hex;
    });
    
    // Touch support
    colorCanvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        colorCanvas.dispatchEvent(clickEvent);
    });
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Duration slider and season selector
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('duration-slider');
    const display = document.getElementById('duration-display');
    
    if (slider && display) {
        slider.addEventListener('input', function() {
            const weeks = parseInt(this.value);
            let displayText;
            if (weeks < 4) {
                displayText = weeks + ' week' + (weeks > 1 ? 's' : '');
            } else if (weeks < 52) {
                const months = Math.round(weeks / 4.33);
                displayText = months + ' month' + (months > 1 ? 's' : '');
            } else {
                const years = Math.round(weeks / 52 * 10) / 10;
                displayText = years + ' year' + (years > 1 ? 's' : '');
            }
            display.textContent = displayText;
            formData.duration = weeks;
        });
    }
    
    // Season selector - Fixed to properly record selection
    setTimeout(() => {
        document.querySelectorAll('.season').forEach(season => {
            season.addEventListener('click', function() {
                document.querySelectorAll('.season').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                formData.endSeason = this.dataset.season;
                console.log('Season selected:', formData.endSeason);
            });
        });
    }, 500);
    
    // Initialize canvases when steps are shown (removed global initialization)
});

// Timeline canvas for emotional journey - Updated with axis
let timelineCanvas, timelineCtx;
let timelineDrawing = false;
let timelinePoints = [];

function initTimelineCanvas() {
    timelineCanvas = document.getElementById('timeline-canvas');
    if (!timelineCanvas) return;
    
    // Set responsive canvas size with proper pixel ratio
    const container = timelineCanvas.parentElement;
    const containerWidth = container.clientWidth;
    const displayWidth = Math.min(600, containerWidth - 40);
    const displayHeight = window.innerWidth < 768 ? 200 : 250;
    
    // Set the display size
    timelineCanvas.style.width = displayWidth + 'px';
    timelineCanvas.style.height = displayHeight + 'px';
    
    // Set the actual canvas size for crisp rendering
    const scale = window.devicePixelRatio || 1;
    timelineCanvas.width = displayWidth * scale;
    timelineCanvas.height = displayHeight * scale;
    
    timelineCtx = timelineCanvas.getContext('2d');
    timelineCtx.scale(scale, scale);
    
    drawTimelineBackground();
    
    // Mouse events
    timelineCanvas.addEventListener('mousedown', startTimelineDrawing);
    timelineCanvas.addEventListener('mousemove', drawTimeline);
    timelineCanvas.addEventListener('mouseup', stopTimelineDrawing);
    timelineCanvas.addEventListener('mouseout', stopTimelineDrawing);
    
    // Touch events
    timelineCanvas.addEventListener('touchstart', handleTimelineTouch);
    timelineCanvas.addEventListener('touchmove', handleTimelineTouch);
    timelineCanvas.addEventListener('touchend', stopTimelineDrawing);
}

function drawTimelineBackground() {
    if (!timelineCanvas || !timelineCtx) return;
    
    // Get the display dimensions (not scaled canvas dimensions)
    const displayWidth = parseInt(timelineCanvas.style.width);
    const displayHeight = parseInt(timelineCanvas.style.height);
    
    // Clear canvas with white background
    timelineCtx.clearRect(0, 0, displayWidth, displayHeight);
    timelineCtx.fillStyle = 'white';
    timelineCtx.fillRect(0, 0, displayWidth, displayHeight);
    
    const margin = 50;
    const rightMargin = 20;
    const bottomMargin = 40;
    const drawWidth = displayWidth - margin - rightMargin;
    const drawHeight = displayHeight - bottomMargin;
    
    // Draw grid lines
    timelineCtx.strokeStyle = '#e0e0e0';
    timelineCtx.lineWidth = 1;
    
    // Horizontal lines (happiness levels)
    for (let i = 0; i <= 4; i++) {
        const y = (drawHeight / 4) * i;
        timelineCtx.beginPath();
        timelineCtx.moveTo(margin, y);
        timelineCtx.lineTo(displayWidth - rightMargin, y);
        timelineCtx.stroke();
    }
    
    // Vertical lines (time markers)
    for (let i = 0; i <= 4; i++) {
        const x = margin + (drawWidth / 4) * i;
        timelineCtx.beginPath();
        timelineCtx.moveTo(x, 0);
        timelineCtx.lineTo(x, drawHeight);
        timelineCtx.stroke();
    }
    
    // Draw axes
    timelineCtx.strokeStyle = '#333';
    timelineCtx.lineWidth = 2;
    
    // Y-axis (happiness)
    timelineCtx.beginPath();
    timelineCtx.moveTo(margin, 0);
    timelineCtx.lineTo(margin, drawHeight);
    timelineCtx.stroke();
    
    // X-axis (time)
    timelineCtx.beginPath();
    timelineCtx.moveTo(margin, drawHeight);
    timelineCtx.lineTo(displayWidth - rightMargin, drawHeight);
    timelineCtx.stroke();
    
    // Add labels
    timelineCtx.font = '12px Arial';
    timelineCtx.fillStyle = '#666';
    timelineCtx.textAlign = 'right';
    timelineCtx.textBaseline = 'middle';
    
    // Y-axis labels
    const happinessLabels = ['Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad'];
    for (let i = 0; i < 5; i++) {
        const y = (drawHeight / 4) * i;
        timelineCtx.fillText(happinessLabels[i], margin - 5, y);
    }
    
    // X-axis label
    timelineCtx.textAlign = 'center';
    timelineCtx.textBaseline = 'top';
    timelineCtx.fillText('Time →', displayWidth / 2, drawHeight + 10);
}

function handleTimelineTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    timelineCanvas.dispatchEvent(mouseEvent);
}

function startTimelineDrawing(e) {
    timelineDrawing = true;
    timelinePoints = [];
    const rect = timelineCanvas.getBoundingClientRect();
    const scaleX = parseInt(timelineCanvas.style.width) / rect.width;
    const scaleY = parseInt(timelineCanvas.style.height) / rect.height;
    const point = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
    timelinePoints.push(point);
}

function drawTimeline(e) {
    if (!timelineDrawing) return;
    const rect = timelineCanvas.getBoundingClientRect();
    const scaleX = parseInt(timelineCanvas.style.width) / rect.width;
    const scaleY = parseInt(timelineCanvas.style.height) / rect.height;
    const point = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
    timelinePoints.push(point);
    
    // Redraw background first
    drawTimelineBackground();
    
    // Draw the happiness curve
    if (timelinePoints.length > 1) {
        timelineCtx.strokeStyle = '#667eea';
        timelineCtx.lineWidth = 3;
        timelineCtx.lineCap = 'round';
        timelineCtx.lineJoin = 'round';
        timelineCtx.beginPath();
        timelineCtx.moveTo(timelinePoints[0].x, timelinePoints[0].y);
        for (let i = 1; i < timelinePoints.length; i++) {
            timelineCtx.lineTo(timelinePoints[i].x, timelinePoints[i].y);
        }
        timelineCtx.stroke();
    }
}

function stopTimelineDrawing() {
    if (timelineDrawing) {
        timelineDrawing = false;
        formData.emotionalJourney = timelinePoints;
    }
}

function submitForm() {
    // Collect all form data
    formData.story = document.getElementById('story-text').value;
    formData.relationshipColor = document.getElementById('relationship-color').value;
    
    // Collect memory locations with context
    const memoryContainer = document.getElementById('memory-locations');
    formData.memoryLocations = [];
    
    if (memoryContainer) {
        const memoryDivs = memoryContainer.children;
        for (let div of memoryDivs) {
            const locationInput = div.querySelector('input[type="text"]');
            const contextTextarea = div.querySelector('textarea');
            
            if (locationInput && locationInput.value.trim()) {
                formData.memoryLocations.push({
                    location: locationInput.value.trim(),
                    context: contextTextarea ? contextTextarea.value.trim() : ''
                });
            }
        }
    }
    
    console.log('Form submitted with complete data:', formData);
    alert('Thank you for sharing your story. It has been added to the collective map.');
    goToLanding();
} 