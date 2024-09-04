from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, MessageHandler, Filters
import threading
import requests
import time

# Global variable to store API data
api_data = []
user_attempts = {}

# Define states
AWAITING_START = 0
AWAITING_ADDRESS = 1
AWAITING_CHOICE = 2
IDLE = 3

# Dictionary to track user states
user_states = {}

def fetch_api_data():
    global api_data
    while True:
        try:
            response = requests.get('https://api.raydium.io/v2/main/pairs')
            if response.status_code == 200:
                api_data = response.json()
            else:
                print("Failed to fetch API data")
        except requests.RequestException as e:
            print(f"Error fetching API data: {e}")

        # Wait for a specified interval (e.g., 1 hour) before fetching again
        time.sleep(3600)

# Start the background job
threading.Thread(target=fetch_api_data, daemon=True).start()

def start(update, context):
    chat_id = update.effective_chat.id
    user_states[chat_id] = AWAITING_START
    keyboard = [[InlineKeyboardButton("Click to Start", callback_data='start')]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text('Welcome! Please click the button below.', reply_markup=reply_markup)

def button(update, context):
    query = update.callback_query
    query.answer()
    chat_id = update.effective_chat.id

    # Check if the current state is AWAITING_START before asking for address
    if user_states.get(chat_id) == AWAITING_START:
        user_states[chat_id] = AWAITING_ADDRESS
        context.bot.send_message(chat_id=chat_id, text="Please type your address:")




def address_received(update, context):
    chat_id = update.effective_chat.id

    # Check if we are expecting an address from this user
    if user_states.get(chat_id) != AWAITING_ADDRESS:
        return  # Ignore if we are not awaiting an address

    address = update.message.text
    now = time.time()

    # Initialize user_attempts for new users
    if chat_id not in user_attempts:
        user_attempts[chat_id] = {'count': 0, 'timeout': 0}

    # Check if the user is still in timeout
    if now < user_attempts[chat_id]['timeout']:
        context.bot.send_message(chat_id=chat_id, text="Please wait before trying again.")
        return

    # Check if the address is in the fetched API data
    market_available = any(
        (item['baseMint'] == address or item['quoteMint'] == address) and
        (item['baseMint'] == "So11111111111111111111111111111111111111112" or
         item['quoteMint'] == "So11111111111111111111111111111111111111112")
        for item in api_data
    )

    if market_available:
        user_states[chat_id] = AWAITING_CHOICE
        keyboard = [
            [InlineKeyboardButton("1", callback_data='1'),
             InlineKeyboardButton("2", callback_data='2')],
            [InlineKeyboardButton("3", callback_data='3'),
             InlineKeyboardButton("4", callback_data='4')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        context.bot.send_message(chat_id=chat_id, text="Please choose an option:", reply_markup=reply_markup)
    else:
        # Increment attempt count
        user_attempts[chat_id]['count'] += 1

        # Check if attempt limit is reached
        if user_attempts[chat_id]['count'] >= 3:
            # Set a timeout (e.g., 5 minutes)
            user_attempts[chat_id]['timeout'] = now + 300
            context.bot.send_message(chat_id=chat_id, text="Maximum attempts reached. Please wait 5 minutes before trying again.")
        else:
            # Ask for a new address
            context.bot.send_message(chat_id=chat_id, text="No market available. Please enter a different address:")

def handle_choice(update, context):
    query = update.callback_query
    query.answer()
    button_data = query.data
    chat_id = update.effective_chat.id

    # Check if we are expecting a choice from this user
    if user_states.get(chat_id) != AWAITING_CHOICE:
        return  # Ignore if we are not awaiting a choice

    # Here you can handle each choice (1, 2, 3, 4) as needed
    # For example, send different messages based on the choice
    response_message = f"You clicked button {button_data}."
    context.bot.send_message(chat_id=chat_id, text=response_message)

    user_states[chat_id] = IDLE  # Reset state to idle or any other state as needed

def status(update, context):
    update.message.reply_text("Your current status is...")

def main():
    updater = Updater("6346001580:AAFisZdc9jej-gGGMGkhKEXnk5UL0KBHeJk", use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CallbackQueryHandler(button, pattern='^start$')) 
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, address_received))
    dp.add_handler(CommandHandler("status", status))
    dp.add_handler(CallbackQueryHandler(handle_choice, pattern='^[1-4]$'))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()




