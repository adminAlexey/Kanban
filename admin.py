"""
Админ-панель для Kanban
Запуск: python admin.py
"""

from datetime import datetime
from flask import Flask

from models.base import db

from models.user import User
from models.board import Board
from models.column import Column
from models.task import Task
from models.activity_logs import Activity


def create_app():
    """Создаём минимальное Flask-приложение для работы с БД"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///D:/Work/GitHub/Kanban/instance/kanban.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


app = create_app()


def show_help():
    print("""
    === 🔧 Админ-панель Kanban ===
    Доступные команды:
      help                    — показать это сообщение
      exit                    — выйти

      # Пользователи
      list_users              — показать всех пользователей
      update_tg <login> <id>  — обновить telegram_id
      delete_user <login>     — удалить пользователя (и всё, что ему принадлежит)

      # Доски
      list_boards             — показать все доски
      delete_board <id>       — удалить доску по ID

      # Задачи
      list_tasks              — показать все задачи
      delete_task <id>        — удалить задачу по ID

      # Логи
      list_logs               — показать последние 20 логов
      clear_logs              — очистить старые логи (старше 1 года)
    """)


def list_users():
    with app.app_context():
        users = User.query.all()
        if not users:
            print("📭 Нет пользователей")
            return
        print("\n📋 Пользователи:")
        print(f"{'ID':<3} {'Login':<20} {'Telegram ID':<15}")
        print("-" * 50)
        for u in users:
            tg = u.telegram_id or "—"
            print(f"{u.id:<3} {u.login:<20} {tg:<15}")


def update_telegram_id(login, tg_id):
    with app.app_context():
        user = User.query.filter_by(login=login).first()
        if not user:
            print(f"❌ Пользователь с логином '{login}' не найден.")
            return

        old_tg = user.telegram_id
        user.telegram_id = tg_id
        db.session.commit()
        print(f"✅ telegram_id обновлён: {old_tg} → {tg_id}")


def delete_user(login):
    with app.app_context():
        user = User.query.filter_by(login=login).first()
        if not user:
            print(f"❌ Пользователь с логином '{login}' не найден.")
            return

        db.session.delete(user)
        db.session.commit()
        print(f"✅ Пользователь '{login}' и все его данные удалены.")


def list_boards():
    with app.app_context():
        boards = Board.query.all()
        if not boards:
            print("📭 Нет досок")
            return
        print("\n📌 Доски:")
        print(f"{'ID':<3} {'Название':<30} {'Владелец':<20}")
        print("-" * 60)
        for b in boards:
            owner = User.query.get(b.owner_id)
            owner_name = owner.login if owner else "??"
            print(f"{b.id:<3} {b.name:<30} {owner_name:<20}")


def delete_board(board_id):
    with app.app_context():
        try:
            board_id = int(board_id)
        except ValueError:
            print("❌ ID доски должно быть числом.")
            return

        board = Board.query.get(board_id)
        if not board:
            print(f"❌ Доска с ID={board_id} не найдена.")
            return

        db.session.delete(board)
        db.session.commit()
        print(f"✅ Доска '{board.name}' удалена.")


def list_tasks():
    with app.app_context():
        tasks = Task.query.all()
        if not tasks:
            print("📭 Нет задач")
            return
        print("\n📝 Задачи:")
        print(f"{'ID':<3} {'Title':<30} {'Owner':<15} {'Assignee':<15} {'Column':<3}")
        print("-" * 80)
        for t in tasks:
            owner = User.query.get(t.owner_id)
            assignee = User.query.get(t.assignee_id) if t.assignee_id else None
            print(f"{t.id:<3} {t.title[:30]:<30} "
                  f"{(owner.login if owner else '??'):<15} "
                  f"{(assignee.login if assignee else '—'):<15} "
                  f"{t.column_id:<3}")


def delete_task(task_id):
    with app.app_context():
        try:
            task_id = int(task_id)
        except ValueError:
            print("❌ ID задачи должно быть числом.")
            return

        task = Task.query.get(task_id)
        if not task:
            print(f"❌ Задача с ID={task_id} не найдена.")
            return

        db.session.delete(task)
        db.session.commit()
        print(f"✅ Задача '{task.title}' удалена.")


def list_logs():
    with app.app_context():
        logs = Activity.query.order_by(Activity.timestamp.desc()).limit(20).all()
        if not logs:
            print("📭 Нет логов")
            return
        print("\n📅 Последние 20 логов:")
        print(f"{'ID':<3} {'User':<15} {'Action':<15} {'Target':<8} {'Time':<20}")
        print("-" * 80)
        for log in logs:
            user = User.query.get(log.user_id)
            username = user.login if user else "??"
            print(f"{log.id:<3} {username:<15} {log.action:<15} "
                  f"{log.target_type}:{log.target_id:<3} {log.timestamp.strftime('%Y-%m-%d %H:%M'):<20}")


def clear_logs():
    with app.app_context():
        cutoff = datetime.now().replace(year=datetime.now().year - 1)
        count = Activity.query.filter(Activity.timestamp < cutoff).delete()
        db.session.commit()
        print(f"✅ Очищено {count} старых логов (старше 1 года).")


if __name__ == "__main__":
    print("👋 Добро пожаловать в админ-панель Kanban!")
    show_help()

    while True:
        try:
            command = input("\n> ").strip()
            if not command:
                continue

            parts = command.split()
            cmd = parts[0].lower()

            if cmd == "exit":
                print("👋 Пока!")
                break
            elif cmd == "help":
                show_help()
            elif cmd == "list_users":
                list_users()
            elif cmd == "update_tg" and len(parts) == 3:
                update_telegram_id(parts[1], parts[2])
            elif cmd == "delete_user" and len(parts) == 2:
                delete_user(parts[1])
            elif cmd == "list_boards":
                list_boards()
            elif cmd == "delete_board" and len(parts) == 2:
                delete_board(parts[1])
            elif cmd == "list_tasks":
                list_tasks()
            elif cmd == "delete_task" and len(parts) == 2:
                delete_task(parts[1])
            elif cmd == "list_logs":
                list_logs()
            elif cmd == "clear_logs":
                clear_logs()
            else:
                print("❌ Неизвестная команда. Введи 'help'")
        except KeyboardInterrupt:
            print("\n👋 Прощай!")
            break
        except Exception as e:
            print(f"⚠️ Ошибка: {e}")