const TelegramBot = require('node-telegram-bot-api');

// Ваш токен
const token = '7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Замените на ваш идентификатор канала (например, @my_channel)
const channelId = '@TechnicalProgress';






// Состояния для отслеживания этапов
const stages = {
  WAITING_FOR_TYPE: 'waiting_for_type',
  WAITING_FOR_TEXT: 'waiting_for_text',
  WAITING_FOR_MEDIA: 'waiting_for_media',
  WAITING_FOR_DATE: 'waiting_for_date',
  WAITING_FOR_TIME: 'waiting_for_time',
};

// Переменные для хранения информации о посте
let postDetails = {};

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет! Чтобы создать пост, отправьте команду /create.');
});

// Обработка команды /create
bot.onText(/\/create/, (msg) => {
  const chatId = msg.chat.id;
  postDetails[chatId] = { stage: stages.WAITING_FOR_TYPE }; // Устанавливаем состояние
  bot.sendMessage(chatId, 'Выберите тип поста:', {
      reply_markup: {
          keyboard: [
              [
                  { text: 'Текст' },
                  { text: 'Фото' },
                  { text: 'Видео' }
              ]
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
      }
  });
});

// Обработка выбора типа поста
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (!postDetails[chatId]) {
      return; // Если нет данных о посте, игнорируем сообщение
  }

  if (postDetails[chatId].stage === stages.WAITING_FOR_TYPE) {
      if (msg.text === 'Текст') {
          postDetails[chatId].stage = stages.WAITING_FOR_TEXT;
          bot.sendMessage(chatId, 'Отправьте текст для поста:');
      } else if (msg.text === 'Фото') {
          postDetails[chatId].stage = stages.WAITING_FOR_MEDIA;
          bot.sendMessage(chatId, 'Пожалуйста, отправьте фото:');
      } else if (msg.text === 'Видео') {
          postDetails[chatId].stage = stages.WAITING_FOR_MEDIA;
          bot.sendMessage(chatId, 'Пожалуйста, отправьте видео:');
      } else {
          bot.sendMessage(chatId, 'Пожалуйста, выберите тип поста: Текст, Фото или Видео.');
      }
  } else if (postDetails[chatId].stage === stages.WAITING_FOR_TEXT) {
      postDetails[chatId].text = msg.text;

      // Переход к выбору даты
      postDetails[chatId].stage = stages.WAITING_FOR_DATE;
      bot.sendMessage(chatId, 'Выберите дату для отправки поста:', {
          reply_markup: {
              keyboard: [
                  [
                      { text: 'Сегодня' },
                      { text: 'Завтра' },
                      { text: 'Послезавтра' }
                  ]
              ],
              one_time_keyboard: true,
              resize_keyboard: true,
          }
      });
  } else if (postDetails[chatId].stage === stages.WAITING_FOR_MEDIA) {
      // Обработка медиа (фото и видео)
      if (msg.photo) {
          const media = msg.photo[msg.photo.length - 1].file_id;
          postDetails[chatId].media = { type: 'photo', file_id: media };
      } else if (msg.video) {
          const media = msg.video.file_id;
          postDetails[chatId].media = { type: 'video', file_id: media };
      }

      // Переход к выбору даты
      postDetails[chatId].stage = stages.WAITING_FOR_DATE;
      bot.sendMessage(chatId, 'Выберите дату для отправки поста:', {
          reply_markup: {
              keyboard: [
                  [
                      { text: 'Сегодня' },
                      { text: 'Завтра' },
                      { text: 'Послезавтра' }
                  ]
              ],
              one_time_keyboard: true,
              resize_keyboard: true,
          }
      });
  } else if (postDetails[chatId].stage === stages.WAITING_FOR_DATE) {
      const today = new Date();
      let selectedDate;

      if (msg.text === 'Сегодня') {
          selectedDate = today;
      } else if (msg.text === 'Завтра') {
          selectedDate = new Date(today);
          selectedDate.setDate(today.getDate() + 1);
      } else if (msg.text === 'Послезавтра') {
          selectedDate = new Date(today);
          selectedDate.setDate(today.getDate() + 2);
      }

      if (selectedDate) {
          postDetails[chatId].date = selectedDate;

          // Запрос выбора времени
          postDetails[chatId].stage = stages.WAITING_FOR_TIME;
          bot.sendMessage(chatId, 'Пожалуйста, выберите время отправки поста (в формате ЧЧ:ММ):');
      } else {
          bot.sendMessage(chatId, 'Пожалуйста, выберите дату: Сегодня, Завтра или Послезавтра.');
      }
  } else if (postDetails[chatId].stage === stages.WAITING_FOR_TIME) {
      const [hours, minutes] = msg.text.split(':').map(Number);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          postDetails[chatId].time = { hours, minutes };
          schedulePost(chatId); // Запланировать отправку поста
      } else {
          bot.sendMessage(chatId, 'Пожалуйста, введите корректное время в формате ЧЧ:ММ.');
      }
  }
});

// Функция для планирования отправки поста
function schedulePost(chatId) {
  const { date, time, media, text } = postDetails[chatId];
  const sendTime = new Date(date);
  sendTime.setHours(time.hours);
  sendTime.setMinutes(time.minutes);

  const delay = sendTime.getTime() - Date.now(); // Рассчитать задержку

  if (delay > 0) {
      setTimeout(() => {
          if (media) {
              if (media.type === 'photo') {
                  bot.sendPhoto(channelId, media.file_id);
              } else {
                  bot.sendVideo(channelId, media.file_id);
              }
          } else {
              bot.sendMessage(channelId, text);
          }
          bot.sendMessage(chatId, 'Ваш пост успешно отправлен в канал.');
          delete postDetails[chatId]; // Очистить данные поста
      }, delay);
      bot.sendMessage(chatId, `Пост запланирован на ${sendTime.toLocaleString()}.`);
  } else {
      bot.sendMessage(chatId, 'Указанное время уже прошло. Пожалуйста, попробуйте снова.');
      delete postDetails[chatId]; // Очистить данные поста
  }
}