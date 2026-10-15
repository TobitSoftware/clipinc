import { createGenreLookup } from './musicbrainz';
import { downloadPath } from './download-path';

const OFFSCREEN_URL = chrome.runtime.getURL('background-page/offscreen.html');
const ICON_URL = chrome.runtime.getURL('assets/images/clipinc-128.png');
let starting = false;
let creating;
let downloadQueue = Promise.resolve();
let mediaQueue = Promise.resolve();
let iconQueue = Promise.resolve();
let lastIcon;
let diagnosticQueue = Promise.resolve();
// Chrome drops fetch's User-Agent header; set it only for this extension's
// MusicBrainz API calls, using a session rule scoped to the granted host.
let identification;
const lookupGenre = createGenreLookup({
    fetchData: (...args) => fetch(...args),
    storage: chrome.storage.local,
    identify: () => {
        if (!identification)
            identification = chrome.declarativeNetRequest
                .updateSessionRules({
                    removeRuleIds: [7301],
                    addRules: [
                        {
                            id: 7301,
                            priority: 1,
                            action: {
                                type: 'modifyHeaders',
                                requestHeaders: [
                                    {
                                        header: 'User-Agent',
                                        operation: 'set',
                                        value: 'clipinc-local/1.12.12 (https://github.com/TobitSoftware/clipinc)',
                                    },
                                ],
                            },
                            condition: {
                                urlFilter: '|https://musicbrainz.org/ws/2/',
                                initiatorDomains: [chrome.runtime.id],
                                resourceTypes: ['xmlhttprequest'],
                            },
                        },
                    ],
                })
                .catch((error) => {
                    identification = null;
                    throw error;
                });
        return identification;
    },
});
function offscreen(command, data) {
    return chrome.runtime.sendMessage({ target: 'offscreen', command, data });
}
function broadcast(command, data) {
    chrome.runtime.sendMessage(
        { target: 'popup', command, data },
        () => void chrome.runtime.lastError,
    );
}
async function exists() {
    return (
        (
            await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT'],
                documentUrls: [OFFSCREEN_URL],
            })
        ).length > 0
    );
}
async function ensureOffscreen() {
    if (await exists()) return;
    if (!creating)
        creating = chrome.offscreen
            .createDocument({
                url: OFFSCREEN_URL,
                reasons: ['USER_MEDIA', 'BLOBS', 'WORKERS'],
                justification:
                    'Record tab audio, encode MP3 files and hold download URLs',
            })
            .finally(() => {
                creating = null;
            });
    await creating;
}
function icon(recording) {
    if (lastIcon === recording) return iconQueue;
    lastIcon = recording;
    // Use extension-root URLs: the service worker lives in background-page/.
    // Queue transitions and do not reload eight images on every track update.
    iconQueue = iconQueue
        .then(() =>
            chrome.action.setIcon({
                path: Object.fromEntries(
                    [16, 32, 48, 128].map((size) => [
                        size,
                        chrome.runtime.getURL(
                            `assets/images/clipinc-${size}${
                                recording ? '-record' : ''
                            }.png`,
                        ),
                    ]),
                ),
            }),
        )
        .catch((error) => {
            console.warn(
                'clipinc: Symbol konnte nicht aktualisiert werden:',
                error.message,
            );
        });
    return iconQueue;
}
async function reset() {
    await chrome.storage.local.set({
        isRecording: false,
        stopAfterTrack: false,
        tabId: 0,
        track: null,
        songCount: 0,
    });
    icon(false);
}
chrome.runtime.onInstalled.addListener(reset);
chrome.runtime.onStartup.addListener(reset);
async function restore({ tabId, volume } = {}) {
    if (tabId)
        await chrome.tabs
            .sendMessage(tabId, { command: 'stopRecording', data: { volume } })
            .catch(() => {});
    await chrome.storage.local.set({
        isRecording: false,
        stopAfterTrack: false,
        tabId: 0,
        track: null,
    });
    icon(false);
}
async function stopCapture() {
    if (await exists()) await restore(await offscreen('stop'));
    else await restore();
}
async function startCapture() {
    if (starting) throw new Error('Aufnahme wird bereits gestartet');
    starting = true;
    let tab, prepared;
    try {
        await ensureOffscreen();
        if ((await offscreen('status'))?.active) return;
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.startsWith('https://open.spotify.com/'))
            throw new Error('Bitte den Spotify-Webplayer öffnen');
        prepared = await chrome.tabs.sendMessage(tab.id, {
            command: 'prepareRecording',
        });
        if (!prepared || prepared.error)
            throw new Error(prepared?.error || 'Spotify-Seite bitte neu laden');
        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
        });
        const response = await offscreen('start', {
            streamId,
            volume: prepared.volume ?? 1,
            tabId: tab.id,
        });
        if (!response?.success)
            throw new Error(response?.error || 'Audiostart fehlgeschlagen');
        await chrome.storage.local.set({ songCount: 0, lastError: null });
        await chrome.tabs.sendMessage(tab.id, { command: 'startRecording' });
    } catch (error) {
        await stopCapture();
        if (prepared && tab)
            await restore({ tabId: tab.id, volume: prepared.volume });
        throw error;
    } finally {
        starting = false;
    }
}
async function reportError(message) {
    console.error('clipinc:', message);
    await chrome.storage.local.set({ lastError: message });
    broadcast('captureError', { message });
}
async function downloadTrack({ url, track }) {
    if (!url.startsWith(`blob:chrome-extension://${chrome.runtime.id}/`))
        throw new Error('Invalid recording URL');
    try {
        const id = await chrome.downloads.download({
            url,
            filename: downloadPath(track),
            conflictAction: 'uniquify',
            saveAs: false,
        });
        // Session storage survives service worker suspension.
        await chrome.storage.session.set({
            [`download:${id}`]: { url, track },
        });
        const [item] = await chrome.downloads.search({ id });
        if (item && item.state !== 'in_progress')
            await settleDownload(id, item.state, item.error);
    } catch (error) {
        await offscreen('releaseUrl', { url });
        throw error;
    }
}
async function settleDownload(id, state, error) {
    const key = `download:${id}`;
    const saved = (await chrome.storage.session.get(key))[key];
    if (!saved) return;
    await chrome.storage.session.remove(key);
    await offscreen('releaseUrl', { url: saved.url });
    if (state !== 'complete')
        return reportError(`Download fehlgeschlagen: ${error || state}`);
    const { songCount = 0 } = await chrome.storage.local.get('songCount');
    await chrome.storage.local.set({ songCount: songCount + 1 });
    broadcast('downloaded', { songCount: songCount + 1 });
    chrome.notifications.create({
        type: 'basic',
        title: 'clipinc',
        message: `${saved.track.artist} – ${saved.track.title} gespeichert`,
        iconUrl: ICON_URL,
    });
}
chrome.downloads.onChanged.addListener((delta) => {
    if (!['complete', 'interrupted'].includes(delta.state?.current)) return;
    downloadQueue = downloadQueue
        .then(() =>
            settleDownload(delta.id, delta.state.current, delta.error?.current),
        )
        .catch((error) => reportError(error.message));
});
// Register all routers at worker startup; never rely on per-session closures.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    const { command, data, target } = message;
    if (target === 'offscreen' || target === 'popup') return;
    if (command === 'exportDiagnostics' && !sender.tab) {
        chrome.storage.local
            .get(['captureDiagnostics', 'lastError'])
            .then(async (diagnostics) => {
                await chrome.downloads.download({
                    url:
                        'data:application/json;charset=utf-8,' +
                        encodeURIComponent(
                            JSON.stringify(
                                {
                                    build: 'capture-timeline-2',
                                    exportedAt: new Date().toISOString(),
                                    ...diagnostics,
                                },
                                null,
                                2,
                            ),
                        ),
                    filename: 'clipinc/diagnose.json',
                    conflictAction: 'uniquify',
                    saveAs: false,
                });
                respond({ success: true });
            })
            .catch((error) =>
                respond({ success: false, error: error.message }),
            );
        return true;
    }
    if (command === 'startCapture') {
        startCapture().then(
            () => respond({ success: true }),
            (error) => {
                reportError(error.message);
                respond({ success: false, error: error.message });
            },
        );
        return true;
    }
    if (command === 'setStopAfterTrack' && !sender.tab) {
        const request = mediaQueue.then(() =>
            offscreen('setStopAfterTrack', data),
        );
        mediaQueue = request.catch(() => {});
        request.then(respond, (error) =>
            respond({ success: false, error: error.message }),
        );
        return true;
    }
    if (command === 'stopCapture') {
        stopCapture().then(
            () => respond({ success: true }),
            (error) => respond({ success: false, error: error.message }),
        );
        return true;
    }
    if (
        sender.tab &&
        (command.startsWith('spotify') || command === 'setVolume')
    ) {
        // Preserve media-event order while reading the saved quality at song start.
        mediaQueue = mediaQueue
            .then(async () => {
                let forwarded = data;
                if (command === 'spotifyPlay' && data?.track) {
                    const { recordingBitrate } =
                        await chrome.storage.local.get('recordingBitrate');
                    const kbps = [128, 192, 256, 320].includes(recordingBitrate)
                        ? recordingBitrate
                        : 256;
                    forwarded = { ...data, track: { ...data.track, kbps } };
                }
                await offscreen('media', {
                    command,
                    data: forwarded,
                    tabId: sender.tab.id,
                });
            })
            .catch((error) => console.debug('clipinc media:', error.message));
        return;
    }
    if (sender.url !== OFFSCREEN_URL) return;
    if (command === 'lookupGenre') {
        lookupGenre(data).then(respond);
        return true;
    }
    if (command === 'captureState') {
        chrome.storage.local.set(data);
        icon(data.isRecording);
        broadcast('spotifyPlay', { track: data.track });
    }
    if (command === 'captureStopped') restore(data);
    if (command === 'captureDiagnostic') {
        diagnosticQueue = diagnosticQueue
            .then(async () => {
                const { captureDiagnostics = [] } =
                    await chrome.storage.local.get('captureDiagnostics');
                captureDiagnostics.push({
                    at: new Date().toISOString(),
                    ...data,
                });
                await chrome.storage.local.set({
                    captureDiagnostics: captureDiagnostics.slice(-100),
                });
            })
            .catch((error) =>
                console.warn('clipinc diagnostic:', error.message),
            );
    }
    if (command === 'captureError') reportError(data.message);
    if (command === 'downloadTrack') {
        downloadQueue = downloadQueue
            .then(() => downloadTrack(data))
            .catch((error) => reportError(error.message));
    }
});
chrome.tabs.onRemoved.addListener(async (id) => {
    const { tabId } = await chrome.storage.local.get('tabId');
    if (tabId === id) await stopCapture();
});
chrome.tabs.onUpdated.addListener(async (id, change) => {
    const { tabId } = await chrome.storage.local.get('tabId');
    if (id === tabId && change.status === 'loading') await stopCapture();
});
