let enabled = false;
let currentId = null;
let endedId = null;
let endedAt = 0;
let pauseTimeout;
let playing = false;
let mediaTime = 0;
let mediaDuration = 0;
let lastPosition = null;
function sendMsg(message) {
    try {
        chrome.runtime.sendMessage(
            message,
            () => void chrome.runtime.lastError,
        );
    } catch {
        enabled = false;
    }
}
function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || '';
}
function durationToMs(value) {
    const parts = String(value || '')
        .split(':')
        .map(Number);
    return parts.every(Number.isFinite)
        ? parts.reduce((sum, part) => sum * 60 + part, 0) * 1000
        : 0;
}
const albumMetadata = new Map();
function getAlbumMetadata(id, title) {
    const cached = albumMetadata.get(id) || {};
    if (!/\/album\/[a-zA-Z0-9]+/.test(window.location.pathname)) return cached;
    const main = document.querySelector('main');
    const heading = main?.querySelector('h1');
    const album = heading?.textContent?.trim();
    if (!album || !id) return cached;
    const rows = [...(main.querySelectorAll('[role="row"]') || [])];
    const row = rows.find((r) =>
        [...r.querySelectorAll('a[href]')].some(
            (a) =>
                a
                    .getAttribute('href')
                    ?.match(/\/track\/([a-zA-Z0-9]+)/)?.[1] === id &&
                a.textContent.trim() === title,
        ),
    );
    // Never apply the displayed album to an unrelated currently playing song.
    if (!row) return cached;
    let header = heading;
    for (
        let depth = 0;
        header && depth < 6;
        depth++, header = header.parentElement
    ) {
        const lines = (header.innerText || '')
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean);
        const year = lines.find((v) => /^(19|20)\d{2}$/.test(v));
        if (!year || !['Album', 'Single', 'EP'].includes(lines[0])) continue;
        const artists = [...header.querySelectorAll('a[href*="/artist/"]')]
            .map((a) => a.textContent.trim())
            .filter(Boolean);
        if (!artists.length) continue;
        const value = {
            album,
            albumArtist: [...new Set(artists)].join(' & '),
            albumReleaseYear: Number(year),
        };
        const number = row.innerText?.split('\n')[0]?.trim();
        if (/^[1-9]\d*$/.test(number)) value.trackNumber = Number(number);
        else if (cached.album === album && cached.trackNumber)
            value.trackNumber = cached.trackNumber;
        albumMetadata.set(id, value);
        if (albumMetadata.size > 500)
            albumMetadata.delete(albumMetadata.keys().next().value);
        return value;
    }
    return cached;
}
function getLocalTrackInfo() {
    const link = document.querySelector(
        '[data-testid="nowplaying-track-link"], [data-testid="context-item-info-title"] a, a[data-testid="context-item-info-title"]',
    );
    const title =
        text('[data-testid="context-item-info-title"]') ||
        text('[data-testid="nowplaying-track-link"]');
    const artist =
        text('[data-testid="context-item-info-subtitles"]') ||
        text('[data-testid="nowplaying-artist"]');
    if (!title || !artist) return null;
    const context = document.querySelector(
        '[data-testid="now-playing-widget"] a[href*="/playlist/"], [data-testid="context-link"][href*="/playlist/"]',
    );
    const list = document.querySelector(
        '[data-testid="playlist-tracklist"], [data-testid="track-list"]',
    );
    const directory =
        context?.textContent?.trim() ||
        list?.getAttribute('aria-label') ||
        (/\/(playlist|album)\//.test(window.location.pathname)
            ? text('main h1')
            : '');
    const id =
        link?.getAttribute('href')?.match(/\/track\/([a-zA-Z0-9]+)/)?.[1] ||
        `${artist}\n${title}`;
    return {
        id,
        ...getAlbumMetadata(id, title),
        title,
        artist,
        directory,
        duration:
            durationToMs(text('[data-testid="playback-duration"]')) ||
            mediaDuration * 1000,
        positionKnown: Boolean(text('[data-testid="playback-position"]')),
        progress:
            durationToMs(text('[data-testid="playback-position"]')) ||
            mediaTime * 1000,
        cover:
            document.querySelector(
                '[data-testid="now-playing-widget"] img, img[data-testid="cover-art-image"]',
            )?.src || '',
        kbps: 256,
        startTime: Date.now(),
    };
}
function updateTrack() {
    if (!enabled || !playing) return;
    const track = getLocalTrackInfo();
    if (!track) return;
    // Spotify may update its title a moment after the media play event.
    if (!currentId && track.id === endedId && Date.now() - endedAt < 1500)
        return;
    const now = Date.now();
    if (lastPosition && lastPosition.id === track.id && track.positionKnown) {
        const delta = track.progress - lastPosition.progress;
        const elapsed = now - lastPosition.at;
        if (delta < -2000 || delta > elapsed + 2000) {
            // The visible song timeline, not internal media seeks, determines
            // whether the listener actually skipped audio.
            const repeat =
                lastPosition.progress >= track.duration - 3000 &&
                track.progress < 3000;
            sendMsg({
                command: repeat ? 'spotifyEnded' : 'spotifySeeking',
                data: {
                    reason: repeat ? 'timeline-repeat' : 'timeline-jump',
                    from: lastPosition.progress,
                    to: track.progress,
                },
            });
            currentId = null;
        }
        if (delta > 0) clearTimeout(pauseTimeout);
    }
    lastPosition = track.positionKnown
        ? { id: track.id, progress: track.progress, at: now }
        : null;
    if (track.id !== currentId) {
        currentId = track.id;
        endedId = null;
        sendMsg({ command: 'spotifyPlay', data: { track } });
    } else {
        sendMsg({ command: 'spotifyUpdateTrack', data: { track } });
    }
}
document.addEventListener('clipinc-media', ({ detail }) => {
    if (!enabled || !detail) return;
    mediaTime = detail.time;
    mediaDuration = detail.duration;
    sendMsg({
        command: 'spotifyDiagnostic',
        data: {
            event: detail.type,
            mediaTime: detail.time,
            title: getLocalTrackInfo()?.title,
        },
    });
    switch (detail.type) {
        case 'play':
            clearTimeout(pauseTimeout);
            playing = true;
            setVolume(1);
            updateTrack();
            break;
        case 'ended': {
            const track = getLocalTrackInfo();
            // An internal media element ending does not necessarily mean that
            // Spotify's displayed song has ended (videos/previews/replacement).
            if (
                !track?.positionKnown ||
                track.id !== currentId ||
                track.duration <= 0 ||
                track.progress < track.duration - 2000
            )
                break;
            clearTimeout(pauseTimeout);
            endedId = currentId;
            endedAt = Date.now();
            currentId = null;
            lastPosition = null;
            playing = false;
            sendMsg({
                command: 'spotifyEnded',
                data: { reason: 'timeline-ended' },
            });
            break;
        }
        case 'pause':
            clearTimeout(pauseTimeout);
            // Continuing visible playback cancels this timeout in updateTrack.
            pauseTimeout = setTimeout(() => {
                playing = false;
                sendMsg({ command: 'spotifyPause', data: {} });
            }, 2500);
            break;
        case 'abort':
        case 'seeking':
            // These are implementation events inside Spotify. A discontinuity
            // in the visible playback position is handled by updateTrack.
            break;
        default:
            break;
    }
});
// Track changes are not guaranteed to emit ended/play on a reused media element.
setInterval(updateTrack, 250);

// handle player volume change event
function handlePlayerVolumeInput(event) {
    sendMsg({
        command: 'setVolume',
        data: { volume: parseFloat(event.target.value) },
    });
}

// get current volume from dom
function getVolume() {
    let v = 1;
    try {
        v = JSON.parse(localStorage.getItem('playback') || '{}').volume ?? 1;
    } catch {}
    return Math.max(0, Math.min(1, v * v * v));
}

// set volume
function setVolume(volume) {
    const e = new CustomEvent('setvolume', {
        detail: { volume },
    });
    document.dispatchEvent(e);
}

/**
 * Find Spotify's volume button using multiple selectors, newest first.
 * Spotify regularly changes its DOM; this makes the code resilient.
 */
function findVolumeButton() {
    const selectors = [
        // Current Spotify (2025/2026) – data-testid on the volume button
        '[data-testid="volume-bar-toggle-mute-button"]',
        '[data-testid="volume-bar"]',
        // Older layout – aria-describedby
        '.control-button[aria-describedby="volume-icon"]',
        // Generic fallback
        'button[aria-label*="olume"]',
        'button[aria-label*="olumen"]',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
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
    input.value = getVolume().toFixed(2);
    input.classList.add('slider');
    input.addEventListener('input', handlePlayerVolumeInput);

    const volumeBar = document.createElement('div');
    volumeBar.appendChild(input);
    volumeBar.classList.add('volume-bar', 'volume-bar--hijacked');

    const volumeBarElement = findVolumeButton();

    if (volumeBarElement) {
        volumeBarElement.parentNode.appendChild(volumeBar);
        volumeBarElement.style.display = 'none';
    } else {
        // Volume control not found – recording still works, volume just isn't
        // locked to 100%. Log at debug level to avoid noise in the error panel.
        console.debug(
            'clipinc: could not hijack volume control – Spotify DOM may have changed',
        );
    }
}

// remove custom volume control and show old one again
function releaseVolumeControl() {
    const volumeBar = document.querySelector('.volume-bar--hijacked');

    if (volumeBar !== null) {
        volumeBar.parentNode.removeChild(volumeBar);
    }

    const regularVolumeBar = findVolumeButton();
    if (regularVolumeBar) {
        regularVolumeBar.style.display = '';
    }
}

chrome.runtime.onMessage.addListener(({ command, data }, sender, respond) => {
    try {
        if (command === 'prepareRecording') {
            respond({ volume: getVolume() });
        }
        if (command === 'startRecording') {
            enabled = true;
            currentId = null;
            lastPosition = null;
            endedId = null;
            hijackVolumeControl();
            setVolume(1);
            document.dispatchEvent(new CustomEvent('clipinc-request-state'));
            respond({ success: true });
        }
        if (command === 'stopRecording') {
            enabled = false;
            playing = false;
            clearTimeout(pauseTimeout);
            releaseVolumeControl();
            setVolume(data.volume ?? 1);
            respond({ success: true });
        }
    } catch (error) {
        console.error('clipinc:', error);
        respond({ error: error.message });
    }
});
