from .base import db
from .user import User
from .column import Column

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    column_id = db.Column(db.Integer, db.ForeignKey('column.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.Date)
    priority = db.Column(db.Integer)  # 1 - low, 2 - medium, 3 - high

    column = db.relationship('Column', backref='tasks')
    owner = db.relationship('User', foreign_keys=[owner_id])
    assignee = db.relationship('User', foreign_keys=[assignee_id])

    def to_dict(self):
        """Преобразование данных в словарь"""
        return {
            'id': self.id,
            'column_id': self.column_id,
            'owner_id': self.owner_id,
            'assignee_id': self.assignee_id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date,
            'priority': self.priority
        }