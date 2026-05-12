// frontend/js/theme.js
/**
 * Theme Manager - Multi-theme support for Inventory Management System
 * Supports: classic, crimson, ocean, forest, night
 * 
 * @module theme
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
        this.initialize();
    }

    initialize() {
        this.applyTheme(this.currentTheme);
        this.renderThemeSwitcher();
        this.bindEvents();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(CONFIG.THEME_KEY, theme);
        this.currentTheme = theme;

        this.updateThemeWidget();
        this.showThemeToast(theme);
        
        // Update theme button if it exists
        const themeBtn = document.querySelector('.theme-btn');
        if (themeBtn) {
            const current = THEMES[theme];
            themeBtn.innerHTML = `
                <span class="theme-current-icon">${current.emoji}</span>
                <span>${current.name}</span>
                <span class="dropdown-arrow">▼</span>
            `;
        }

        // Send event for any listeners
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

                <div class="theme-dropdown" id="themeDropdown">
                    <div class="theme-dropdown-header">
                        <h4>Choose Theme</h4>
                        <p>Customize your enterprise workspace</p>
                    </div>

                    ${Object.entries(THEMES)
                        .map(([key, theme]) => `
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
                        `)
                        .join('')}
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const dropdown = document.querySelector('#themeDropdown');
            const toggle = document.querySelector('#themeToggleBtn');

            if (!dropdown || !toggle) return;

            if (toggle.contains(e.target)) {
                dropdown.classList.toggle('open');
                return;
            }

            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        document.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');

            if (!option) return;

            const theme = option.dataset.theme;

            this.applyTheme(theme);
            this.renderThemeSwitcher();
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

        if (existing) {
            existing.remove();
        }

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
    
    // Legacy compatibility methods
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
    
    loadTheme() {
        const saved = localStorage.getItem(CONFIG.THEME_KEY);
        if (saved && THEMES[saved]) {
            return saved;
        }

        if (typeof auth !== 'undefined' && auth.getCurrentUser) {
            const user = auth.getCurrentUser();
            if (user && ThemeManager.ROLE_DEFAULTS[user.role]) {
                return ThemeManager.ROLE_DEFAULTS[user.role];
            }
        }

        return 'classic';
    }

    getThemeSelectorHTML() {
        const current = THEMES[this.currentTheme || 'classic'];
        return `
            <div class="theme-selector" id="themeSelector">
                <button type="button" class="theme-btn" id="themeBtn">
                    ${current.icon} ${current.name} <span class="dropdown-arrow">▼</span>
                </button>
                <div class="theme-dropdown" id="themeDropdown" style="display: none;">
                    ${Object.entries(THEMES).map(([key, theme]) => `
                        <button type="button" class="theme-option ${this.currentTheme === key ? 'active' : ''}"
                                data-theme="${key}">
                            ${theme.icon} ${theme.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    setupThemeSelectorEvents() {
        const themeBtn = document.getElementById('themeBtn');
        const dropdown = document.getElementById('themeDropdown');
        
        if (themeBtn && !themeBtn.dataset.themeListenerAttached) {
            themeBtn.dataset.themeListenerAttached = 'true';
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }
        
        if (dropdown && !dropdown.dataset.themeOptionsAttached) {
            dropdown.dataset.themeOptionsAttached = 'true';
            dropdown.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const themeName = e.target.dataset.theme;
                    if (themeName) {
                        this.applyTheme(themeName);
                        this.closeDropdown();
                    }
                });
            });
        }
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
    return themeManager;
}

// Immediate initialization - apply theme from storage first to prevent flash
(function applyStoredThemeImmediately() {
    try {
        const themeKey = typeof CONFIG !== 'undefined' ? CONFIG.THEME_KEY : 'ims_theme';
        const savedTheme = localStorage.getItem(themeKey);
        if (savedTheme && THEMES[savedTheme]) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            console.log(`🎨 Stored theme applied immediately: ${savedTheme}`);
        }
    } catch (e) {
        console.log('Theme not applied immediately (CONFIG not loaded yet)');
    }
})();

// Wait for config to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initThemeManager();
    });
} else {
    initThemeManager();
}