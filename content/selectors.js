export function getAlbumName() {
    const trackList = document.querySelector('div[data-testid="track-list"]');

    return trackList ? trackList.getAttribute('aria-label') || '' : '';
}

export function getTrackName() {
    const titleElement = document.querySelector(
        'a[data-testid="nowplaying-track-link"]'
    );

    return titleElement.textContent;
}

export function getArtistName() {
    const artistElement = document.querySelector(
        'a[data-testid="nowplaying-artist"]'
    );

    return artistElement.textContent;
}

export function getTrackDuration() {
    const durationElement = document.querySelector(
        '[data-testid="playback-duration"]'
    );

    return durationElement.textContent;
}

export function getCoverImageSrc() {
    const coverElement = document.querySelector(
        'img[data-testid="cover-art-image"]'
    );

    return coverElement.getAttribute('src');
}
