const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Ваш токен
const token = '7217323400:AAG-59l0iLJ01a-rVGbS8qplGLgT1EyAa2U';

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Замените на ваш идентификатор канала (например, @my_channel)
const chatId = '@TechnicalProgress';

// Папка, из которой будут загружаться изображения и видео
const mediaFolder = './img'; // Укажите путь к вашей папке с медиафайлами

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

// Функция для отправки медиафайла
function sendMediaFile(mediaFile) {
    const mediaPath = path.join(mediaFolder, mediaFile);
    console.log(`Attempting to send media file: ${mediaPath}`); // Отладочная информация

    // Проверяем тип файла и отправляем соответствующий метод
    const isVideo = /\.(mp4|mov|avi)$/.test(mediaFile);
    if (isVideo) {
        bot.sendVideo(chatId, mediaPath)
            .then(() => {
                console.log(`Sent video: ${mediaFile}`);
            })
            .catch(error => {
                console.error(`Error sending video: ${error}`);
            });
    } else {
        bot.sendPhoto(chatId, mediaPath)
            .then(() => {
                console.log(`Sent image: ${mediaFile}`);
            })
            .catch(error => {
                console.error(`Error sending image: ${error}`);
            });
    }
}

// Основная функция для отправки медиафайлов через заданный интервал
function startSendingMedia(chatId) {
    if (sendingMedia) return; // Если уже отправляем, ничего не делаем

    sendingMedia = true;
    mediaFiles = getMediaFiles(); // Получаем список медиафайлов
    if (mediaFiles.length === 0) {
        console.log('No media files found in the specified folder.');
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

        // Проверяем, находится ли текущее время в заданном диапазоне
        if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
            // **Отправляем медиафайл только если есть еще медиафайлы**
            if (index < mediaFiles.length) {
                sendMediaFile(mediaFiles[index]);
                index++; // Увеличиваем индекс на 1
            } else {
                // **Если все медиафайлы отправлены, останавливаем отправку**
                stopSendingMedia(chatId);
                bot.sendMessage(chatId, 'Все медиафайлы были успешно отправлены.');

                // **Обновляем клавиатуру с кнопкой выбора интервала**
                const options = {
                    reply_markup: {
                        keyboard: [
                            ['Выбрать интервал']
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                };

                bot.sendMessage(chatId, 'Выберите новый интервал отправки медиафайлов:', options);
            }
        } else if (currentTotalMinutes >= endTotalMinutes) {
            // Если текущее время превышает время окончания, останавливаем отправку и предлагаем новый выбор интервала
            stopSendingMedia(chatId);
            bot.sendMessage(chatId, 'Время отправки медиафайлов истекло.');

            // Обновляем клавиатуру с кнопкой выбора интервала
            const options = {
                reply_markup: {
                    keyboard: [
                        ['Выбрать интервал']
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            };

            bot.sendMessage(chatId, 'Выберите новый интервал отправки медиафайлов:', options);
        }
    }, interval);

    // Обновляем клавиатуру
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
function stopSendingMedia(chatId) {
    if (!sendingMedia) return; // Если не отправляем, ничего не делаем

    clearInterval(intervalId); // Останавливаем интервал
    sendingMedia = false; // Сбрасываем флаг
    console.log('Stopped sending media files.');
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

        bot.sendMessage(chatId, 'Выберите интервал отправки медиафайлов:', options);
    } else if (['5 секунд', '10 секунд', '15 секунд', '20 секунд'].includes(msg.text)) {
        interval = parseInt(msg.text) * 1000; // Устанавливаем интервал в миллисекундах
        bot.sendMessage(chatId, `Интервал установлен на ${msg.text}. Выберите время начала:`, {
            reply_markup: {
                keyboard: [
                    ['8:00', '9:00', '10:00', '11:00', '12:00', 'СВОЁ ВРЕМЯ'],
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
        bot.sendMessage(chatId, 'Теперь выберите время окончания:', {
            reply_markup: {
                keyboard: [
                    ['19:00', '20:00', '21:00', '22:00', 'СВОЁ ВРЕМЯ'],
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else if (msg.text === 'СВОЁ ВРЕМЯ') {
        bot.sendMessage(chatId, 'Введите своё время (чч:мм):');
        bot.once('message', (timeMsg) => {
            const timeParts = timeMsg.text.split(':');
            if (timeParts.length === 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                startTime = new Date();
                startTime.setHours(hours, minutes, 0); // Устанавливаем время начала

                // Теперь задаем время окончания
                bot.sendMessage(chatId, 'Теперь выберите время окончания:', {
                    reply_markup: {
                        keyboard: [
                            ['19:00', '20:00', '21:00', '22:00', 'СВОЁ ВРЕМЯ'],
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
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

        bot.sendMessage(chatId, 'Готово! Нажмите "Запустить отправку медиафайлов", чтобы начать.');

        // Создаем кнопку для запуска отправки
        const options = {
            reply_markup: {
                keyboard: [
                    ['Запустить отправку медиафайлов']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };

        bot.sendMessage(chatId, 'Теперь вы можете запустить отправку.', options);
    } else if (msg.text === 'Запустить отправку медиафайлов') {
        startSendingMedia(chatId);
    } else if (msg.text === 'Остановить отправку медиафайлов') {
        stopSendingMedia(chatId);
    }
});