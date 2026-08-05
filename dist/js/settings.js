/**
 * Settings Panel and Configuration
 */

const Settings = {
    init() {
        this.setupEventListeners();
        this.applySettings();
        this.updateStatuses();
    },

    setupEventListeners() {
        const $ = (id) => document.getElementById(id);

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

        // Single staff-office email recipient.
        const staffInput = $('staffEmailInput');
        if (staffInput) staffInput.addEventListener('change', (e) => {
            const prev = State.staffEmail;
            State.staffEmail = e.target.value.trim();
            State.saveStaffEmail(prev);
            State.showSaved();
            this.updateStatuses();
        });

        // menu.json destination folder (native picker in the desktop app).
        const chooseFolderBtn = $('chooseFolderBtn');
        if (chooseFolderBtn) {
            chooseFolderBtn.addEventListener('click', async () => {
                if (!(window.__TAURI__ && window.__TAURI__.invoke)) {
                    State.showError('Choosing a folder requires the desktop app.');
                    return;
                }
                try {
                    const folder = await window.__TAURI__.invoke('pick_folder');
                    if (folder) {
                        const prev = State.menuJsonFolder;
                        State.menuJsonFolder = folder;
                        State.saveMenuJsonFolder(prev);
                        this.updateStatuses();
                        State.showSaved();
                    }
                } catch (err) {
                    State.showError(`Could not open the folder picker: ${err}`);
                }
            });
        }

        const smtpHost = $('smtpHostInput');
        if (smtpHost) smtpHost.addEventListener('change', (e) => {
            const prev = State.smtpHost;
            State.smtpHost = e.target.value;
            State.saveSmtpHost(prev);
            State.showSaved();
            this.updateStatuses();
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
            this.updateStatuses();
        });

        const smtpPassword = $('smtpPasswordInput');
        if (smtpPassword) smtpPassword.addEventListener('change', (e) => {
            const prev = State.smtpPassword;
            State.smtpPassword = e.target.value;
            State.saveSmtpPassword(prev);
            State.showSaved();
            this.updateStatuses();
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

        const sendTestEmailBtn = $('sendTestEmailBtn');
        if (sendTestEmailBtn) {
            sendTestEmailBtn.addEventListener('click', async () => {
                // Persist unsaved input values before sending.
                if (staffInput && staffInput.value !== State.staffEmail) {
                    State.staffEmail = staffInput.value.trim();
                    State.saveStaffEmail();
                    this.updateStatuses();
                }
                await Publish.sendTestEmail();
            });
        }

        // Export/Import data (recovery tools)
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

    /** Live status lines: email configuration + menu.json destination. */
    updateStatuses() {
        const emailStatus = document.getElementById('emailStatus');
        if (emailStatus) {
            const parts = [];
            if (State.staffEmail) {
                parts.push(`Recipient: ${State.staffEmail}`);
            } else {
                parts.push('No staff-office recipient set');
            }
            if (State.smtpHost && State.smtpUser && State.smtpPassword) {
                parts.push('SMTP configured');
                emailStatus.className = 'setting-status ok';
                emailStatus.textContent = `✓ ${parts.join(' · ')}`;
            } else {
                const missing = [];
                if (!State.smtpHost) missing.push('host');
                if (!State.smtpUser) missing.push('user');
                if (!State.smtpPassword) missing.push('password');
                parts.push(`SMTP incomplete (missing ${missing.join(', ')})`);
                emailStatus.className = 'setting-status warn';
                emailStatus.textContent = `! ${parts.join(' · ')}`;
            }
        }

        const folderStatus = document.getElementById('menuJsonFolderStatus');
        if (folderStatus) {
            const input = document.getElementById('menuJsonFolderInput');
            if (input) input.value = State.menuJsonFolder;
            if (State.menuJsonFolder) {
                folderStatus.className = 'setting-status ok';
                folderStatus.textContent = window.__TAURI__ && window.__TAURI__.invoke
                    ? `✓ menu.json will be written to ${State.menuJsonFolder}`
                    : `✓ menu.json will be downloaded (folder selected: ${State.menuJsonFolder}); the desktop app writes it there`;
            } else {
                folderStatus.className = 'setting-status warn';
                folderStatus.textContent = window.__TAURI__ && window.__TAURI__.invoke
                    ? '! No destination folder selected — Publish Month is disabled until you choose one.'
                    : '! No destination folder selected — the desktop app writes menu.json to the folder you choose here; in the browser it is downloaded instead.';
            }
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
        const staffInput = $('staffEmailInput');
        if (staffInput) staffInput.value = State.staffEmail;
        const smtpHost = $('smtpHostInput');
        if (smtpHost) smtpHost.value = State.smtpHost;
        const smtpPort = $('smtpPortInput');
        if (smtpPort) smtpPort.value = State.smtpPort;
        const smtpUser = $('smtpUserInput');
        if (smtpUser) smtpUser.value = State.smtpUser;
        const smtpPassword = $('smtpPasswordInput');
        if (smtpPassword) smtpPassword.value = State.smtpPassword;

        this.updateStatuses();

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
