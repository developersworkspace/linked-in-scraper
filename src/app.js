// "C:\Program Files (x86)\Java\jre1.8.0_161\bin\java" -jar -Dwebdriver.chrome.driver=chromedriver.exe selenium-server-standalone-3.0.1.jar

const webdriverio = require('webdriverio');
const options = { desiredCapabilities: { browserName: 'chrome' } };
const client = webdriverio.remote(options);
const fs = require('fs');
const request = require('request');
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'combined.txt' })
    ],
  });

const content = fs.readFileSync(path.join(__dirname, '..', 'data.csv'), 'utf8');

const lines = content.split(/\r?\n/).map((line) => line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/)).slice(1);

const names = lines.map((line) => line[4]);

// Chris Petersen

(async () => {
    const browser = webdriverio
        .remote(options)
        .init()
        .url('https://www.linkedin.com');

    await browser.getTitle();

    browser.setValue('.login-email', 'developersworkspace@gmail.com');
    browser.setValue('.login-password', '');

    await wait(5000);

    browser.click('.login.submit-button');

    await wait(10000);

    for (const name of names) {
        browser.url(`https://www.linkedin.com/search/results/index/?keywords=${name}&origin=GLOBAL_SEARCH_HEADER`);

        await wait(25000);

        const linkElements = await browser.elements('.search-entity.search-result .search-result__info .search-result__result-link');

        const urls = [];

        for (const linkElement of linkElements.value) {
            const url = await browser.elementIdAttribute(linkElement.ELEMENT, 'href');

            urls.push(url.value);
        }

        for (const url of urls) {
            browser.url(url);

            await wait(25000);

            const company = await browser.getHTML('.pv-top-card-section__company');
            
            if (company.indexOf('Euromonitor International') == -1) {
                logger.warn(`Skipping '${url}' for '${name}'`, {
                    name,
                    url,
                });

                continue;
            }

            const style = await browser.getAttribute('.pv-top-card-section__photo', 'style');

            const pattern = /background-image: url\("(.*)"\);/;

            const groups = pattern.exec(style);

            const profileImageUrl = groups[1];

            logger.info(`Donwloading '${profileImageUrl}' for '${name}'`, {
                name,
                profileImageUrl,
            });

            await downloadImage(profileImageUrl, path.join(__dirname, `images/${name.toLowerCase().replace(' ', '-')}.jpg`));

            break;

        }
    }

    // await wait(10000);

    // browser.close();
})();

async function wait(n) {
    return new Promise((resolve, rejext) => {
        setTimeout(resolve, n);
    })
}

async function downloadImage(uri, filename, callback) {
    return new Promise((resolve, reject) => {
        request.head(uri, function (err, res, body) {
            request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve);
        });
    })
};