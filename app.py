from flask import Flask, jsonify, request, send_from_directory
import sqlite3
import os

app = Flask(__name__)

# Подключение к SQLite
DATABASE = 'tasks.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Для получения результатов в виде словарей
    return conn

# Инициализация базы данных
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            due_date TEXT,
            assignee TEXT,
            priority TEXT
        );
    ''')
    conn.commit()
    cur.close()
    conn.close()

@app.route('/')
def index():
    return send_from_directory(os.path.dirname(__file__), 'templates/index.html')

# Маршрут для получения всех задач
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT * FROM tasks ORDER BY status')
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Преобразуем данные в JSON
        tasks = [
            {
                'id': row['id'],
                'title': row['title'],
                'description': row['description'],
                'status': row['status'],
                'due_date': row['due_date'],
                'assignee': row['assignee'],
                'priority': row['priority']
            }
            for row in rows
        ]
        return jsonify(tasks)
    except Exception as e:
        print('Error fetching tasks:', str(e))
        return jsonify({'error': str(e)}), 500

# Маршрут для создания новой задачи
@app.route('/api/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        print('Received data:', data)

        title = data.get('title')
        description = data.get('description', '')
        status = data.get('status')
        due_date = data.get('due_date')
        assignee = data.get('assignee')
        priority = data.get('priority')

        if not title or not status or not due_date or not assignee or not priority:
            return jsonify({'error': 'Missing required fields'}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO tasks (title, description, status, due_date, assignee, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (title, description, status, due_date, assignee, priority))
        conn.commit()
        task_id = cur.lastrowid
        cur.close()
        conn.close()

        print('Task created successfully, ID:', task_id)
        return jsonify({
            'message': 'Task created successfully',
            'id': task_id,
            'title': title,
            'description': description,
            'status': status,
            'due_date': due_date,
            'assignee': assignee,
            'priority': priority
        })
    except Exception as e:
        print('Error creating task:', str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        data = request.get_json()
        title = data.get('title')
        description = data.get('description')
        status = data.get('status')

        conn = get_db_connection()
        cur = conn.cursor()

        if title is not None:
            cur.execute('UPDATE tasks SET title = ? WHERE id = ?', (title, task_id))
        if description is not None:
            cur.execute('UPDATE tasks SET description = ? WHERE id = ?', (description, task_id))
        if status is not None:
            cur.execute('UPDATE tasks SET status = ? WHERE id = ?', (status, task_id))

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'message': 'Task updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db() # Инициализация базы данных при запуске
    app.run(debug=True)