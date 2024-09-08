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

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    # Assign a unique color to the new player
    color = "#{:06x}".format(random.randint(0, 0xFFFFFF))
    players[request.sid] = color
    last_move_time[request.sid] = 0
    emit('color_assigned', {'color': color})
    emit('update_grid', {'grid': grid}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    del players[request.sid]
    del last_move_time[request.sid]

@socketio.on('place_marker')
def handle_place_marker(data):
    player = request.sid
    current_time = time.time()
    
    if current_time - last_move_time[player] < 1:
        emit('error', {'message': 'Please wait 1 second between moves'})
        return

    col = data['col']
    row = -1
    for i in range(9, -1, -1):
        if grid[i][col] is None:
            row = i
            break

    if row != -1:
        grid[row][col] = players[player]
        last_move_time[player] = current_time
        emit('update_grid', {'grid': grid, 'row': row, 'col': col, 'color': players[player]}, broadcast=True)
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
            emit('winner', {'color': color, 'cells': winning_cells}, broadcast=True)
            return

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
