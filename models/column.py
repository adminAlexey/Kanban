"""Работа  с колонками доски в БД"""

from .base import db

class Column(db.Model):
    """Модель колонки"""
    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey('board.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, nullable=False)

    tasks = db.relationship('Task', back_populates='column', lazy=True, cascade='all, delete-orphan')
