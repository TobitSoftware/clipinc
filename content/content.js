import './inject';

let trackTimeout;

// handle player play event
function handlePlayerPlay() {
    chrome.runtime.sendMessage(
        { command: 'spotifyPlay', data: { track: getLocalTrackInfo() } },
        (response) => {}
    );
    trackTimeout = setTimeout(() => {
        getTrackInfo().then((track) => {
            chrome.runtime.sendMessage({
                command: 'spotifyUpdateTrack',
                data: { track },
            });
        });
    }, 1000);
}

// handle player ended event
function handlePlayerEnded() {
    clearTimeout(trackTimeout);
    chrome.runtime.sendMessage(
        { command: 'spotifyEnded', data: {} },
        (response) => {}
    );
}

// handle player abort event
function handlePlayerAbort() {
    clearTimeout(trackTimeout);
    chrome.runtime.sendMessage(
        { command: 'spotifyAbort', data: {} },
        (response) => {}
    );
}

// handle player pause event
function handlePlayerPause() {
    chrome.runtime.sendMessage(
        { command: 'spotifyPause', data: {} },
        (response) => {}
    );
}

// handle player pause event
function handlePlayerSeek() {
    chrome.runtime.sendMessage({ command: 'spotifySeeking', data: {} });
}

// handle player volume change event
function handlePlayerVolumeInput(event) {
    chrome.runtime.sendMessage({
        command: 'setVolume',
        data: { volume: parseFloat(event.target.value) },
    });
}

/**
 * Checks if current playing Track is in an Album
 * @returns {boolean}
 */
function isAlbumTrack() {
    const playIcon = document.querySelector('.cover-art-playback playing');

    return false;
}

/**
 * Searches in the DOM for the album name
 * @returns {string}
 */
function getAlbumName() {
    const trackList = document.querySelector('div[data-testid="track-list"]');

    return trackList ? trackList.getAttribute('aria-label') || '' : '';
}

/**
 * Searches in the DOM for the playlist name
 * @returns {string}
 */
function getPlayListName() {
    const trackList = document.querySelector(
        'div[data-testid="playlist-tracklist"]'
    );

    return trackList?.getAttribute('aria-label') || '';
}

/**
 * Checks if the current playing Track is in a Playlist
 * @returns {boolean}
 */
function isTrackInPlayList() {
    const playlist = document.querySelector(
        'div[data-testid="playlist-tracklist"]'
    );

    return Boolean(playlist);
}

// get track info from dom
const getTrackInfo = () =>
    new Promise((resolve) => {
        let directoryName = '';
        const isPlaylistTrack = isTrackInPlayList();

        if (!isPlaylistTrack) {
            directoryName = getAlbumName();
        } else {
            directoryName = getPlayListName();
        }
        const isPremium = document.querySelector('.AdsContainer') === null;

        fetch(
            'https://open.spotify.com/get_access_token?reason=transport&productType=web_player'
        )
            .then((data) => data.json())
            .then((json) => {
                if (json.accessToken && json.accessToken !== '') {
                    fetch('https://api.spotify.com/v1/me/player', {
                        headers: {
                            Authorization: `Bearer ${json.accessToken}`,
                        },
                    })
                        .then((res) => res.json())
                        .then((t) => {
                            if (t.currently_playing_type === 'ad') {
                                const track = getLocalTrackInfo();
                                track.type = 'ad';
                                resolve(track);
                                return;
                            }

                            const track = t.item;

                            resolve({
                                title: track.name,
                                artist: track.artists.reduce(
                                    (acc, a) =>
                                        acc + (acc ? ', ' : '') + a.name,
                                    ''
                                ),
                                duration: track.duration_ms,
                                cover: track.album.images
                                    ? track.album.images[0].url
                                    : undefined,
                                album: track.album.name,
                                discNumber: track.disc_number,
                                trackNumber: track.track_number,
                                albumArtist: track.album.artists.reduce(
                                    (acc, a) =>
                                        acc + (acc ? ', ' : '') + a.name,
                                    ''
                                ),
                                albumReleaseYear: parseInt(
                                    track.album.release_date.substring(0, 4),
                                    10
                                ),
                                isPremium,
                                kbps: isPremium ? 256 : 128,
                                directory:
                                    directoryName !== ''
                                        ? directoryName
                                        : undefined,
                                progress: t.progress_ms,
                                startTime: new Date(),
                            });
                        })
                        .catch((err) => {
                            console.error(
                                'clipinc: could not retrieve remote track info',
                                err
                            );
                            resolve(getLocalTrackInfo());
                        });
                }
            })
            .catch((ex) => {
                console.log('ex', ex);
            });
    });

function getLocalTrackInfo() {
    let directoryName = '';

    const isPlaylistTrack = isTrackInPlayList();

    if (!isPlaylistTrack) {
        directoryName = getAlbumName();
    } else {
        directoryName = getPlayListName();
    }
    const isPremium = document.querySelector('.AdsContainer') === null;

    const title = document.querySelector(
        '[data-testid="context-item-info-title"]'
    ).textContent;
    const artist = document.querySelector(
        '[data-testid="context-item-info-subtitles"]'
    ).textContent;

    const duration =
        document.querySelector('[data-testid="playback-duration"]')
            .textContent || 0;
    const cover =
        document.querySelector('img[data-testid="cover-art-image"]').src || '';

    return {
        artist,
        title,
        duration: durationToMs(duration),
        cover,
        isPremium,
        kbps: isPremium ? 256 : 128,
        directory: directoryName !== '' ? directoryName : undefined,
        progress: 0,
        startTime: Date.now(),
    };
}

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
    const connectBar = document.querySelector('.ConnectBar');

    return connectBar === null;
}

// get current volume from dom
function getVolume() {
    const v = JSON.parse(localStorage.getItem('playback')).volume;
    return Math.max(0, Math.min(1, v * v * v));
}

// set volume
function setVolume(volume) {
    const e = new CustomEvent('setvolume', {
        detail: { volume },
    });
    document.dispatchEvent(e);
}

// overwrite spotify volume control, to prevent gain change while recording
function hijackVolumeControl() {
    const hijackedVolumeBar = document.querySelector('.volume-bar--hijacked');

    if (hijackedVolumeBar !== null) {
        return;
    }

    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0;
    input.max = 1;
    input.step = 0.01;
    input.value = JSON.parse(localStorage.getItem('playback')).volume.toFixed(
        2
    );
    input.classList.add('slider');
    input.addEventListener('input', handlePlayerVolumeInput);

    const volumeBar = document.createElement('div');
    volumeBar.appendChild(input);
    volumeBar.classList.add('volume-bar', 'volume-bar--hijacked');

    const volumeBarElement = document.querySelector('.volume-bar');

    volumeBarElement.parentNode.appendChild(volumeBar);
    volumeBarElement.style.display = 'none';
}

// remove custom volume control and show old one again
function releaseVolumeControl() {
    const volumeBar = document.querySelector('.volume-bar--hijacked');

    if (volumeBar !== null) {
        volumeBar.parentNode.removeChild(volumeBar);
    }

    const regularVolumeBar = document.querySelector('.volume-bar');

    regularVolumeBar.style.display = '';
}

chrome.runtime.onMessage.addListener(
    ({ command, data }, sender, sendResponse) => {
        switch (command) {
            case 'prepareRecording':
                const isReady =
                    document.querySelector('body.clipinc-ready') !== null;

                if (!isReady) {
                    window.location.reload();
                    return;
                }

                const error = !getIsLocalDevice()
                    ? 'cannot record from remote device'
                    : undefined;
                const oldVolume = getVolume();

                if (!error) {
                    hijackVolumeControl();
                    setVolume(1);
                }

                sendResponse({ volume: oldVolume, error });
                break;
            case 'startRecording':
                skipBack();
                setTimeout(() => {
                    if (!play()) {
                        // if track is already running when starting the recording
                        // dispatch play event so the track is known to clipinc
                        handlePlayerPlay();
                    }
                }, 1000);
                break;
            case 'stopRecording':
                releaseVolumeControl();
                setVolume(data.volume);
                break;
        }
    }
);

function play() {
    const playButton = document.querySelector(
        '.control-button.spoticon-play-16'
    );

    if (playButton) {
        playButton.click();
        return true;
    }

    return false;
}

function pause() {
    const pauseButton = document.querySelector(
        '.control-button.spoticon-pause-16'
    );

    if (pauseButton) {
        pauseButton.click();
        return true;
    }

    return false;
}

function skipBack() {
    const skipBackButton = document.querySelector(
        '.control-button.spoticon-skip-back-16'
    );

    if (skipBackButton) {
        skipBackButton.click();
        return true;
    }

    return false;
}

//load inject.js to start the player hijack
function hijackPlayer() {
    const s = document.createElement('script');
    s.src = chrome.extension.getURL('content/inject.js');
    s.onload = function () {
        this.remove();

        document.addEventListener('play', handlePlayerPlay);
        document.addEventListener('ended', handlePlayerEnded);
        document.addEventListener('pause', handlePlayerPause);
        document.addEventListener('abort', handlePlayerAbort);
        document.addEventListener('seeking', handlePlayerSeek);

        //event listener to increase volume for first track
        document.addEventListener('initplayer', () => {
            chrome.storage.local.get('isRecording', ({ isRecording }) => {
                if (isRecording) {
                    setVolume(1);
                }
            });
        });

        // if player is already recording, hijack volume control immediately
        chrome.storage.local.get('isRecording', ({ isRecording }) => {
            if (isRecording) {
                hijackVolumeControl();
                play();
            }
        });
    };
    (document.head || document.documentElement).appendChild(s);
}

// hijack player as soon as script is ready
hijackPlayer();
