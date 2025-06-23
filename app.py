from flask import Flask, render_template, request, jsonify #, send_from_directory
# from flask_sqlalchemy import SQLAlchemy
from config import config_by_name
import models
from datetime import datetime

app = Flask(__name__)
app.config.from_object(config_by_name['dev'])
app.secret_key = app.config.get('SECRET_KEY', 'fallback-secret-key')

models.base.db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')
    # return send_from_directory(os.path.dirname(__file__), 'templates/index.html')

@app.route('/login', methods=['POST'])
def login():
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

        board_id = models.Board.query.filter_by(name='Kanban доска', owner_id=owner_id).all()[-1].id

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
        except Exception as e:
            models.base.db.session.rollback()
            return jsonify({'success': False, 'message': 'Ошибка при регистрации пользователя'}), 500

    return jsonify({
        'success': True,
        'message': 'Успешный вход',
        'username': username
    })

@app.route('/load_boards', methods=['POST'])
def load_boards():
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
    print(boards_list)

    return jsonify(boards_list)

@app.route('/fill_boards', methods=['POST'])
def fill_boards():
    data = request.get_json()
    board_id = data.get('board_id')
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
                    'assignee_id': task.assignee_id,                    
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

@app.route('/add_task', methods=['POST'])
def add_task():
    data = request.get_json()
    print('data', data)
    owner = data.get('owner')
    assignee = data.get('assignee')
    title = data.get('title')
    description = data.get('description')
    due_date = datetime.strptime(data.get('due_date'), '%Y-%m-%d').date()
    priority = data.get('priority')
    project = data.get('project')
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
    except Exception as e:
        print('error', e)
        models.base.db.session.rollback()
        return jsonify({'success': False, 'message': 'Ошибка при добавлении карточки'}), 500

    return jsonify({
        'success': True,
        'message': 'Доска создана успешно',
        'title': title,
        'description': description,
        'due_date': due_date,
        'assignee': assignee,
        'priority': priority
    })

@app.route('/add_board', methods=['POST'])
def add_board():
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
    except Exception as e:
        print('ошибка сохранения БД', e)
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

if __name__ == '__main__':
    with app.app_context():
        models.base.db.create_all()
    app.run(debug=app.config.get('DEBUG', False))