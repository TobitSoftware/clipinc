function handlePlay() {
    chrome.runtime.sendMessage({command: 'play', data: {}});
}

function handleEnded() {
    chrome.runtime.sendMessage({command: 'ended', data: {track: getTrackInfo()}});
}

function handleAbort() {
    chrome.runtime.sendMessage({command: 'abort', data: {}});
}

function handlePause() {
    chrome.runtime.sendMessage({command: 'pause', data: {}});
}

function handleVolumeInput(event) {
    chrome.runtime.sendMessage({command: 'setVolume', data: {volume: parseFloat(event.target.value)}});
}

function getTrackInfo() {
    const nowPlayingBar = document.querySelector('div.now-playing-bar');

    const artist = nowPlayingBar.querySelector('.track-info__artists a').innerText;
    const title = nowPlayingBar.querySelector('.track-info__name a').innerText;
    const duration = nowPlayingBar.querySelector('.progress-bar + .playback-bar__progress-time').innerText;
    const cover = nowPlayingBar.querySelector('.cover-art-image').style.backgroundImage;
    const isPremium = document.querySelector('.main-view-container--has-ads') === null;
    const isGroup = document.querySelector('.icon.playing-icon.spoticon-volume-16') !== null;
    const type = document.querySelector('.icon.playing-icon.spoticon-volume-16 + .type');
    const isAlbum = type && type.innerText.toLocaleLowerCase() === 'album';
    const isPlaylist = type && type.innerText.toLocaleLowerCase() === 'playlist';
    const lastPlayed = JSON.parse(localStorage.getItem('playbackHistory'))[0].name;


    return {
        artist,
        title,
        duration: durationToSeconds(duration),
        cover: cover.substring('url("'.length, cover.length - '")'.length),
        kbps: isPremium ? 256 : 128,
        playlist: isGroup && isPlaylist ? lastPlayed : undefined,
        album: isGroup && isAlbum ? lastPlayed : undefined
    };
}

function getIsLocalDevice() {
    return document.querySelector('.connect-bar') === null;
}

function getVolume() {
    const v = JSON.parse(localStorage.getItem('playback')).volume;
    return Math.max(0, Math.min(1, v * v * v));
}

function setVolume(volume) {
    const e = new CustomEvent('setvolume', {
        detail: {volume}
    });
    document.dispatchEvent(e)
}

function hijackVolumeControl() {
    if (document.querySelector('.volume-bar--hijacked') !== null) {
        return;
    }

    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = 1;
    input.step = 0.01;
    input.value = JSON.parse(localStorage.getItem('playback')).volume.toFixed(2);
    input.classList.add('slider');
    input.addEventListener('input', handleVolumeInput);

    const volumeBar = document.createElement('div');
    volumeBar.appendChild(input);
    volumeBar.classList.add('volume-bar', 'volume-bar--hijacked');

    document.querySelector('.volume-bar').parentNode.appendChild(volumeBar);
    document.querySelector('.volume-bar').style.display = 'none';
}

function releaseVolumeControl() {
    const volumeBar = document.querySelector('.volume-bar--hijacked');

    if (volumeBar !== null) {
        volumeBar.parentNode.removeChild(volumeBar);
    }

    document.querySelector('.volume-bar').style.display = '';
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

        //event listener to increase volume for first track
        document.addEventListener('initplayer', () => {
            chrome.storage.local.get('isRecording', ({isRecording}) => {
                console.log("initplayer, isRecording: ", isRecording);

                if (isRecording) {
                    setVolume(1);
                }
            })
        });
    };
    (document.head || document.documentElement).appendChild(s);
}

function durationToSeconds(duration) {
    const times = duration.split(':');
    return parseInt(times[0], 10) * 60 + parseInt(times[1], 10);
}

chrome.runtime.onMessage.addListener(({command, data}, sender, sendResponse) => {
    switch (command) {
        case 'prepareRecording':
            const error = !getIsLocalDevice() ? 'cannot record from remote device' : undefined;
            const oldVolume = getVolume();

            if (!error) {
                hijackVolumeControl();
                setVolume(1);
            }

            sendResponse({volume: oldVolume, error});
            break;
        case 'startRecording':
            const play = document.querySelector('.control-button.spoticon-play-16');
            if (play) {
                play.click();
            }
            break;
        case 'stopRecording':
            releaseVolumeControl();
            setVolume(data.volume);
            const pause = document.querySelector('.control-button.spoticon-pause-16');
            if (pause) {
                pause.click();
            }
            break;
    }
});

hijackPlayer();
chrome.storage.local.get('isRecording', ({isRecording}) => {
    if (isRecording) {
        hijackVolumeControl();
    }
});