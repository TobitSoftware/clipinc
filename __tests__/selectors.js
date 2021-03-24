const {
    getAlbumName,
    getTrackName,
    getArtistName,
    getTrackDuration,
    getCoverImageSrc,
} = require('../content/selectors');
const ChromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');

const USERNAME = 'babawo9543@donmah.com';
const PASSWORD = 'passwort123';
const ALBUM_URL = 'https://open.spotify.com/album/7gsWAHLeT0w7es6FofOXk1';

let browser;
let page;

beforeAll(async () => {
    try {
        const executablePath = ChromeLauncher.Launcher.getFirstInstallation();

        console.log(`Google Chrome Binary found at \`${executablePath}\``);

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--window-size=1920,1080'],
            executablePath,
        });

        const pages = await browser.pages();
        page = pages[0];

        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });

        /** ======================
        ========= LOGIN ==========
        ======================= */

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

        /** ======================
        ===== COOKIE NOTICE ======
        ======================= */

        const buttonXPath = "//button[contains(., 'Accept Cookies')]";
        await page.waitForXPath(buttonXPath);
        await page.waitForTimeout(1000);

        const [button] = await page.$x(buttonXPath);
        if (button) {
            await button.click();
        }

        await page.waitForTimeout(500);

        /** ======================
        ======= PLAY TRACK =======
        ======================= */

        await page.goto(ALBUM_URL, { waitUntil: 'networkidle2' });

        const trackNameXPath = `//*[contains(text(), "Famous")]`;
        await page.waitForXPath(trackNameXPath);
        await page.waitForTimeout(500);
        const [trackNameElement] = await page.$x(trackNameXPath);
        await trackNameElement.click({ clickCount: 2, delay: 50 });

        await page.waitForTimeout(2000);
    } catch (e) {
        console.error(e);
    }
}, 60000);

afterAll(async () => {
    await browser.close();
});

test('should find album name', async () => {
    const albumName = await page.evaluate(getAlbumName);

    expect(albumName).toBe('The Life Of Pablo');
});

test('should find track name', async () => {
    const trackName = await page.evaluate(getTrackName);

    expect(trackName).toBe('Famous');
});

test('should find artist name', async () => {
    const artistName = await page.evaluate(getArtistName);

    expect(artistName).toBe('Kanye West');
});

test('should find track duration', async () => {
    const trackDuration = await page.evaluate(getTrackDuration);

    expect(trackDuration).toBe('3:16');
});

test('should find cover image src', async () => {
    const coverImageSrc = await page.evaluate(getCoverImageSrc);

    // Check that the src is a URL.
    expect(coverImageSrc).toMatch(
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i
    );
});
