importScripts("/../encoders/Mp3Encoder.min.js");
importScripts("/../encoders/browser-id3-writer.js");

const NUM_CH = 2; // constant
let sampleRate = 44100,
    options = undefined,
    encoder = undefined,
    recBuffers = undefined,
    track = undefined,
    bufferCount = 0;

function error(message) {
    self.postMessage({command: "error", message: "mp3: " + message});
}

function init(data) {
    if (data.config.numChannels === NUM_CH) {
        sampleRate = data.config.sampleRate;
        options = data.options;
    } else {
        error("numChannels must be " + NUM_CH);
    }
}

function start(t) {
    recBuffers = [];
    track = t
}

function record(buffer) {
    bufferCount++;
    recBuffers.push(buffer);
}

function postProgress(progress) {
    self.postMessage({command: "progress", progress: progress});
}

function finish() {
    if (recBuffers) {
        postProgress(0);
        encoder = new Mp3LameEncoder(sampleRate, 256);
        let timeout = Date.now() + 1000;
        while (recBuffers.length > 0) {
            encoder.encode(recBuffers.shift());
            let now = Date.now();
            if (now > timeout) {
                console.log(bufferCount, recBuffers.length);
                postProgress((bufferCount - recBuffers.length) / bufferCount);
                timeout = now + 1000;
            }
        }
        postProgress(1);
    }

    const blob = encoder.finish("audio/mpeg");
    const t = track;
    cleanup();

    const filePromise = new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (event) => resolve(event.target.result);
        fileReader.readAsArrayBuffer(blob);
    });

    const imagePromise = fetch(t.cover).then(res => res.arrayBuffer());

    Promise.all([filePromise, imagePromise])
        .then(([file, cover]) => {
            console.log('cover', cover);

            const writer = new ID3Writer(file);
            writer.setFrame("TPE1", [t.artist])
                .setFrame("TALB", t.title)
                .setFrame("APIC", {
                    type: 3,
                    data: cover.arrayBuffer,
                    description: ''
                });
            writer.addTag();

            t.url = writer.getURL();
            self.postMessage({
                command: "complete",
                track: t
            });
        });
}

function cleanup() {
    encoder = recBuffers = track = undefined;
    bufferCount = 0;
}

self.onmessage = function (event) {
    let data = event.data;
    switch (data.command) {
        case "init":
            init(data);
            break;
        case "start":
            start(data.track);
            break;
        case "record":
            record(data.buffer);
            break;
        case "finish":
            finish();
            break;
        case "cancel":
            cleanup();
    }
};

self.postMessage({command: "loaded"});
