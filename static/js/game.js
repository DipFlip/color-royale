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
const resetButton = document.getElementById('reset-game');
const readyIndicator = document.getElementById('ready-indicator');

function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Set a random initial color when the page loads
playerColorInput.value = getRandomColor();

startGameButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    playerColor = playerColorInput.value;
    
    if (playerName) {
        socket.emit('player_setup', { name: playerName, color: playerColor });
        playerSetup.style.display = 'none';
        gameArea.style.display = 'flex';
    } else {
        message.textContent = 'Please enter your name.';
    }
});

resetButton.addEventListener('click', () => {
    socket.emit('reset_game');
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
        readyIndicator.style.backgroundColor = 'red';
        setTimeout(() => {
            readyIndicator.style.backgroundColor = 'green';
        }, 1000);
        return;
    }

    const cell = event.target;
    const col = parseInt(cell.dataset.col);

    socket.emit('place_marker', { col });
    lastMoveTime = currentTime;
    readyIndicator.style.backgroundColor = 'red';
    setTimeout(() => {
        readyIndicator.style.backgroundColor = 'green';
    }, 1000);
}

function updateGrid(gridData, row, col, color, starPositions) {
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
                if (starPositions) {
                    drawStars(starPositions);
                }
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
        if (starPositions) {
            drawStars(starPositions);
        }
    }
}

function updatePlayerList(players) {
    playerList.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player-item');
        playerElement.style.color = player.color;
        playerElement.textContent = `${player.name}: ${player.score}`;
        playerElement.dataset.playerId = player.id;
        playerList.appendChild(playerElement);
    });
}

function drawStars(starPositions) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell) => {
        cell.innerHTML = '';
    });
    if (starPositions && Array.isArray(starPositions)) {
        starPositions.forEach(([row, col]) => {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                const star = document.createElement('div');
                star.classList.add('star');
                cell.appendChild(star);
            }
        });
    }
}

socket.on('game_started', (data) => {
    message.textContent = `Game started! Your color is ${playerColor}`;
    updateGrid(data.grid);
    updatePlayerList(data.players);
    drawStars(data.star_positions);
});

socket.on('update_grid', (data) => {
    updateGrid(data.grid, data.row, data.col, data.color, data.star_positions);
    updatePlayerScore(data.player_id, data.new_score, data.points);
});

socket.on('update_players', (data) => {
    updatePlayerList(data.players);
});

function updatePlayerScore(playerId, newScore, points) {
    const playerElement = document.querySelector(`.player-item[data-player-id="${playerId}"]`);
    if (playerElement) {
        const playerName = playerElement.textContent.split(':')[0];
        playerElement.textContent = `${playerName}: ${newScore}`;
        
        if (points > 0) {
            const popUp = document.createElement('div');
            popUp.textContent = `+${points}`;
            popUp.classList.add('score-popup');
            playerElement.appendChild(popUp);
            setTimeout(() => {
                popUp.remove();
            }, 1000);
        }
    }
}

socket.on('score_update', (data) => {
    updatePlayerScore(data.player_id, data.new_score, 1);
    
    data.winning_cells.forEach(([row, col]) => {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        cell.style.border = '2px solid gold';
    });
});

socket.on('game_reset', (data) => {
    message.textContent = 'Game has been reset!';
    updateGrid(data.grid);
    updatePlayerList(data.players);
    drawStars(data.star_positions);
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '1px solid #ccc';
    });
});

socket.on('clear_highlights', () => {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '1px solid #ccc';
    });
});

socket.on('error', (data) => {
    message.textContent = data.message;
});

createGrid();
