const puppeteer = require('puppeteer');
const path = require('path');
const ChromeLauncher = require('chrome-launcher');

const CRX_PATH = path.resolve('src/');
const USERNAME = 'babawo9543@donmah.com';
const PASSWORD = 'passwort123';
const EXTENSION_NAME = 'clipinc®';

// The song "Frank's Track" by Kanye West, because it is pretty short (38 seconds).
const ALBUM_URL = 'https://open.spotify.com/album/7gsWAHLeT0w7es6FofOXk1';

const CHROME_EXECUTABLE_PATH = ChromeLauncher.Launcher.getFirstInstallation();

puppeteer
    .launch({
        // Extensions are not supported in headless mode
        headless: false,
        defaultViewport: { width: 1200, height: 1000 },
        args: [
            `--disable-extensions-except=${CRX_PATH}`,
            `--load-extension=${CRX_PATH}`,
        ],
        executablePath: CHROME_EXECUTABLE_PATH,
    })
    .then(async (browser) => {
        const [page] = await browser.pages();
        await page.goto(
            'https://accounts.spotify.com/en/login?continue=https:%2F%2Fopen.spotify.com%2F',
            { waitUntil: 'networkidle2' }
        );

        const usernameSelector = 'input[name=username]';
        await page.waitForSelector(usernameSelector);
        await page.type(usernameSelector, USERNAME, { delay: 20 });

        const passwordSelector = 'input[name=password]';
        await page.waitForSelector(passwordSelector);
        await page.type(passwordSelector, PASSWORD, { delay: 20 });

        await page.keyboard.press('Enter');

        const submitButtonSelector = 'button[id=login-button]';
        await page.waitForSelector(submitButtonSelector);
        await page.click(submitButtonSelector, { delay: 1000 });

        const buttonXPath = "//button[contains(., 'Accept Cookies')]";
        await page.waitForXPath(buttonXPath);
        await page.waitForTimeout(1000);
        const [button] = await page.$x(buttonXPath);
        if (button) {
            await button.click();
        }

        await page.waitForTimeout(500);
        await page.goto(ALBUM_URL, { waitUntil: 'networkidle2' });

        const trackNameXPath = `//*[contains(text(), "Frank's Track")]`;
        await page.waitForXPath(trackNameXPath);
        await page.waitForTimeout(2000);
        const [trackNameElement] = await page.$x(trackNameXPath);
        await trackNameElement.click({ clickCount: 2 });

        const targets = browser.targets();
        const extensionTarget = targets.find(({ _targetInfo }) => {
            return (
                _targetInfo.title === EXTENSION_NAME &&
                _targetInfo.type === 'background_page'
            );
        });

        const extensionUrl = extensionTarget._targetInfo.url || '';
        const [, , extensionID] = extensionUrl.split('/');

        const extensionPopupHtml = 'popup/popup.html';

        const extensionPage = await browser.newPage();
        await extensionPage.goto(
            `chrome-extension://${extensionID}/${extensionPopupHtml}`
        );

        // await browser.close();
    });
