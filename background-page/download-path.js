export function safeSegment(value, fallback = '') {
    return (
        String(value || '')
            .normalize('NFC')
            // Remove control characters forbidden in download filenames.
            // eslint-disable-next-line no-control-regex
            .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[. ]+|[. ]+$/g, '')
            .slice(0, 100)
            .trim() || fallback
    );
}
export function downloadPath(track) {
    return [
        'clipinc',
        safeSegment(track.directory),
        `${safeSegment(track.artist, 'Unbekannt')} - ${safeSegment(
            track.title,
            'Unbekannt',
        )}.mp3`,
    ]
        .filter(Boolean)
        .join('/');
}
