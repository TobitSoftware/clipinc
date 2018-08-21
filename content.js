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

function enableVolume() {
    document.querySelector('.volume-bar').style.opacity = "";
    document.querySelector('.volume-bar').style.pointerEvents = "";
}

function disableVolume() {
    document.querySelector('.volume-bar').style.opacity = "0.5";
    document.querySelector('.volume-bar').style.pointerEvents = "none";
}

function durationToSeconds(duration) {
    const times = duration.split(":");
    return parseInt(times[0], 10) * 60 + parseInt(times[1], 10);
}

chrome.runtime.onMessage.addListener((command) => {
    let button;

    if (command === 'play') {
        disableVolume();
        button = document.querySelector(".control-button[title=\"Play\"]");
    } else if (command === 'pause') {
        enableVolume();
        button = document.querySelector(".control-button[title=\"Pause\"]");
    }

    if (button) {
        button.click();
    }
});

//inject script to hijack player
const s = document.createElement('script');
s.src = chrome.extension.getURL('inject.js');
s.onload = function () {
    this.remove();
    document.addEventListener('play', handlePlay);
    document.addEventListener('ended', handleEnded);
    document.addEventListener('pause', handlePause);
    document.addEventListener('abort', handleAbort);
};
(document.head || document.documentElement).appendChild(s);

const btn = document.createElement("button");
btn.classList.add("control-button", "control-button--circled");
btn.setAttribute("title", "Record");
btn.addEventListener('click', () => {
    chrome.runtime.sendMessage("startCapture");
});

const playBtn = document.querySelector(`button[title="Play"]`);
playBtn.parentNode.insertBefore(btn, playBtn);


