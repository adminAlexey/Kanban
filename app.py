"""бэкенд"""

import os
import threading
from dotenv import load_dotenv
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from sqlalchemy.exc import SQLAlchemyError

from deploy.config import config_by_name
import models
from telebot import send_message

load_dotenv()

app = Flask(__name__)
app.config.from_object(config_by_name["dev"])
app.secret_key = app.config.get("SECRET_KEY", "fallback-secret-key")
app.config["TELEGRAM_BOT_TOKEN"] = os.getenv("TELEGRAM_BOT_TOKEN")

models.base.db.init_app(app)


def log_activity(user_id, action, target_type, target_id=None, details=None):
    """Логирует действие пользователя в таблицу ActivityLog"""
    log_entry = models.Activity(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    models.base.db.session.add(log_entry)


@app.route("/")
def index():
    """Функция запуска интерфейса"""
    return render_template("index.html")


@app.route("/settings")
def settings():
    """Страница настроек"""
    return render_template("settings.html")


@app.route("/notifications")
def notifications():
    """Страница уведомлений"""
    return render_template("notifications.html")


@app.route("/api/login", methods=["POST"])
def login():
    """Функция авторизации пользователя"""
    data = request.get_json()
    username = data.get("username")

    if not username:
        return jsonify({"success": False, "message": "Логин обязателен"}), 400

    # Ищем пользователя в БД
    user = models.User.query.filter_by(login=username).first()

    if not user:
        # Создаем нового пользователя, если его нет
        user = models.User(login=username)
        models.base.db.session.add(user)
        models.base.db.session.flush()  # Получаем user.id

        board = models.Board(name="Kanban доска", owner_id=user.id)
        models.base.db.session.add(board)
        models.base.db.session.flush()  # Получаем board.id

        # Создаем стандартные колонки
        backlog_column = models.Column(board_id=board.id, title="BackLog", position=0)
        to_do_column = models.Column(board_id=board.id, title="To Do", position=1)
        in_progress_column = models.Column(
            board_id=board.id, title="In Progress", position=2
        )
        done_column = models.Column(board_id=board.id, title="Done", position=3)

        models.base.db.session.add_all(
            [backlog_column, to_do_column, in_progress_column, done_column]
        )

        # 🔥 Логируем: пользователь создан и ему выдана доска
        log_activity(
            user_id=user.id,
            action="user_registered",
            target_type="user",
            details={"username": username},
        )
        log_activity(
            user_id=user.id,
            action="board_created",
            target_type="board",
            target_id=board.id,
            details={"name": board.name, "initial": True},
        )
        log_activity(
            user_id=user.id,
            action="columns_created",
            target_type="column",
            details={
                "count": 4,
                "board_id": board.id,
                "titles": ["BackLog", "To Do", "In Progress", "Done"],
            },
        )

        try:
            models.base.db.session.commit()
        except SQLAlchemyError:
            models.base.db.session.rollback()
            return (
                jsonify(
                    {"success": False, "message": "Ошибка регистрации пользователя"}
                ),
                500,
            )

    return jsonify({"success": True, "message": "Успешный вход", "username": username})


@app.route("/api/boards", methods=["POST"])
def load_boards():
    """Функция загрузки досок пользователя"""
    data = request.get_json()
    username = data.get("username")
    user = models.User.query.filter_by(login=username).first()
    if not user:
        return jsonify({"success": False, "message": "Пользователь не найден"}), 404

    boards = models.Board.query.filter_by(owner_id=user.id).all()
    boards_list = [
        {"id": board.id, "name": board.name, "owner_id": board.owner_id}
        for board in boards
    ]

    return jsonify(boards_list)


@app.route("/api/board/<int:board_id>", methods=["GET"])
def fill_boards(board_id):
    """Функция заполнения доски"""
    board_info = [
        {
            "id": column.id,
            "board_id": column.board_id,
            "title": column.title,
            "position": column.position,
            "tasks": [
                {
                    "id": task.id,
                    "column_id": task.column_id,
                    "owner_id": task.owner_id,
                    "assignee": task.assignee.login,
                    "title": task.title,
                    "description": task.description,
                    "due_date": task.due_date.strftime("%Y-%m-%d"),
                    "priority": task.priority,
                }
                for task in models.Task.query.filter_by(column_id=column.id).all()
            ],
        }
        for column in models.Column.query.filter_by(board_id=board_id).all()
    ]
    return jsonify(board_info)


@app.route("/api/column", methods=["POST"])
def add_column():
    """Функция добавления колонки"""
    data = request.get_json()
    board_id = data.get("board_id")
    title = data.get("title")
    board = models.Board.query.filter_by(id=board_id).first()
    board_columns = board.columns
    position = len(board_columns)

    column = models.Column(board_id=board_id, title=title, position=position)
    models.base.db.session.add(column)
    models.db.session.commit()

    return jsonify({"success": True, "message": "Колонка создана"})


@app.route("/api/task", methods=["POST"])
def add_task():
    """Функция добавления карточки"""
    data = request.get_json()
    owner = data.get("owner")
    assignee = data.get("assignee")
    title = data.get("title")
    description = data.get("description")
    due_date = datetime.strptime(data.get("due_date"), "%Y-%m-%d").date()
    priority = data.get("priority")
    project_id = int(data.get("project_id"))

    board = models.Board.query.filter_by(id=project_id).first()
    if not board:
        return jsonify({"success": False, "message": "Доска не найдена"}), 404

    column = models.Column.query.filter_by(board_id=board.id, title="BackLog").first()
    if not column:
        return jsonify({"success": False, "message": "Колонка BackLog не найдена"}), 404

    owner_user = models.User.query.filter_by(login=owner).first()
    assignee_user = models.User.query.filter_by(login=assignee).first()
    if not owner_user or not assignee_user:
        return jsonify({"success": False, "message": "Пользователь не найден"}), 404

    task = models.Task(
        column_id=column.id,
        owner_id=owner_user.id,
        assignee_id=assignee_user.id,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
    )

    models.base.db.session.add(task)
    models.base.db.session.flush()  # Получаем task.id

    # 🔥 Логируем создание задачи
    log_activity(
        user_id=owner_user.id,
        action="task_created",
        target_type="task",
        target_id=task.id,
        details={
            "title": title,
            "assignee": assignee,
            "priority": priority,
            "column": "BackLog",
        },
    )

    text = f"""
Новая задача прилетела:
{task.title}

{task.description}

{task.due_date}
    """
    send_message(assignee_user.telegram_id, text)

    try:
        models.base.db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Карточка добавлена",
                "id": task.id,
                "title": title,
                "description": description,
                "due_date": due_date.isoformat(),
                "assignee": assignee,
                "priority": priority,
            }
        )
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return (
            jsonify({"success": False, "message": "Ошибка при добавлении карточки"}),
            500,
        )


@app.route("/api/board/<int:board_id>", methods=["DELETE"])
def delete_board(board_id):
    """Функция удаления доски"""
    board = models.Board.query.filter_by(id=board_id).first()
    if not board:
        return jsonify({"success": False, "message": "Доска не найдена"}), 404

    user_id = board.owner_id

    # 🔥 Логируем удаление
    log_activity(
        user_id=user_id,
        action="board_deleted",
        target_type="board",
        target_id=board.id,
        details={"name": board.name},
    )

    models.base.db.session.delete(board)
    try:
        models.base.db.session.commit()
        return jsonify({"success": True, "message": "Доска удалена"})
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return jsonify({"success": False, "message": "Ошибка при удалении доски"}), 500


@app.route("/api/board/", methods=["POST"])
def add_board():
    """Функция добавления доски"""
    data = request.get_json()
    board_name = data.get("board_name")
    owner = data.get("owner")

    owner_user = models.User.query.filter_by(login=owner).first()
    if not owner_user:
        return jsonify({"success": False, "message": "Владелец не найден"}), 404

    board = models.Board(name=board_name, owner_id=owner_user.id)
    models.base.db.session.add(board)
    models.base.db.session.flush()

    # Создаём колонки
    backlog_column = models.Column(board_id=board.id, title="BackLog", position=0)
    to_do_column = models.Column(board_id=board.id, title="To Do", position=1)
    in_progress_column = models.Column(
        board_id=board.id, title="In Progress", position=2
    )
    done_column = models.Column(board_id=board.id, title="Done", position=3)

    models.base.db.session.add_all(
        [backlog_column, to_do_column, in_progress_column, done_column]
    )

    # 🔥 Логируем
    log_activity(
        user_id=owner_user.id,
        action="board_created",
        target_type="board",
        target_id=board.id,
        details={"name": board_name, "initial": False},
    )
    log_activity(
        user_id=owner_user.id,
        action="columns_created",
        target_type="column",
        details={"count": 4, "board_id": board.id},
    )

    try:
        models.base.db.session.commit()
        return jsonify(
            {
                "success": True,
                "message": "Доска создана успешно",
                "board": {
                    "id": board.id,
                    "name": board_name,
                    "owner_id": owner_user.id,
                },
            }
        )
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return (
            jsonify({"success": False, "message": "Ошибка при добавлении доски"}),
            500,
        )


@app.route("/api/task/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    """Функция обновления карточки"""
    data = request.get_json()
    task = models.Task.query.filter_by(id=task_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Сохраняем старые значения для логирования
    old_column = models.base.db.session.get(models.Column, task.column_id)
    old_assignee = task.assignee.login if task.assignee else None

    # Обновляем поля
    if data.get("title") is not None:
        task.title = data["title"]
    if data.get("description") is not None:
        task.description = data["description"]
    if data.get("due_date") is not None:
        task.due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
    if data.get("assignee") is not None:
        assignee_user = models.User.query.filter_by(login=data["assignee"]).first()
        if assignee_user:
            task.assignee_id = assignee_user.id
    if data.get("priority") is not None:
        task.priority = data["priority"]
    if data.get("column_id") is not None:
        task.column_id = data["column_id"]

    models.base.db.session.flush()

    # 🔥 Логируем изменения
    changes = {}

    if data.get("title") is not None:
        changes["title"] = data["title"]
    if data.get("description") is not None:
        changes["description"] = data["description"]
    if data.get("due_date") is not None:
        changes["due_date"] = data["due_date"]
    if data.get("assignee") is not None and old_assignee != data["assignee"]:
        changes["assignee"] = {"from": old_assignee, "to": data["assignee"]}
    if data.get("priority") is not None:
        changes["priority"] = data["priority"]
    if data.get("column_id") is not None and old_column.id != data["column_id"]:
        new_column = models.base.db.session.get(models.Column, data["column_id"])
        changes["moved"] = {
            "from": old_column.title,
            "to": new_column.title if new_column else "unknown",
        }

    log_activity(
        user_id=task.owner_id,
        action="task_updated",
        target_type="task",
        target_id=task.id,
        details=changes,
    )

    text = f"""
Изменения в задаче:
{changes}
    """
    send_message(task.owner.telegram_id, text)

    try:
        models.base.db.session.commit()
        return jsonify({"success": True, "task": task.to_dict()})
    except SQLAlchemyError:
        models.base.db.session.rollback()
        return jsonify({"error": "Failed to update task"}), 500


@app.route("/api/users/<int:board_id>", methods=["GET"])
def get_users(board_id):
    """Функция получения пользователей доски"""
    users = models.User.query.all()
    users_data = [{"id": user.id, "username": user.login} for user in users]

    return jsonify({"board_id": board_id, "users": users_data})


@app.route("/api/bind-telegram", methods=["POST"])
def bind_telegram():
    """Привязывает telegram_id к пользователю по логину"""
    data = request.get_json()
    user_data = data.get("user")
    args = data.get("args")

    if args:
        login = args[0]
        user = models.User.query.filter_by(login=login).first()

        if user.telegram_id != str(user_data["id"]):
            user.telegram_id = user_data["id"]
            send_message(user_data['id'], f"Привязан новый аккаунт телеграм по логину <code>{login}</code>")
        else:
            user.telegram_id = user_data["id"]
            text = f"""
Ты успешно привязал аккаунт:\n
<code>{login}</code>\n\n
Теперь ты будешь получать уведомления из Kanban."""
            send_message(user_data['id'], text)
    else:
        telegram_id = user_data["id"]
        print('check', models.User.query.filter_by(telegram_id=telegram_id).first())
        if models.User.query.filter_by(telegram_id=str(telegram_id)).first() is not None and models.User.query.filter_by(telegram_id=telegram_id).first().telegram_id == str(user_data['id']):
            send_message(user_data['id'], 'Телеграм уже привязан к логину доски')
        else:
            text = """
Чтобы привязать аккаунт, используй ссылку из приложения:\n
<code>https://t.me/kanban_notice_flask_bot?start=твой_логин</code>
        
или воспользуйся ссылкой привязки http://127.0.0.1:5000/notifications
            """
            send_message(telegram_id, text)
    models.base.db.session.commit()
    return jsonify({"success": True, "message": "Telegram успешно привязан"})


if __name__ == "__main__":
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        with app.app_context():
            models.base.db.create_all()
            
            # Запуск Telegram-бота
            from telebot import run_bot
            thread = threading.Thread(target=run_bot, daemon=True)
            thread.start()

    app.run(debug=app.config.get("DEBUG", True))
