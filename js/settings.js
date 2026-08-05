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

        const smtpHost = $('smtpHostInput');
        if (smtpHost) smtpHost.addEventListener('change', (e) => {
            const prev = State.smtpHost;
            State.smtpHost = e.target.value;
            State.saveSmtpHost(prev);
            State.showSaved();
        });

        const smtpPort = $('smtpPortInput');
        if (smtpPort) smtpPort.addEventListener('change', (e) => {
            const prev = State.smtpPort;
            const parsed = parseInt(e.target.value, 10);
            State.smtpPort = Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
            State.saveSmtpPort(prev);
            State.showSaved();
        });

        const smtpUser = $('smtpUserInput');
        if (smtpUser) smtpUser.addEventListener('change', (e) => {
            const prev = State.smtpUser;
            State.smtpUser = e.target.value;
            State.saveSmtpUser(prev);
            State.showSaved();
        });

        const smtpPassword = $('smtpPasswordInput');
        if (smtpPassword) smtpPassword.addEventListener('change', (e) => {
            const prev = State.smtpPassword;
            State.smtpPassword = e.target.value;
            State.saveSmtpPassword(prev);
            State.showSaved();
        });

        const testConnectionBtn = $('testConnectionBtn');
        if (testConnectionBtn) testConnectionBtn.addEventListener('click', async () => {
            // Read the live input values: the 'change' event only fires on blur,
            // so a just-typed value may not be persisted to State yet.
            const host = smtpHost ? smtpHost.value : State.smtpHost;
            const rawPort = smtpPort ? parseInt(smtpPort.value, 10) : NaN;
            const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : State.smtpPort;
            const user = smtpUser ? smtpUser.value : State.smtpUser;
            const password = smtpPassword ? smtpPassword.value : State.smtpPassword;
            await State.testSmtpConnection(host, port, user, password);
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
        const smtpHost = $('smtpHostInput');
        if (smtpHost) smtpHost.value = State.smtpHost;
        const smtpPort = $('smtpPortInput');
        if (smtpPort) smtpPort.value = State.smtpPort;
        const smtpUser = $('smtpUserInput');
        if (smtpUser) smtpUser.value = State.smtpUser;
        const smtpPassword = $('smtpPasswordInput');
        if (smtpPassword) smtpPassword.value = State.smtpPassword;
        
        // Focus trap setup
        this.previouslyFocused = document.activeElement;
        this.setupFocusTrap(modal);
        
        modal.style.display = 'flex';
    },

    close() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        modal.style.display = 'none';
        
        // Restore focus
        if (this.previouslyFocused && this.previouslyFocused.focus) {
            this.previouslyFocused.focus();
        }
        
        // Clean up focus trap
        this.removeFocusTrap();
    },

    setupFocusTrap(modal) {
        // Add keydown listener to trap focus within modal
        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;
            
            const focusableElements = Array.from(
                modal.querySelectorAll(
                    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                )
            );
            
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const isShift = e.shiftKey;
            
            if (isShift && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!isShift && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };
        
        modal.addEventListener('keydown', trapFocus);
        
        // Store reference for cleanup
        this._focusTrapListener = trapFocus;
    },

    removeFocusTrap() {
        if (this._focusTrapListener) {
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.removeEventListener('keydown', this._focusTrapListener);
            }
            this._focusTrapListener = null;
        }
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
