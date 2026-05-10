/**
 * MAP INTERACTIONS
 * Handles game mode navigation and popup displays
 */

// Map of game modes to their views and popups
const gameModes = {
    empire: {
        view: 'empire-view',
        popup: 'popup-empire.html'
    },
    expedition: {
        view: 'expedition-view',
        popup: 'popup-pvp-expedition.html'
    },
    ravagers: {
        view: 'ravagers-view',
        popup: 'popup-pvp-expedition.html' // Ravagers uses same PVP popup
    },
    pve: {
        view: 'pve-view',
        popup: 'popup-pve.html'
    },
    mines: {
        view: 'mines-view',
        popup: null
    }
};

// Current active view
let currentView = 'world-map-view';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMapRegions();
    initBackButtons();
    initPopupTriggers();
    initPopupClose();
});

/**
 * Initialize clickable map regions
 */
function initMapRegions() {
    const regions = document.querySelectorAll('.map-region');

    regions.forEach(region => {
        region.addEventListener('click', () => {
            const mode = region.dataset.mode;
            navigateToMode(mode);
        });

        // Add hover sound effect placeholder
        region.addEventListener('mouseenter', () => {
            // Future: Add hover sound
            console.log(`Hovering over: ${region.dataset.mode}`);
        });
    });
}

/**
 * Navigate to a specific game mode view
 * @param {string} mode - Game mode identifier
 */
function navigateToMode(mode) {
    if (!gameModes[mode]) {
        console.error(`Unknown game mode: ${mode}`);
        return;
    }

    const targetView = gameModes[mode].view;
    switchView(targetView);

    // Add transition effect
    playTransitionEffect();
}

/**
 * Switch between map views
 * @param {string} viewId - ID of the view to show
 */
function switchView(viewId) {
    // Hide all views
    const allViews = document.querySelectorAll('.map-view');
    allViews.forEach(view => {
        view.classList.remove('active');
    });

    // Show target view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        currentView = viewId;
        console.log(`Switched to view: ${viewId}`);
    }
}

/**
 * Initialize back buttons
 */
function initBackButtons() {
    const backButtons = document.querySelectorAll('.back-button');

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.target || 'world-map-view';
            switchView(target);
        });
    });
}

/**
 * Initialize popup trigger buttons
 */
function initPopupTriggers() {
    // Empire popup
    const empireBtn = document.getElementById('show-empire-popup');
    if (empireBtn) {
        empireBtn.addEventListener('click', () => {
            showPopup('empire');
        });
    }

    // Expedition popup
    const expeditionBtn = document.getElementById('show-expedition-popup');
    if (expeditionBtn) {
        expeditionBtn.addEventListener('click', () => {
            showPopup('expedition');
        });
    }

    // Ravagers popup
    const ravagersBtn = document.getElementById('show-ravagers-popup');
    if (ravagersBtn) {
        ravagersBtn.addEventListener('click', () => {
            showPopup('ravagers');
        });
    }

    // PVE popup
    const pveBtn = document.getElementById('show-pve-popup');
    if (pveBtn) {
        pveBtn.addEventListener('click', () => {
            showPopup('pve');
        });
    }
}

/**
 * Show popup overlay with specific content
 * @param {string} mode - Game mode identifier
 */
function showPopup(mode) {
    if (!gameModes[mode] || !gameModes[mode].popup) {
        console.warn(`No popup configured for mode: ${mode}`);
        return;
    }

    const overlay = document.getElementById('popup-overlay');
    const frame = document.getElementById('popup-frame');

    if (overlay && frame) {
        frame.src = gameModes[mode].popup;
        overlay.classList.add('active');
        console.log(`Showing popup for: ${mode}`);
    }
}

/**
 * Close popup overlay
 */
function closePopup() {
    const overlay = document.getElementById('popup-overlay');
    const frame = document.getElementById('popup-frame');

    if (overlay && frame) {
        overlay.classList.remove('active');

        // Clear iframe source after animation
        setTimeout(() => {
            frame.src = '';
        }, 300);
    }
}

/**
 * Initialize popup close button
 */
function initPopupClose() {
    const closeBtn = document.querySelector('.close-popup-btn');
    const overlay = document.getElementById('popup-overlay');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }

    // Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePopup();
        }
    });
}

/**
 * Play transition effect (placeholder for animation)
 */
function playTransitionEffect() {
    // Future: Add zoom/fade transition effect
    console.log('Transition effect played');
}

/**
 * Keyboard shortcuts for quick navigation
 */
document.addEventListener('keydown', (e) => {
    // Press number keys to jump to different views
    const keyMap = {
        '1': 'empire-view',
        '2': 'expedition-view',
        '3': 'ravagers-view',
        '4': 'pve-view',
        '5': 'mines-view',
        '0': 'world-map-view'
    };

    if (keyMap[e.key]) {
        switchView(keyMap[e.key]);
    }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        navigateToMode,
        switchView,
        showPopup,
        closePopup
    };
}
