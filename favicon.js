// Animated Game of Life Favicon
(function() {
    const size = 32;
    const cellSize = 4;
    const gridSize = size / cellSize;
    
    // Create canvas for favicon
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Create link element for favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    
    // Initialize grid with random cells
    let grid = [];
    function initGrid() {
        grid = [];
        for (let y = 0; y < gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                grid[y][x] = Math.random() > 0.6 ? 1 : 0;
            }
        }
    }
    
    // Count neighbors for a cell
    function countNeighbors(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + gridSize) % gridSize;
                const ny = (y + dy + gridSize) % gridSize;
                count += grid[ny][nx];
            }
        }
        return count;
    }
    
    // Update grid according to Game of Life rules
    function updateGrid() {
        const newGrid = [];
        for (let y = 0; y < gridSize; y++) {
            newGrid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                const neighbors = countNeighbors(x, y);
                if (grid[y][x] === 1) {
                    // Live cell survives with 2 or 3 neighbors
                    newGrid[y][x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    // Dead cell becomes alive with exactly 3 neighbors
                    newGrid[y][x] = neighbors === 3 ? 1 : 0;
                }
            }
        }
        grid = newGrid;
    }
    
    // Check if grid is static or empty
    function isGridStale() {
        let aliveCount = 0;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                aliveCount += grid[y][x];
            }
        }
        return aliveCount < 3 || aliveCount > gridSize * gridSize * 0.8;
    }
    
    // Draw the grid to canvas
    function draw() {
        // Get theme colors
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const bgColor = isDark ? '#0a1f14' : '#f5f7f6';
        const cellColor = isDark ? '#4ade80' : '#16a34a';
        
        // Clear canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        
        // Draw cells
        ctx.fillStyle = cellColor;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x] === 1) {
                    ctx.beginPath();
                    ctx.arc(
                        x * cellSize + cellSize / 2,
                        y * cellSize + cellSize / 2,
                        cellSize / 2 - 0.5,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
        
        // Update favicon
        favicon.href = canvas.toDataURL('image/png');
    }
    
    // Animation loop
    let frameCount = 0;
    function animate() {
        frameCount++;
        
        // Update every 8 frames (~250ms at 30fps)
        if (frameCount % 8 === 0) {
            updateGrid();
            
            // Reinitialize if grid becomes stale
            if (isGridStale()) {
                initGrid();
            }
        }
        
        draw();
        requestAnimationFrame(animate);
    }
    
    // Start animation
    initGrid();
    animate();
})();
