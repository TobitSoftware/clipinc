function handlePlay() {
    setTimeout(() => {
        chrome.runtime.sendMessage({command: "play", data: getTrackInfo()});
    }, 10);
}

function handleEnded() {
    chrome.runtime.sendMessage({command: "ended", data: {}})
}

function handleAbort() {
    chrome.runtime.sendMessage({command: "abort", data: {}})
}

function getTrackInfo() {
    const nowPlayingBar = document.querySelector("div.now-playing-bar");

    const title = nowPlayingBar.querySelector(".track-info__name a").innerText;
    const artist = nowPlayingBar.querySelector(".track-info__artists a").innerText;
    const duration = nowPlayingBar.querySelector(".progress-bar + .playback-bar__progress-time").innerText;
    const cover = nowPlayingBar.querySelector(".cover-art-image").style.backgroundImage;

    return {
        title,
        artist,
        duration,
        cover: cover.substring("url(\"".length, cover.length - "\")".length)
    };
}

const s = document.createElement('script');
s.src = chrome.extension.getURL('inject.js');
s.onload = function () {
    this.remove();
    document.addEventListener('play', handlePlay);
    document.addEventListener('ended', handleEnded);
    document.addEventListener('abort', handleAbort);
};
(document.head || document.documentElement).appendChild(s);
