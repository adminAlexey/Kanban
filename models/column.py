from .base import db
from .board import Board

class Column(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('board.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    board = db.relationship('Board', backref='columns')