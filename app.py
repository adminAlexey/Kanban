"""Module providing a function printing python version."""

from datetime import datetime
from flask import Flask, request, jsonify, render_template
from sqlalchemy.exc import SQLAlchemyError

from deploy.config import config_by_name
import models

app = Flask(__name__)
app.config.from_object(config_by_name['dev'])
app.secret_key = app.config.get('SECRET_KEY', 'fallback-secret-key')

models.base.db.init_app(app)

@app.route('/')
def index():
    """Функция запуска интерфейса"""
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Функция авторизации пользователя"""
    data = request.get_json()
    username = data.get('username')
    # password = data.get('password')

    if not username:
        return jsonify({'success': False, 'message': 'Логин обязателен'}), 400

    # Ищем пользователя в БД
    user = models.User.query.filter_by(login=username).first()

    if not user:
        # Создаем нового пользователя, если его нет
        user = models.User(login=username)
        models.base.db.session.add(user)

        owner_id = models.User.query.filter_by(login=username).first().id
        board = models.Board(name='Kanban доска',
                                owner_id=owner_id)
        models.base.db.session.add(board)
        models.base.db.session.flush()
        board_id = board.id

        backlog_column = models.Column(board_id=board_id, title='BackLog', position=0)
        to_do_column = models.Column(board_id=board_id, title='To Do', position=1)
        in_progress_column = models.Column(board_id=board_id, title='In Progress', position=2)
        done_column = models.Column(board_id=board_id, title='Done', position=3)
        models.base.db.session.add(backlog_column)
        models.base.db.session.add(to_do_column)
        models.base.db.session.add(in_progress_column)
        models.base.db.session.add(done_column)

        try:
            models.base.db.session.commit()
        except SQLAlchemyError:
            models.base.db.session.rollback()
            return jsonify({'success': False, 'message': 'Ошибка регистрации пользователя'}), 500

    return jsonify({
        'success': True,
        'message': 'Успешный вход',
        'username': username
    })

@app.route('/api/boards', methods=['POST'])
def load_boards():
    """"Функция загрузки досок пользователя"""
    data = request.get_json()
    username = data.get('username')
    user_id = models.User.query.filter_by(login=username).first().id
    boards = models.Board.query.filter_by(owner_id=user_id).all()

    boards_list = [
        {
            'id': board.id,
            'name': board.name,
            'owner_id': board.owner_id
        }
        for board in boards
    ]

    return jsonify(boards_list)

@app.route('/api/board/<int:board_id>', methods=['GET'])
def fill_boards(board_id):
    """Функция заполнения доски"""
    board_info = [
        {
            'id': column.id,
            'board_id': column.board_id,
            'title': column.title,
            'position': column.position,
            'tasks': [
                {
                    'id': task.id,
                    'column_id': task.column_id,
                    'owner_id': task.owner_id,
                    # 'assignee_id': task.assignee_id,
                    'assignee': task.assignee.login,
                    'title': task.title,
                    'description': task.description,
                    'due_date': task.due_date.strftime('%Y-%m-%d'),
                    'priority': task.priority
                }
                for task in models.Task.query.filter_by(column_id=column.id).all()
            ]
        }
        for column in models.Column.query.filter_by(board_id=board_id).all()
    ]
    return jsonify(board_info)

@app.route('/api/task', methods=['POST'])
def add_task():
    """Функция добавления карточки"""
    data = request.get_json()
    owner = data.get('owner')
    assignee = data.get('assignee')
    title = data.get('title')
    description = data.get('description')
    due_date = datetime.strptime(data.get('due_date'), '%Y-%m-%d').date()
    priority = data.get('priority')
    project_id = int(data.get('project_id'))
    project = models.Board.query.filter_by(id=project_id).first().name
    board_id = models.Board.query.filter_by(name=project).first().id
    column_id = models.Column.query.filter_by(board_id=board_id, title='BackLog').first().id
    owner_id = models.User.query.filter_by(login=owner).first().id
    assignee_id = models.User.query.filter_by(login=assignee).first().id

    task = models.Task(
        column_id=column_id,
        owner_id=owner_id,
        assignee_id=assignee_id,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
    )

    models.base.db.session.add(task)
    try:
        models.base.db.session.commit()
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return jsonify({'success': False, 'message': 'Ошибка при добавлении карточки'}), 500

    return jsonify({
        'success': True,
        'message': 'Доска создана успешно',
        'id': task.id,
        'title': title,
        'description': description,
        'due_date': due_date,
        'assignee': assignee,
        'priority': priority
    })

@app.route('/api/board/<int:board_id>', methods=['DELETE'])
def delete_board(board_id):
    """Функция удаления доски"""
    board = models.Board.query.filter_by(id=board_id).first()
    models.base.db.session.delete(board)
    models.base.db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Доска удалена успешно'
    })

@app.route('/api/board/', methods=['POST'])
def add_board():
    """Функция добавления доски"""
    data = request.get_json()
    board_name = data.get('board_name')
    owner = data.get('owner')
    owner_id = models.User.query.filter_by(login=owner).first().id

    board = models.Board(name=board_name,
                         owner_id=owner_id)
    models.base.db.session.add(board)

    board_id = models.Board.query.filter_by(name=board_name, owner_id=owner_id).all()[-1].id

    backlog_column = models.Column(board_id=board_id, title='BackLog', position=0)
    to_do_column = models.Column(board_id=board_id, title='To Do', position=1)
    in_progress_column = models.Column(board_id=board_id, title='In Progress', position=2)
    done_column = models.Column(board_id=board_id, title='Done', position=3)
    models.base.db.session.add(backlog_column)
    models.base.db.session.add(to_do_column)
    models.base.db.session.add(in_progress_column)
    models.base.db.session.add(done_column)

    try:
        models.base.db.session.commit()
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return jsonify({'success': False, 'message': 'Ошибка при добавлении доски'}), 500

    return jsonify({
        'success': True,
        'message': 'Доска создана успешно',
        'board':{
            'id': board.id,
            'name': board.name,
            'owner_id': board.owner_id
        }
    })

@app.route('/api/task/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Функция обновления карточки"""
    data = request.get_json()
    task_id = data['id']
    task = models.Task.query.filter_by(id=task_id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    task.title = data['title'] if data['title'] is not None else task.title
    task.description = data['description'] if data['description'] is not None else task.description
    task.due_date = data['due_date'] if data['due_date'] is not None else task.due_date
    task.assignee_id = models.User.query.filter_by(login=data['assignee']).first().id if data['assignee'] is not None else task.assignee_id
    task.priority = data['priority'] if data['priority'] is not None else task.priority
    task.column_id = data['column_id'] if data['column_id'] is not None else task.column_id

    models.base.db.session.commit()

    return jsonify({'success': True, 'task': task.to_dict()})

# TODO: Добавить функционал для добавления и удаления
# пользователей принадлежащих доске
@app.route('/api/users/<int:board_id>', methods=['GET'])
def get_users(board_id):
    """Функция получения пользователей доски"""
    # board = models.Board.query.filter_by(id=board_id).first()
    users = models.User.query.all()
    users_data = [
        {
            'id': user.id,
            'username': user.login
        }
        for user in users
    ]
    
    return jsonify({
        'board_id': board_id,
        'users': users_data
    })

if __name__ == '__main__':
    with app.app_context():
        models.base.db.create_all()
    app.run(debug=app.config.get('DEBUG', False))
