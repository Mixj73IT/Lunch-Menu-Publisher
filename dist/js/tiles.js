/**
 * Tile Library - Drag, Reorder, and Management
 */

const Tiles = {
    draggedTile: null,
    sourceGrid: null,
    dragElement: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    boundMouseMove: null,
    boundMouseUp: null,
    undoStack: [],

    init() {
        this.renderLibraries();
        this.setupAddButtons();
    },

    renderLibraries() {
        this.renderGrid(GridIds.ENTREE, State.entreeTiles);
        this.renderGrid(GridIds.SIDE, State.sideTiles);
        this.renderGrid(GridIds.SPECIALS, State.specialsTiles);
        this.renderGrid(GridIds.SPECIAL_EVENT, State.specialEventTiles);
    },

    renderGrid(gridId, tiles) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        grid.innerHTML = '';

        tiles.forEach(tile => {
            const tileEl = this.createTileElement(tile);
            grid.appendChild(tileEl);
        });
    },

    createTileElement(tile) {
        const el = document.createElement('div');
        el.className = `tile ${tile.type}`;
        el.dataset.tileId = tile.id;
        el.dataset.tileType = tile.type;
        el.textContent = tile.name;

        // Delete button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'tile-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove this tile';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeTile(tile.id, tile.type);
        });
        el.appendChild(removeBtn);

        // Mouse-based drag and drop for Tauri compatibility
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('tile-remove')) return;
            this.handleMouseDown(e, tile);
        });
        el.style.cursor = 'grab';

        return el;
    },

    handleMouseDown(e, tile) {
        if (e.button !== 0) return; // Only left click

        this.draggedTile = tile;
        this.sourceGrid = e.target.closest('.tile-grid').id;

        // Create a clone for dragging
        this.dragElement = e.target.cloneNode(true);
        this.dragElement.style.position = 'fixed';
        this.dragElement.style.pointerEvents = 'none';
        this.dragElement.style.opacity = '0.8';
        this.dragElement.style.zIndex = '10000';
        this.dragElement.style.cursor = 'grabbing';

        const rect = e.target.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        this.dragElement.style.left = (e.clientX - this.dragOffsetX) + 'px';
        this.dragElement.style.top = (e.clientY - this.dragOffsetY) + 'px';

        document.body.appendChild(this.dragElement);

        // Add global mouse move and mouse up listeners
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);

        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        // Also listen on window for drags that leave the document
        window.addEventListener('mouseup', this.boundMouseUp);

        e.target.classList.add('dragging');
    },

    handleMouseMove(e) {
        if (!this.dragElement) return;

        this.dragElement.style.left = (e.clientX - this.dragOffsetX) + 'px';
        this.dragElement.style.top = (e.clientY - this.dragOffsetY) + 'px';

        // Highlight drop targets
        document.querySelectorAll('.day-cell').forEach(cell => {
            const rect = cell.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                if (!cell.classList.contains('no-school') && !cell.classList.contains('empty')) {
                    cell.classList.add('drag-over');
                }
            } else {
                cell.classList.remove('drag-over');
            }
        });
    },

    handleMouseUp(e) {
        if (!this.dragElement) return;

        // Check if dropped on a day cell
        const cell = e.target.closest('.day-cell');
        if (cell && !cell.classList.contains('no-school') && !cell.classList.contains('empty')) {
            // Trigger the drop
            const date = cell.dataset.date;
            if (date) {
                const dayData = State.getDay(State.currentMonth, State.currentYear, date);

                if (this.draggedTile.type === TileTypes.ENTREE) {
                    dayData.entree = this.draggedTile.name;
                } else if (this.draggedTile.type === TileTypes.SIDE) {
                    if (!dayData.sides.includes(this.draggedTile.name)) {
                        dayData.sides.push(this.draggedTile.name);
                    }
                } else if (this.draggedTile.type === TileTypes.SPECIALS) {
                    dayData.special = this.draggedTile.name;
                } else if (this.draggedTile.type === TileTypes.SPECIAL_EVENT) {
                    dayData.specialEvent = this.draggedTile.name;
                }

                State.pushUndo();
                State.setDay(State.currentMonth, State.currentYear, date, dayData);
                State.showSaved();
                // Defensive: renderCalendar touches many DOM elements (grid, cells, labels);
                // if any are missing (stale cached HTML), the app shouldn't lose the save.
                try {
                    Calendar.renderCalendar();
                } catch (err) {
                    // Calendar.renderCalendar failed — gracefully continue since data was already saved
                }
            }
        }

        // Cleanup
        document.body.removeChild(this.dragElement);
        this.dragElement = null;
        this.draggedTile = null;

        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.classList.remove('drag-over');
        });

        document.querySelectorAll('.tile').forEach(tile => {
            tile.classList.remove('dragging');
        });

        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('mouseup', this.boundMouseUp);
    },

    updateGridDensity() {
        const entreePanel = document.getElementById('entreePanel');
        const sidePanel = document.getElementById('sidePanel');
        const specialPanel = document.getElementById('specialPanel');
        if (!entreePanel || !sidePanel || !specialPanel) return;
        
        const entreeGrid = document.getElementById(GridIds.ENTREE);
        const sideGrid = document.getElementById(GridIds.SIDE);
        const specialGrid = document.getElementById(GridIds.SPECIAL_EVENT);

        const compactEnabled = State.settings.compactGridEnabled;

        if (compactEnabled) {
            // Entrees (Left) get 3 columns if the Right side is collapsed
            const rightCollapsed = sidePanel.classList.contains('collapsed') && specialPanel.classList.contains('collapsed');
            entreeGrid.dataset.columns = rightCollapsed ? '3' : '2';

            // Sides and Special (Right) get 3 columns if the Left side is collapsed
            const leftCollapsed = entreePanel.classList.contains('collapsed');
            sideGrid.dataset.columns = leftCollapsed ? '3' : '2';
            specialGrid.dataset.columns = leftCollapsed ? '3' : '2';
        } else {
            entreeGrid.dataset.columns = '2';
            sideGrid.dataset.columns = '2';
            specialGrid.dataset.columns = '2';
        }
    },

    setupAddButtons() {
        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.dataset.type;
                const panel = btn.closest('.panel');
                this.showInlineAddInput(type, panel);
            });
        });
    },

    showInlineAddInput(type, panel) {
        // Remove any existing inline input first
        this.removeInlineAddInput();

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-add-input';
        input.placeholder = `New ${type} name...`;
        input.style.cssText = 'width: 100%; padding: 6px 8px; border: 2px solid var(--color-accent); border-radius: 4px; font-size: 13px; margin-bottom: 6px;';

        let committed = false;
        const commitOnce = () => {
            if (committed) return;
            committed = true;
            const name = input.value.trim();
            this.removeInlineAddInput();
            if (name) {
                this.addTile(type, name);
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitOnce(); }
            if (e.key === 'Escape') { committed = true; this.removeInlineAddInput(); }
        });
        input.addEventListener('blur', () => {
            // Small delay so Enter keydown fires before blur commits
            setTimeout(() => {
                if (!committed && document.body.contains(input)) {
                    commitOnce();
                }
            }, 150);
        });

        const content = panel.querySelector('.panel-content');
        content.insertBefore(input, content.firstChild);
        input.focus();
    },

    removeInlineAddInput() {
        const existing = document.querySelector('.inline-add-input');
        if (existing) existing.remove();
    },

    addTile(type, nameOverride) {
        const name = nameOverride || '';
        if (!name || !name.trim()) return;

        const newTile = {
            id: `${type}-${Date.now()}`,
            name: name.trim(),
            type: type
        };

        if (type === TileTypes.ENTREE) {
            const prev = [...State.entreeTiles];
            State.entreeTiles.push(newTile);
            State.saveEntreeTiles(prev);
            this.renderGrid(GridIds.ENTREE, State.entreeTiles);
        } else if (type === TileTypes.SIDE) {
            const prev = [...State.sideTiles];
            State.sideTiles.push(newTile);
            State.saveSideTiles(prev);
            this.renderGrid(GridIds.SIDE, State.sideTiles);
        } else if (type === TileTypes.SPECIALS) {
            const prev = [...State.specialsTiles];
            State.specialsTiles.push(newTile);
            State.saveSpecialsTiles(prev);
            this.renderGrid(GridIds.SPECIALS, State.specialsTiles);
        } else if (type === TileTypes.SPECIAL_EVENT) {
            const prev = [...State.specialEventTiles];
            State.specialEventTiles.push(newTile);
            State.saveSpecialEventTiles(prev);
            this.renderGrid(GridIds.SPECIAL_EVENT, State.specialEventTiles);
        }
    },

    removeTile(tileId, type) {
        if (!confirm(`Remove this ${type}?`)) return;

        // Save state for undo
        this.pushUndoState(type);

        if (type === TileTypes.ENTREE) {
            const prev = State.entreeTiles;
            State.entreeTiles = State.entreeTiles.filter(t => t.id !== tileId);
            State.saveEntreeTiles(prev);
            this.renderGrid(GridIds.ENTREE, State.entreeTiles);
        } else if (type === TileTypes.SIDE) {
            const prev = State.sideTiles;
            State.sideTiles = State.sideTiles.filter(t => t.id !== tileId);
            State.saveSideTiles(prev);
            this.renderGrid(GridIds.SIDE, State.sideTiles);
        } else if (type === TileTypes.SPECIALS) {
            const prev = State.specialsTiles;
            State.specialsTiles = State.specialsTiles.filter(t => t.id !== tileId);
            State.saveSpecialsTiles(prev);
            this.renderGrid(GridIds.SPECIALS, State.specialsTiles);
        } else if (type === TileTypes.SPECIAL_EVENT) {
            const prev = State.specialEventTiles;
            State.specialEventTiles = State.specialEventTiles.filter(t => t.id !== tileId);
            State.saveSpecialEventTiles(prev);
            this.renderGrid(GridIds.SPECIAL_EVENT, State.specialEventTiles);
        }

        this.showUndoButton();
    },

    pushUndoState(type) {
        let tiles;
        if (type === TileTypes.ENTREE) {
            tiles = [...State.entreeTiles];
        } else if (type === TileTypes.SIDE) {
            tiles = [...State.sideTiles];
        } else if (type === TileTypes.SPECIALS) {
            tiles = [...State.specialsTiles];
        } else if (type === TileTypes.SPECIAL_EVENT) {
            tiles = [...State.specialEventTiles];
        }

        this.undoStack.push({ type, tiles });
        // Keep only last 10 actions
        if (this.undoStack.length > 10) {
            this.undoStack.shift();
        }
    },

    undo() {
        if (this.undoStack.length === 0) return;

        const lastState = this.undoStack.pop();
        const { type, tiles } = lastState;

        if (type === TileTypes.ENTREE) {
            const prev = State.entreeTiles;
            State.entreeTiles = tiles;
            State.saveEntreeTiles(prev);
            this.renderGrid(GridIds.ENTREE, State.entreeTiles);
        } else if (type === TileTypes.SIDE) {
            const prev = State.sideTiles;
            State.sideTiles = tiles;
            State.saveSideTiles(prev);
            this.renderGrid(GridIds.SIDE, State.sideTiles);
        } else if (type === TileTypes.SPECIALS) {
            const prev = State.specialsTiles;
            State.specialsTiles = tiles;
            State.saveSpecialsTiles(prev);
            this.renderGrid(GridIds.SPECIALS, State.specialsTiles);
        } else if (type === TileTypes.SPECIAL_EVENT) {
            const prev = State.specialEventTiles;
            State.specialEventTiles = tiles;
            State.saveSpecialEventTiles(prev);
            this.renderGrid(GridIds.SPECIAL_EVENT, State.specialEventTiles);
        }

        if (this.undoStack.length === 0) {
            this.hideUndoButton();
        }
    },

    showUndoButton() {
        let undoBtn = document.getElementById('undoBtn');
        if (!undoBtn) {
            undoBtn = document.createElement('button');
            undoBtn.id = 'undoBtn';
            undoBtn.className = 'btn btn-secondary';
            undoBtn.textContent = 'Undo';
            undoBtn.style.position = 'fixed';
            undoBtn.style.bottom = '20px';
            undoBtn.style.left = '20px';
            undoBtn.style.zIndex = '1000';
            undoBtn.addEventListener('click', () => this.undo());
            document.body.appendChild(undoBtn);
        }
    },

    hideUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.remove();
    }
};
