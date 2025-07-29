// Supabase Configuration and Progressive Saving
const SUPABASE_URL = 'https://hcdtrmealydzdqubybwj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZHRybWVhbHlkemRxdWJ5YndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzU2NjUsImV4cCI6MjA2ODU1MTY2NX0.c2Nh2XotOR9xoR2aW0xx-qZkG1BlLZSmvkhMfcR95EE';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Session Management
let sessionId = null;

function initializeSession() {
    // Try to get existing session ID from localStorage
    sessionId = localStorage.getItem('breakup-map-session');
    
    if (!sessionId) {
        // Generate new UUID-format session ID
        sessionId = generateUUID();
        localStorage.setItem('breakup-map-session', sessionId);
        console.log('New session created:', sessionId);
    } else {
        console.log('Existing session found:', sessionId);
    }
}

// Generate a proper UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Progressive Saving Functions
async function saveSubmissionData(stepCompleted, additionalData = {}) {
    if (!sessionId) {
        console.error('No session ID available');
        return;
    }

    try {
        // Prepare the data to save
        const submissionData = {
            session_id: sessionId,
            status: stepCompleted >= 7 ? 'complete' : 'partial',
            step_completed: stepCompleted,
            ...additionalData
        };

        // Remove any undefined values
        Object.keys(submissionData).forEach(key => {
            if (submissionData[key] === undefined) {
                delete submissionData[key];
            }
        });

        console.log('Saving submission data:', submissionData);

        // First try to see if record exists
        const { data: existingData } = await supabase
            .from('submissions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        console.log('Existing record:', existingData);

        let result;
        if (existingData) {
            // Update existing record
            result = await supabase
                .from('submissions')
                .update(submissionData)
                .eq('session_id', sessionId);
        } else {
            // Insert new record
            result = await supabase
                .from('submissions')
                .insert(submissionData);
        }

        const { data, error } = result;

        if (error) {
            console.error('Error saving data:', error);
            console.error('Full error details:', JSON.stringify(error, null, 2));
        } else {
            console.log('Data saved successfully:', data);
        }
    } catch (err) {
        console.error('Failed to save data:', err);
    }
}

// Step-specific saving functions
async function saveStep2Data() {
    if (formData.endLocation) {
        await saveSubmissionData(2, {
            breakup_location: {
                coordinates: formData.endLocation,
                place_name: formData.endLocationData?.place_name || formData.endLocationData?.text || 'Unknown location'
            }
        });
    }
}

async function saveStep3Data() {
    // Only save if there are memory markers
    if (memoryMarkers && memoryMarkers.length > 0) {
        const memoryLocations = memoryMarkers.map(marker => ({
            coordinates: marker.coords,
            description: marker.description || '',
            context: marker.context || ''
        }));

        await saveSubmissionData(3, {
            memory_locations: memoryLocations
        });
    } else {
        // Save empty array to indicate step was completed
        await saveSubmissionData(3, {
            memory_locations: []
        });
    }
}

async function saveStep5Data() {
    await saveSubmissionData(5, {
        duration: formData.duration || null
    });
}

async function saveStep7Data() {
    const storyText = document.getElementById('story-text')?.value || '';
    await saveSubmissionData(7, {
        story: storyText || null
    });
}

async function saveCompleteSubmission() {
    // Collect all final data
    const storyText = document.getElementById('story-text')?.value || '';
    
    // Simplified data structure that should definitely work
    const completeData = {
        story: storyText || null,
        duration: formData.duration || null
    };

    // Add memory locations as simple JSON if they exist
    if (memoryMarkers.length > 0) {
        completeData.memory_locations = memoryMarkers.map(marker => ({
            coordinates: marker.coords,
            description: marker.description || '',
            context: marker.context || ''
        }));
    }

    // Add breakup location if available
    if (formData.endLocation) {
        completeData.breakup_location = {
            coordinates: formData.endLocation,
            place_name: formData.endLocationData?.place_name || formData.endLocationData?.text || 'Unknown location'
        };
    }

    console.log('Complete data being saved:', JSON.stringify(completeData, null, 2));
    await saveSubmissionData(7, completeData);
}

// Initialize session when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSession();
});

mapboxgl.accessToken = 'pk.eyJ1IjoibGluZ2x1NjYiLCJhIjoiY21jemNneWtwMHRpazJxcHo4ejE3eWo3MyJ9.jprho4oY5mPdmieXJMa2cg';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-74.0060, 40.7128],
    zoom: 10,
    pitch: 0,
    bearing: 0
});

async function goToStep(stepNumber) {
    // Save current step data before transitioning
    const currentStep = document.querySelector('.form-step[style*="block"], .form-step.active');
    
    if (currentStep) {
        const currentStepNum = parseInt(currentStep.id.replace('step-', ''));
        
        // Save data based on the step we're leaving
        try {
            switch (currentStepNum) {
                case 2:
                    await saveStep2Data();
                    break;
                case 3:
                    await saveStep3Data();
                    break;
                case 5:
                    await saveStep5Data();
                    break;
                case 7:
                    await saveStep7Data();
                    break;
            }
        } catch (error) {
            console.error(`Error saving step ${currentStepNum} data:`, error);
        }
    }
    
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

    // New interactive storyless locations
    {
        location: "Sanuki Udon",
        address: "31 W 4th St",
        coordinates: [-73.9982, 40.7302],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Washington Square Park (NE Corner)",
        address: "Washington Square",
        coordinates: [-73.9972, 40.7318],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Equinox (Steam Room)",
        address: "Columbus Circle",
        coordinates: [-73.9819, 40.7680],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "The Met (Stairs)",
        address: "1000 5th Ave",
        coordinates: [-73.9632, 40.7794],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Teazzi LIC",
        address: "43-21 Hunter St",
        coordinates: [-73.942469, 40.747828],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Hunter's Point South",
        address: "1-15 57th Ave",
        coordinates: [-73.9600, 40.7385],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Bushwick Inlet Park",
        address: "Kent Ave",
        coordinates: [-73.9627, 40.7215],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "PPL Williamsburg",
        address: "189 Roebling St",
        coordinates: [-73.9576, 40.7062],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "East River Promenade",
        address: "Manhattan",
        coordinates: [-73.9742, 40.7520],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
    },
    {
        location: "Green Acre Park",
        address: "217 E 51st St",
        coordinates: [-73.9700, 40.7565],
        story: "",
        isDefault: false,
        isActive: false,
        isInteractive: true
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
        el.style.width = story.isActive ? '20px' : '16px';
        el.style.height = story.isActive ? '20px' : '16px';
        el.style.borderRadius = '50%';
        el.style.background = story.isActive ? (story.isDefault ? '#dc3545' : '#e74c3c') : '#c82333';
        el.style.border = story.isActive ? '3px solid white' : '3px solid white';
        el.style.boxShadow = story.isActive ? '0 4px 12px rgba(0,0,0,0.3)' : '0 3px 10px rgba(200,35,51,0.4)';
        el.style.cursor = (story.isActive || story.isInteractive) ? 'pointer' : 'default';
        el.style.transition = 'box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease';
        el.style.transformOrigin = 'center center';
        
        // Add hover effects to ALL dots
        el.addEventListener('mouseenter', () => {
            if (story.isActive) {
                el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
            } else if (story.isInteractive) {
                el.style.boxShadow = '0 4px 12px rgba(200,35,51,0.6)';
                el.style.width = '18px';
                el.style.height = '18px';
            } else {
                el.style.boxShadow = '0 4px 12px rgba(200,35,51,0.5)';
                el.style.width = '17px';
                el.style.height = '17px';
            }
        });
        
        el.addEventListener('mouseleave', () => {
            if (story.isActive) {
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            } else {
                el.style.boxShadow = story.isInteractive ? '0 3px 10px rgba(200,35,51,0.4)' : '0 3px 10px rgba(200,35,51,0.4)';
                el.style.width = story.isActive ? '20px' : '16px';
                el.style.height = story.isActive ? '20px' : '16px';
            }
        });

        // Add interactions for active stories and interactive storyless dots
        if (story.isActive || story.isInteractive) {
            
            // Create popup based on story type
            let popup;
            if (story.isActive) {
                // Story popup for active stories
                popup = new mapboxgl.Popup({
                    offset: 25,
                    closeButton: false,
                    closeOnClick: false,
                    className: 'story-popup'
                }).setHTML(`
                    <div class="popup-location">${story.location}</div>
                    <div class="popup-story">"${story.story}"</div>
                `);
            } else if (story.isInteractive) {
                // Address popup for interactive storyless dots
                popup = new mapboxgl.Popup({
                    offset: 25,
                    closeButton: false,
                    closeOnClick: false,
                    className: 'story-popup'
                }).setHTML(`
                    <div class="popup-location">${story.location}</div>
                    <div class="popup-story" style="font-style: normal; color: #8b7355;">${story.address}</div>
                `);
            }

            // Add event listener to close current popup when this one closes
            popup.on('close', () => {
                if (currentPopup === popup) {
                    currentPopup = null;
                }
            });

            // Store popup reference
            story.popup = popup;

            // Custom click handler to ensure only one popup is open
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Stop auto-cycling when user interacts (only for story dots)
                if (story.isActive && cycleInterval) {
                    clearInterval(cycleInterval);
                    cycleInterval = null;
                }
                
                // Animate out current popup if one is open
                if (currentPopup && currentPopup.isOpen()) {
                    currentPopup.remove();
                    // Open new popup immediately
                    popup.setLngLat(story.coordinates).addTo(map);
                    currentPopup = popup;
                } else {
                    // No current popup, just open this one
                    popup.setLngLat(story.coordinates).addTo(map);
                    currentPopup = popup;
                }
            });

            // Store reference for default popup (only for active stories)
            if (story.isDefault && story.isActive) {
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
    
    // Trigger entrance animations for the intro step
    setTimeout(() => {
        triggerIntroAnimations();
    }, 100);
    
    if (isLocal) {
        // Local development - use hash
        window.location.hash = 'submit';
    } else {
        // Hosted - use proper URL
        history.pushState({page: 'submit'}, 'Submit Your Story', '/submit');
    }
}

function triggerIntroAnimations() {
    const submitTitle = document.querySelector('.submit-title');
    const submitSubtext = document.querySelector('.submit-subtext');
    const introButtons = document.querySelector('.intro-buttons');
    
    // Reset animations first (in case returning to this step)
    [submitTitle, submitSubtext, introButtons].forEach(el => {
        if (el) el.classList.remove('animate-in');
    });
    
    // Trigger animations with simpler timing since we have fewer elements
    setTimeout(() => {
        if (submitTitle) submitTitle.classList.add('animate-in');
    }, 100);
    
    setTimeout(() => {
        if (submitSubtext) submitSubtext.classList.add('animate-in');
    }, 300);
    
    setTimeout(() => {
        if (introButtons) introButtons.classList.add('animate-in');
    }, 600);
}

function triggerSidebarContentAnimations() {
    const sidebarTitle = document.querySelector('.map-form-sidebar h2');
    const formSections = document.querySelectorAll('.map-form-sidebar .form-section');
    const inputGroups = document.querySelectorAll('.map-form-sidebar .input-group');
    const stepNavigation = document.querySelector('.map-form-sidebar .step-navigation');
    const mobileNavigation = document.querySelector('.map-form-sidebar .step-navigation-mobile');
    
    // Reset animations first
    [sidebarTitle, stepNavigation, mobileNavigation].forEach(el => {
        if (el) el.classList.remove('animate-in');
    });
    formSections.forEach(el => el.classList.remove('animate-in'));
    inputGroups.forEach(el => el.classList.remove('animate-in'));
    
    // Trigger staggered animations
    setTimeout(() => {
        if (sidebarTitle) sidebarTitle.classList.add('animate-in');
    }, 100);
    
    setTimeout(() => {
        formSections.forEach(section => section.classList.add('animate-in'));
    }, 200);
    
    setTimeout(() => {
        inputGroups.forEach(group => group.classList.add('animate-in'));
    }, 300);
    
    setTimeout(() => {
        if (stepNavigation) stepNavigation.classList.add('animate-in');
        if (mobileNavigation) mobileNavigation.classList.add('animate-in');
    }, 400);
}

function goToLanding() {
    document.getElementById('submit-page').style.display = 'none';
    document.getElementById('landing-page').style.display = 'grid';
    
    // Refresh the main map after returning to landing page
    setTimeout(() => {
        if (map) {
            map.resize();
            
            // Re-center the map to NYC
            map.flyTo({
                center: [-73.95, 40.73],
                zoom: 11.5,
                duration: 1500
            });
            
            // Restart the popup cycling if it was stopped
            if (cycleInterval) {
                clearInterval(cycleInterval);
            }
            
            // Close any open popups first
            if (currentPopup && currentPopup.isOpen()) {
                currentPopup.remove();
                currentPopup = null;
            }
            
            // Restart cycling after a brief delay
            setTimeout(() => {
                const defaultStory = sampleStories.find(story => story.isDefaultPopup);
                if (defaultStory && defaultStory.popup) {
                    defaultStory.popup.setLngLat(defaultStory.coordinates).addTo(map);
                    currentPopup = defaultStory.popup;
                    
                    setTimeout(() => {
                        startCycling();
                    }, 3000);
                }
            }, 1000);
        }
    }, 100);
    
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
}

function showStep(stepNumber) {
    console.log('Showing step:', stepNumber);
    
    // Find currently visible step
    const currentStep = document.querySelector('.form-step[style*="block"], .form-step.active');
    const newStep = document.getElementById('step-' + stepNumber);
    
    // Check if this is a map step
    const isMapStep = stepNumber === 2 || stepNumber === 3;
    const wasMapStep = currentStep && (currentStep.id === 'step-2' || currentStep.id === 'step-3');
    const isMapToMapTransition = wasMapStep && isMapStep;
    
    // Handle shared map container visibility with smooth transition
    const sharedMapContainer = document.getElementById('shared-map-container');
    
    if (isMapStep) {
        if (!wasMapStep) {
            // Transitioning TO map from non-map step
            sharedMapContainer.style.display = 'block';
            setTimeout(() => {
                sharedMapContainer.classList.add('show');
            }, 100);
        }
        // Update dynamic sidebar content ONLY if not a map-to-map transition
        if (!isMapToMapTransition) {
            updateDynamicSidebar(stepNumber);
        }
    } else {
        if (wasMapStep) {
            // Transitioning FROM map to non-map step
            sharedMapContainer.classList.remove('show');
            setTimeout(() => {
                sharedMapContainer.style.display = 'none';
            }, 800);
        }
    }
    
    if (currentStep && currentStep !== newStep) {
        if (isMapToMapTransition) {
            // For map-to-map transitions, smooth sidebar content transition
            currentStep.classList.add('exiting');
            currentStep.classList.remove('active');
            
            setTimeout(() => {
                currentStep.style.display = 'none';
                currentStep.classList.remove('exiting');
                newStep.style.display = 'block';
                
                setTimeout(() => {
                    newStep.classList.add('active');
                }, 50);
                
                // Update sidebar content with slight delay for smoothness
                setTimeout(() => {
                    updateDynamicSidebar(stepNumber);
                    
                    // Update map behavior for the new step
                    currentMapStep = stepNumber;
                    setupMapForCurrentStep();
                }, 100);
            }, 300);
            
        } else {
            // Normal transition for non-map steps
            currentStep.classList.add('exiting');
            currentStep.classList.remove('active');
            
            // After animation completes, hide current and show new
            setTimeout(() => {
                // Hide all steps and reset styles
                for (let i = 1; i <= 8; i++) {
                    const step = document.getElementById('step-' + i);
                    if (step) {
                        step.style.display = 'none';
                        step.classList.remove('active', 'exiting');
                        // Reset any transition styles
                        resetStepStyles(step);
                        const sidebar = step.querySelector('.map-form-sidebar');
                        resetSidebarStyles(sidebar);
                    }
                }
                
                // Show new step with smooth animation
                newStep.style.display = 'block';
                setTimeout(() => {
                    newStep.classList.add('active');
                }, 50);
    
                // Initialize maps and canvases for steps that need them
                setTimeout(() => {
                    if (stepNumber === 1) {
                        console.log('Triggering intro animations for step 1');
                        triggerIntroAnimations();
                    } else if (stepNumber === 2 || stepNumber === 3) {
                        console.log(`Initializing shared map for step ${stepNumber}`);
                        initSharedFormMap(stepNumber);
                    } else if (stepNumber === 4) {
                        console.log('Initializing step 4 color picker');
                        initColorPicker();
                    } else if (stepNumber === 8) {
                        console.log('Initializing step 8 timeline');
                        initTimelineCanvas();
                    }
                }, 300);
                
            }, 600); // Wait for exit animation to complete
        }
    } else {
        // No current step or same step, just show directly
        for (let i = 1; i <= 8; i++) {
            const step = document.getElementById('step-' + i);
            if (step) {
                step.style.display = 'none';
                step.classList.remove('active', 'exiting');
                // Reset any transition styles
                resetStepStyles(step);
                const sidebar = step.querySelector('.map-form-sidebar');
                resetSidebarStyles(sidebar);
            }
        }
        
        newStep.style.display = 'block';
        setTimeout(() => {
            newStep.classList.add('active');
        }, 50);
        
        // Initialize maps and canvases for steps that need them
        setTimeout(() => {
            if (stepNumber === 1) {
                console.log('Triggering intro animations for step 1');
                triggerIntroAnimations();
            } else if (stepNumber === 2 || stepNumber === 3) {
                console.log(`Initializing shared map for step ${stepNumber}`);
                initSharedFormMap(stepNumber);
            } else if (stepNumber === 4) {
                console.log('Initializing step 4 color picker');
                initColorPicker();
            } else if (stepNumber === 8) {
                console.log('Initializing step 8 timeline');
                initTimelineCanvas();
            }
        }, 300);
    }
}

function updateDynamicSidebar(stepNumber) {
    const dynamicSidebar = document.getElementById('dynamic-sidebar');
    const sourceContent = document.getElementById(`step-${stepNumber}-sidebar-content`);
    
    if (dynamicSidebar && sourceContent) {
        // Add smooth transition for content change
        dynamicSidebar.classList.add('content-changing');
        
        setTimeout(() => {
            // Copy sidebar content
            dynamicSidebar.innerHTML = sourceContent.innerHTML;
            
            // If step 3, restore any existing memory location inputs
            if (stepNumber === 3 && memoryMarkers.length > 0) {
                restoreMemoryLocationInputs();
            }
            
            // Remove transition class and trigger content animations
            setTimeout(() => {
                dynamicSidebar.classList.remove('content-changing');
                triggerSidebarContentAnimations();
            }, 50);
        }, 200);
    } else {
        console.error(`Missing elements for step ${stepNumber}: dynamicSidebar=${!!dynamicSidebar}, sourceContent=${!!sourceContent}`);
    }
}

function restoreMemoryLocationInputs() {
    const container = document.getElementById('memory-locations');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Recreate input forms for each memory marker
    memoryMarkers.forEach((memoryData, index) => {
        restoreMemoryLocationDiv(memoryData.coords, memoryData.id, memoryData.description, memoryData.context);
    });
}

function restoreMemoryLocationDiv(coords, memoryId, description = '', context = '') {
    const container = document.getElementById('memory-locations');
    const div = document.createElement('div');
    div.style.cssText = `
        padding: 10px;
        margin-bottom: 15px;
        background: rgba(166, 124, 82, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(139, 115, 85, 0.1);
    `;
    
    div.setAttribute('data-memory-id', memoryId);
    const uniqueId = memoryId;
    
    div.innerHTML = `
        <div style="margin-bottom: 10px; display: none;">
            <label style="display: block; margin-bottom: 5px; font-size: 12px; color: #8b7355; font-weight: 500;">Search for a place:</label>
            <input type="text" id="search-${uniqueId}" placeholder="Search for a café, restaurant, park..." 
                   style="width: 100%; padding: 8px; border: 1px solid #d4c4b0; border-radius: 4px; font-size: 14px; margin-bottom: 8px;">
            <div style="display: none; padding: 8px; background: rgba(166, 124, 82, 0.1); border-radius: 4px; font-size: 12px; color: #8b7355;" class="preview-location">
                <strong>Preview:</strong> <span class="preview-text"></span>
                <div style="margin-top: 5px;">
                    <button type="button" class="confirm-location" style="background: #8b7355; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; margin-right: 8px;">✓ Add This Location</button>
                    <button type="button" class="cancel-preview" style="background: none; color: #999; border: none; padding: 4px; font-size: 11px; cursor: pointer; text-decoration: underline;">✕ cancel</button>
                </div>
            </div>
        </div>
        <div style="position: relative;" class="location-confirmed">
            <input type="text" id="memory-${uniqueId}" placeholder="Describe this memory location" 
                   value="${description}"
                   style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #d4c4b0; border-radius: 4px; font-size: 14px; background: #f9f7f4;">
            <button type="button" class="remove-memory-btn" onclick="removeMemoryLocation(this)" 
                    style="position: absolute; top: 50%; right: 8px; transform: translateY(-50%); 
                           background: none; color: #999; border: none; padding: 0; 
                           font-size: 16px; cursor: pointer; width: 20px; height: 20px; 
                           display: flex; align-items: center; justify-content: center;
                           border-radius: 50%; transition: all 0.2s ease;"
                    onmouseover="this.style.backgroundColor='#f0f0f0'; this.style.color='#dc3545';" 
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999';"
                    title="Remove this memory location">
                ✕
            </button>
        </div>
    `;
    
    container.appendChild(div);
    
    // Add event listener to save description changes
    const descriptionInput = div.querySelector(`#memory-${uniqueId}`);
    
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function() {
            updateMemoryData(memoryId, 'description', this.value);
        });
    }
}

function updateMemoryData(memoryId, field, value) {
    const memoryData = memoryMarkers.find(m => m.id === memoryId);
    if (memoryData) {
        memoryData[field] = value;
    }
}

async function goToStep(stepNumber) {
    // Save current step data before transitioning
    const currentStep = document.querySelector('.form-step[style*="block"], .form-step.active');
    
    if (currentStep) {
        const currentStepNum = parseInt(currentStep.id.replace('step-', ''));
        
        // Save data based on the step we're leaving
        try {
            switch (currentStepNum) {
                case 2:
                    await saveStep2Data();
                    break;
                case 3:
                    await saveStep3Data();
                    break;
                case 5:
                    await saveStep5Data();
                    break;
                case 7:
                    await saveStep7Data();
                    break;
            }
        } catch (error) {
            console.error(`Error saving step ${currentStepNum} data:`, error);
        }
    }
    
    showStep(stepNumber);
}

// Helper function to reset sidebar transition styles
function resetSidebarStyles(sidebar) {
    if (sidebar) {
        sidebar.style.opacity = '';
        sidebar.style.transform = '';
        sidebar.style.transition = '';
    }
}

// Helper function to reset step transition styles
function resetStepStyles(step) {
    if (step) {
        step.style.opacity = '';
        step.style.transition = '';
    }
}

let sharedFormMap;
let currentMapStep = null;
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
                
                // If this is a memory location input, update the stored data
                if (inputId.startsWith('memory-')) {
                    const memoryId = inputId.replace('memory-', '');
                    updateMemoryData(memoryId, 'description', placeName);
                }
            }
        } else {
            const input = document.getElementById(inputId);
            if (input) {
                const fallbackValue = `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
                input.value = fallbackValue;
                
                // If this is a memory location input, update the stored data
                if (inputId.startsWith('memory-')) {
                    const memoryId = inputId.replace('memory-', '');
                    updateMemoryData(memoryId, 'description', fallbackValue);
                }
            }
        }
    } catch (error) {
        console.log('Reverse geocoding failed:', error);
        const input = document.getElementById(inputId);
        if (input) {
            const fallbackValue = `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
            input.value = fallbackValue;
            
            // If this is a memory location input, update the stored data
            if (inputId.startsWith('memory-')) {
                const memoryId = inputId.replace('memory-', '');
                updateMemoryData(memoryId, 'description', fallbackValue);
            }
        }
    }
}

// Enhanced autocomplete search functionality using Google Places API for better business coverage
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


function initSharedFormMap(stepNumber) {
    console.log(`Initializing shared form map for step ${stepNumber}`);
    currentMapStep = stepNumber;
    
    let initialCenter = [-74.0060, 40.7128];
    let initialZoom = 10;
    
    // Use end location if available
    if (formData.endLocation) {
        initialCenter = formData.endLocation;
        // Adjust zoom based on step and existing memory markers
        if (memoryMarkers.length > 0) {
            initialZoom = 13; // Broader view when there are memory markers
        } else {
            initialZoom = stepNumber === 2 ? 16 : 13;
        }
        console.log(`Using end location:`, initialCenter, `zoom: ${initialZoom}`);
    }
    
    if (!sharedFormMap) {
        console.log('Creating single shared map instance');
        // Always use form-map container - we'll move the sidebar content instead
        sharedFormMap = new mapboxgl.Map({
            container: 'form-map',
            style: 'mapbox://styles/mapbox/light-v11',
            center: initialCenter,
            zoom: initialZoom
        });
        
        sharedFormMap.on('load', () => {
            console.log('Shared map loaded successfully');
            setupMapForCurrentStep();
        });
        
        sharedFormMap.on('click', handleMapClick);
    } else {
        console.log('Reusing existing map, just updating behavior');
        // Map already exists, just update its behavior
        setupMapForCurrentStep();
            }
}

function setupMapForCurrentStep() {
    if (!sharedFormMap) return;
    
    console.log(`Setting up map for step ${currentMapStep}`);
    
    // Clean up any existing state first
    cleanupMapStep();
    
    if (currentMapStep === 2) {
        // Step 2: End location selection
        setupStep2Behavior();
    } else if (currentMapStep === 3) {
        // Step 3: Memory locations
        setupStep3Behavior();
    }
}

function cleanupMapStep() {
    console.log('Cleaning up map step');
            
    // Reset autocomplete setup flags to allow re-initialization
    const endLocationInput = document.getElementById('end-location');
    if (endLocationInput) {
        endLocationInput.removeAttribute('data-autocomplete-setup');
    }
    
    // Clear memory location autocomplete flags
    document.querySelectorAll('[data-memory-autocomplete-setup]').forEach(input => {
        input.removeAttribute('data-memory-autocomplete-setup');
    });
}

function setupStep2Behavior() {
    console.log('Setting up step 2 behavior');
    
    // Keep memory markers visible - they should persist across steps
    if (memoryMarkers.length > 0) {
        console.log('Keeping memory markers visible in step 2');
        memoryMarkers.forEach(markerData => {
            if (!markerData.marker.getMap()) {
                markerData.marker.addTo(sharedFormMap);
            }
        });
    }
    
    // Restore the marker to step 2 styling (editable)
    if (formMapMarker && formData.endLocation) {
        console.log('Restoring step 2 marker styling');
        const markerEl = formMapMarker.getElement();
        
        // Restore original red color for Mapbox default markers
        const svg = markerEl.querySelector('svg');
        if (svg) {
            svg.style.fill = '#e74c3c'; // Original red
        }
        
        // Restore editable styling
        markerEl.style.cursor = 'pointer'; // Clickable
        markerEl.style.filter = 'drop-shadow(0 4px 8px rgba(231,76,60,0.3))';
        
        // Remove the popup since it's editable in step 2
        if (formMapMarker.getPopup()) {
            formMapMarker.setPopup(null);
        }
        
        // Update input field
        if (formData.endLocationData) {
            const input = document.getElementById('end-location');
            if (input) {
                input.value = formData.endLocationData.place_name || formData.endLocationData.text;
    }
        }
        
        // Zoom to show both end location and any memory markers
        const allCoords = [formData.endLocation];
        if (memoryMarkers.length > 0) {
            memoryMarkers.forEach(m => allCoords.push(m.coords));
        }
        
        if (allCoords.length > 1) {
            // Fit to show all locations
            const bounds = new mapboxgl.LngLatBounds();
            allCoords.forEach(coord => bounds.extend(coord));
            sharedFormMap.fitBounds(bounds, {padding: 50, duration: 1000});
        } else {
            // Just the end location
            sharedFormMap.flyTo({
                center: formData.endLocation,
                zoom: 16,
                duration: 1000
            });
        }
    } else if (formData.endLocation && !formMapMarker) {
        // Create marker if it doesn't exist
        console.log('Creating step 2 end location marker');
        formMapMarker = new mapboxgl.Marker({color: '#e74c3c'})
            .setLngLat(formData.endLocation)
            .addTo(sharedFormMap);
    }
    
    // Setup autocomplete (only once)
    const input = document.getElementById('end-location');
    if (input && !input.hasAttribute('data-autocomplete-setup')) {
        console.log('Setting up autocomplete for step 2');
        input.setAttribute('data-autocomplete-setup', 'true');
        setupAutocomplete('end-location', sharedFormMap, (coords, feature) => {
            if (formMapMarker) {
                formMapMarker.remove();
            }
            
            formMapMarker = new mapboxgl.Marker({color: '#e74c3c'})
                .setLngLat(coords)
                .addTo(sharedFormMap);
            
            formData.endLocation = coords;
            formData.endLocationData = feature;
        });
    }
}

function setupStep3Behavior() {
    console.log('Setting up step 3 behavior');
    
    // Change the existing marker styling to indicate it's now non-editable
    if (formMapMarker && formData.endLocation) {
        console.log('Changing step 2 marker styling for step 3');
        const markerEl = formMapMarker.getElement();
        
        // For Mapbox default markers, we need to modify the SVG fill
        const svg = markerEl.querySelector('svg');
        if (svg) {
            svg.style.fill = '#c0392b'; // Darker red
        }
        
        // Update cursor and styling
        markerEl.style.cursor = 'default'; // Not clickable
        markerEl.style.filter = 'drop-shadow(0 4px 8px rgba(192,57,43,0.4))';
        
        // Add or update popup to show this is the end location
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false
        }).setHTML(`
            <div style="font-weight: 600; color: #c0392b; margin-bottom: 5px;">End Location</div>
            <div style="font-size: 12px; color: #666;">From previous step</div>
        `);
        
        formMapMarker.setPopup(popup);
    }
        
    // Re-add any existing memory markers
        if (memoryMarkers.length > 0) {
        console.log('Re-adding memory markers:', memoryMarkers.length);
        memoryMarkers.forEach(markerData => {
            if (!markerData.marker.getMap()) {
                markerData.marker.addTo(sharedFormMap);
            }
        });
        }
        
    // Zoom out to show broader area for memory locations
    if (formData.endLocation) {
        const currentZoom = sharedFormMap.getZoom();
        const targetZoom = Math.max(currentZoom - 2, 12);
        console.log(`Zooming from ${currentZoom} to ${targetZoom}`);
        
        sharedFormMap.flyTo({
                center: formData.endLocation,
            zoom: targetZoom,
            duration: 1500
        });
    }
}

function handleMapClick(e) {
    if (currentMapStep === 2) {
        // Step 2: Set end location
        const coords = [e.lngLat.lng, e.lngLat.lat];
        
        if (formMapMarker) {
            formMapMarker.remove();
        }
        
        formMapMarker = new mapboxgl.Marker({color: '#e74c3c'})
            .setLngLat(coords)
            .addTo(sharedFormMap);
        
        sharedFormMap.flyTo({
            center: coords,
            zoom: 16,
                duration: 1000
            });
        
        reverseGeocode(coords, 'end-location');
        formData.endLocation = coords;
        formData.endLocationData = null;
        
    } else if (currentMapStep === 3) {
        // Step 3: Add memory location
        const coords = [e.lngLat.lng, e.lngLat.lat];
        addMemoryLocation(coords);
        
        const memoryDivs = document.querySelectorAll('#memory-locations > div');
        const newMemoryDiv = memoryDivs[memoryDivs.length - 1];
        const memoryId = newMemoryDiv.getAttribute('data-memory-id');
        
        const marker = new mapboxgl.Marker({color: '#3498db'})
            .setLngLat(coords)
            .addTo(sharedFormMap);
        
        memoryMarkers.push({marker, coords, id: memoryId, description: '', context: ''});
        
        // Reverse geocode to get location name and populate the description
        reverseGeocode(coords, `memory-${memoryId}`);
    }
}

let memoryMarkers = [];

// Legacy function names for compatibility
function initFormMap() {
    initSharedFormMap(2);
}

function initFormMap2() {
    initSharedFormMap(3);
}



function addMemoryLocation(coords = null) {
    const container = document.getElementById('memory-locations');
    const div = document.createElement('div');
    div.style.cssText = `
        padding: 10px;
        margin-bottom: 15px;
        background: rgba(166, 124, 82, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(139, 115, 85, 0.1);
    `;
    
    const uniqueId = Date.now();
    const memoryId = 'memory-' + uniqueId;
    
    div.innerHTML = `
        <div style="position: relative;" class="location-confirmed">
            <input type="text" id="${memoryId}" placeholder="Describe this memory location" 
                   style="width: 100%; padding: 8px 30px 8px 8px; border: 1px solid #d4c4b0; border-radius: 4px; font-size: 14px; background: #f9f7f4;">
            <button type="button" class="remove-memory-btn" onclick="removeMemoryLocation(this)" 
                    style="position: absolute; top: 50%; right: 8px; transform: translateY(-50%); 
                           background: none; color: #999; border: none; padding: 0; 
                           font-size: 16px; cursor: pointer; width: 20px; height: 20px; 
                           display: flex; align-items: center; justify-content: center;
                           border-radius: 50%; transition: all 0.2s ease;"
                    onmouseover="this.style.backgroundColor='#f0f0f0'; this.style.color='#dc3545';" 
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999';"
                    title="Remove this memory location">
                ✕
            </button>
        </div>
    `;
    
    div.setAttribute('data-memory-id', uniqueId);
    container.appendChild(div);
    
    // Add event listener to save description changes
    const descriptionInput = div.querySelector(`#${memoryId}`);
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function() {
            updateMemoryData(uniqueId, 'description', this.value);
        });
    }
    
    // If coordinates provided, reverse geocode to fill in the location
    if (coords) {
        reverseGeocode(coords, memoryId);
    }
}



function removeMemoryLocation(button) {
    const memoryDiv = button.closest('div').parentNode;
    
    // Get the memory location ID to find the correct marker
    const memoryId = memoryDiv.getAttribute('data-memory-id');
    
    // Find and remove the corresponding marker from map
    for (let i = memoryMarkers.length - 1; i >= 0; i--) {
        if (memoryMarkers[i].id === memoryId) {
            memoryMarkers[i].marker.remove();
            memoryMarkers.splice(i, 1);
            break;
        }
    }
    
    memoryDiv.remove();
}

// Color picker functionality
function initColorPicker() {
    const colorPicker = document.getElementById('color-picker');
    const colorDisplay = document.getElementById('selected-color');
    
    if (!colorPicker) {
        console.log('Color picker elements not found');
        return;
    }
    
    // Handle clicks on the gradient
    colorPicker.addEventListener('click', function(e) {
        const rect = colorPicker.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        
        // Calculate color based on position across the gradient
        let color;
        if (progress < 0.25) {
            color = interpolateColor('#87CEEB', '#DDA0DD', progress / 0.25);
        } else if (progress < 0.5) {
            color = interpolateColor('#DDA0DD', '#FFB6C1', (progress - 0.25) / 0.25);
        } else if (progress < 0.75) {
            color = interpolateColor('#FFB6C1', '#FF69B4', (progress - 0.5) / 0.25);
        } else {
            color = interpolateColor('#FF69B4', '#FF4500', (progress - 0.75) / 0.25);
        }
        
        colorDisplay.style.backgroundColor = color;
        document.getElementById('relationship-color').value = color;
        formData.relationshipColor = color;
    });
    
    // Touch support
    colorPicker.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        colorPicker.dispatchEvent(clickEvent);
    });
}

function interpolateColor(color1, color2, factor) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
    
    return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Duration slider and season selector
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('duration-slider');
    const display = document.getElementById('duration-display');
    
    if (slider && display) {
        // Function to map slider value (1-100) to days
        function mapSliderValueToDays(sliderValue) {
            if (sliderValue <= 50) {
                // Linear mapping from 1 day to 270 days (9 months) for values 1-50
                return Math.round(1 + (sliderValue - 1) * (270 - 1) / 49);
            } else {
                // Exponential mapping from 270 days to 10,950 days (30 years) for values 51-100
                const factor = (sliderValue - 50) / 50; // 0 to 1
                return Math.round(270 + factor * factor * (10950 - 270));
            }
        }
        
        slider.addEventListener('input', function() {
            const sliderValue = parseInt(this.value);
            const days = mapSliderValueToDays(sliderValue);
            let displayText;
            
            if (days === 1) {
                displayText = '1 day';
            } else if (days < 7) {
                displayText = days + ' days';
            } else if (days < 30) {
                const weeks = Math.round(days / 7);
                displayText = weeks + ' week' + (weeks > 1 ? 's' : '');
            } else if (days < 365) {
                const months = Math.round(days / 30.44);
                displayText = months + ' month' + (months > 1 ? 's' : '');
            } else {
                const years = Math.round(days / 365.25 * 10) / 10;
                displayText = years + ' year' + (years > 1 ? 's' : '');
            }
            
            display.textContent = displayText;
            formData.duration = days; // Store as days instead of weeks
        });
        
        // Set initial display
        const initialSliderValue = parseInt(slider.value);
        const initialDays = mapSliderValueToDays(initialSliderValue);
        const initialMonths = Math.round(initialDays / 30.44);
        display.textContent = initialMonths + ' month' + (initialMonths > 1 ? 's' : '');
        formData.duration = initialDays;
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
    
    // Story text will be saved on step transitions and final submit
    
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

async function submitForm() {
    try {
        // Save the complete submission
        await saveCompleteSubmission();
        
        console.log('Form submitted successfully with session ID:', sessionId);
        
        // Show thank you page
        showThankYouPage();
        
        // Clear the session after successful submission
        localStorage.removeItem('breakup-map-session');
        sessionId = null;
        
        // Reset form data
        formData = {
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
        
        // Clear memory markers
        memoryMarkers.forEach(marker => marker.marker.remove());
        memoryMarkers = [];
        
        // Remove form map marker
        if (formMapMarker) {
            formMapMarker.remove();
            formMapMarker = null;
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your story. Please try again.');
    }
}

function showThankYouPage() {
    // Hide all form steps
    for (let i = 1; i <= 8; i++) {
        const step = document.getElementById('step-' + i);
        if (step) {
            step.style.display = 'none';
            step.classList.remove('active', 'exiting');
        }
    }
    
    // Hide shared map container
    const sharedMapContainer = document.getElementById('shared-map-container');
    if (sharedMapContainer) {
        sharedMapContainer.style.display = 'none';
    }
    
    // Show thank you page
    const thankYouPage = document.getElementById('thank-you-page');
    if (thankYouPage) {
        thankYouPage.style.display = 'block';
        setTimeout(() => {
            thankYouPage.classList.add('active');
        }, 10);
    }
} 