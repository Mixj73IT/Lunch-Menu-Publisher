/**
 * Settings Panel and Configuration
 */

const Settings = {
    init() {
        this.setupEventListeners();
        this.applySettings();
    },

    setupEventListeners() {
        document.getElementById('settingsBtn').addEventListener('click', () => this.open());
        document.getElementById('closeSettings').addEventListener('click', () => this.close());

        document.getElementById('compactGridToggle').addEventListener('change', (e) => {
            State.settings.compactGridEnabled = e.target.checked;
            State.saveSettings();
            Tiles.updateGridDensity();
        });

        document.getElementById('versesToggle').addEventListener('change', (e) => {
            State.settings.versesEnabled = e.target.checked;
            State.saveSettings();
            Calendar.renderVerse();
        });

        document.getElementById('advancedVerseToggle').addEventListener('change', (e) => {
            State.settings.advancedVerseLookup = e.target.checked;
            State.saveSettings();

            const advancedTab = document.getElementById('advancedTab');
            advancedTab.style.display = e.target.checked ? 'inline-block' : 'none';

            if (e.target.checked) {
                BibleData.load().then(() => {
                    VerseSelector.populateBookSelect();
                });
            }
        });

        document.getElementById('pdfEmailInput').addEventListener('change', (e) => {
            State.pdfEmail = e.target.value;
            State.savePdfEmail();
        });

        document.getElementById('txtEmailInput').addEventListener('change', (e) => {
            State.txtEmail = e.target.value;
            State.saveTxtEmail();
        });
    },

    open() {
        const modal = document.getElementById('settingsModal');
        document.getElementById('compactGridToggle').checked = State.settings.compactGridEnabled;
        document.getElementById('versesToggle').checked = State.settings.versesEnabled;
        document.getElementById('advancedVerseToggle').checked = State.settings.advancedVerseLookup;
        document.getElementById('pdfEmailInput').value = State.pdfEmail;
        document.getElementById('txtEmailInput').value = State.txtEmail;
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
        this.initializeButtonStates();
        this.setupEventListeners();
    },

    initializeButtonStates() {
        document.querySelectorAll('.collapse-btn').forEach(btn => {
            const panelName = btn.dataset.panel;
            const panel = document.getElementById(panelName + 'Panel');
            const isCollapsed = panel.classList.contains('collapsed');
            const title = panel.querySelector('h2');

            if (isCollapsed) {
                title.style.display = 'none';
                if (panelName === 'entree') {
                    btn.textContent = 'Entrees';
                } else if (panelName === 'side') {
                    btn.textContent = 'Sides';
                } else if (panelName === 'special') {
                    btn.textContent = 'Special';
                }
            }
        });
    },

    setupEventListeners() {
        document.querySelectorAll('.collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panelName = e.target.dataset.panel;
                const panel = document.getElementById(panelName + 'Panel');
                panel.classList.toggle('collapsed');

                // Update collapse button text
                const isCollapsed = panel.classList.contains('collapsed');
                const title = panel.querySelector('h2');

                if (isCollapsed) {
                    title.style.display = 'none';
                    if (panelName === 'entree') {
                        btn.textContent = 'Entrees';
                    } else if (panelName === 'side') {
                        btn.textContent = 'Sides';
                    } else if (panelName === 'special') {
                        btn.textContent = 'Special';
                    }
                } else {
                    title.style.display = 'block';
                    if (panelName === 'entree') {
                        btn.textContent = '<';
                    } else if (panelName === 'side') {
                        btn.textContent = '>';
                    } else if (panelName === 'special') {
                        btn.textContent = '∨';
                    }
                }

                Tiles.updateGridDensity();
            });
        });
    }
};
