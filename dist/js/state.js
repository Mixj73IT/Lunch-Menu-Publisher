/**
 * Tauri v2 compatibility: withGlobalTauri exposes invoke under
 * window.__TAURI__.core.invoke (the v1-style window.__TAURI__.invoke does not
 * exist in Tauri v2). Alias it once here so every existing call site works
 * unchanged in the desktop app.
 */
if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.invoke !== 'function') {
    window.__TAURI__.invoke = window.__TAURI__.core.invoke;
}

/**
 * State Management & LocalStorage Persistence
 */

const StorageKeys = {
    ENTREE_TILES: 'lunchMenu_entreeTiles',
    SIDE_TILES: 'lunchMenu_sideTiles',
    SPECIALS_TILES: 'lunchMenu_specialsTiles',
    SPECIAL_EVENT_TILES: 'lunchMenu_specialEventTiles',
    MENUS: 'lunchMenu_menus',
    SETTINGS: 'lunchMenu_settings',
    CURRENT_MONTH: 'lunchMenu_currentMonth',
    STAFF_EMAIL: 'lunchMenu_staffEmail',
    SMTP_HOST: 'lunchMenu_smtpHost',
    SMTP_PORT: 'lunchMenu_smtpPort',
    SMTP_USER: 'lunchMenu_smtpUser',
    SMTP_PASSWORD: 'lunchMenu_smtpPassword',
    MENU_JSON_FOLDER: 'lunchMenu_menuJsonFolder',
    LAST_PUBLISHED: 'lunchMenu_lastPublished',
    // Legacy keys, kept only for one-time migration to STAFF_EMAIL.
    PDF_EMAIL: 'lunchMenu_pdfEmail',
    TXT_EMAIL: 'lunchMenu_txtEmail'
};

const TileTypes = Object.freeze({
    ENTREE: 'entree',
    SIDE: 'side',
    SPECIALS: 'specials',
    SPECIAL_EVENT: 'specialEvent'
});

const GridIds = Object.freeze({
    ENTREE: 'entreeGrid',
    SIDE: 'sideGrid',
    SPECIALS: 'specialsGrid',
    SPECIAL_EVENT: 'specialGrid'
});

const MONTH_NAMES = Object.freeze([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]);

const DEFAULT_ENTREES = [
    { id: 'entree-1', name: 'Chicken Nuggets', type: TileTypes.ENTREE },
    { id: 'entree-2', name: 'Pizza', type: TileTypes.ENTREE },
    { id: 'entree-3', name: 'Hamburger', type: TileTypes.ENTREE },
    { id: 'entree-4', name: 'Hot Dog', type: TileTypes.ENTREE },
    { id: 'entree-5', name: 'Chicken Sandwich', type: TileTypes.ENTREE },
    { id: 'entree-6', name: 'Spaghetti', type: TileTypes.ENTREE },
    { id: 'entree-7', name: 'Tacos', type: TileTypes.ENTREE },
    { id: 'entree-8', name: 'Grilled Cheese', type: TileTypes.ENTREE },
    { id: 'entree-9', name: 'Chicken Patty', type: TileTypes.ENTREE },
    { id: 'entree-10', name: 'Turkey & Cheese Wrap', type: TileTypes.ENTREE }
];

const DEFAULT_SIDES = [
    { id: 'side-1', name: 'French Fries', type: TileTypes.SIDE },
    { id: 'side-2', name: 'Mashed Potatoes', type: TileTypes.SIDE },
    { id: 'side-3', name: 'Green Beans', type: TileTypes.SIDE },
    { id: 'side-4', name: 'Corn', type: TileTypes.SIDE },
    { id: 'side-5', name: 'Carrots', type: TileTypes.SIDE },
    { id: 'side-6', name: 'Apple Slices', type: TileTypes.SIDE },
    { id: 'side-7', name: 'Side Salad', type: TileTypes.SIDE },
    { id: 'side-8', name: 'Roll', type: TileTypes.SIDE }
];

const DEFAULT_SPECIALS = [
    { id: 'foodspec-1', name: 'Reuben', type: TileTypes.SPECIALS },
    { id: 'foodspec-2', name: 'Pulled Pork BBQ', type: TileTypes.SPECIALS },
    { id: 'foodspec-3', name: 'Chicken Bake', type: TileTypes.SPECIALS },
    { id: 'foodspec-4', name: 'Walking Taco', type: TileTypes.SPECIALS }
];

const DEFAULT_SPECIAL_EVENTS = [
    { id: 'special-1', name: 'Bake Sale', type: TileTypes.SPECIAL_EVENT },
    { id: 'special-2', name: 'Sno-Cones', type: TileTypes.SPECIAL_EVENT },
    { id: 'special-3', name: 'Archery Fundraiser', type: TileTypes.SPECIAL_EVENT },
    { id: 'special-4', name: 'Grandparents Day', type: TileTypes.SPECIAL_EVENT }
];

const DEFAULT_SETTINGS = {
    compactGridEnabled: false,
    versesEnabled: true,
    advancedVerseLookup: true
};

const State = {
    entreeTiles: [],
    sideTiles: [],
    specialsTiles: [],
    specialEventTiles: [],
    menus: {},
    settings: {},
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    staffEmail: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    menuJsonFolder: '',
    lastPublished: {},
    undoStack: [],
    undoMaxSize: 20,

    init() {
        // Reset to current date to ensure correct month
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.loadAll();
        this.ensureDefaults();
    },

    loadAll() {
        this.entreeTiles = this.load(StorageKeys.ENTREE_TILES) || [];
        this.sideTiles = this.load(StorageKeys.SIDE_TILES) || [];
        this.specialsTiles = this.load(StorageKeys.SPECIALS_TILES) || [];
        this.specialEventTiles = this.load(StorageKeys.SPECIAL_EVENT_TILES) || [];
        this.menus = this.load(StorageKeys.MENUS) || {};
        this.settings = this.load(StorageKeys.SETTINGS) || {};
        this.smtpHost = this.load(StorageKeys.SMTP_HOST) || '';
        const savedPort = this.load(StorageKeys.SMTP_PORT);
        this.smtpPort = (typeof savedPort === 'number' && savedPort > 0) ? savedPort : 587;
        this.smtpUser = this.load(StorageKeys.SMTP_USER) || '';
        this.smtpPassword = this.load(StorageKeys.SMTP_PASSWORD) || '';
        this.menuJsonFolder = this.load(StorageKeys.MENU_JSON_FOLDER) || '';
        this.lastPublished = this.load(StorageKeys.LAST_PUBLISHED) || {};

        // Migration: the old app had separate PDF/TXT recipients. Consolidate
        // them into the single staff-office recipient (TXT took precedence).
        const staffEmail = this.load(StorageKeys.STAFF_EMAIL) || '';
        const legacyPdfEmail = this.load(StorageKeys.PDF_EMAIL) || '';
        const legacyTxtEmail = this.load(StorageKeys.TXT_EMAIL) || '';
        this.staffEmail = staffEmail || legacyTxtEmail || legacyPdfEmail;
        if (!staffEmail && this.staffEmail) {
            const prev = '';
            this.save(StorageKeys.STAFF_EMAIL, this.staffEmail);
            this.save(StorageKeys.PDF_EMAIL, prev);
            this.save(StorageKeys.TXT_EMAIL, prev);
        }

        const savedDate = this.load(StorageKeys.CURRENT_MONTH);
        if (savedDate) {
            this.currentMonth = savedDate.month;
            this.currentYear = savedDate.year;
        }
    },

    ensureDefaults() {
        if (this.entreeTiles.length === 0) {
            const prev = this.entreeTiles;
            this.entreeTiles = [...DEFAULT_ENTREES];
            this.saveEntreeTiles(prev);
        }

        if (this.sideTiles.length === 0) {
            const prev = this.sideTiles;
            this.sideTiles = [...DEFAULT_SIDES];
            this.saveSideTiles(prev);
        }

        if (this.specialsTiles.length === 0) {
            const prev = this.specialsTiles;
            this.specialsTiles = [...DEFAULT_SPECIALS];
            this.saveSpecialsTiles(prev);
        }

        if (this.specialEventTiles.length === 0) {
            const prev = this.specialEventTiles;
            this.specialEventTiles = [...DEFAULT_SPECIAL_EVENTS];
            this.saveSpecialEventTiles(prev);
        }

        // Migration: fix stale 'special' type to 'specialEvent' in stored tiles
        if (Array.isArray(this.specialEventTiles)) {
            let migrated = false;
            const prev = this.specialEventTiles;
            this.specialEventTiles = this.specialEventTiles.map(tile => {
                if (tile.type === 'special') {
                    migrated = true;
                    return { ...tile, type: TileTypes.SPECIAL_EVENT };
                }
                return tile;
            });
            if (migrated) {
                this.saveSpecialEventTiles(prev);
            }
        } else {
            const prev = this.specialEventTiles;
            this.specialEventTiles = [...DEFAULT_SPECIAL_EVENTS];
            this.saveSpecialEventTiles(prev);
        }

        const prevSettings = this.settings;
        this.settings = { ...DEFAULT_SETTINGS, ...this.settings };
        this.saveSettings(prevSettings);
    },

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            // Error loading from localStorage - silently handled by returning null
            this.showError('Failed to load saved data. Your settings may have been reset.');
            return null;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            // Error saving to localStorage - user already notified via showError toast
            this.showError('Failed to save data. Your browser storage may be full. Please clear some data.');
            return false;
        }
    },

    showError(message) {
        const existingError = document.querySelector('.error-toast');
        if (existingError) existingError.remove();

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = [
            'position: fixed;',
            'bottom: 20px;',
            'right: 20px;',
            'background: #dc3545;',
            'color: white;',
            'padding: 12px 20px;',
            'border-radius: 4px;',
            'z-index: 1000;',
            'box-shadow: 0 2px 8px rgba(0,0,0,0.2);',
            'animation: slideIn 0.3s ease;'
        ].join(' ');
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    showLoading(message) {
        const existingLoading = document.querySelector('.loading-toast');
        if (existingLoading) existingLoading.remove();

        const toast = document.createElement('div');
        toast.className = 'loading-toast';
        toast.textContent = message;
        toast.style.cssText = [
            'position: fixed;',
            'bottom: 20px;',
            'right: 20px;',
            'background: #0d6efd;',
            'color: white;',
            'padding: 12px 20px;',
            'border-radius: 4px;',
            'z-index: 1000;',
            'box-shadow: 0 2px 8px rgba(0,0,0,0.2);',
            'animation: slideIn 0.3s ease;'
        ].join(' ');
        document.body.appendChild(toast);
    },

    hideLoading() {
        const loading = document.querySelector('.loading-toast');
        if (loading) {
            loading.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => loading.remove(), 300);
        }
    },

    /* ---- Undo for calendar edits ---- */
    pushUndo() {
        const snapshot = JSON.parse(JSON.stringify(this.menus));
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.undoMaxSize) {
            this.undoStack.shift();
        }
    },

    performUndo() {
        if (this.undoStack.length === 0) return;
        this.menus = this.undoStack.pop();
        this.save(StorageKeys.MENUS, this.menus);
        return true;
    },

    /* ---- Autosave feedback ---- */
    showSaved() {
        let badge = document.getElementById('autosaveBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'autosaveBadge';
            badge.className = 'autosave-badge';
            badge.textContent = 'Saved';
            document.body.appendChild(badge);
        }
        badge.classList.add('visible');
        clearTimeout(badge._timeout);
        badge._timeout = setTimeout(() => {
            badge.classList.remove('visible');
        }, 1500);
    },

    /* ---- Staff-office email (single recipient) ---- */
    saveStaffEmail(prev) {
        if (!this.save(StorageKeys.STAFF_EMAIL, this.staffEmail) && prev !== undefined) {
            this.staffEmail = prev;
        }
    },

    /* ---- menu.json destination folder ---- */
    saveMenuJsonFolder(prev) {
        if (!this.save(StorageKeys.MENU_JSON_FOLDER, this.menuJsonFolder) && prev !== undefined) {
            this.menuJsonFolder = prev;
        }
    },

    /* ---- Last published snapshots ---- */
    markPublished(month, year, publishedAt) {
        const prev = { ...this.lastPublished };
        this.lastPublished[this.getMenuKey(month, year)] = publishedAt || new Date().toISOString();
        if (!this.save(StorageKeys.LAST_PUBLISHED, this.lastPublished) && prev !== undefined) {
            this.lastPublished = prev;
        }
    },

    getLastPublished(month, year) {
        return this.lastPublished[this.getMenuKey(month, year)] || null;
    },

    /* ---- SMTP settings ---- */
    saveSmtpHost(prev) {
        if (!this.save(StorageKeys.SMTP_HOST, this.smtpHost) && prev !== undefined) {
            this.smtpHost = prev;
        }
    },

    saveSmtpPort(prev) {
        if (!this.save(StorageKeys.SMTP_PORT, this.smtpPort) && prev !== undefined) {
            this.smtpPort = prev;
        }
    },

    saveSmtpUser(prev) {
        if (!this.save(StorageKeys.SMTP_USER, this.smtpUser) && prev !== undefined) {
            this.smtpUser = prev;
        }
    },

    saveSmtpPassword(prev) {
        if (!this.save(StorageKeys.SMTP_PASSWORD, this.smtpPassword) && prev !== undefined) {
            this.smtpPassword = prev;
        }
    },

    /**
     * Test the SMTP connection.
     * In the Tauri desktop app this asks the Rust backend to open a real
     * connection to the mail server. In the browser it cannot work (no SMTP
     * client exists there), so we tell the user instead of pretending.
     */
    async testSmtpConnection(host, port, user, password) {
        const h = (host !== undefined ? host : this.smtpHost) || '';
        const p = (port !== undefined ? port : this.smtpPort) || 587;
        const u = (user !== undefined ? user : this.smtpUser) || '';
        const pw = (password !== undefined ? password : this.smtpPassword) || '';

        if (!h || !u || !pw) {
            this.showError('Missing SMTP credentials. Please fill in host, user, and password.');
            return;
        }

        if (!window.__TAURI__?.invoke) {
            this.showError('SMTP connection testing is only available in the desktop app.');
            return;
        }

        this.showLoading('Testing SMTP connection...');
        try {
            await window.__TAURI__.invoke('test_smtp_connection', {
                host: h,
                port: p,
                user: u,
                password: pw
            });
            this.showSaved();
            alert('SMTP connection successful!');
        } catch (error) {
            console.error('SMTP connection test failed:', error);
            this.showError('SMTP test failed. Check your host, port, user, and password, then try again.');
        } finally {
            this.hideLoading();
        }
    },

    /* ---- Export all data as JSON ---- */
    exportData() {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            entreeTiles: this.entreeTiles,
            sideTiles: this.sideTiles,
            specialsTiles: this.specialsTiles,
            specialEventTiles: this.specialEventTiles,
            menus: this.menus,
            settings: this.settings,
            staffEmail: this.staffEmail,
            menuJsonFolder: this.menuJsonFolder,
            smtpHost: this.smtpHost,
            smtpPort: this.smtpPort,
            smtpUser: this.smtpUser
            // NOTE: the SMTP password is intentionally NOT exported in backups.
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lunch-menu-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showSaved();
    },

    /* ---- Import data from JSON file ---- */
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                try {
                    data = JSON.parse(e.target.result);
                } catch (parseErr) {
                    this.showError('The file is not valid JSON. Please select a backup file.');
                    return;
                }
                // Validate structure before accepting any data
                if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
                if (typeof data.version !== 'number' || data.version < 1) throw new Error('Unsupported backup version');
                if (data.entreeTiles && !Array.isArray(data.entreeTiles)) throw new Error('Corrupted entree tiles');
                if (data.sideTiles && !Array.isArray(data.sideTiles)) throw new Error('Corrupted side tiles');
                if (data.specialsTiles && !Array.isArray(data.specialsTiles)) throw new Error('Corrupted specials tiles');
                if (data.specialEventTiles && !Array.isArray(data.specialEventTiles)) throw new Error('Corrupted special event tiles');
                if (data.menus && typeof data.menus !== 'object') throw new Error('Corrupted menu data');
                if (data.settings && typeof data.settings !== 'object') throw new Error('Corrupted settings');
                // Restore all data
                if (data.entreeTiles) {
                    const prev = this.entreeTiles;
                    this.entreeTiles = data.entreeTiles;
                    this.saveEntreeTiles(prev);
                }
                if (data.sideTiles) {
                    const prev = this.sideTiles;
                    this.sideTiles = data.sideTiles;
                    this.saveSideTiles(prev);
                }
                if (data.specialsTiles) {
                    const prev = this.specialsTiles;
                    this.specialsTiles = data.specialsTiles;
                    this.saveSpecialsTiles(prev);
                }
                if (data.specialEventTiles) {
                    const prev = this.specialEventTiles;
                    // Migrate old 'special' type to 'specialEvent' on import
                    this.specialEventTiles = data.specialEventTiles.map(tile =>
                        tile.type === 'special' ? { ...tile, type: TileTypes.SPECIAL_EVENT } : tile
                    );
                    this.saveSpecialEventTiles(prev);
                }
                if (data.menus) {
                    this.menus = data.menus;
                    this.save(StorageKeys.MENUS, this.menus);
                }
                if (data.settings) {
                    const prev = this.settings;
                    this.settings = data.settings;
                    this.saveSettings(prev);
                }
                // Backward compatible: old backups used pdfEmail/txtEmail.
                const importedStaffEmail = data.staffEmail !== undefined
                    ? data.staffEmail
                    : (data.txtEmail || data.pdfEmail || '');
                if (importedStaffEmail !== undefined) {
                    const prev = this.staffEmail;
                    this.staffEmail = importedStaffEmail;
                    this.saveStaffEmail(prev);
                }
                if (data.menuJsonFolder !== undefined) {
                    const prev = this.menuJsonFolder;
                    this.menuJsonFolder = data.menuJsonFolder;
                    this.saveMenuJsonFolder(prev);
                }
                if (typeof data.smtpHost === 'string') {
                    const prev = this.smtpHost;
                    this.smtpHost = data.smtpHost;
                    this.saveSmtpHost(prev);
                }
                if (typeof data.smtpPort === 'number' && data.smtpPort > 0) {
                    const prev = this.smtpPort;
                    this.smtpPort = data.smtpPort;
                    this.saveSmtpPort(prev);
                }
                if (typeof data.smtpUser === 'string') {
                    const prev = this.smtpUser;
                    this.smtpUser = data.smtpUser;
                    this.saveSmtpUser(prev);
                }
                alert('Data imported successfully! The page will now reload.');
                location.reload();
            } catch (err) {
                const msg = (err && err.message) ? err.message : 'Failed to import data. The file may be corrupted.';
                this.showError(msg);
            }
        };
        reader.readAsText(file);
    },

    saveEntreeTiles(prev) {
        if (!this.save(StorageKeys.ENTREE_TILES, this.entreeTiles) && prev !== undefined) {
            this.entreeTiles = prev;
        }
    },

    saveSideTiles(prev) {
        if (!this.save(StorageKeys.SIDE_TILES, this.sideTiles) && prev !== undefined) {
            this.sideTiles = prev;
        }
    },

    saveSpecialsTiles(prev) {
        if (!this.save(StorageKeys.SPECIALS_TILES, this.specialsTiles) && prev !== undefined) {
            this.specialsTiles = prev;
        }
    },

    saveSpecialEventTiles(prev) {
        if (!this.save(StorageKeys.SPECIAL_EVENT_TILES, this.specialEventTiles) && prev !== undefined) {
            this.specialEventTiles = prev;
        }
    },

    saveSettings(prev) {
        if (!this.save(StorageKeys.SETTINGS, this.settings) && prev !== undefined) {
            this.settings = prev;
        }
    },

    saveCurrentMonth(prev) {
        if (!this.save(StorageKeys.CURRENT_MONTH, { month: this.currentMonth, year: this.currentYear }) && prev !== undefined) {
            this.currentMonth = prev.month;
            this.currentYear = prev.year;
        }
    },

    getMenuKey(month, year) {
        return year + '-' + month;
    },

    getMenu(month, year) {
        const key = this.getMenuKey(month, year);
        return this.menus[key] || this.createEmptyMenu(month, year);
    },

    createEmptyMenu(month, year) {
        return {
            month,
            year,
            days: {},
            verse: null
        };
    },

    saveMenu(menu) {
        const key = this.getMenuKey(menu.month, menu.year);
        const previous = this.menus[key];
        this.menus[key] = menu;
        if (!this.save(StorageKeys.MENUS, this.menus)) {
            // Roll back in-memory state on persistence failure
            if (previous === undefined) {
                delete this.menus[key];
            } else {
                this.menus[key] = previous;
            }
        }
    },

    getDay(month, year, date) {
        const menu = this.getMenu(month, year);
        return menu.days[date] || {
            date,
            entree: '',
            sides: [],
            special: '',
            specialEvent: '',
            isNoSchool: false
        };
    },

    setDay(month, year, date, dayData) {
        const menu = this.getMenu(month, year);
        menu.days[date] = dayData;
        this.saveMenu(menu);
    },

    setMonthVerse(month, year, verse) {
        const menu = this.getMenu(month, year);
        menu.verse = verse;
        this.saveMenu(menu);
    },

    reorderTiles(type, newOrder) {
        if (type === TileTypes.ENTREE) {
            const prev = this.entreeTiles;
            this.entreeTiles = newOrder;
            this.saveEntreeTiles(prev);
        } else {
            const prev = this.sideTiles;
            this.sideTiles = newOrder;
            this.saveSideTiles(prev);
        }
    },

    setCurrentMonth(month, year) {
        const prev = { month: this.currentMonth, year: this.currentYear };
        this.currentMonth = month;
        this.currentYear = year;
        this.saveCurrentMonth(prev);
    }
};
