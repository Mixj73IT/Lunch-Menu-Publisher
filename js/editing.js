/**
 * Day Inline Editing - Click to edit functionality
 */

const Editing = {
    init() {
        this.setupDayEditing();
    },

    setupDayEditing() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            if (cell.classList.contains('empty') || cell.classList.contains('weekend')) {
                return;
            }

            cell.addEventListener('click', (e) => {
                if (e.target.classList.contains('day-edit-input')) return;
                if (e.target.classList.contains('no-school-toggle')) return;
                this.startEditing(cell);
            });
        });
    },

    startEditing(cell) {
        if (cell.classList.contains('editing') || cell.classList.contains('no-school')) {
            return;
        }

        document.querySelectorAll('.day-cell.editing').forEach(c => {
            this.finishEditing(c);
        });

        cell.classList.add('editing');
        const input = cell.querySelector('.day-edit-input');
        input.focus();
        input.select();

        const finish = () => this.finishEditing(cell);
        
        input.addEventListener('blur', finish, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                const date = cell.dataset.date;
                const dayData = State.getDay(State.currentMonth, State.currentYear, date);
                input.value = Calendar.formatDayEditValue(dayData);
                input.blur();
            }
        });
    },

    finishEditing(cell) {
        if (!cell.classList.contains('editing')) return;

        const date = cell.dataset.date;
        const input = cell.querySelector('.day-edit-input');
        const value = input.value.trim();

        let dayData = State.getDay(State.currentMonth, State.currentYear, date);

        dayData.entree = '';
        dayData.sides = [];
        dayData.specialEvent = '';

        if (value !== '') {
            const parts = value.split(/\s*\|\s*/);
            dayData.entree = parts[0].trim();

            if (parts.length > 1) {
                dayData.sides = parts[1].split(/,\s*/).map(s => s.trim()).filter(s => s);
            }

            if (parts.length > 2) {
                dayData.specialEvent = parts[2].trim();
            }
        }

        State.setDay(State.currentMonth, State.currentYear, date, dayData);
        cell.classList.remove('editing');
        Calendar.renderCalendar();
    }
};
