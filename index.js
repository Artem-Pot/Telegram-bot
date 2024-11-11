const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Ваш токен
const token = '7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Замените на ваш идентификатор канала (например, @my_channel)
const chatId = '@TechnicalProgress';

// Папка, из которой будут загружаться изображения
const imagesFolder = './img'; // Укажите путь к вашей папке с изображениями

// Интервал времени для отправки изображений (в миллисекундах)
const interval = 10000; // 10 секунд

// Функция для получения списка изображений из папки
function getImages() {
    return fs.readdirSync(imagesFolder).filter(file => {
        return /\.(jpg|jpeg|png|gif)$/.test(file); // Поддерживаемые форматы изображений
    });
}

// Функция для отправки изображения
function sendImage(chatId, image) {
    const imagePath = path.join(imagesFolder, image);
    console.log(`Attempting to send image: ${imagePath}`); // Отладочная информация
    bot.sendPhoto(chatId, imagePath)
        .then(() => {
            console.log(`Sent: ${image}`);
        })
        .catch(error => {
            console.error(`Error sending image: ${error}`);
        });
}

// Основная функция для отправки изображений через заданный интервал
function startSendingImages() {
    const images = getImages();
    if (images.length === 0) {
        console.log('No images found in the specified folder.');
        return; // Если нет изображений, выходим из функции
    }

    let index = 0;

    setInterval(() => {
        sendImage(chatId, images[index]);
        index = (index + 1) % images.length; // Циклический индекс
    }, interval);
}

// Запускаем отправку изображений
startSendingImages();