// handle player play event
function handlePlayerPlay() {
    getTrackInfo().then((track) => {
        chrome.runtime.sendMessage({command: 'spotifyPlay', data: { track }});
    });
}

// handle player ended event
function handlePlayerEnded() {
    getTrackInfo().then((track) => {
        chrome.runtime.sendMessage({command: 'spotifyEnded', data: { track }});
    });
}

// handle player abort event
function handlePlayerAbort() {
    chrome.runtime.sendMessage({command: 'spotifyAbort', data: {}});
}

// handle player pause event
function handlePlayerPause() {
    chrome.runtime.sendMessage({command: 'spotifyPause', data: {}});
}

// get track info from dom
const getTrackInfo = () => new Promise((resolve) => {
    const recentlyPlayed = document.querySelector('.recently-played');
    const isGroup = recentlyPlayed.querySelector('.icon.RecentlyPlayedWidget__playing-icon.spoticon-volume-16') !== null;
    const lastPlayed = JSON.parse(localStorage.getItem('playbackHistory'))[0].name;
    const isPremium = document.querySelector('.AdsContainer') === null;

    fetch('https://api.spotify.com/v1/me/player', {
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`
        }
    }).then(res => res.json())
        .then((t) => {
            const track = t.item;

            console.log("progress", track.progress_ms);

            resolve({
                title: track.name,
                artist: track.artists.reduce((acc, a) => acc + (acc ? ', ' : '') + a.name, ''),
                duration: track.duration_ms,
                cover: track.album.images[2].url,
                album: track.album.name,
                discNumber: track.disc_number,
                trackNumber: track.track_number,
                albumArtist: track.album.artists.reduce((acc, a) => acc + (acc ? ', ' : '') + a.name, ''),
                albumReleaseYear: parseInt(track.album.release_date.substring(0, 4), 10),
                isPremium,
                kbps: isPremium ? 256 : 128,
                directory: isGroup ? lastPlayed : undefined,
                progress: t.progress_ms,
                startTime: new Date()
            });
        })
        .catch((err) => {
            console.error('clipinc: could not retrieve remote track info', err);

            const nowPlayingBar = document.querySelector('div.now-playing-bar');

            const artist = nowPlayingBar.querySelector('.track-info__artists').innerText;
            const title = nowPlayingBar.querySelector('.track-info__name').innerText;
            const duration = nowPlayingBar.querySelector('.progress-bar + .playback-bar__progress-time').innerText;
            const cover = nowPlayingBar.querySelector('.cover-art-image').style.backgroundImage;

            resolve({
                artist,
                title,
                duration: durationToMs(duration),
                cover: cover.substring('url("'.length, cover.length - '")'.length),
                isPremium,
                kbps: isPremium ? 256 : 128,
                directory: isGroup ? lastPlayed : undefined,
                progress: 0,
                startTime: Date.now()
            })
        });
});

// parses duration to ms
function durationToMs(duration) {
    const times = duration.split(':');
    return (parseInt(times[0], 10) * 60 + parseInt(times[1], 10)) * 1000;
}

// retrieves a field from the cookies
function getCookie(key) {
    const cookies = document.cookie.split('; ');

    for (let i = 0, l = cookies.length; i < l; i++) {
        const c = cookies[i].split('=');
        if (c[0] === key) {
            return c[1];
        }
    }

    return '';
}

function getAccessToken() {
    return getCookie('wp_access_token');
}

// checks if playback is on the local device
function getIsLocalDevice() {
    return document.querySelector('.connect-bar') === null;
}

// get current volume from dom
function getVolume() {
    const v = JSON.parse(localStorage.getItem('playback')).volume;
    return Math.max(0, Math.min(1, v * v * v));
}

// set volume
function setVolume(volume) {
    const e = new CustomEvent('setvolume', {
        detail: {volume}
    });
    document.dispatchEvent(e)
}

// overwrite spotify volume control, to prevent gain change while recording
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
    input.addEventListener('input', handlePlayerVolumeInput);

    const volumeBar = document.createElement('div');
    volumeBar.appendChild(input);
    volumeBar.classList.add('volume-bar', 'volume-bar--hijacked');

    document.querySelector('.volume-bar').parentNode.appendChild(volumeBar);
    document.querySelector('.volume-bar').style.display = 'none';
}

// remove custom volume control and show old one again
function releaseVolumeControl() {
    const volumeBar = document.querySelector('.volume-bar--hijacked');

    if (volumeBar !== null) {
        volumeBar.parentNode.removeChild(volumeBar);
    }

    document.querySelector('.volume-bar').style.display = '';
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

//load inject.js to start the player hijack
function hijackPlayer() {
    const s = document.createElement('script');
    s.src = chrome.extension.getURL('inject.js');
    s.onload = function () {
        this.remove();

        document.addEventListener('play', handlePlayerPlay);
        document.addEventListener('ended', handlePlayerEnded);
        document.addEventListener('pause', handlePlayerPause);
        document.addEventListener('abort', handlePlayerAbort);

        //event listener to increase volume for first track
        document.addEventListener('initplayer', () => {
            chrome.storage.local.get('isRecording', ({isRecording}) => {
                console.log("initplayer, isRecording: ", isRecording);

                if (isRecording) {
                    setVolume(1);
                }
            })
        });

        // if player is already recording, hijack volume control immediately
        chrome.storage.local.get('isRecording', ({isRecording}) => {
            if (isRecording) {
                hijackVolumeControl();
            }
        });
    };
    (document.head || document.documentElement).appendChild(s);
}

// hijack player as soon as script is ready
hijackPlayer();
