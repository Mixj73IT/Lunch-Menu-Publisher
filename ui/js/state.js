/**
 * State Management & LocalStorage Persistence
 */

const StorageKeys = {
    ENTREE_TILES: 'lunchMenu_entreeTiles',
    SIDE_TILES: 'lunchMenu_sideTiles',
    SPECIAL_EVENT_TILES: 'lunchMenu_specialEventTiles',
    MENUS: 'lunchMenu_menus',
    SETTINGS: 'lunchMenu_settings',
    CURRENT_MONTH: 'lunchMenu_currentMonth',
    PDF_EMAIL: 'lunchMenu_pdfEmail',
    TXT_EMAIL: 'lunchMenu_txtEmail'
};

const DEFAULT_ENTREES = [
    { id: 'entree-1', name: 'Chicken Nuggets', type: 'entree' },
    { id: 'entree-2', name: 'Pizza', type: 'entree' },
    { id: 'entree-3', name: 'Hamburger', type: 'entree' },
    { id: 'entree-4', name: 'Hot Dog', type: 'entree' },
    { id: 'entree-5', name: 'Chicken Sandwich', type: 'entree' },
    { id: 'entree-6', name: 'Spaghetti', type: 'entree' },
    { id: 'entree-7', name: 'Tacos', type: 'entree' },
    { id: 'entree-8', name: 'Grilled Cheese', type: 'entree' },
    { id: 'entree-9', name: 'Chicken Patty', type: 'entree' },
    { id: 'entree-10', name: 'Turkey & Cheese Wrap', type: 'entree' }
];

const DEFAULT_SIDES = [
    { id: 'side-1', name: 'French Fries', type: 'side' },
    { id: 'side-2', name: 'Mashed Potatoes', type: 'side' },
    { id: 'side-3', name: 'Green Beans', type: 'side' },
    { id: 'side-4', name: 'Corn', type: 'side' },
    { id: 'side-5', name: 'Carrots', type: 'side' },
    { id: 'side-6', name: 'Apple Slices', type: 'side' },
    { id: 'side-7', name: 'Side Salad', type: 'side' },
    { id: 'side-8', name: 'Roll', type: 'side' }
];

const DEFAULT_SPECIAL_EVENTS = [
    { id: 'special-1', name: 'Bake Sale', type: 'special' },
    { id: 'special-2', name: 'Sno-Cones', type: 'special' },
    { id: 'special-3', name: 'Pizza Party', type: 'special' },
    { id: 'special-4', name: 'Ice Cream Day', type: 'special' }
];

const DEFAULT_SETTINGS = {
    compactGridEnabled: false,
    versesEnabled: true,
    advancedVerseLookup: false
};

const State = {
    entreeTiles: [],
    sideTiles: [],
    specialEventTiles: [],
    menus: {},
    settings: {},
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    pdfEmail: '',
    txtEmail: '',

    init() {
        // Reset to current date to ensure correct month
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.loadAll();
        this.ensureDefaults();
        this.migrateNoSchoolData();
    },

    loadAll() {
        this.entreeTiles = this.load(StorageKeys.ENTREE_TILES) || [];
        this.sideTiles = this.load(StorageKeys.SIDE_TILES) || [];
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
            this.entreeTiles = [...DEFAULT_ENTREES];
            this.saveEntreeTiles();
        }

        if (this.sideTiles.length === 0) {
            this.sideTiles = [...DEFAULT_SIDES];
            this.saveSideTiles();
        }

        if (this.specialEventTiles.length === 0) {
            this.specialEventTiles = [...DEFAULT_SPECIAL_EVENTS];
            this.saveSpecialEventTiles();
        }

        this.settings = { ...DEFAULT_SETTINGS, ...this.settings };
        this.saveSettings();
    },

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return null;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    },

    saveEntreeTiles() {
        this.save(StorageKeys.ENTREE_TILES, this.entreeTiles);
    },

    saveSideTiles() {
        this.save(StorageKeys.SIDE_TILES, this.sideTiles);
    },

    saveSpecialEventTiles() {
        this.save(StorageKeys.SPECIAL_EVENT_TILES, this.specialEventTiles);
    },

    saveSettings() {
        this.save(StorageKeys.SETTINGS, this.settings);
    },

    saveCurrentMonth() {
        this.save(StorageKeys.CURRENT_MONTH, {
            month: this.currentMonth,
            year: this.currentYear
        });
    },

    savePdfEmail() {
        this.save(StorageKeys.PDF_EMAIL, this.pdfEmail);
    },

    saveTxtEmail() {
        this.save(StorageKeys.TXT_EMAIL, this.txtEmail);
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
        this.menus[key] = menu;
        this.save(StorageKeys.MENUS, this.menus);
    },

    getDay(month, year, date) {
        const menu = this.getMenu(month, year);
        return menu.days[date] || {
            date,
            entree: '',
            sides: [],
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
        if (type === 'entree') {
            this.entreeTiles = newOrder;
            this.saveEntreeTiles();
        } else {
            this.sideTiles = newOrder;
            this.saveSideTiles();
        }
    },

    setCurrentMonth(month, year) {
        this.currentMonth = month;
        this.currentYear = year;
        this.saveCurrentMonth();
    },

    migrateNoSchoolData() {
        // Clear NO SCHOOL flags for weekdays (only weekends should be NO SCHOOL by default)
        let migrated = false;
        Object.keys(this.menus).forEach(key => {
            const menu = this.menus[key];
            Object.keys(menu.days).forEach(date => {
                const day = menu.days[date];
                const dayOfWeek = new Date(date).getDay();
                // If it's a weekday (Mon-Fri) and marked as NO SCHOOL, clear it
                if (dayOfWeek >= 1 && dayOfWeek <= 5 && day.isNoSchool) {
                    day.isNoSchool = false;
                    migrated = true;
                }
            });
        });

        if (migrated) {
            this.save(StorageKeys.MENUS, this.menus);
            console.log('Migrated NO SCHOOL data: cleared weekday flags');
        }
    }
};
