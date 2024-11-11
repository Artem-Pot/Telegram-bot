const TelegramBot = require('node-telegram-bot-api');

// Ваш токен
const token = '7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Замените на ваш идентификатор канала (например, @my_channel)
const channelId = '@TechnicalProgress';






// Состояния для отслеживания этапов
const stages = {
  WAITING_FOR_CONTENT: 'waiting_for_content',
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
  postDetails[chatId] = { stage: stages.WAITING_FOR_CONTENT }; // Устанавливаем состояние
  bot.sendMessage(chatId, 'Отправьте текст, фото или видео для поста:');
});

// Обработка входящих сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  if (!postDetails[chatId]) {
      return; // Если нет данных о посте, игнорируем сообщение
  }

  if (postDetails[chatId].stage === stages.WAITING_FOR_CONTENT) {
      // Проверка на наличие текста или медиа
      if (msg.text) {
          postDetails[chatId].text = msg.text; // Сохраняем текст поста
          bot.sendMessage(chatId, 'Теперь отправьте фото или видео (или просто отправьте текст) для поста:');
      } else if (msg.photo) {
          postDetails[chatId].media = { type: 'photo', file_id: msg.photo[msg.photo.length - 1].file_id };
          bot.sendMessage(chatId, 'Фото сохранено. Теперь отправьте текст для поста:');
      } else if (msg.video) {
          postDetails[chatId].media = { type: 'video', file_id: msg.video.file_id };
          bot.sendMessage(chatId, 'Видео сохранено. Теперь отправьте текст для поста:');
      }

      // Переход к выбору даты
      if (postDetails[chatId].text && (postDetails[chatId].media || msg.photo || msg.video)) {
          postDetails[chatId].stage = stages.WAITING_FOR_DATE;
          bot.sendMessage(chatId, 'Выберите дату для отправки поста:', {
              reply_markup: {
                  keyboard: [
                      [
                          { text: 'Сегодня' },
                          { text: 'Завтра' },
                          { text: 'Послезавтра' },
                          { text: 'Отправить немедленно' } // Кнопка для немедленной отправки
                      ]
                  ],
                  one_time_keyboard: true,
                  resize_keyboard: true,
              }
          });
      }
  } else if (postDetails[chatId].stage === stages.WAITING_FOR_DATE) {
      if (msg.text === 'Отправить немедленно') {
          // Немедленная отправка
          sendPost(chatId);
          delete postDetails[chatId]; // Очистить данные поста
      } else {
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

// Функция для отправки поста
function sendPost(chatId) {
  const { media, text } = postDetails[chatId];
  
  if (media) {
      if (media.type === 'photo') {
          bot.sendPhoto(channelId, media.file_id, { caption: text || '' });
      } else if (media.type === 'video') {
          bot.sendVideo(channelId, media.file_id, { caption: text || '' });
      }
  } else if (text) {
      bot.sendMessage(channelId, text);
  }
  
  bot.sendMessage(chatId, 'Ваш пост успешно отправлен в канал.');
}

// Функция для планирования отправки поста
function schedulePost(chatId) {
  const { date, time, media, text } = postDetails[chatId];
  const sendTime = new Date(date);
  sendTime.setHours(time.hours);
  sendTime.setMinutes(time.minutes);

  const delay = sendTime.getTime() - Date.now(); // Рассчитать задержку

  if (delay > 0) {
      setTimeout(() => {
          sendPost(chatId);
          delete postDetails[chatId]; // Очистить данные поста
      }, delay);
      bot.sendMessage(chatId, `Пост запланирован на ${sendTime.toLocaleString()}.`);
  } else {
      bot.sendMessage(chatId, 'Указанное время уже прошло. Пожалуйста, попробуйте снова.');
      delete postDetails[chatId]; // Очистить данные поста
  }
}