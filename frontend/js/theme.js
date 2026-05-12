// frontend/js/theme.js
/**
 * Theme Manager - Portal dropdown to body to prevent clipping
 */

const THEMES = {
    classic: {
        emoji: '📊',
        name: 'Classic',
        description: 'Executive Enterprise'
    },
    crimson: {
        emoji: '🔥',
        name: 'Crimson',
        description: 'Sales Command Center'
    },
    ocean: {
        emoji: '🌊',
        name: 'Ocean',
        description: 'Analytics Intelligence'
    },
    forest: {
        emoji: '🌲',
        name: 'Forest',
        description: 'Warehouse Operations'
    },
    night: {
        emoji: '🌙',
        name: 'Night',
        description: 'Monitoring Center'
    }
};

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'classic';
        this.dropdownOpen = false;
        this.initialize();
    }

    initialize() {
        this.applyTheme(this.currentTheme);
        this.renderThemeSwitcher();
        this.createPortalDropdown();
        this.bindEvents();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(CONFIG.THEME_KEY, theme);
        this.currentTheme = theme;

        this.updateThemeWidget();
        this.showThemeToast(theme);
        
        // Update theme button if it exists
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            const current = THEMES[theme];
            themeBtn.innerHTML = `
                <span class="theme-current-icon">${current.emoji}</span>
                <span>${current.name}</span>
                <span class="dropdown-arrow">▼</span>
            `;
        }

        // Update active state in portal dropdown
        this.updateDropdownActiveState();

        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        console.log(`🎨 Theme applied: ${theme}`);
    }

    renderThemeSwitcher() {
        const container = document.querySelector('#themeSwitcherContainer');
        if (!container) return;

        const current = THEMES[this.currentTheme];

        container.innerHTML = `
            <div class="theme-selector">
                <button class="theme-btn" id="themeToggleBtn">
                    <span class="theme-current-icon">${current.emoji}</span>
                    <span>${current.name}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
            </div>
        `;
    }

    createPortalDropdown() {
        // Remove existing dropdown if any
        const existing = document.getElementById('globalThemeDropdown');
        if (existing) existing.remove();

        // Create dropdown at body level
        const dropdown = document.createElement('div');
        dropdown.id = 'globalThemeDropdown';
        dropdown.className = 'theme-dropdown';
        
        dropdown.innerHTML = `
            <div class="theme-dropdown-header">
                <h4>Choose Theme</h4>
                <p>Customize your enterprise workspace</p>
            </div>
            ${Object.entries(THEMES).map(([key, theme]) => `
                <button class="theme-option ${key === this.currentTheme ? 'active' : ''}" data-theme="${key}">
                    <div class="theme-left">
                        <div class="theme-emoji">${theme.emoji}</div>
                        <div class="theme-info">
                            <div class="theme-name">${theme.name}</div>
                            <div class="theme-desc">${theme.description}</div>
                        </div>
                    </div>
                    <div class="theme-check">✓</div>
                </button>
            `).join('')}
        `;
        
        document.body.appendChild(dropdown);
        this.dropdownElement = dropdown;
    }

    updateDropdownActiveState() {
        if (!this.dropdownElement) return;
        
        const options = this.dropdownElement.querySelectorAll('.theme-option');
        options.forEach(option => {
            const theme = option.dataset.theme;
            if (theme === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    positionDropdown() {
        const themeBtn = document.getElementById('themeToggleBtn');
        if (!themeBtn || !this.dropdownElement) return;

        const rect = themeBtn.getBoundingClientRect();
        
        this.dropdownElement.style.position = 'fixed';
        this.dropdownElement.style.top = `${rect.bottom + 8}px`;
        this.dropdownElement.style.right = `${window.innerWidth - rect.right}px`;
        this.dropdownElement.style.left = 'auto';
    }

    bindEvents() {
        // Toggle dropdown on button click
        document.addEventListener('click', (e) => {
            const themeBtn = document.getElementById('themeToggleBtn');
            const dropdown = this.dropdownElement;
            
            if (!dropdown) return;

            if (themeBtn && themeBtn.contains(e.target)) {
                e.stopPropagation();
                this.dropdownOpen = !this.dropdownOpen;
                
                if (this.dropdownOpen) {
                    this.positionDropdown();
                    dropdown.classList.add('open');
                } else {
                    dropdown.classList.remove('open');
                }
                return;
            }

            // Close if clicking outside
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
                this.dropdownOpen = false;
            }
        });

        // Handle theme selection
        document.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (!option) return;

            const theme = option.dataset.theme;
            if (theme) {
                this.applyTheme(theme);
                this.renderThemeSwitcher();
                this.createPortalDropdown(); // Recreate dropdown with new active state
                this.dropdownOpen = false;
            }
        });

        // Reposition on scroll/resize
        window.addEventListener('scroll', () => {
            if (this.dropdownOpen) {
                this.positionDropdown();
            }
        });
        
        window.addEventListener('resize', () => {
            if (this.dropdownOpen) {
                this.positionDropdown();
            }
        });
    }

    updateThemeWidget() {
        const widget = document.querySelector('#themeHeaderWidget');
        if (!widget) return;

        const current = THEMES[this.currentTheme];
        widget.innerHTML = `
            <div class="theme-widget-content">
                <div class="theme-widget-title">
                    ${current.emoji} ${current.description}
                </div>
                <div class="theme-widget-subtitle">
                    Theme Activated • Enterprise Experience Enabled
                </div>
            </div>
            <div class="theme-widget-icon">
                ${current.emoji}
            </div>
        `;
    }

    showThemeToast(theme) {
        const current = THEMES[theme];
        const existing = document.querySelector('.theme-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast toast-info show theme-toast';
        toast.innerHTML = `
            ${current.emoji} ${current.name} Theme Activated<br>
            <small>${current.description}</small>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

// Initialize theme manager
let themeManager = null;

function initThemeManager() {
    if (!themeManager && typeof CONFIG !== 'undefined') {
        themeManager = new ThemeManager();
        window.themeManager = themeManager;
        console.log('✅ Theme Manager initialized (portal mode)');
    }
    return themeManager;
}

// Immediate theme application to prevent flash
(function applyStoredThemeImmediately() {
    try {
        const themeKey = typeof CONFIG !== 'undefined' ? CONFIG.THEME_KEY : 'ims_theme';
        const savedTheme = localStorage.getItem(themeKey);
        if (savedTheme && THEMES[savedTheme]) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    } catch (e) {}
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initThemeManager());
} else {
    initThemeManager();
}