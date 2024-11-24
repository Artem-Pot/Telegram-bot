const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const moment = require('moment-timezone'); // Импортируем moment-timezone
const chalk = require('chalk');
const xlsx = require('xlsx'); // Импортируем библиотеку для работы с exel

// Токен и chatId канала 
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
let sentFiles = new Set(); // Множество для хранения имен отправленных файлов

// Функция для получения текста из файла text.xlsx
function getTextFromExcel() {
    const workbook = xlsx.readFile(path.join(mediaFolder, 'text.xlsx')); // Читаем файл Excel
    const sheetName = workbook.SheetNames[0]; // Получаем имя первого листа
    const sheet = workbook.Sheets[sheetName]; // Получаем данные с этого листа
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // Преобразуем данные в массив массивов
    return data.map(row => row.slice(0, 4)); // Возвращаем первые четыре столбца (A, B, C, D)
}

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
        console.log(chalk.blue(`[${now}] Конвертирован ${filePath} в ${outputFilePath}`));
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

async function sendMediaFile(mediaFile) {
    try {
        const mediaPath = path.join(mediaFolder, mediaFile);
        console.log(`[${now}] Попытка отправить медиафайл: ${mediaPath}`);

        const isVideo = /\.(mp4|mov|avi|mpeg|m4v)$/i.test(mediaFile);
        const isImage = /\.(jpg|jpeg|png|gif|raw|tiff|bmp|psd|svg|webp)$/i.test(mediaFile);

        const fileNameWithoutExt = mediaFile.replace(/\.[^/.]+$/, "");
        if (sentFiles.has(fileNameWithoutExt)) {
            console.log(chalk.yellow(`[${now}] Файл ${mediaFile} уже был отправлен. Пропускаем.`));
            return; 
        }

        // Проверка наличия файла text.xlsx
        const excelFilePath = path.join(mediaFolder, 'text.xlsx');
        const texts = fs.existsSync(excelFilePath) ? getTextFromExcel() : null; // Получаем текст из Excel, если файл существует

        let postText = '';
        if (texts) {
            const index = mediaFiles.indexOf(mediaFile);
            const postTexts = texts[index] || []; // Получаем массив текстов для текущего медиафайла

            // Формируем подпись
            if (postTexts[0] && postTexts[0].trim() !== '') {
                postText += `<b>${postTexts[0].trim()}</b>\n\n`; // Столбец A (жирный шрифт)
            }
            if (postTexts[1] && postTexts[1].trim() !== '') {
                postText += postTexts[1].trim() + '\n\n'; // Столбец B
            }
            if (postTexts[2] && postTexts[2].trim() !== '') {
                postText += postTexts[2].trim() + '\n\n'; // Столбец C
            }
            if (postTexts[3] && postTexts[3].trim() !== '') {
                postText += postTexts[3].trim(); // Столбец D
            }
        } else {
            console.log(chalk.blue(`[${now}] Файл text.xlsx не найден. Отправляем медиафайлы без текста.`));
        }

        const originalFolder = path.join(__dirname, 'original', path.basename(mediaFolder));
        if (!fs.existsSync(originalFolder)) {
            fs.mkdirSync(originalFolder, { recursive: true });
        }

        if (isImage && /\.(tiff|svg)$/i.test(mediaFile)) {
            const convertedFile = await convertToPNG(mediaPath);
            if (convertedFile) {
                await bot.sendPhoto(channelId, convertedFile, { caption: postText.trim() === '' ? undefined : postText, parse_mode: 'HTML' });
                sentFiles.add(fileNameWithoutExt);
                fs.rename(mediaPath, path.join(originalFolder, mediaFile), (err) => {
                    if (err) {
                        console.error(chalk.white.bgRed(`[${now}] Ошибка перемещения файла: ${err}`));
                    } else {
                        console.log(chalk.blue(`[${now}] Оригинальный файл перемещен в ${originalFolder}`));
                    }
                });
                console.log(chalk.yellow(`[${now}] Отправлено изображение: ${convertedFile}`));
                return;
            } else {
                console.error(chalk.white.bgRed(`[${now}] Не удалось конвертировать файл: ${mediaFile}`));
                return;
            }
        }

        if (isVideo) {
            await bot.sendVideo(channelId, mediaPath, { caption: postText.trim() === '' ? undefined : postText, parse_mode: 'HTML' });
            sentFiles.add(fileNameWithoutExt);
            console.log(chalk.yellow(`[${now}] Отправлено видео: ${mediaFile}`));
        } else if (isImage) {
            await bot.sendPhoto(channelId, mediaPath, { caption: postText.trim() === '' ? undefined : postText, parse_mode: 'HTML' });
            sentFiles.add(fileNameWithoutExt);
            console.log(chalk.yellow(`[${now}] Отправлено изображение: ${mediaFile}`));
        } else {
            console.error(chalk.white.bgRed(`[${now}] Файл ${mediaFile} не поддерживается для отправки.`));
        }
    
    } catch (error) {
        console.error(chalk.white.bgRed(`[${now}] Ошибка отправки медиафайла: ${error.message}`));
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

    // Проверяем текущее время сразу при запуске
    const currentTime = moment.tz("Europe/Samara"); // Получаем текущее время в Europe/Samara
    const currentTotalMinutes = currentTime.hours() * 60 + currentTime.minutes();

    const startTotalMinutes = startTime.hours() * 60 + startTime.minutes();
    const endTotalMinutes = endTime.hours() * 60 + endTime.minutes();

    // Если текущее время находится в интервале, отправляем первый файл сразу
    if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
        sendMediaFile(mediaFiles[index]);
        index++; // Увеличиваем индекс на 1
    }

    intervalId = setInterval(() => {
        const currentTime = moment.tz("Europe/Samara"); // Получаем текущее время в Europe/Samara
        const currentTotalMinutes = currentTime.hours() * 60 + currentTime.minutes();

        if (currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes) {
            if (index < mediaFiles.length) {
                sendMediaFile(mediaFiles[index]);
                index++; // Увеличиваем индекс на 1
            } else {
                stopSendingMedia();
                bot.sendMessage(chatId, `<b>-----Все медиафайлы были успешно отправлены.------</b>`, {parse_mode: 'HTML'});
                showStartOptions(); // Показать начальные опции
                resetSendingState(); // Сброс состояния отправки
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
    console.log(chalk.bold.green(`[${now}] Прекращена отправка медиафайлов.`));
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
                ['5 сек', '30 мин'],
                ['1 ч', '2 ч'],
                ['3 ч', '4 ч'],
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
        resetSendingState();
        return;
    }

    const options = {
        reply_markup: {
            keyboard: [subfolders], // Все папки в одной строке
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
    } else if (['5 сек', '30 мин', '1 ч', '2 ч', '3 ч', '4 ч'].includes(msg.text)) {
        if (msg.text === '5 сек') {
            interval = 5 * 1000; // Устанавливаем интервал в 5 секунд
        } else if (msg.text === '30 мин') {
            interval = 30 * 60 * 1000; // Устанавливаем интервал в 30 минут
        } else if (msg.text === '1 ч') {
            interval = 1 * 60 * 60 * 1000; // Устанавливаем интервал в 1 час
        } else if (msg.text === '2 ч') {
            interval = 2 * 60 * 60 * 1000; // Устанавливаем интервал в 2 часа
        } else if (msg.text === '3 ч') {
            interval = 3 * 60 * 60 * 1000; // Устанавливаем интервал в 3 часа
        } else if (msg.text === '4 ч') {
            interval = 4 * 60 * 60 * 1000; // Устанавливаем интервал в 4 часа
        }
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
        resetSendingState();

    } 
});

// Функция для сброса состояния отправки
function resetSendingState() {
    chatId = null;
    mediaFolder = './media'; // Сброс к папке по умолчанию
    sendingMedia = false; // Сброс флага отправки
    clearInterval(intervalId); // Остановка интервала, если он запущен
    startTime = null; // Сброс времени начала
    endTime = null; // Сброс времени окончания
    intervalId = null; // Сброс ID интервала
    interval = 10000; // Сброс интервала к значению по умолчанию
}

//вывод ошибок
bot.on("polling_error", (error) => {
    console.error(chalk.white.bgRed(`[${now}] Ошибка опроса: ${error.message}`));
});

console.log(chalk.bold.green(`[${now}] Бот запущен и готов к работе...`));