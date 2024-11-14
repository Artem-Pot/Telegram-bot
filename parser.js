//проверка наличия обновлений контанта через RSS и передача в телеграмм канал

const { Telegraf } = require('telegraf'); // Импортируем Telegraf 
const Parser = require('rss-parser');

// Ваш токен бота
const bot = new Telegraf('7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U');

// URL RSS-канала
const rssUrl = 'https://www.yapfiles.ru/rss/1/'; // Замените на ваш RSS URL

// Создаем парсер
const parser = new Parser();
let lastItemGuid = null;

// Функция для проверки RSS-канала
async function checkRSS() {
    try {
        const feed = await parser.parseURL(rssUrl);
        
        // Проверяем новые записи
        if (lastItemGuid !== feed.items[0].guid) {
            lastItemGuid = feed.items[0].guid;

            // Формируем текст сообщения
            const message = `🚨 Новая запись: ${feed.items[0].title}\n${feed.items[0].link}`;
            
            // Отправляем текстовое сообщение в чат
            await bot.telegram.sendMessage('2068022561', message);
        }
    } catch (error) {
        console.error('Ошибка при проверке RSS:', error);
    }
}

// Запускаем проверку каждые 1 минуту
setInterval(checkRSS, 1 * 60 * 1000);

// Запуск бота
bot.launch().then(() => {
    console.log('Бот запущен');
});