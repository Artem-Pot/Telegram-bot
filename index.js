const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Ваш токен и chatId канала (например, @my_channel)
const token = '7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U';
const channelId = '@TechnicalProgress'; // Укажите ID вашего канала

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

let chatId; // Переменная для хранения идентификатора чата
let mediaFolder = './media'; // Папка, из которой будут загружаться изображения и видео (по умолчанию)
let sendingMedia = false; // Флаг для отслеживания состояния отправки медиафайлов
let intervalId; // ID интервала
let interval = 10000; // Интервал времени для отправки медиафайлов (по умолчанию 10 секунд)
let startTime; // Время начала отправки
let endTime; // Время окончания отправки
let mediaFiles; // Массив медиафайлов

// Функция для получения списка медиафайлов из папки
function getMediaFiles() {
    return fs.readdirSync(mediaFolder).filter(file => {
        return /\.(jpg|jpeg|png|gif|mp4|mov|avi)$/.test(file); // Поддерживаемые форматы изображений и видео
    });
}

// Функция для получения списка вложенных папок
function getSubfolders(directory) {
    return fs.readdirSync(directory).filter(file => {
        return fs.lstatSync(path.join(directory, file)).isDirectory(); // Возвращаем только папки
    });
}

// Функция для отправки медиафайла
function sendMediaFile(mediaFile) {
    const mediaPath = path.join(mediaFolder, mediaFile);
    console.log(`Attempting to send media file: ${mediaPath}`); // Отладочная информация

    const isVideo = /\.(mp4|mov|avi)$/.test(mediaFile);
    if (isVideo) {
        bot.sendVideo(channelId, mediaPath)
            .then(() => {
                console.log(`Sent video: ${mediaFile}`);
            })
            .catch(error => {
                console.error(`Error sending video: ${error}`);
            });
    } else {
        bot.sendPhoto(channelId, mediaPath)
            .then(() => {
                console.log(`Sent image: ${mediaFile}`);
            })
            .catch(error => {
                console.error(`Error sending image: ${error}`);
            });
    }
}

// Основная функция для отправки медиафайлов через заданный интервал
function startSendingMedia() {
    if (sendingMedia) return; // Если уже отправляем, ничего не делаем

    sendingMedia = true;
    mediaFiles = getMediaFiles(); // Получаем список медиафайлов
    if (mediaFiles.length === 0) {
        bot.sendMessage(chatId, 'Нет медиафайлов в указанной папке.');
        sendingMedia = false; // Сбрасываем флаг
        return; // Если нет медиафайлов, выходим из функции
    }

    let index = 0;

    intervalId = setInterval(() => {
        const currentTime = new Date();
        const currentHours = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();
        const currentTotalMinutes = currentHours * 60 + currentMinutes;

        const startTotalMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const endTotalMinutes = endTime.getHours() * 60 + endTime.getMinutes();

        if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
            if (index < mediaFiles.length) {
                sendMediaFile(mediaFiles[index]);
                index++; // Увеличиваем индекс на 1
            } else {
                stopSendingMedia();
                bot.sendMessage(chatId, 'Все медиафайлы были успешно отправлены.');
                showStartOptions();
            }
        } else if (currentTotalMinutes >= endTotalMinutes) {
            stopSendingMedia();
            bot.sendMessage(chatId, 'Время отправки медиафайлов истекло.');
            showStartOptions();
        }
    }, interval);

    const options = {
        reply_markup: {
            keyboard: [
                ['Остановить отправку медиафайлов']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Отправка медиафайлов запущена!', options);
}

// Функция для остановки отправки медиафайлов
function stopSendingMedia() {
    if (!sendingMedia) return; // Если не отправляем, ничего не делаем

    clearInterval(intervalId); // Останавливаем интервал
    sendingMedia = false; // Сбрасываем флаг
    console.log('Stopped sending media files.');
}

// Функция для отображения начальных опций
function showStartOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['Выбрать папку с медиафайлами']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Добро пожаловать! Нажмите "Выбрать папку с медиафайлами", чтобы продолжить:', options);
}

// Функция для отображения опций интервала
function showIntervalOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['5 секунд', '10 секунд'],
                ['15 секунд', '20 секунд'],
                ['Отмена']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Выберите интервал отправки медиафайлов:', options);
}

// Функция для отображения опций времени
function showTimeOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['8:00', '9:00', '10:00', '11:00', '12:00', 'СВОЁ ВРЕМЯ'],
                ['Отмена']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Теперь выберите время начала:', options);
}

// Функция для отображения опций окончания времени
function showEndTimeOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['19:00', '20:00', '21:00', '22:00', 'СВОЁ ВРЕМЯ'],
                ['Отмена']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Теперь выберите время окончания:', options);
}

// Функция для отображения подпапок в папке media
function showSubfolders() {
    const subfolders = getSubfolders(mediaFolder);
    if (subfolders.length === 0) {
        bot.sendMessage(chatId, 'В указанной папке нет вложенных папок.');
        showStartOptions(); // Возвращаем к начальным опциям
        return;
    }

    const options = {
        reply_markup: {
            keyboard: subfolders.map(folder => [folder]), // Создаем кнопки для каждого подкаталога
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    bot.sendMessage(chatId, 'Выберите папку с медиафайлами:', options);
}

// Обработка текстовых сообщений
bot.onText(/\/start/, (msg) => {
    chatId = msg.chat.id; // Сохраняем идентификатор чата
    showStartOptions();
});

// Обработка выбора папки с медиафайлами
bot.on('message', (msg) => {
    chatId = msg.chat.id; // Обновляем идентификатор чата

    if (msg.text === 'Выбрать папку с медиафайлами') {
        showSubfolders(); // Вызываем функцию для отображения подпапок
    } else if (getSubfolders(mediaFolder).includes(msg.text)) {
        mediaFolder = path.join(mediaFolder, msg.text); // Обновляем путь к выбранной папке
        bot.sendMessage(chatId, `Папка с медиафайлами установлена: ${mediaFolder}`);
        showIntervalOptions(); // Переходим к выбору интервала
    } else if (['5 секунд', '10 секунд', '15 секунд', '20 секунд'].includes(msg.text)) {
        interval = parseInt(msg.text) * 1000; // Устанавливаем интервал в миллисекундах
        bot.sendMessage(chatId, `Интервал установлен на ${msg.text}.`, {
            reply_markup: {
                keyboard: [
                    ['8:00', '9:00', '10:00', '11:00', '12:00', 'СВОЁ ВРЕМЯ'],
                    ['Отмена']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (['8:00', '9:00', '10:00', '11:00', '12:00'].includes(msg.text)) {
        const timeParts = msg.text.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        startTime = new Date();
        startTime.setHours(hours, minutes, 0); // Устанавливаем время начала
        showEndTimeOptions(); // Показать опции для выбора времени окончания
    } else if (msg.text === 'СВОЁ ВРЕМЯ') {
        bot.sendMessage(chatId, 'Введите своё время (чч:мм):');
        bot.once('message', (timeMsg) => {
            const timeParts = timeMsg.text.split(':');
            if (timeParts.length === 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                startTime = new Date();
                startTime.setHours(hours, minutes, 0); // Устанавливаем время начала
                
                showEndTimeOptions(); // Показать опции для выбора времени окончания
            } else {
                bot.sendMessage(chatId, 'Неверный формат времени. Пожалуйста, введите в формате чч:мм.');
            }
        });
    } else if (['19:00', '20:00', '21:00', '22:00'].includes(msg.text)) {
        const timeParts = msg.text.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        endTime = new Date();
        endTime.setHours(hours, minutes, 0); // Устанавливаем время окончания

        bot.sendMessage(chatId, 'Готово! Нажмите "Запустить отправку медиафайлов", чтобы начать.', {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку медиафайлов', 'Отмена']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (msg.text === 'Запустить отправку медиафайлов') {
        startSendingMedia();
    } else if (msg.text === 'Остановить отправку медиафайлов') {
        stopSendingMedia();
        showStartOptions();
       
        mediaFolder = './media'; // Сброс к папке по умолчанию
        sendingMedia = false; // Сброс флага отправки
        clearInterval(intervalId); // Остановка интервала, если он запущен
        startTime = null; // Сброс времени начала
        endTime = null; // Сброс времени окончания
        intervalId = null; // Сброс ID интервала
        interval = 10000; // Сброс интервала к значению по умолчанию
        // showSubfolders();

    } else if (msg.text === 'Отмена') {
        // Сброс всех переменных и возврат на начальный экран
        showStartOptions(); // Показать начальные опции
        chatId = null;
        mediaFolder = './media'; // Сброс к папке по умолчанию
        sendingMedia = false; // Сброс флага отправки
        clearInterval(intervalId); // Остановка интервала, если он запущен
        startTime = null; // Сброс времени начала
        endTime = null; // Сброс времени окончания
        intervalId = null; // Сброс ID интервала
        interval = 10000; // Сброс интервала к значению по умолчанию

    }
});