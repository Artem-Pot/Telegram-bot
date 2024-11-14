//Парсер файлов с сайтов в папку downloads // npm run start3

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// URL страницы для парсинга
const url = 'http://www.smeha.ru/'; // Замените на нужный URL

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

// Функция для парсинга страницы
const parsePage = async () => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Получаем все изображения на странице
        const imageUrls = [];
        $('img').each((index, element) => {
            const imgUrl = $(element).attr('src');
            if (imgUrl) {
                imageUrls.push(imgUrl);
            }
        });

        // Создаем папку для сохранения изображений
        const dir = path.join(__dirname, 'downloads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Скачиваем каждое изображение
        for (const imageUrl of imageUrls) {
            // Полный URL
            const fullUrl = new URL(imageUrl, url).href;
            const fileName = path.basename(fullUrl);
            const filePath = path.join(dir, fileName);
            console.log(`Скачивание: ${fullUrl}`);
            await downloadFile(fullUrl, filePath);
        }

        console.log('Скачивание завершено');
    } catch (error) {
        console.error('Ошибка при парсинге страницы:', error);
    }
};

// Запускаем парсинг
parsePage();