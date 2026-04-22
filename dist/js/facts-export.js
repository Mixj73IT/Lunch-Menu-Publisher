/**
 * FACTS Export - Plain text generation
 */

const FactsExport = {
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('exportBtn').addEventListener('click', () => this.open());
        document.getElementById('closeExport').addEventListener('click', () => this.close());
        document.getElementById('copyExportBtn').addEventListener('click', () => this.copyToClipboard());
    },

    open() {
        const modal = document.getElementById('exportModal');
        const textarea = document.getElementById('exportText');
        
        const exportText = this.generateExport();
        textarea.value = exportText;
        
        modal.style.display = 'flex';
    },

    close() {
        document.getElementById('exportModal').style.display = 'none';
    },

    generateExport() {
        const menu = State.getMenu(State.currentMonth, State.currentYear);
        const lines = [];

        const daysInMonth = new Date(State.currentYear, State.currentMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(State.currentYear, State.currentMonth, day);
            const dayOfWeek = date.getDay();

            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            const dateKey = `${State.currentYear}-${String(State.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = menu.days[dateKey];

            if (!dayData || dayData.isNoSchool) continue;
            if (!dayData.entree && (!dayData.sides || dayData.sides.length === 0) && !dayData.specialEvent) continue;

            const dayAbbr = this.dayNames[dayOfWeek];
            const monthAbbr = State.currentMonth + 1;
            const dateStr = `${dayAbbr} ${monthAbbr}/${day}`;

            let content = dayData.entree || '';
            if (dayData.sides && dayData.sides.length > 0) {
                content += (content ? ' + ' : '') + dayData.sides.join(', ');
            }

            if (dayData.specialEvent) {
                content += (content ? ' + ' : '') + dayData.specialEvent;
            }

            if (content) {
                lines.push(`${dateStr}: ${content}`);
            }
        }

        return lines.join('\n');
    },

    copyToClipboard() {
        const textarea = document.getElementById('exportText');
        textarea.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyExportBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
};
