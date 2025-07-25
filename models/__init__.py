"""инициализация БД"""

from .base import db
from .user import User
from .board import Board
from .column import Column
from .task import Task
from .activity_logs import Activity

def init_db(app):
    """инициализация БД"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
