from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import random
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Game state
grid = [[None for _ in range(25)] for _ in range(10)]
players = {}
last_move_time = {}
scores = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('player_setup')
def handle_player_setup(data):
    player_id = request.sid
    players[player_id] = {
        'name': data['name'],
        'color': data['color']
    }
    last_move_time[player_id] = 0
    scores[player_id] = 0
    emit('game_started', {'grid': grid, 'players': get_players_list()}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    player_id = request.sid
    if player_id in players:
        del players[player_id]
    if player_id in last_move_time:
        del last_move_time[player_id]
    if player_id in scores:
        del scores[player_id]
    emit('update_players', {'players': get_players_list()}, broadcast=True)

@socketio.on('place_marker')
def handle_place_marker(data):
    player_id = request.sid
    current_time = time.time()
    
    if player_id not in players:
        emit('error', {'message': 'Player not set up'})
        return
    
    if current_time - last_move_time[player_id] < 1:
        emit('error', {'message': 'Please wait 1 second between moves'})
        return

    col = data['col']
    row = -1
    for i in range(9, -1, -1):
        if grid[i][col] is None:
            row = i
            break

    if row != -1:
        grid[row][col] = players[player_id]['color']
        last_move_time[player_id] = current_time
        emit('update_grid', {'grid': grid, 'row': row, 'col': col, 'color': players[player_id]['color']}, broadcast=True)
        check_winner(row, col)
    else:
        emit('error', {'message': 'This column is full'})

def check_winner(row, col):
    color = grid[row][col]
    directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
    
    for dr, dc in directions:
        count = 1
        for i in range(1, 4):
            r, c = row + i * dr, col + i * dc
            if 0 <= r < 10 and 0 <= c < 25 and grid[r][c] == color:
                count += 1
            else:
                break
        for i in range(1, 4):
            r, c = row - i * dr, col - i * dc
            if 0 <= r < 10 and 0 <= c < 25 and grid[r][c] == color:
                count += 1
            else:
                break
        if count >= 4:
            winning_cells = [(row + i * dr, col + i * dc) for i in range(-3, 4) if 0 <= row + i * dr < 10 and 0 <= col + i * dc < 25 and grid[row + i * dr][col + i * dc] == color]
            winner = next(player for player, data in players.items() if data['color'] == color)
            scores[winner] += 1
            emit('winner', {'name': players[winner]['name'], 'color': color, 'cells': winning_cells, 'players': get_players_list()}, broadcast=True)
            return

def get_players_list():
    return [{'id': player_id, 'name': data['name'], 'color': data['color'], 'score': scores[player_id]} for player_id, data in players.items()]

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
