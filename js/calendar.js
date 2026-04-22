/**
 * Calendar Rendering and Navigation
 */

const Calendar = {
    monthNames: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    init() {
        this.setupNavigation();
        this.setupDropTargets();
        this.render();
    },

    setupNavigation() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.changeMonth(1);
        });
    },

    changeMonth(delta) {
        let newMonth = State.currentMonth + delta;
        let newYear = State.currentYear;

        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }

        State.setCurrentMonth(newMonth, newYear);
        this.render();
    },

    render() {
        this.updateMonthLabel();
        this.renderCalendar();
        this.renderVerse();
    },

    updateMonthLabel() {
        const label = `${this.monthNames[State.currentMonth]} ${State.currentYear}`;
        document.getElementById('currentMonthLabel').textContent = label;
        document.getElementById('monthTitle').textContent = label;
    },

    renderVerse() {
        const menu = State.getMenu(State.currentMonth, State.currentYear);
        const verseText = document.getElementById('verseText');
        const verseRef = document.getElementById('verseRef');

        if (menu.verse && State.settings.versesEnabled) {
            verseText.textContent = menu.verse.text;
            verseRef.textContent = menu.verse.reference;
            document.getElementById('verseDisplay').style.display = 'block';
        } else {
            document.getElementById('verseDisplay').style.display = 'none';
        }
    },

    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        this.dayNames.forEach(day => {
            const header = document.createElement('div');
            header.className = 'day-header';
            header.textContent = day;
            grid.appendChild(header);
        });

        const days = this.getMonthDays(State.currentYear, State.currentMonth);
        const menu = State.getMenu(State.currentMonth, State.currentYear);

        days.forEach(day => {
            const cell = this.createDayCell(day, menu);
            grid.appendChild(cell);
        });

        Editing.setupDayEditing();
    },

    getMonthDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, dayOfWeek: i });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({
                date: i,
                fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                dayOfWeek: date.getDay(),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }

        const remainingCells = 42 - days.length;
        for (let i = 0; i < remainingCells; i++) {
            days.push({ date: null, dayOfWeek: (startDayOfWeek + daysInMonth + i) % 7 });
        }

        return days;
    },

    createDayCell(day, menu) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.date = day.fullDate || '';

        if (day.date === null) {
            cell.classList.add('empty');
            return cell;
        }

        const isWeekend = day.isWeekend;
        const dayData = menu.days[day.fullDate] || {};
        const isNoSchool = isWeekend || dayData.isNoSchool;

        if (isWeekend) {
            cell.classList.add('weekend');
        }

        if (isNoSchool) {
            cell.classList.add('no-school');
            if (!isWeekend) {
                cell.classList.add('weekday');
            }
        }

        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day.date;
        cell.appendChild(dayNumber);

        // Add NO SCHOOL text for weekday NO SCHOOL cells
        if (isNoSchool && !isWeekend) {
            const noSchoolText = document.createElement('div');
            noSchoolText.className = 'no-school-text';
            noSchoolText.textContent = 'NO SCHOOL';
            cell.appendChild(noSchoolText);
        }

        // Add NS toggle for weekdays only
        if (!isWeekend) {
            const nsBtn = document.createElement('button');
            nsBtn.className = 'ns-toggle' + (isNoSchool ? ' active' : '');
            nsBtn.textContent = 'NS';
            nsBtn.title = isNoSchool ? 'Click to mark as school day' : 'Click to mark NO SCHOOL';
            nsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNoSchool(day.fullDate);
            });
            cell.appendChild(nsBtn);
        }

        const content = document.createElement('div');
        content.className = 'day-content';

        if (!isNoSchool) {
            if (dayData.entree) {
                const entreeDiv = document.createElement('div');
                entreeDiv.className = 'day-entree';
                entreeDiv.textContent = dayData.entree;
                content.appendChild(entreeDiv);
            }

            if (dayData.sides && dayData.sides.length > 0) {
                const sidesDiv = document.createElement('div');
                sidesDiv.className = 'day-sides';
                sidesDiv.textContent = dayData.sides.join(', ');
                content.appendChild(sidesDiv);
            }

            // Add Milk as automatic staple for school days
            if (!isWeekend) {
                const milkDiv = document.createElement('div');
                milkDiv.className = 'day-staple';
                milkDiv.textContent = 'Milk';
                content.appendChild(milkDiv);
            }

            // Add special event if present
            if (dayData.specialEvent) {
                const specialDiv = document.createElement('div');
                specialDiv.className = 'day-special-event';
                specialDiv.textContent = dayData.specialEvent;
                content.appendChild(specialDiv);
            }
        }

        cell.appendChild(content);

        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'day-edit-input';
        editInput.value = this.formatDayEditValue(dayData);
        editInput.placeholder = 'Drag tile or type: Entree | Side1, Side2 | Special';
        cell.appendChild(editInput);

        return cell;
    },

    formatDayEditValue(dayData) {
        if (!dayData.entree && (!dayData.sides || dayData.sides.length === 0) && !dayData.specialEvent) {
            return '';
        }
        // Always preserve the three-part structure: entree | sides | special
        let value = dayData.entree || '';
        if (dayData.sides && dayData.sides.length > 0) {
            value += ' | ' + dayData.sides.join(', ');
        } else if (dayData.specialEvent) {
            // Add empty sides section if there's a special event
            value += ' | ';
        }
        if (dayData.specialEvent) {
            value += ' | ' + dayData.specialEvent;
        }
        return value;
    },

    setupDropTargets() {
        const grid = document.getElementById('calendarGrid');

        grid.addEventListener('dragover', (e) => {
            const cell = e.target.closest('.day-cell');
            if (cell && !cell.classList.contains('no-school') && !cell.classList.contains('empty')) {
                e.preventDefault();
                cell.classList.add('drag-over');
            }
        });

        grid.addEventListener('dragleave', (e) => {
            const cell = e.target.closest('.day-cell');
            if (cell) {
                cell.classList.remove('drag-over');
            }
        });

        grid.addEventListener('drop', (e) => {
            const cell = e.target.closest('.day-cell');
            if (cell) {
                cell.classList.remove('drag-over');
                this.handleDrop(e, cell);
            }
        });
    },

    handleDrop(e, cell) {
        e.preventDefault();
        const date = cell.dataset.date;
        if (!date) return;

        try {
            const tileData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const dayData = State.getDay(State.currentMonth, State.currentYear, date);

            if (tileData.type === 'entree') {
                dayData.entree = tileData.name;
            } else if (tileData.type === 'side') {
                if (!dayData.sides.includes(tileData.name)) {
                    dayData.sides.push(tileData.name);
                }
            } else if (tileData.type === 'special') {
                dayData.specialEvent = tileData.name;
            }

            State.setDay(State.currentMonth, State.currentYear, date, dayData);
            this.renderCalendar();
        } catch (err) {
            console.error('Error handling drop:', err);
        }
    },

    toggleNoSchool(date) {
        const dayData = State.getDay(State.currentMonth, State.currentYear, date);
        const cell = document.querySelector(`.day-cell[data-date="${date}"]`);
        
        if (cell && cell.classList.contains('weekend')) {
            return;
        }

        dayData.isNoSchool = !dayData.isNoSchool;
        if (dayData.isNoSchool) {
            dayData.entree = '';
            dayData.sides = [];
        }

        State.setDay(State.currentMonth, State.currentYear, date, dayData);
        this.renderCalendar();
    }
};
