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

    init() {
        this.renderLibraries();
        this.setupDragEvents();
        this.setupAddButtons();
    },

    renderLibraries() {
        this.renderGrid('entreeGrid', State.entreeTiles);
        this.renderGrid('sideGrid', State.sideTiles);
        this.renderGrid('specialGrid', State.specialEventTiles);
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

        // Mouse-based drag and drop for Tauri compatibility
        el.addEventListener('mousedown', (e) => this.handleMouseDown(e, tile));
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

                if (this.draggedTile.type === 'entree') {
                    dayData.entree = this.draggedTile.name;
                } else if (this.draggedTile.type === 'side') {
                    if (!dayData.sides.includes(this.draggedTile.name)) {
                        dayData.sides.push(this.draggedTile.name);
                    }
                } else if (this.draggedTile.type === 'special') {
                    dayData.specialEvent = this.draggedTile.name;
                }

                State.setDay(State.currentMonth, State.currentYear, date, dayData);
                Calendar.renderCalendar();
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
    },

    setupDragEvents() {
        document.querySelectorAll('.tile-grid').forEach(grid => {
            grid.addEventListener('dragover', (e) => this.handleGridDragOver(e));
            grid.addEventListener('drop', (e) => this.handleGridDrop(e));
        });
    },

    handleGridDragOver(e) {
        e.preventDefault();
        const grid = e.currentTarget;
        const afterElement = this.getDragAfterElement(grid, e.clientY, e.clientX);
        const draggable = document.querySelector('.tile.dragging');
        
        if (draggable && grid.contains(draggable)) {
            if (afterElement) {
                grid.insertBefore(draggable, afterElement);
            } else {
                grid.appendChild(draggable);
            }
        }
    },

    handleGridDrop(e) {
        e.preventDefault();
        const grid = e.currentTarget;
        const draggedEl = document.querySelector('.tile.dragging');
        
        if (!draggedEl || !grid.contains(draggedEl)) return;

        const newOrder = Array.from(grid.children).map(child => {
            const id = child.dataset.tileId;
            const type = child.dataset.tileType;
            const name = child.textContent;
            return { id, type, name };
        });

        const type = grid.id === 'entreeGrid' ? 'entree' : 'side';
        State.reorderTiles(type, newOrder);
    },

    getDragAfterElement(container, y, x) {
        const draggableElements = [...container.querySelectorAll('.tile:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offsetX = x - box.left - box.width / 2;
            const offsetY = y - box.top - box.height / 2;
            const offset = Math.abs(offsetX) + Math.abs(offsetY);
            
            if (offset < closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.POSITIVE_INFINITY }).element;
    },

    updateGridDensity() {
        const entreePanel = document.getElementById('entreePanel');
        const sidePanel = document.getElementById('sidePanel');
        const specialPanel = document.getElementById('specialPanel');
        
        const entreeGrid = document.getElementById('entreeGrid');
        const sideGrid = document.getElementById('sideGrid');
        const specialGrid = document.getElementById('specialGrid');

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
                this.addTile(type);
            });
        });
    },

    addTile(type) {
        const name = prompt(`Enter new ${type} name:`);
        if (!name || !name.trim()) return;

        const newTile = {
            id: `${type}-${Date.now()}`,
            name: name.trim(),
            type: type
        };

        if (type === 'entree') {
            State.entreeTiles.push(newTile);
            State.saveEntreeTiles();
            this.renderGrid('entreeGrid', State.entreeTiles);
        } else if (type === 'side') {
            State.sideTiles.push(newTile);
            State.saveSideTiles();
            this.renderGrid('sideGrid', State.sideTiles);
        } else if (type === 'special') {
            State.specialEventTiles.push(newTile);
            State.saveSpecialEventTiles();
            this.renderGrid('specialGrid', State.specialEventTiles);
        }
    },

    removeTile(tileId, type) {
        if (!confirm(`Remove this ${type}?`)) return;

        if (type === 'entree') {
            State.entreeTiles = State.entreeTiles.filter(t => t.id !== tileId);
            State.saveEntreeTiles();
            this.renderGrid('entreeGrid', State.entreeTiles);
        } else if (type === 'side') {
            State.sideTiles = State.sideTiles.filter(t => t.id !== tileId);
            State.saveSideTiles();
            this.renderGrid('sideGrid', State.sideTiles);
        } else if (type === 'special') {
            State.specialEventTiles = State.specialEventTiles.filter(t => t.id !== tileId);
            State.saveSpecialEventTiles();
            this.renderGrid('specialGrid', State.specialEventTiles);
        }
    }
};
