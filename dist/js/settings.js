/**
 * Settings Panel and Configuration
 */

const Settings = {
    init() {
        this.setupEventListeners();
        this.applySettings();
    },

    setupEventListeners() {
        const $ = (id) => document.getElementById(id);
        
        // Debug: log any missing DOM elements
        const expectedIds = [
            'settingsBtn', 'closeSettings', 'compactGridToggle', 'versesToggle',
            'advancedVerseToggle', 'pdfEmailInput', 'txtEmailInput',
            'exportDataBtn', 'importDataBtn', 'importDataFile'
        ];
        const missing = expectedIds.filter(id => !$(id));
        if (missing.length > 0) {
            // Some expected DOM elements are missing — gracefully skip their listeners
        }
        
        const settingsBtn = $('settingsBtn');
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.open());
        
        const closeBtn = $('closeSettings');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        const compactGrid = $('compactGridToggle');
        if (compactGrid) compactGrid.addEventListener('change', (e) => {
            const prev = { ...State.settings };
            State.settings.compactGridEnabled = e.target.checked;
            State.saveSettings(prev);
            Tiles.updateGridDensity();
        });

        const versesToggle = $('versesToggle');
        if (versesToggle) versesToggle.addEventListener('change', (e) => {
            const prev = { ...State.settings };
            State.settings.versesEnabled = e.target.checked;
            State.saveSettings(prev);
            Calendar.renderVerse();
        });

        const advancedToggle = $('advancedVerseToggle');
        if (advancedToggle) advancedToggle.addEventListener('change', (e) => {
            const prev = { ...State.settings };
            State.settings.advancedVerseLookup = e.target.checked;
            State.saveSettings(prev);

            const advancedTab = $('advancedTab');
            if (advancedTab) advancedTab.style.display = e.target.checked ? 'inline-block' : 'none';

            if (e.target.checked) {
                BibleData.load().then(() => {
                    VerseSelector.populateBookSelect();
                });
            }
        });

        const pdfInput = $('pdfEmailInput');
        if (pdfInput) pdfInput.addEventListener('change', (e) => {
            const prev = State.pdfEmail;
            State.pdfEmail = e.target.value;
            State.savePdfEmail(prev);
        });

        const txtInput = $('txtEmailInput');
        if (txtInput) txtInput.addEventListener('change', (e) => {
            const prev = State.txtEmail;
            State.txtEmail = e.target.value;
            State.saveTxtEmail(prev);
        });

        // Export/Import data (optional elements)
        const exportBtn = $('exportDataBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => {
            State.exportData();
        });

        const importBtn = $('importDataBtn');
        const importFile = $('importDataFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });
            importFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    State.importData(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }
    },

    open() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        const $ = (id) => document.getElementById(id);
        const compactGrid = $('compactGridToggle');
        if (compactGrid) compactGrid.checked = State.settings.compactGridEnabled;
        const versesToggle = $('versesToggle');
        if (versesToggle) versesToggle.checked = State.settings.versesEnabled;
        const advancedToggle = $('advancedVerseToggle');
        if (advancedToggle) advancedToggle.checked = State.settings.advancedVerseLookup;
        const pdfInput = $('pdfEmailInput');
        if (pdfInput) pdfInput.value = State.pdfEmail;
        const txtInput = $('txtEmailInput');
        if (txtInput) txtInput.value = State.txtEmail;
        modal.style.display = 'flex';
    },

    close() {
        document.getElementById('settingsModal').style.display = 'none';
    },

    applySettings() {
        Tiles.updateGridDensity();
        Calendar.renderVerse();
    }
};

// Panel collapse functionality
const PanelCollapse = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.querySelectorAll('.collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panelName = e.target.closest('.collapse-btn').dataset.panel;
                const panel = document.getElementById(panelName + 'Panel');
                panel.classList.toggle('collapsed');
                Tiles.updateGridDensity();
            });
        });
    }
};
