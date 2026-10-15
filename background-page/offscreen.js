import { Recorder } from './recorder';

let session = null;
const urls = new Set();
function post(command, data) {
    chrome.runtime.sendMessage(
        { target: 'background', command, data },
        () => void chrome.runtime.lastError,
    );
}
function state() {
    post('captureState', {
        isRecording: Boolean(session),
        tabId: session?.tabId || 0,
        track: session?.track || null,
        stopAfterTrack: Boolean(session?.stopAfterTrack),
    });
}
// State and media processing survive suspension of the MV3 service worker.
setInterval(() => {
    if (session) {
        state();
        if (session.recorder.active)
            session.recorder.diagnose(
                session.recorder.active,
                'recorder-health',
            );
    }
}, 20000);

async function startCapture({ streamId, volume, tabId }) {
    if (session) throw new Error('Recording already active');
    let stream, context;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            },
            video: false,
        });
        context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const monitor = context.createGain();
        monitor.gain.value = volume;
        source.connect(monitor).connect(context.destination);
        const recorder = new Recorder(source);
        await recorder.ready;
        await context.resume();
        session = {
            stream,
            context,
            recorder,
            monitor,
            tabId,
            track: null,
            savedVolume: volume,
        };
        recorder.onMetadata = (track) =>
            chrome.runtime.sendMessage({
                target: 'background',
                command: 'lookupGenre',
                data: {
                    album: track.album,
                    albumArtist: track.albumArtist,
                    artist: track.artist,
                },
            });
        recorder.onComplete = (_, track, buffer) => {
            const url = URL.createObjectURL(
                new Blob([buffer], { type: 'audio/mpeg' }),
            );
            urls.add(url);
            post('downloadTrack', { url, track });
        };
        recorder.onDiagnostic = (data) =>
            post('captureDiagnostic', {
                ...data,
                title: data.title || session?.track?.title,
            });
        recorder.onError = (_, message) => post('captureError', { message });
        state();
    } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        await context?.close();
        throw error;
    }
}
function finishTrack() {
    if (!session?.track) return;
    if (session.track.type === 'ad') session.recorder.cancelRecording();
    else session.recorder.finishRecording(session.track);
    session.track = null;
    if (session.stopAfterTrack) {
        post('captureStopped', stopCapture());
        return true;
    }
    return false;
}
function setStopAfterTrack({ enabled, trackId } = {}) {
    if (!session) return { success: false, error: 'Keine Aufnahme aktiv.' };
    if (
        enabled &&
        (!session.track ||
            session.track.type === 'ad' ||
            session.track.id !== trackId)
    ) {
        return {
            success: false,
            error: 'Der Titel hat gewechselt oder es läuft noch keine Songaufnahme. Bitte erneut wählen.',
        };
    }
    session.stopAfterTrack = Boolean(enabled);
    state();
    return { success: true, enabled: session.stopAfterTrack };
}
function stopCapture() {
    if (!session) return;
    const old = session;
    session = null;
    old.recorder.cancelRecording();
    old.stream.getTracks().forEach((track) => track.stop());
    old.monitor.disconnect();
    // Allow already completed songs to finish encoding after Stop.
    const cleanup = setInterval(() => {
        if (old.recorder.jobs.size === 0) {
            clearInterval(cleanup);
            old.context.close();
        }
    }, 250);
    state();
    return { tabId: old.tabId, volume: old.savedVolume };
}
function media({ command, data, tabId }) {
    if (!session || session.tabId !== tabId) return;
    const track = data?.track;
    if (command !== 'spotifyUpdateTrack' && command !== 'setVolume') {
        post('captureDiagnostic', {
            event: command,
            title: session.track?.title,
            detail: data,
        });
    }
    switch (command) {
        case 'spotifyPlay':
            if (!track?.id) return;
            if (session.track?.id === track.id) {
                session.track = {
                    ...session.track,
                    ...track,
                    kbps: session.track.kbps,
                };
                break;
            }
            if (finishTrack()) return;
            session.track = { ...track };
            if (track.type !== 'ad') session.recorder.startRecording();
            break;
        case 'spotifyUpdateTrack':
            if (track?.id === session.track?.id)
                session.track = {
                    ...session.track,
                    ...track,
                    kbps: session.track.kbps,
                };
            break;
        case 'spotifyEnded':
            if (finishTrack()) return;
            break;
        case 'spotifyAbort':
        case 'spotifySeeking':
            if (session.stopAfterTrack) {
                post('captureStopped', stopCapture());
                return;
            }
            session.recorder.cancelRecording();
            session.track = null;
            break;
        case 'spotifyPause': {
            const stopped = stopCapture();
            post('captureStopped', stopped);
            return;
        }
        case 'setVolume':
            session.monitor.gain.value = Math.max(0, Math.min(1, data.volume));
            break;
        default:
            break;
    }
    state();
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.target !== 'offscreen') return;
    const { command, data } = message;
    if (command === 'start') {
        startCapture(data).then(
            () => respond({ success: true }),
            (error) => respond({ success: false, error: error.message }),
        );
        return true;
    }
    if (command === 'setStopAfterTrack') respond(setStopAfterTrack(data));
    if (command === 'stop') respond(stopCapture() || {});
    if (command === 'media') media(data);
    if (command === 'status')
        respond({ active: Boolean(session), tabId: session?.tabId });
    if (command === 'releaseUrl' && urls.delete(data.url))
        URL.revokeObjectURL(data.url);
});
