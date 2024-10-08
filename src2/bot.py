#!/usr/bin/env python
# pylint: disable=unused-argument


import logging

from telegram import ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
# set higher logging level for httpx to avoid all GET and POST requests being logged
logging.getLogger("httpx").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

GET_WALLET, SPEED, STOP = range(3)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    await update.message.reply_text(
        "Hi! My name is bodgaBot. What is you wallet?"
    )

    return GET_WALLET


async def get_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user = update.message.from_user
    logger.info("name : %s", user.first_name)
    reply_keyboard = [["fast", "slow", "cancel"]]

    await update.message.reply_text(
        "fast or slow.",
           reply_markup=ReplyKeyboardMarkup(
            reply_keyboard, one_time_keyboard=True, input_field_placeholder="fast or slow?"
            ),
        )

    return SPEED


##async def photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
##    """Stores the photo and asks for a location."""
##    user = update.message.from_user
##    photo_file = await update.message.photo[-1].get_file()
##    await photo_file.download_to_drive("user_photo.jpg")
##    logger.info("Photo of %s: %s", user.first_name, "user_photo.jpg")
##    await update.message.reply_text(
##        "Gorgeous! Now, send me your location please, or send /skip if you don't want to."
##    )
##
##    return LOCATION
##
##
##async def skip_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
##    """Skips the photo and asks for a location."""
##    user = update.message.from_user
##    logger.info("User %s did not send a photo.", user.first_name)
##    await update.message.reply_text(
##        "I bet you look great! Now, send me your location please, or send /skip."
##    )
##
##    return LOCATION
##
##
##async def location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
##    """Stores the location and asks for some info about the user."""
##    user = update.message.from_user
##    user_location = update.message.location
##    logger.info(
##        "Location of %s: %f / %f", user.first_name, user_location.latitude, user_location.longitude
##    )
##    await update.message.reply_text(
##        "Maybe I can visit you sometime! At last, tell me something about yourself."
##    )
##
##    return BIO
##
##
##async def skip_location(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
##    """Skips the location and asks for info about the user."""
##    user = update.message.from_user
##    logger.info("User %s did not send a location.", user.first_name)
##    await update.message.reply_text(
##        "You seem a bit paranoid! At last, tell me something about yourself."
##    )
##
##    return BIO
##
##
##async def bio(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
##    """Stores the info about the user and ends the conversation."""
##    user = update.message.from_user
##    logger.info("Bio of %s: %s", user.first_name, update.message.text)
##    await update.message.reply_text("Thank you! I hope we can talk again some day.")
##
##    return ConversationHandler.END
##

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels and ends the conversation."""
    user = update.message.from_user
    logger.info("User %s canceled the conversation.", user.first_name)
    await update.message.reply_text(
        "Bye! I hope we can talk again some day.", reply_markup=ReplyKeyboardRemove()
    )

    return ConversationHandler.END


def main() -> None:
    application = Application.builder().token("7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM").build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            GET_WALLET: [MessageHandler(filters.TEXT, get_wallet)],

##            PHOTO: [MessageHandler(filters.PHOTO, photo), CommandHandler("skip", skip_photo)],
##            LOCATION: [
##                MessageHandler(filters.LOCATION, location),
##                CommandHandler("skip", skip_location),
##            ],
##            BIO: [MessageHandler(filters.TEXT & ~filters.COMMAND, bio)],

        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)

    # Run the bot until the user presses Ctrl-C
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
