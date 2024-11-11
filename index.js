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
let startTime; // Время начала отправки
let endTime; // Время окончания отправки
let images; // Массив изображений

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
    images = getImages(); // Получаем список изображений
    if (images.length === 0) {
        console.log('No images found in the specified folder.');
        sendingImages = false; // Сбрасываем флаг
        return; // Если нет изображений, выходим из функции
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
            // **Отправляем изображение только если есть еще изображения**
            if (index < images.length) {
                sendImage(images[index]);
                index++; // Увеличиваем индекс на 1
            } else {
                // **Если все изображения отправлены, останавливаем отправку**
                stopSendingImages(chatId);
                bot.sendMessage(chatId, 'Все изображения были успешно отправлены.');

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

                bot.sendMessage(chatId, 'Выберите новый интервал отправки изображений:', options);
            }
        } else if (currentTotalMinutes >= endTotalMinutes) {
            // Если текущее время превышает время окончания, останавливаем отправку и предлагаем новый выбор интервала
            stopSendingImages(chatId);
            bot.sendMessage(chatId, 'Время отправки изображений истекло.');

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

            bot.sendMessage(chatId, 'Выберите новый интервал отправки изображений:', options);
        }
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
    } else if (['5 секунд', '10 секунд', '15 секунд', '20 секунд'].includes(msg.text)) {
        interval = parseInt(msg.text) * 1000; // Устанавливаем интервал в миллисекундах
        bot.sendMessage(chatId, `Интервал установлен на ${msg.text}. Укажите время начала (чч:мм):`);

        // Переход к следующему шагу выбора времени
        bot.once('message', (startTimeMsg) => {
            const timeParts = startTimeMsg.text.split(':');
            if (timeParts.length === 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                startTime = new Date();
                startTime.setHours(hours, minutes, 0); // Устанавливаем время начала
                bot.sendMessage(chatId, `Время начала установлено на ${startTimeMsg.text}. Укажите время окончания (чч:мм):`);

                // Переход к следующему шагу выбора времени
                bot.once('message', (endTimeMsg) => {
                    const endTimeParts = endTimeMsg.text.split(':');
                    if (endTimeParts.length === 2) {
                        const endHours = parseInt(endTimeParts[0]);
                        const endMinutes = parseInt(endTimeParts[1]);
                        endTime = new Date();
                        endTime.setHours(endHours, endMinutes, 0); // Устанавливаем время окончания

                        bot.sendMessage(chatId, 'Готово! Нажмите "Запустить отправку изображений", чтобы начать.');

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

                        bot.sendMessage(chatId, 'Теперь вы можете запустить отправку.', options);
                    } else {
                        bot.sendMessage(chatId, 'Неверный формат времени окончания. Пожалуйста, введите в формате чч:мм.');
                    }
                });
            } else {
                bot.sendMessage(chatId, 'Неверный формат времени начала. Пожалуйста, введите в формате чч:мм.');
            }
        });
    } else if (msg.text === 'Запустить отправку изображений') {
        startSendingImages(chatId);
    } else if (msg.text === 'Остановить отправку изображений') {
        stopSendingImages(chatId);
    }
});