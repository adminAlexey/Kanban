""""""

from .base import db
from .user import User
from .board import Board
from .column import Column
from .task import Task

def init_db(app):
    """"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
