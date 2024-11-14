const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// URL страницы для парсинга
const url = 'https://www.yapfiles.ru/cat/1/'; // Замените на нужный URL

// Функция для скачивания файла
const downloadFile = async (fileUrl, filePath) => {
    const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream',
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

// Функция для получения имени домена без www и расширения
const getDomainName = (url) => {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return domain.split('.').slice(0, -1).join('.'); // Удаляем доменное расширение
};

// Функция для парсинга страницы
const parsePage = async () => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Получаем все изображения и видео на странице
        const imageUrls = [];
        const videoUrls = [];

        // Получаем изображения
        $('img').each((index, element) => {
            const imgUrl = $(element).attr('src');
            if (imgUrl) {
                imageUrls.push(imgUrl);
            }
        });

        // Получаем видео (например, теги video и iframe)
        $('video, source, iframe, embed, object').each((index, element) => {
            const videoUrl = $(element).attr('src');
            if (videoUrl) {
                videoUrls.push(videoUrl);
            }
        });

        // Получаем имя домена
        const domainName = getDomainName(url);
        
        // Создаем структуру папок для сохранения медиа
        const baseDir = path.join(__dirname, 'downloads', domainName);
        const imagesDir = path.join(baseDir, 'images');
        const videosDir = path.join(baseDir, 'video');

        // Создаем папки, если они не существуют
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.mkdirSync(videosDir, { recursive: true });

        // Скачиваем изображения
        for (const imageUrl of imageUrls) {
            const fullUrl = new URL(imageUrl, url).href;
            const fileName = path.basename(fullUrl);
            const filePath = path.join(imagesDir, fileName);
            console.log(`Скачивание изображения: ${fullUrl}`);
            await downloadFile(fullUrl, filePath);
        }

        // Скачиваем видео
        for (const videoUrl of videoUrls) {
            const fullUrl = new URL(videoUrl, url).href;
            const fileName = path.basename(fullUrl);
            const filePath = path.join(videosDir, fileName);
            console.log(`Скачивание видео: ${fullUrl}`);
            await downloadFile(fullUrl, filePath);
        }

        console.log('Скачивание завершено');
    } catch (error) {
        console.error('Ошибка при парсинге страницы:', error);
    }
};

// Запускаем парсинг
parsePage();