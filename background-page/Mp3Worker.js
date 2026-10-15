/* eslint-env worker */
/* global Mp3LameEncoder, ID3Writer, globalThis */

const encoderReady = new Promise((resolve) => {
    globalThis.Mp3LameEncoderConfig = { onRuntimeInitialized: resolve };
});
importScripts('./encoders/Mp3Encoder.min.js');
importScripts('./encoders/browser-id3-writer.js');

let metadataReply;
function getMetadata(track) {
    if (!track.album) return Promise.resolve({});
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            metadataReply = null;
            resolve({});
        }, 23000);
        metadataReply = (data) => {
            clearTimeout(timer);
            metadataReply = null;
            resolve(data || {});
        };
        globalThis.postMessage({
            command: 'metadata',
            track: {
                album: track.album,
                albumArtist: track.albumArtist,
                artist: track.artist,
            },
        });
    });
}
const NUM_CH = 2;
let sampleRate = 44100,
    encoder = undefined,
    recBuffers = undefined,
    bufferCount = 0;

function error(message) {
    console.debug('error');
    globalThis.postMessage({
        command: 'error',
        message: `Mp3Worker: ${message}`,
    });
}

function init(data) {
    console.debug('init');
    if (data.config.numChannels === NUM_CH) {
        sampleRate = data.config.sampleRate;
    } else {
        error(`numChannels must be ${NUM_CH}`);
    }
}

function start() {
    console.debug('start', []);
    recBuffers = [];
}

function record(buffer) {
    //console.debug('record', bufferCount, buffer);
    bufferCount++;
    if (recBuffers) recBuffers.push(buffer);
}

function postProgress(progress) {
    //console.debug('progress', progress);
    globalThis.postMessage({ command: 'progress', progress });
}

async function finish(track) {
    await encoderReady;
    const frames = (recBuffers || []).reduce(
        (total, channels) => total + channels[0].length,
        0,
    );
    const recordedMs = (frames / sampleRate) * 1000;
    // Reject empty/partial captures rather than downloading misleading MP3s.
    if (
        recordedMs < 1000 ||
        (track.duration > 0 &&
            recordedMs < track.duration - Math.max(2000, track.duration * 0.02))
    ) {
        throw new Error(
            `Incomplete recording: ${Math.round(recordedMs)} ms of ${
                track.duration || '?'
            } ms (${track.title || 'unknown'})`,
        );
    }

    if (recBuffers) {
        postProgress(0);
        encoder = new Mp3LameEncoder(sampleRate, track.kbps || 256);
        let timeout = Date.now() + 1000;
        while (recBuffers.length > 0) {
            encoder.encode(recBuffers.shift());
            let now = Date.now();
            if (now > timeout) {
                postProgress((bufferCount - recBuffers.length) / bufferCount);
                timeout = now + 1000;
            }
        }
        postProgress(1);
    }

    // save variables locally so cleanup can be run
    const blob = encoder.finish('audio/mpeg');
    cleanup();

    const filePromise = new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onerror = () =>
            reject(new Error('Could not read encoded audio'));
        fileReader.onload = (event) => resolve(event.target.result);
        fileReader.readAsArrayBuffer(blob);
    });

    const imagePromise = track.cover
        ? fetch(track.cover, { signal: AbortSignal.timeout(5000) })
              .then(async (res) => {
                  if (!res.ok) return null;
                  return {
                      arrayBuffer: await res.arrayBuffer(),
                      mimeType: res.headers.get('Content-Type'),
                  };
              })
              .catch(() => null)
        : Promise.resolve(null);

    return Promise.all([filePromise, imagePromise, getMetadata(track)]).then(
        ([file, cover, metadata]) => {
            console.debug('got file and image');

            const writer = new ID3Writer(file);
            writer
                .setFrame('TPE1', [track.artist])
                .setFrame('TIT2', track.title)
                .setFrame('TLEN', track.duration);

            if (
                cover &&
                cover.arrayBuffer &&
                cover.arrayBuffer.byteLength > 0
            ) {
                try {
                    writer.setFrame('APIC', {
                        type: 3,
                        data: cover.arrayBuffer,
                        description: '',
                        mimeType: cover.mimeType,
                    });
                } catch {
                    /* Invalid artwork must not discard the audio. */
                }
            }

            if (metadata.genre) writer.setFrame('TCON', [metadata.genre]);

            if (track.album) {
                writer.setFrame('TALB', track.album);
            }

            if (track.albumArtist) {
                writer.setFrame('TPE2', track.albumArtist);
            }

            if (track.albumReleaseDate) {
                writer.setFrame('TDAT', track.albumReleaseDate);
            }

            if (track.albumReleaseYear) {
                writer.setFrame('TYER', track.albumReleaseYear);
            }

            if (track.discNumber) {
                writer.setFrame('TPOS', track.discNumber);
            }

            if (track.trackNumber) {
                writer.setFrame('TRCK', track.trackNumber);
            }

            writer.addTag();

            console.debug('done');
            // Transfer the raw ArrayBuffer instead of a Blob URL.
            // Blob URLs are scoped to the document that created them and cannot be
            // used by chrome.downloads in the service worker.
            const taggedBuffer = writer.arrayBuffer;
            globalThis.postMessage(
                {
                    command: 'complete',
                    track,
                    buffer: taggedBuffer,
                },
                [taggedBuffer],
            ); // transfer ownership for efficiency
        },
    );
}

function cleanup() {
    console.debug('cleanup');
    encoder = recBuffers = undefined;
    bufferCount = 0;
}

globalThis.onmessage = function (event) {
    let data = event.data;
    switch (data.command) {
        case 'metadata':
            metadataReply?.(data.metadata);
            break;
        case 'init':
            init(data);
            break;
        case 'start':
            start();
            break;
        case 'record':
            record(data.buffer);
            break;
        case 'finish':
            finish(data.track).catch((err) => {
                cleanup();
                error(err.message);
            });
            break;
        case 'cancel':
            cleanup();
            break;
        default:
            break;
    }
};
