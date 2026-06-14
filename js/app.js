/**
 * Lunch Menu Publisher - Main Application Entry Point
 */

const App = {
    async init() {
        State.init();
        Tiles.init();
        Calendar.init();
        Editing.init();
        await VerseSelector.init();
        Settings.init();
        PanelCollapse.init();
        FactsExport.init();

        // EmailExport may not be available in browser (Tauri-only module)
        try {
            if (typeof EmailExport !== 'undefined') {
                EmailExport.init();
            }
        } catch (e) {
            // EmailExport not available in browser (Tauri-only)
        }

        // Bible data is lazy-loaded only when the Advanced verse lookup tab is opened
        // (see settings.js advancedVerseToggle listener and verses.js open() method)

        this.setupPreviewMode();
        this.setDefaultVerse();
        this.setupKeyboardShortcuts();

        // App initialized
    },

    setupPreviewMode() {
        const previewBtn = document.getElementById('previewBtn');
        
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                document.body.classList.add('preview-mode');
                this.addExitPreviewButton();
            });
        }

        // Copy from previous month
        const copyBtn = document.getElementById('copyPrevMonthBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                Calendar.copyFromPreviousMonth();
            });
        }
    },

    addExitPreviewButton() {
        if (document.getElementById('exitPreviewBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'exitPreviewBtn';
        btn.className = 'btn btn-primary';
        btn.textContent = 'Exit Preview';
        btn.addEventListener('click', () => {
            document.body.classList.remove('preview-mode');
            btn.remove();
            // Remove print button too
            const printBtn = document.getElementById('printPreviewBtn');
            if (printBtn) printBtn.remove();
        });

        document.body.appendChild(btn);

        // Also add a Print button in preview mode
        const printBtn = document.createElement('button');
        printBtn.id = 'printPreviewBtn';
        printBtn.className = 'btn btn-primary';
        printBtn.textContent = 'Print';
        printBtn.style.right = '140px';
        printBtn.addEventListener('click', () => {
            window.print();
        });
        document.body.appendChild(printBtn);
    },

    setDefaultVerse() {
        const menu = State.getMenu(State.currentMonth, State.currentYear);
        
        if (!menu.verse) {
            const monthVerses = VerseSelector.curatedVerses.filter(v => 
                v.months.includes(State.currentMonth + 1)
            );
            
            if (monthVerses.length > 0) {
                State.setMonthVerse(State.currentMonth, State.currentYear, monthVerses[0]);
                Calendar.renderVerse();
            }
        }
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z = Undo
            if (e.ctrlKey && e.key === 'z' && !e.target.closest('input, textarea, select')) {
                e.preventDefault();
                if (State.undoStack.length > 0) {
                    if (State.performUndo()) {
                        Calendar.render();
                        Tiles.renderLibraries();
                        State.showSaved();
                    }
                } else if (Tiles.undoStack.length > 0) {
                    Tiles.undo();
                }
            }
            // Ctrl+Arrow = Month navigation
            if (e.ctrlKey && e.key === 'ArrowLeft' && !e.target.closest('input, textarea, select')) {
                e.preventDefault();
                Calendar.changeMonth(-1);
            }
            if (e.ctrlKey && e.key === 'ArrowRight' && !e.target.closest('input, textarea, select')) {
                e.preventDefault();
                Calendar.changeMonth(1);
            }
            // Ctrl+P = Print preview
            if (e.ctrlKey && e.key === 'p' && !e.target.closest('input, textarea, select')) {
                e.preventDefault();
                if (!document.body.classList.contains('preview-mode')) {
                    document.body.classList.add('preview-mode');
                    this.addExitPreviewButton();
                }
                setTimeout(() => window.print(), 300);
            }
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});

// Handle print dialog for PDF export
window.addEventListener('beforeprint', () => {
    document.body.classList.add('preview-mode');
});

window.addEventListener('afterprint', () => {
    document.body.classList.remove('preview-mode');
    const exitBtn = document.getElementById('exitPreviewBtn');
    if (exitBtn) exitBtn.remove();
    const printBtn = document.getElementById('printPreviewBtn');
    if (printBtn) printBtn.remove();
});
