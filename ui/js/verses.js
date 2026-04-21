/**
 * Verse Selection - Curated and Advanced Lookup
 */

const VerseSelector = {
    curatedVerses: [],
    bibleData: null,

    async init() {
        await this.loadCuratedVerses();
        this.setupEventListeners();
    },

    async loadCuratedVerses() {
        try {
            const response = await fetch('data/curated-verses.json');
            const data = await response.json();
            this.curatedVerses = data.verses;
            console.log('Loaded', this.curatedVerses.length, 'curated verses');
        } catch (err) {
            console.error('Failed to load curated verses:', err);
            this.curatedVerses = [];
        }
    },

    setupEventListeners() {
        document.getElementById('closeVerse').addEventListener('click', () => this.close());
        document.getElementById('curatedTab').addEventListener('click', () => this.showTab('curated'));
        document.getElementById('advancedTab').addEventListener('click', () => this.showTab('advanced'));
        document.getElementById('noVerseBtn').addEventListener('click', () => this.selectVerse(null));
        
        // Select Verse button in calendar header
        const selectVerseBtn = document.getElementById('selectVerseBtn');
        if (selectVerseBtn) {
            selectVerseBtn.addEventListener('click', () => this.open());
        }
        
        document.getElementById('bookSelect').addEventListener('change', (e) => this.onBookChange(e));
        document.getElementById('chapterSelect').addEventListener('change', (e) => this.onChapterChange(e));
        document.getElementById('selectAdvancedVerse').addEventListener('click', () => this.selectAdvancedVerse());
    },

    open() {
        const modal = document.getElementById('verseModal');
        modal.style.display = 'flex';
        
        const advancedTab = document.getElementById('advancedTab');
        advancedTab.style.display = State.settings.advancedVerseLookup ? 'inline-block' : 'none';
        
        this.showTab('curated');
        this.renderCuratedVerses();

        if (State.settings.advancedVerseLookup && this.bibleData) {
            this.populateBookSelect();
        }
    },

    close() {
        document.getElementById('verseModal').style.display = 'none';
    },

    showTab(tab) {
        const curatedTab = document.getElementById('curatedTab');
        const advancedTab = document.getElementById('advancedTab');
        const verseList = document.getElementById('verseList');
        const verseAdvanced = document.getElementById('verseAdvanced');

        if (tab === 'curated') {
            curatedTab.classList.add('active');
            advancedTab.classList.remove('active');
            verseList.style.display = 'block';
            verseAdvanced.style.display = 'none';
        } else {
            curatedTab.classList.remove('active');
            advancedTab.classList.add('active');
            verseList.style.display = 'none';
            verseAdvanced.style.display = 'flex';
        }
    },

    renderCuratedVerses() {
        const list = document.getElementById('verseList');
        list.innerHTML = '';

        console.log('Current month:', State.currentMonth + 1);
        console.log('Total curated verses:', this.curatedVerses.length);

        const monthVerses = this.curatedVerses.filter(v =>
            v.months.includes(State.currentMonth + 1)
        );

        console.log('Filtered verses for month:', monthVerses.length);

        monthVerses.forEach(verse => {
            const el = document.createElement('div');
            el.className = 'verse-option';
            el.innerHTML = `
                <p class="v-text">"${verse.text}"</p>
                <p class="v-ref">${verse.reference}</p>
            `;
            el.addEventListener('click', () => this.selectVerse(verse));
            list.appendChild(el);
        });

        if (monthVerses.length === 0) {
            list.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No curated verses available for this month.</p>';
        }
    },

    selectVerse(verse) {
        State.setMonthVerse(State.currentMonth, State.currentYear, verse);
        Calendar.renderVerse();
        this.close();
    },

    populateBookSelect() {
        const select = document.getElementById('bookSelect');
        select.innerHTML = '<option>Select Book...</option>';
        
        if (!this.bibleData) return;

        Object.keys(this.bibleData).forEach(book => {
            const option = document.createElement('option');
            option.value = book;
            option.textContent = book;
            select.appendChild(option);
        });
    },

    onBookChange(e) {
        const book = e.target.value;
        const chapterSelect = document.getElementById('chapterSelect');
        const verseSelect = document.getElementById('verseSelect');

        chapterSelect.innerHTML = '<option>Chapter</option>';
        verseSelect.innerHTML = '<option>Verse</option>';
        verseSelect.disabled = true;

        if (!book || !this.bibleData || !this.bibleData[book]) {
            chapterSelect.disabled = true;
            return;
        }

        chapterSelect.disabled = false;
        Object.keys(this.bibleData[book]).forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = `Chapter ${index + 1}`;
            chapterSelect.appendChild(option);
        });
    },

    onChapterChange(e) {
        const book = document.getElementById('bookSelect').value;
        const chapter = e.target.value;
        const verseSelect = document.getElementById('verseSelect');

        verseSelect.innerHTML = '<option>Verse</option>';

        if (!book || !chapter || !this.bibleData || !this.bibleData[book]) {
            verseSelect.disabled = true;
            return;
        }

        const verses = this.bibleData[book][chapter - 1];
        if (!verses) {
            verseSelect.disabled = true;
            return;
        }

        verseSelect.disabled = false;
        verses.forEach((_, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = `Verse ${index + 1}`;
            verseSelect.appendChild(option);
        });
    },

    selectAdvancedVerse() {
        const book = document.getElementById('bookSelect').value;
        const chapter = document.getElementById('chapterSelect').value;
        const verse = document.getElementById('verseSelect').value;

        if (!book || !chapter || !verse) return;

        const verseText = this.bibleData[book][chapter - 1][verse - 1];
        const reference = `${book} ${chapter}:${verse}`;

        this.selectVerse({
            text: verseText,
            reference: reference
        });
    }
};

// Initialize bible data loader
const BibleData = {
    data: null,

    async load() {
        try {
            const response = await fetch('data/kjv-bible.json');
            this.data = await response.json();
            VerseSelector.bibleData = this.data;
            console.log('Loaded Bible data with', Object.keys(this.data).length, 'books');
        } catch (err) {
            console.error('Failed to load Bible data:', err);
        }
    }
};
