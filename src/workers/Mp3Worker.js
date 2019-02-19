importScripts('/../encoders/Mp3Encoder.min.js');
importScripts('/../encoders/browser-id3-writer.js');

const NUM_CH = 2;
let sampleRate = 44100,
    options = undefined,
    encoder = undefined,
    recBuffers = undefined,
    bufferCount = 0;

function error(message) {
    self.postMessage({command: 'error', message: `Mp3Worker: ${message}`});
}

function init(data) {
    if (data.config.numChannels === NUM_CH) {
        sampleRate = data.config.sampleRate;
        options = data.options;
    } else {
        error(`numChannels must be ${NUM_CH}`);
    }
}

function start() {
    recBuffers = [];
}

function record(buffer) {
    bufferCount++;
    recBuffers.push(buffer);
}

function postProgress(progress) {
    self.postMessage({command: 'progress', progress});
}

function finish(track) {
    if (recBuffers) {
        postProgress(0);
        encoder = new Mp3LameEncoder(sampleRate, track.kbps);
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

    const filePromise = new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (event) => resolve(event.target.result);
        fileReader.readAsArrayBuffer(blob);
    });

    const imagePromise = fetch(track.cover).then(res => res.arrayBuffer()
        .then((arrayBuffer) => ({
            arrayBuffer,
            mimeType: res.headers.get('Content-Type')
        }))
    );

    Promise.all([filePromise, imagePromise])
        .then(([file, cover]) => {
            const writer = new ID3Writer(file);
            writer.setFrame('TPE1', [track.artist])
                .setFrame('TIT2', track.title)
                .setFrame('TLEN', track.duration);

            if (cover && cover.arrayBuffer && cover.arrayBuffer.byteLength > 0) {
                writer.setFrame('APIC', {
                    type: 3,
                    data: cover.arrayBuffer,
                    description: '',
                    mimeType: cover.mimeType
                });
            }

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

            track.url = writer.getURL();
            self.postMessage({
                command: 'complete',
                track
            });
        });
}

function cleanup() {
    encoder = recBuffers = undefined;
    bufferCount = 0;
}

self.onmessage = function (event) {
    let data = event.data;
    switch (data.command) {
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
            finish(data.track);
            break;
        case 'cancel':
            cleanup();
    }
};
