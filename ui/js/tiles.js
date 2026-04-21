/**
 * Tile Library - Drag, Reorder, and Management
 */

const Tiles = {
    draggedTile: null,
    sourceGrid: null,

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
        el.draggable = true;
        el.dataset.tileId = tile.id;
        el.dataset.tileType = tile.type;

        const text = document.createElement('span');
        text.textContent = tile.name;
        el.appendChild(text);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'tile-remove';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove this tile';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeTile(tile.id, tile.type);
        });
        el.appendChild(removeBtn);

        el.addEventListener('dragstart', (e) => this.handleDragStart(e, tile));
        el.addEventListener('dragend', (e) => this.handleDragEnd(e));

        return el;
    },

    handleDragStart(e, tile) {
        this.draggedTile = tile;
        this.sourceGrid = e.target.closest('.tile-grid').id;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(tile));
    },

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.classList.remove('drag-over');
        });
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
        const entreeGrid = document.getElementById('entreeGrid');
        const sideGrid = document.getElementById('sideGrid');

        const compactEnabled = State.settings.compactGridEnabled;

        if (compactEnabled) {
            entreeGrid.dataset.columns = sidePanel.classList.contains('collapsed') ? '3' : '2';
            sideGrid.dataset.columns = entreePanel.classList.contains('collapsed') ? '3' : '2';
        } else {
            entreeGrid.dataset.columns = '2';
            sideGrid.dataset.columns = '2';
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
