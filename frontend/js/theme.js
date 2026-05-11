// frontend/js/theme.js
/**
 * Theme Manager - Multi-theme support for Inventory Management System
 * Supports: classic, crimson, ocean, forest, night
 * 
 * @module theme
 */

class ThemeManager {
    static THEMES = {
        classic: { 
            name: 'Classic', 
            icon: '🏛️', 
            description: 'Professional office slate theme',
            default: true
        },
        crimson: { 
            name: 'Crimson', 
            icon: '🔴', 
            description: 'Energetic red theme for sales',
            default: false
        },
        ocean: { 
            name: 'Ocean', 
            icon: '🌊', 
            description: 'Calm blue theme for admin',
            default: false
        },
        forest: { 
            name: 'Forest', 
            icon: '🌲', 
            description: 'Natural green theme for warehouse',
            default: false
        },
        night: { 
            name: 'Night', 
            icon: '🌙', 
            description: 'Dark comfortable theme for supply',
            default: false
        }
    };

    static ROLE_DEFAULTS = {
        admin: 'ocean',
        sales: 'crimson',
        warehouse: 'forest',
        supply: 'night'
    };

    constructor() {
        this.currentTheme = null;
        this.dropdownOpen = false;
        this.init();
    }

    init() {
        this.currentTheme = this.loadTheme();
        this.applyTheme(this.currentTheme);
        this.setupClickListener();
    }

    loadTheme() {
        // Check localStorage first
        const saved = localStorage.getItem(CONFIG.THEME_KEY);
        if (saved && ThemeManager.THEMES[saved]) {
            return saved;
        }

        // Check user role for default
        if (typeof auth !== 'undefined' && auth.getCurrentUser) {
            const user = auth.getCurrentUser();
            if (user && ThemeManager.ROLE_DEFAULTS[user.role]) {
                return ThemeManager.ROLE_DEFAULTS[user.role];
            }
        }

        // Default to classic
        return 'classic';
    }

    applyTheme(themeName) {
        if (!ThemeManager.THEMES[themeName]) {
            themeName = 'classic';
        }

        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem(CONFIG.THEME_KEY, themeName);
        this.currentTheme = themeName;

        // Update theme button text if it exists
        const themeBtn = document.querySelector('.theme-btn');
        if (themeBtn) {
            const currentTheme = ThemeManager.THEMES[themeName];
            themeBtn.innerHTML = `${currentTheme.icon} ${currentTheme.name} <span class="dropdown-arrow">▼</span>`;
        }

        // Update active state in dropdown
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === themeName);
        });

        // Send event for any listeners
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));

        console.log(`🎨 Theme applied: ${themeName}`);
    }

    getThemeSelectorHTML() {
        const current = ThemeManager.THEMES[this.currentTheme];
        return `
            <div class="theme-selector" id="themeSelector">
                <button class="theme-btn" onclick="if(themeManager) themeManager.toggleDropdown()">
                    ${current.icon} ${current.name} <span class="dropdown-arrow">▼</span>
                </button>
                <div class="theme-dropdown" id="themeDropdown" style="display: none;">
                    ${Object.entries(ThemeManager.THEMES).map(([key, theme]) => `
                        <button class="theme-option ${this.currentTheme === key ? 'active' : ''}" 
                                data-theme="${key}" 
                                onclick="themeManager.applyTheme('${key}'); themeManager.closeDropdown();">
                            ${theme.icon} ${theme.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    toggleDropdown() {
        const dropdown = document.getElementById('themeDropdown');
        if (dropdown) {
            this.dropdownOpen = !this.dropdownOpen;
            dropdown.style.display = this.dropdownOpen ? 'block' : 'none';
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('themeDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.dropdownOpen = false;
        }
    }

    setupClickListener() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const selector = document.getElementById('themeSelector');
            if (selector && !selector.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }
}

// Initialize theme manager when DOM is ready
let themeManager = null;

function initThemeManager() {
    if (!themeManager && typeof CONFIG !== 'undefined') {
        themeManager = new ThemeManager();
        window.themeManager = themeManager;
        console.log('✅ Theme Manager initialized');
    }
}

// Wait for config to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initThemeManager, 100);
    });
} else {
    setTimeout(initThemeManager, 100);
}