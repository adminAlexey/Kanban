"""Бот телеграм"""

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
import os
import requests
import traceback

_bot_instance = None


def get_bot():
    global _bot_instance
    if _bot_instance is None:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN не установлен")

        _bot_instance = Application.builder().token(bot_token).build()

        _bot_instance.add_handler(CommandHandler("start", start))

    return _bot_instance


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик /start с логином из ссылки"""
    user = update.effective_user
    args = context.args  # Это то, что после /start в ссылке
    
    print(f"🔄 /start вызван пользователем: {user.full_name} (@{user.username or 'no_username'})")
    print('user:\n', user, '\n\nid:\n', user.id)

    response = requests.post(
        "http://localhost:5000/api/bind-telegram",
        json={
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name
            },
            "args": args,
        }
    )
    print(response)

def send_message(chat_id, text):
    method = "sendMessage"
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("❌ TELEGRAM_BOT_TOKEN не установлен")
        return False

    url = f"https://api.telegram.org/bot{token}/{method}"
    data = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    
    try:
        response = requests.post(url, data=data)
        result = response.json()
        
        if response.status_code == 200 and result.get("ok"):
            print("✅ Сообщение отправлено")
            return True
        else:
            print(f"❌ Ошибка Telegram API: {result.get('description')}")
            return False
    except Exception as e:
        print(f"❌ Ошибка сети/запроса: {e}")
        return False
    
def run_bot():
    """Запускает бота в отдельном потоке с event loop"""
    import asyncio
    try:
        bot = get_bot()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        print("🚀 Telegram-бот запущен. Ожидаем сообщения...")
        loop.run_until_complete(bot.run_polling(drop_pending_updates=True))
    except Exception as e:
        print(f"❌ Ошибка при запуске бота: {e}")
