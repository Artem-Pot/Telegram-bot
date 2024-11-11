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

let sendingImages = false; // Флаг для отслеживания состояния отправки изображений
let intervalId; // ID интервала
let interval = 10000; // Интервал времени для отправки изображений (по умолчанию 10 секунд)

// Функция для получения списка изображений из папки
function getImages() {
    return fs.readdirSync(imagesFolder).filter(file => {
        return /\.(jpg|jpeg|png|gif)$/.test(file); // Поддерживаемые форматы изображений
    });
}

// Функция для отправки изображения
function sendImage(image) {
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
function startSendingImages(chatId) {
    if (sendingImages) return; // Если уже отправляем, ничего не делаем

    sendingImages = true;
    const images = getImages();
    if (images.length === 0) {
        console.log('No images found in the specified folder.');
        sendingImages = false; // Сбрасываем флаг
        return; // Если нет изображений, выходим из функции
    }

    let index = 0;

    intervalId = setInterval(() => {
        sendImage(images[index]);
        index = (index + 1) % images.length; // Циклический индекс
    }, interval);

    // Обновляем клавиатуру
    const options = {
        reply_markup: {
            keyboard: [
                ['Остановить отправку изображений']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Отправка изображений запущена!', options);
}

// Функция для остановки отправки изображений
function stopSendingImages(chatId) {
    if (!sendingImages) return; // Если не отправляем, ничего не делаем

    clearInterval(intervalId); // Останавливаем интервал
    sendingImages = false; // Сбрасываем флаг
    console.log('Stopped sending images.');

    // Обновляем клавиатуру
    const options = {
        reply_markup: {
            keyboard: [
                ['Выбрать интервал']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Отправка изображений остановлена!', options);
}

// Обработка текстовых сообщений
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Создаем клавиатуру с кнопками
    const options = {
        reply_markup: {
            keyboard: [
                ['Выбрать интервал']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Добро пожаловать! Нажмите "Выбрать интервал", чтобы продолжить:', options);
});

// Обработка выбора интервала
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.text === 'Выбрать интервал') {
        const options = {
            reply_markup: {
                keyboard: [
                    ['5 секунд', '10 секунд'],
                    ['15 секунд', '20 секунд']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Выберите интервал отправки изображений:', options);
    } else if (msg.text === '5 секунд') {
        interval = 5000; // Устанавливаем интервал 5 секунд
        bot.sendMessage(chatId, 'Интервал установлен на 5 секунд. Нажмите "Запустить отправку изображений", чтобы начать.');

        // Создаем кнопку для запуска отправки
        const options = {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку изображений']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Готово! Теперь вы можете запустить отправку.', options);
    } else if (msg.text === '10 секунд') {
        interval = 10000; // Устанавливаем интервал 10 секунд
        bot.sendMessage(chatId, 'Интервал установлен на 10 секунд. Нажмите "Запустить отправку изображений", чтобы начать.');

        const options = {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку изображений']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Готово! Теперь вы можете запустить отправку.', options);
    } else if (msg.text === '15 секунд') {
        interval = 15000; // Устанавливаем интервал 15 секунд
        bot.sendMessage(chatId, 'Интервал установлен на 15 секунд. Нажмите "Запустить отправку изображений", чтобы начать.');

        const options = {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку изображений']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Готово! Теперь вы можете запустить отправку.', options);
    } else if (msg.text === '20 секунд') {
        interval = 20000; // Устанавливаем интервал 20 секунд
        bot.sendMessage(chatId, 'Интервал установлен на 20 секунд. Нажмите "Запустить отправку изображений", чтобы начать.');

        const options = {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку изображений']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Готово! Теперь вы можете запустить отправку.', options);
    } else if (msg.text === 'Запустить отправку изображений') {
        startSendingImages(chatId);
    } else if (msg.text === 'Остановить отправку изображений') {
        stopSendingImages(chatId);
    }
});