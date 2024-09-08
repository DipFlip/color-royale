const socket = io();
let playerColor;
let playerName;
let lastMoveTime = 0;

const grid = document.getElementById('grid');
const message = document.getElementById('message');
const playerSetup = document.getElementById('player-setup');
const gameArea = document.getElementById('game-area');
const startGameButton = document.getElementById('start-game');
const playerNameInput = document.getElementById('player-name');
const playerColorInput = document.getElementById('player-color');
const playerList = document.getElementById('player-list');

startGameButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    playerColor = playerColorInput.value;
    
    if (playerName && playerColor) {
        socket.emit('player_setup', { name: playerName, color: playerColor });
        playerSetup.style.display = 'none';
        gameArea.style.display = 'flex';
    } else {
        message.textContent = 'Please enter your name and choose a color.';
    }
});

function createGrid() {
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 25; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', handleCellClick);
            grid.appendChild(cell);
        }
    }
}

function handleCellClick(event) {
    const currentTime = Date.now();
    if (currentTime - lastMoveTime < 1000) {
        message.textContent = 'Please wait 1 second between moves';
        return;
    }

    const cell = event.target;
    const col = parseInt(cell.dataset.col);

    socket.emit('place_marker', { col });
    lastMoveTime = currentTime;
}

function updateGrid(gridData, row, col, color) {
    if (row !== undefined && col !== undefined && color !== undefined) {
        // Animate the dropping of the marker
        let currentRow = 0;
        const dropInterval = setInterval(() => {
            if (currentRow > 0) {
                const prevCell = document.querySelector(`.cell[data-row="${currentRow-1}"][data-col="${col}"]`);
                prevCell.style.backgroundColor = 'white';
            }
            const cell = document.querySelector(`.cell[data-row="${currentRow}"][data-col="${col}"]`);
            cell.style.backgroundColor = color;
            currentRow++;
            if (currentRow > row) {
                clearInterval(dropInterval);
            }
        }, 50);
    } else {
        // Update the entire grid
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 25);
            const col = index % 25;
            cell.style.backgroundColor = gridData[row][col] || 'white';
        });
    }
}

function updatePlayerList(players) {
    playerList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player-item');
        playerElement.style.color = player.color;
        playerElement.textContent = `${player.name}: ${player.score}`;
        playerList.appendChild(playerElement);
    });
}

socket.on('game_started', (data) => {
    message.textContent = `Game started! Your color is ${playerColor}`;
    updateGrid(data.grid);
    updatePlayerList(data.players);
});

socket.on('update_grid', (data) => {
    updateGrid(data.grid, data.row, data.col, data.color);
});

socket.on('update_players', (data) => {
    updatePlayerList(data.players);
});

socket.on('winner', (data) => {
    message.textContent = `Player ${data.name} (${data.color}) wins!`;
    data.cells.forEach(([row, col]) => {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        cell.style.border = '2px solid gold';
    });
    updatePlayerList(data.players);
});

socket.on('error', (data) => {
    message.textContent = data.message;
});

createGrid();
