function handlePlay() {
    chrome.runtime.sendMessage({command: "play", data: {}});
}

function handleEnded() {
    chrome.runtime.sendMessage({command: "ended", data: getTrackInfo()})
}

function handleAbort() {
    chrome.runtime.sendMessage({command: "abort", data: {}})
}

function handlePause() {
    chrome.runtime.sendMessage({command: "pause", data: {}})
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
        duration: durationToSeconds(duration),
        cover: cover.substring("url(\"".length, cover.length - "\")".length),
        kbps: document.querySelector(".main-view-container--has-ads") === null ? 256 : 128
    };
}

function durationToSeconds(duration) {
    const times = duration.split(":");
    return parseInt(times[0], 10) * 60 + parseInt(times[1], 10);
}

chrome.runtime.onMessage.addListener((command) => {
    let button;

    if (command === 'play') {
        button = document.querySelector(".control-button[title=\"Play\"]");
    } else if (command === 'pause') {
        button = document.querySelector(".control-button[title=\"Pause\"]");
    }

    if (button) {
        button.click();
    }
});

const s = document.createElement('script');
s.src = chrome.extension.getURL('inject.js');
s.onload = function () {
    this.remove();
    document.addEventListener('play', handlePlay);
    document.addEventListener('ended', handleEnded);
    document.addEventListener('abort', handleAbort);
    document.addEventListener('pause', handlePause);
};
(document.head || document.documentElement).appendChild(s);
