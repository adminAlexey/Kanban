import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///kanban.db")

class ProductionConfig(Config):
    DEBUG = False
    HOST = 'gp_dns_pkap1123_audit.gp.df.sbrf.ru'
    USER = '22170424'
    PASSWORD = ''
    PORT = 5432
    DB_NAME = 'capgp3'
    SQLALCHEMY_DATABASE_URI = f'jdbc:postgresql://{HOST}:{PORT}/{DB_NAME}'
    # f'postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DB_NAME}'

config_by_name = {
    'dev': DevelopmentConfig,
    'prod': ProductionConfig
}