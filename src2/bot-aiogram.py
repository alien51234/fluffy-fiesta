import logging

import aiogram.utils.markdown as md
from aiogram import Bot, Dispatcher, types
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters import Text
from aiogram.dispatcher.filters.state import State, StatesGroup
from aiogram.types import ParseMode
from aiogram.utils import executor

logging.basicConfig(level=logging.INFO)

API_TOKEN = '7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM'

bot = Bot(token=API_TOKEN)

# For example use simple MemoryStorage for Dispatcher.
storage = MemoryStorage()
dp = Dispatcher(bot, storage=storage)


# States
class Form(StatesGroup):
    name = State()
    wallet = State()
    speed = State()
    stop = State()

@dp.message_handler(commands='start')
async def cmd_start(message: types.Message):
    """
    Conversation's entry point
    """
    # Set state
    await Form.name.set()

    await message.reply("Hi there! What's your name?")


# You can use state '*' if you need to handle all states
@dp.message_handler(state='*', commands='cancel')
@dp.message_handler(Text(equals='cancel', ignore_case=True), state='*')
async def cancel_handler(message: types.Message, state: FSMContext):
    """
    Allow user to cancel any action
    """
    current_state = await state.get_state()
    if current_state is None:
        return

    logging.info('Cancelling state %r', current_state)
    # Cancel state and inform user about it
    await state.finish()
    # And remove keyboard (just in case)
    await message.reply('Cancelled.', reply_markup=types.ReplyKeyboardRemove())



@dp.message_handler(state=Form.name)
async def process_wallet(message: types.Message, state: FSMContext):
    """
    Process wallet
    """
    async with state.proxy() as data:
        data['name'] = message.text

    await Form.next()
    await message.reply("Give me a wallet?")



@dp.message_handler(Text(equals='slow', ignore_case=True), state=Form.speed)
async def process_gender(message: types.Message, state: FSMContext):
    print('selected slow')
    async with state.proxy() as data:
        #data['gender'] = message.text

        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, selective=True)
        markup.add("slow")
        markup.add("fast")
        markup.add("stop")
        await message.reply("DO i start?", reply_markup=markup)

@dp.message_handler(Text(equals='fast', ignore_case=True), state=Form.speed)
async def process_gender(message: types.Message, state: FSMContext):
    print('selected fast')
    async with state.proxy() as data:
        #data['gender'] = message.text

        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, selective=True)
        markup.add("slow")
        markup.add("fast")
        markup.add("stop")
        await message.reply("DO i start?", reply_markup=markup)
        
##        await bot.send_message(
##            message.chat.id,
##            md.text(
##                md.text('Hi! Nice to meet you,', md.bold(data['name'])),
##                md.text('Age:', md.code(data['age'])),
##                md.text('Gender:', data['gender']),
##                sep='\n',
##            ),
##            reply_markup=markup,
##            parse_mode=ParseMode.MARKDOWN,
##        )
    await Form.speed.set()



if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True)
