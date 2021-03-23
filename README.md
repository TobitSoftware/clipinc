<h1 align="center"><a href="https://tobit.software/clipinc" target="_blank">clipinc®</a></h1>

<p align="center">
    <strong>Records Spotify songs in your browser as you listen to them</strong>
</p>

<p align="center">
    <a href="https://chrome.google.com/webstore/detail/clipinc%C2%AE/oppggbgnmeainpanihcbcdniomfobmec" target="_blank">
        <img
            alt="Chrome Web Store"
            src="https://img.shields.io/chrome-web-store/v/oppggbgnmeainpanihcbcdniomfobmec?style=for-the-badge&color=%2310B981&labelColor=%2327272A"
        />
    </a>
    <a href="https://chrome.google.com/webstore/detail/clipinc%C2%AE/oppggbgnmeainpanihcbcdniomfobmec" target="_blank">
        <img
            alt="Chrome Web Store"
            src="https://img.shields.io/chrome-web-store/users/oppggbgnmeainpanihcbcdniomfobmec?style=for-the-badge&color=%230EA5E9&labelColor=%2327272A"
        />
    </a>
    <a href="https://github.com/TobitSoftware/clipinc/blob/main/LICENSE" target="_blank">
        <img
            alt="GitHub"
            src="https://img.shields.io/github/license/TobitSoftware/clipinc?style=for-the-badge&color=%236366F1&labelColor=%2327272A"
        />
    </a>
</p>

<p align="center">
    <a href="#-downloads"><b>Downloads</b></a>
    <span>  •  </span>
    <a href="#-local-development"><b>Local Development</b></a>
    <span>  •  </span>
    <a href="#-contribute"><b>Contribute</b></a>
</p>
 
---

This browser extension records Spotify songs as you listen to them and saves
them to your default download directory.

For more information visit our [website](https://tobit.software/clipinc) (in
German).

## ❯ Downloads

The extension is available from both the Chrome Web Store and the Microsoft
Edge-Add-Ons:

<p align="center">
    <a href="https://chrome.google.com/webstore/detail/clipinc%C2%AE/oppggbgnmeainpanihcbcdniomfobmec" target="_blank">
        <img
            src="./readme-assets/chrome-web-store.png"
            alt="Available in the Chrome Web Store"
            height="48"
        />
    </a>
    <a href="https://microsoftedge.microsoft.com/addons/detail/clipinc%C2%AE/chioloodckidjhigkknplmlelmcghmfm" target="_blank">
        <img
            src="./readme-assets/microsoft-store.png"
            alt="Get it from Microsoft"
            height="48"
        />
    </a>
</p>

## ❯ Local Development

1. Clone repository
2. Install the dependencies by running `npm i`
3. Build a development version by running `npm run dev-build`
4. Open `chrome://extensions` or `edge://extensions`
5. Activate developer mode
6. Load the `dist/` directory as an unpacked extension

After performing changes you have to run the `npm run dev-build` command again
and reload the extension to pick up your changes.

## ❯ Contribute

If you think you have any ideas that could benefit the project, feel free to
create an issue or pull request!
