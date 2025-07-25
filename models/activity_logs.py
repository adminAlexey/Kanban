"""Логирование активностей в БД"""

from datetime import datetime

from .base import db

class Activity(db.Model):
    """Модель лога активности"""

    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # например: 'task_created', 'task_moved', 'board_deleted'
    target_type = db.Column(db.String(50), nullable=False)  # 'task', 'board', 'column', 'user'
    target_id = db.Column(db.Integer, nullable=True)  # id объекта (если применимо)
    details = db.Column(db.JSON, nullable=True)  # любые данные: старое/новое значение, причина и т.д.
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)

    user = db.relationship('User', backref='activities')

    def to_dict(self):
        """Преобразование в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.login,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'timestamp': self.timestamp.isoformat()
        }
