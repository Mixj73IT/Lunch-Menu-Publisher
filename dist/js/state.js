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
    pdfEmail: '',
    txtEmail: '',
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
        this.pdfEmail = this.load(StorageKeys.PDF_EMAIL) || '';
        this.txtEmail = this.load(StorageKeys.TXT_EMAIL) || '';

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

        // Migration: fix stale 'special' type → 'specialEvent' in stored tiles
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
                console.log('Migrated special event tile types from "special" to "specialEvent"');
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
            console.error('Error loading from localStorage:', e);
            this.showError('Failed to load saved data. Your settings may have been reset.');
            return null;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
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
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
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
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0d6efd;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
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
            badge.textContent = '✓ Saved';
            document.body.appendChild(badge);
        }
        badge.classList.add('visible');
        clearTimeout(badge._timeout);
        badge._timeout = setTimeout(() => {
            badge.classList.remove('visible');
        }, 1500);
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
            pdfEmail: this.pdfEmail,
            txtEmail: this.txtEmail
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lunch-menu-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
                    console.error('JSON parse failed:', parseErr);
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
                if (data.pdfEmail !== undefined) {
                    const prev = this.pdfEmail;
                    this.pdfEmail = data.pdfEmail;
                    this.savePdfEmail(prev);
                }
                if (data.txtEmail !== undefined) {
                    const prev = this.txtEmail;
                    this.txtEmail = data.txtEmail;
                    this.saveTxtEmail(prev);
                }
                alert('Data imported successfully! The page will now reload.');
                location.reload();
            } catch (err) {
                console.error('Import failed:', err);
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

    savePdfEmail(prev) {
        if (!this.save(StorageKeys.PDF_EMAIL, this.pdfEmail) && prev !== undefined) {
            this.pdfEmail = prev;
        }
    },

    saveTxtEmail(prev) {
        if (!this.save(StorageKeys.TXT_EMAIL, this.txtEmail) && prev !== undefined) {
            this.txtEmail = prev;
        }
    },

    getMenuKey(month, year) {
        return `${year}-${month}`;
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
