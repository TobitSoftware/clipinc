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
    const isPremium = document.querySelector(".main-view-container--has-ads") === null;

    return {
        title,
        artist,
        duration: durationToSeconds(duration),
        cover: cover.substring("url(\"".length, cover.length - "\")".length),
        kbps: isPremium ? 256 : 128
    };
}

function getVolume() {
    const v = JSON.parse(localStorage.getItem('playback')).volume;
    return Math.max(0, Math.min(1, v * v * v));
}

function setVolume(volume) {
    const e = new CustomEvent('setvolume', {
        detail: { volume }
    });
    document.dispatchEvent(e)
}

function hijackVolumeControl() {

}

function hijackPlayer() {
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
}

function durationToSeconds(duration) {
    const times = duration.split(":");
    return parseInt(times[0], 10) * 60 + parseInt(times[1], 10);
}

chrome.runtime.onMessage.addListener(({command, data}, sender, sendResponse) => {
    switch (command) {
        case 'prepareRecording':
            const oldVolume = getVolume();
            setVolume(1);
            sendResponse({volume: oldVolume});
            break;
        case 'startRecording':
            const play = document.querySelector(".control-button[title=\"Play\"]");
            if (play) {
                play.click();
            }
            break;
        case 'stopRecording':
            setVolume(data.volume);
            const pause = document.querySelector(".control-button[title=\"Pause\"]");
            if (pause) {
                pause.click();
            }
            break;
    }
});

hijackPlayer();