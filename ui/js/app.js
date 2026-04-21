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
        EmailExport.init();

        this.setupPreviewMode();
        this.setDefaultVerse();

        await BibleData.load();

        console.log('Lunch Menu Publisher initialized');
    },

    setupPreviewMode() {
        const previewBtn = document.getElementById('previewBtn');
        
        previewBtn.addEventListener('click', () => {
            document.body.classList.add('preview-mode');
            this.addExitPreviewButton();
        });
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
        });

        document.body.appendChild(btn);
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
});
