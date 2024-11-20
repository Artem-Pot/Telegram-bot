const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const moment = require('moment-timezone'); // Импортируем moment-timezone
const chalk = require('chalk');

// Ваш токен и chatId канала (например, @my_channel)
const { token, channelId } = require('./keyId');

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

let chatId; // Переменная для хранения идентификатора чата
let mediaFolder = './media'; // Папка, из которой будут загружаться изображения и видео (по умолчанию)ssh
let sendingMedia = false; // Флаг для отслеживания состояния отправки медиафайлов
let intervalId; // ID интервала
let interval = 10000; // Интервал времени для отправки медиафайлов (по умолчанию 10 секунд)
let startTime; // Время начала отправки
let endTime; // Время окончания отправки
let mediaFiles; // Массив медиафайлов
const now = moment().tz("Europe/Samara").format('YYYY-MM-DD HH:mm:ss'); //формат времени для консольных сообщений

// Функция для получения списка медиафайлов из папки
function getMediaFiles() {
    return fs.readdirSync(mediaFolder).filter(file => {
        return /\.(jpg|jpeg|png|gif|raw|tiff|bmp|psd|svg|webp|mp4|mov|avi|mpeg|m4v)$/.test(file); // Поддерживаемые форматы изображений и видео
    });
}

// Функция для конвертации TIFF и SVG в PNG
async function convertToPNG(filePath) {
    const outputFilePath = filePath.replace(/\.(tiff|svg)$/i, '.png');

    try {
        await sharp(filePath)
            .toFile(outputFilePath);
        console.log(chalk.yellow(`[${now}] Конвертирован ${filePath} в ${outputFilePath}`));
        return outputFilePath; // Возвращаем путь к конвертированному файлу
    } catch (error) {
        console.error(chalk.white.bgRed(`[${now}] Ошибка конвертации ${filePath}: ${error.message}`));
        return null; // Возвращаем null в случае ошибки
    }
}

// Функция для получения списка вложенных папок
function getSubfolders(directory) {
    return fs.readdirSync(directory).filter(file => {
        return fs.lstatSync(path.join(directory, file)).isDirectory(); // Возвращаем только папки
    });
}

// Функция для отправки медиафайла
async function sendMediaFile(mediaFile) {
    const mediaPath = path.join(mediaFolder, mediaFile);
    console.log(`[${now}] Попытка отправить медиафайл: ${mediaPath}`); // Отладочная информация

    const isVideo = /\.(mp4|mov|avi|mpeg|m4v)$/i.test(mediaFile);
    const isImage = /\.(jpg|jpeg|png|gif|raw|tiff|bmp|psd|svg|webp)$/i.test(mediaFile);

    if (isImage && /\.(tiff|svg)$/i.test(mediaFile)) {
        const convertedFile = await convertToPNG(mediaPath);
        if (convertedFile) {
            // Если конвертация успешна, отправляем конвертированный файл
            await bot.sendPhoto(channelId, convertedFile);
            const now = moment().tz("Europe/Samara").format('YYYY-MM-DD HH:mm:ss');
            console.log(`[${now}] Отправлено изображение: ${convertedFile}`);
            return; // Завершаем выполнение функции
        } else {
            console.error(chalk.white.bgRed(`[${now}] Не удалось конвертировать файл: ${mediaFile}`));
            return; // Завершаем выполнение функции, если конвертация не удалась
        }
    }
    
    if (isVideo) {
        bot.sendVideo(channelId, mediaPath)
            .then(() => {
                const now = moment().tz("Europe/Samara").format('YYYY-MM-DD HH:mm:ss');
                console.log(`[${now}] Отправлено видео: ${mediaFile}`);
            })
            .catch(error => {
                console.error(chalk.white.bgRed(`[${now}] Ошибка отправки видео: ${error}`));
            });
    } else if (isImage) {
        bot.sendPhoto(channelId, mediaPath) // Используем mediaPath вместо convertedFile
            .then(() => {
                const now = moment().tz("Europe/Samara").format('YYYY-MM-DD HH:mm:ss');
                console.log(`[${now}] Отправлено изображение: ${mediaPath}`); // Используем mediaPath
            })
            .catch(error => {
                console.error(chalk.white.bgRed(`[${now}] Ошибка отправки изображения: ${error}`));
            });
    } else {
        console.error(chalk.white.bgRed(`[${now}] Файл ${mediaFile} не поддерживается для отправки.`));
    }
}

// Основная функция для отправки медиафайлов через заданный интервал
function startSendingMedia() {
    if (sendingMedia) return; // Если уже отправляем, ничего не делаем

    sendingMedia = true;
    mediaFiles = getMediaFiles(); // Получаем список медиафайлов
    if (mediaFiles.length === 0) {
        bot.sendMessage(chatId, `<b>Нет медиафайлов в указанной папке. Пожалуйста, выберите другую папку.</b>`, {parse_mode: 'HTML'});
        sendingMedia = false; // Сбрасываем флаг
        showSubfolders(); // Предлагаем выбрать другую папку
        return; // Если нет медиафайлов, выходим из функции
    }

    let index = 0;

    intervalId = setInterval(() => {
        const currentTime = moment.tz("Europe/Samara"); // Получаем текущее время в Europe/Samara
        const currentTotalMinutes = currentTime.hours() * 60 + currentTime.minutes();

        const startTotalMinutes = startTime.hours() * 60 + startTime.minutes();
        const endTotalMinutes = endTime.hours() * 60 + endTime.minutes();

        if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
            if (index < mediaFiles.length) {
                sendMediaFile(mediaFiles[index]);
                index++; // Увеличиваем индекс на 1
            } else {
                stopSendingMedia();
                bot.sendMessage(chatId, `<b>-----Все медиафайлы были успешно отправлены.------</b>`, {parse_mode: 'HTML'});
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
        } else if (currentTotalMinutes >= endTotalMinutes) {
            stopSendingMedia();
            bot.sendMessage(chatId, `<b>Время отправки медиафайлов истекло.</b>`, {parse_mode: 'HTML'});
            showStartOptions();
        }
    }, interval);

    const options = {
        reply_markup: {
            keyboard: [
                ['Остановить отправку медиафайлов ⏹️']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, `<b>Отправка медиафайлов запущена!</b>`, options);
}

// Функция для остановки отправки медиафайлов
function stopSendingMedia() {
    if (!sendingMedia) return; // Если не отправляем, ничего не делаем

    clearInterval(intervalId); // Останавливаем интервал
    sendingMedia = false; // Сбрасываем флаг
    console.log(chalk.green(`[${now}] Прекращена отправка медиафайлов.`));
}

// Функция для отображения начальных опций
function showStartOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['Выбрать папку с медиафайлами 📂']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, `<b>Добро пожаловать! Нажмите "Выбрать папку с медиафайлами", чтобы продолжить:</b>`, options);
}

// Функция для отображения опций интервала
function showIntervalOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['5 секунд', '10 секунд'],
                ['15 секунд', '20 секунд'],
                ['Отмена 🔄']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, `<b>Выберите интервал отправки медиафайлов:</b>`, options);
}

// Функция для отображения опций окончания времени
function showEndTimeOptions() {
    const options = {
        reply_markup: {
            keyboard: [
                ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00'],
                ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
                ['19:00', '20:00', '21:00', '22:00', '23:00', '23:59'],
                ['Отмена 🔄']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, `<b>Теперь выберите время окончания:</b> `, options);
}

// Функция для отображения подпапок в папке media
function showSubfolders() {
    const subfolders = getSubfolders(mediaFolder);
    if (subfolders.length === 0) {
        bot.sendMessage(chatId, `<b>В указанной папке нет вложенных папок.</b>`, {parse_mode: 'HTML'});
        showStartOptions(); // Показать начальные опции
        chatId = null;
        mediaFolder = './media'; // Сброс к папке по умолчанию
        sendingMedia = false; // Сброс флага отправки
        clearInterval(intervalId); // Остановка интервала, если он запущен
        startTime = null; // Сброс времени начала
        endTime = null; // Сброс времени окончания
        intervalId = null; // Сброс ID интервала
        interval = 10000; // Сброс интервала к значению по умолчанию
        return;
    }

    const options = {
        reply_markup: {
            keyboard: subfolders.map(folder => [folder]), // Создаем кнопки для каждого подкаталога
            resize_keyboard: true,
            one_time_keyboard: true
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, `<b>Выберите папку с медиафайлами:</b>`, options);
}

// Обработка текстовых сообщений
bot.onText(/\/start/, (msg) => {
    chatId = msg.chat.id; // Сохраняем идентификатор чата
    showStartOptions();
});

// Обработка выбора папки с медиафайлами
bot.on('message', (msg) => {
    chatId = msg.chat.id; // Обновляем идентификатор чата

    if (msg.text === 'Выбрать папку с медиафайлами 📂') {
        showSubfolders(); // Вызываем функцию для отображения подпапок
    } else if (getSubfolders(mediaFolder).includes(msg.text)) {
        mediaFolder = path.join(mediaFolder, msg.text); // Обновляем путь к выбранной папке
        bot.sendMessage(chatId, `<b>Папка с медиафайлами установлена:  <u>${mediaFolder}</u></b>`, {parse_mode: "HTML"});
        mediaFiles = getMediaFiles(); // Получаем список медиафайлов
        if (mediaFiles.length === 0) {
            bot.sendMessage(chatId, `<b>Нет медиафайлов в указанной папке. Пожалуйста, выберите другую папку.</b>`, {parse_mode: 'HTML'});
            showSubfolders(); // Предлагаем выбрать другую папку
            return; // Если нет медиафайлов, выходим из функции
        }
        showIntervalOptions(); // Переходим к выбору интервала
    } else if (['5 секунд', '10 секунд', '15 секунд', '20 секунд'].includes(msg.text)) {
        interval = parseInt(msg.text) * 1000; // Устанавливаем интервал в миллисекундах
        bot.sendMessage(chatId, `<b>Интервал установлен на ${msg.text}. Выберите время начала:</b> `, {
            reply_markup: {
                keyboard: [
                    ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00'],
                    ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
                    ['19:00', '20:00', '21:00', '22:00', '23:00', '23:59'],
                    ['Отмена 🔄']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            },
            parse_mode: 'HTML'
        });

    } else if (['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '23:59'].includes(msg.text)) {
        if (!startTime) {
            // Выбор времени начала
            const timeParts = msg.text.split(':');
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            startTime = moment.tz(`2023-01-01 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, "Europe/Samara"); // Устанавливаем время начала с учетом временной зоны
            bot.sendMessage(chatId, `<b>Время начала установлено на ${msg.text}. Теперь выберите время окончания:</b>`, {
                reply_markup: {
                    keyboard: [
                        ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00'],
                        ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
                        ['19:00', '20:00', '21:00', '22:00', '23:00', '23:59'],
                        ['Отмена 🔄']
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                },
                parse_mode: 'HTML'
            });
        } else {
            // Выбор времени окончания
            const timeParts = msg.text.split(':');
            const hours = parseInt(timeParts[0]);
            const minutes = parseInt(timeParts[1]);
            endTime = moment.tz(`2023-01-01 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, "Europe/Samara"); // Устанавливаем время окончания с учетом временной зоны

            // Проверка, что время окончания больше времени начала
            if (endTime.isSameOrBefore(startTime)) {
                bot.sendMessage(chatId, `<b>Время окончания должно быть позже времени начала. Пожалуйста, выберите время окончания снова:</b>`, { parse_mode: 'HTML' });
                showEndTimeOptions(); // Показать меню выбора времени окончания снова
            } else {
                bot.sendMessage(chatId, `<b>Готово! Нажмите "Запустить отправку медиафайлов", чтобы начать.</b>`, {
                    reply_markup: {
                        keyboard: [['Запустить отправку медиафайлов ▶️', 'Отмена 🔄']],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    },
                    parse_mode: 'HTML'
                });
            }
        }
    } else if (msg.text === 'Запустить отправку медиафайлов ▶️') {
        startSendingMedia();
    } else if (msg.text === 'Остановить отправку медиафайлов ⏹️') {
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

    } else if (msg.text === 'Отмена 🔄') {
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

console.log(chalk.green(`[${now}] Бот запущен и готов к работе...`));