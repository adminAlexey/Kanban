"""Работа с пользователями в БД"""

from .base import db

class User(db.Model):
    """Модель пользователя"""
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(80), unique=True, nullable=False)
    telegram_id = db.Column(db.String(50), unique=True, nullable=True)
