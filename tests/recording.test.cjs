const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function recorderHarness() {
    const workers = [],
        nodes = [];
    class Worker {
        constructor() {
            this.messages = [];
            workers.push(this);
        }
        postMessage(data) {
            this.messages.push(data);
        }
        terminate() {
            this.terminated = true;
        }
    }
    class AudioWorkletNode {
        constructor() {
            this.port = {
                postMessage: (data) => {
                    this.request = data;
                },
            };
            nodes.push(this);
        }
        connect() {}
        disconnect() {}
    }
    const context = {
        sampleRate: 44100,
        audioWorklet: { addModule: async () => {} },
        createGain: () => ({ connect() {}, disconnect() {} }),
    };
    const scope = vm.createContext({ Worker, AudioWorkletNode, URL });
    vm.runInContext(
        read('background-page/recorder.js')
            .replace(
                'export class Recorder',
                'globalThis.Recorder = class Recorder',
            )
            .replaceAll('import.meta.url', "'file:///extension/recorder.js'"),
        scope,
    );
    return {
        recorder: new scope.Recorder({ context, connect() {} }),
        workers,
        nodes,
    };
}
test('finishing song A while B is recording never resets or kills B', async () => {
    const { recorder, workers, nodes } = recorderHarness();
    await recorder.ready;
    recorder.startRecording();
    recorder.finishRecording({ title: 'A' });
    recorder.startRecording();
    nodes[0].port.onmessage({
        data: {
            command: 'record',
            buffer: [new Float32Array(128), new Float32Array(128)],
        },
    });
    nodes[0].port.onmessage({ data: { command: 'flushed' } });
    let completed;
    recorder.onComplete = (_, track) => {
        completed = track.title;
    };
    workers[0].onmessage({
        data: {
            command: 'complete',
            track: { title: 'A' },
            buffer: new ArrayBuffer(1),
        },
    });
    assert.equal(completed, 'A');
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[1].terminated, undefined);
    assert.equal(recorder.isRecording(), true);
    assert.deepEqual(
        workers[0].messages.map((m) => m.command),
        ['init', 'start', 'record', 'finish'],
    );
});
test('duplicate starts do not allocate/reset a second recording', async () => {
    const { recorder, workers } = recorderHarness();
    await recorder.ready;
    recorder.startRecording();
    recorder.startRecording();
    assert.equal(workers.length, 1);
    recorder.cancelRecording();
    assert.equal(workers[0].terminated, true);
    assert.equal(recorder.jobs.size, 0);
});
test('download paths retain playlist and Unicode and prevent traversal', () => {
    const scope = vm.createContext({});
    vm.runInContext(
        read('background-page/download-path.js').replaceAll('export ', ''),
        scope,
    );
    assert.equal(
        scope.downloadPath({
            directory: 'Meine Playlist',
            artist: 'Björk',
            title: 'Jóga',
        }),
        'clipinc/Meine Playlist/Björk - Jóga.mp3',
    );
    assert.equal(
        scope.downloadPath({
            directory: '../..',
            artist: 'A/B',
            title: 'Song: 1',
        }),
        'clipinc/A B - Song 1.mp3',
    );
});
function workerHarness() {
    const messages = [];
    const scope = vm.createContext({
        console: { debug() {} },
        importScripts() {
            scope.Mp3LameEncoderConfig.onRuntimeInitialized();
        },
        Blob,
        AbortSignal,
        fetch: async () => {
            throw new Error('Cover offline');
        },
        FileReader: class {
            readAsArrayBuffer(blob) {
                blob.arrayBuffer().then((result) =>
                    this.onload({ target: { result } }),
                );
            }
        },
        Mp3LameEncoder: class {
            encode() {}
            finish() {
                return new Blob([new Uint8Array(10000)]);
            }
        },
        ID3Writer: class {
            constructor(file) {
                this.arrayBuffer = file;
            }
            setFrame() {
                return this;
            }
            addTag() {}
        },
        postMessage: (data) => messages.push(data),
    });
    vm.runInContext(read('background-page/Mp3Worker.js'), scope);
    const send = (command, data = {}) =>
        scope.onmessage({ data: { command, ...data } });
    send('init', { config: { sampleRate: 44100, numChannels: 2 } });
    send('start');
    return { send, messages };
}
test('missing cover does not prevent audio download', async () => {
    const { send, messages } = workerHarness();
    send('record', {
        buffer: [new Float32Array(88200), new Float32Array(88200)],
    });
    send('finish', {
        track: {
            title: 'A',
            artist: 'B',
            duration: 2000,
            cover: 'https://invalid/cover',
        },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(messages.at(-1).command, 'complete');
});
test('empty and partial recordings report error without a download', async () => {
    for (const frames of [0, 128, 44100]) {
        const { send, messages } = workerHarness();
        if (frames)
            send('record', {
                buffer: [new Float32Array(frames), new Float32Array(frames)],
            });
        send('finish', {
            track: { title: 'A', artist: 'B', duration: 180000 },
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(messages.at(-1).command, 'error');
        assert.match(messages.at(-1).message, /Incomplete/);
    }
});
test('offscreen ignores duplicate plays and stale metadata while finishing each song once', () => {
    const recorders = [],
        events = [];
    class Recorder {
        constructor() {
            recorders.push(this);
            this.jobs = new Set();
            this.ready = Promise.resolve();
        }
        startRecording() {
            events.push('start');
        }
        finishRecording(track) {
            events.push(`finish:${track.id}`);
        }
        cancelRecording() {
            events.push('cancel');
        }
    }
    const scope = vm.createContext({
        Recorder,
        setInterval() {},
        chrome: {
            runtime: { sendMessage() {}, onMessage: { addListener() {} } },
        },
    });
    vm.runInContext(
        read('background-page/offscreen.js').replace(
            "import { Recorder } from './recorder';",
            '',
        ),
        scope,
    );
    vm.runInContext(
        'session = { tabId: 1, recorder: new Recorder(), track: null }',
        scope,
    );
    const media = (command, id, tabId = 1) =>
        scope.media({ command, data: { track: { id, title: id } }, tabId });
    media('spotifyPlay', 'A');
    media('spotifyPlay', 'A');
    media('spotifyPlay', 'B');
    media('spotifyUpdateTrack', 'A');
    media('spotifyPlay', 'foreign', 2);
    media('spotifyEnded');
    media('spotifyEnded');
    assert.deepEqual(events, ['start', 'finish:A', 'start', 'finish:B']);
});
for (const kbps of [128, 192, 256, 320])
    test(`real encoder produces ${kbps} kbit/s MP3 with dynamic code generation disabled`, async () => {
        const messages = [];
        let complete;
        const result = new Promise((resolve) => {
            complete = resolve;
        });
        const scope = vm.createContext(
            {
                console: { log() {}, debug() {}, warn() {}, error() {} },
                Blob,
                AbortSignal,
                setTimeout,
                clearTimeout,
                FileReader: class {
                    readAsArrayBuffer(blob) {
                        blob.arrayBuffer().then((result) =>
                            this.onload({ target: { result } }),
                        );
                    }
                },
                XMLHttpRequest: class {
                    open(method, url) {
                        this.url = url;
                    }
                    send() {
                        const bytes = fs.readFileSync(
                            path.join(root, this.url),
                        );
                        this.response = bytes.buffer.slice(
                            bytes.byteOffset,
                            bytes.byteOffset + bytes.byteLength,
                        );
                        this.status = 200;
                        setTimeout(() => this.onload(), 0);
                    }
                },
                postMessage(message) {
                    messages.push(message);
                    if (['complete', 'error'].includes(message.command))
                        complete(message);
                },
                importScripts(file) {
                    vm.runInContext(
                        read(path.join('background-page', file)),
                        scope,
                    );
                },
            },
            { codeGeneration: { strings: false, wasm: false } },
        );
        scope.self = scope;
        vm.runInContext(read('background-page/Mp3Worker.js'), scope);
        scope.onmessage({
            data: {
                command: 'init',
                config: { sampleRate: 44100, numChannels: 2 },
            },
        });
        scope.onmessage({ data: { command: 'start' } });
        for (let block = 0; block < 100; block++) {
            const audio = Float32Array.from(
                { length: 882 },
                (_, n) =>
                    0.3 *
                    Math.sin((2 * Math.PI * 440 * (block * 882 + n)) / 44100),
            );
            scope.onmessage({
                data: { command: 'record', buffer: [audio, audio.slice()] },
            });
        }
        scope.onmessage({
            data: {
                command: 'finish',
                track: {
                    title: 'Synthetic tone',
                    artist: 'Test',
                    duration: 2000,
                    kbps,
                },
            },
        });
        const message = await result;
        assert.equal(message.command, 'complete', message.message);
        const bytes = Buffer.from(message.buffer);
        assert.equal(bytes.subarray(0, 3).toString(), 'ID3');
        assert.ok(
            bytes.length > kbps * 250 && bytes.length < kbps * 250 + 10000,
            `unexpected MP3 size ${bytes.length}`,
        );
        // On macOS, independently inspect duration with the system audio parser.
        if (process.platform === 'darwin') {
            const os = require('node:os');
            const dir = fs.mkdtempSync(
                path.join(os.tmpdir(), 'clipinc-audio-test-'),
            );
            try {
                const file = path.join(dir, 'tone.mp3');
                fs.writeFileSync(file, bytes);
                const info = require('node:child_process').execFileSync(
                    '/usr/bin/afinfo',
                    [file],
                    { encoding: 'utf8' },
                );
                const duration = Number(
                    info.match(/estimated duration: ([\d.]+)/)?.[1],
                );
                assert.ok(duration >= 2 && duration < 2.2, info);
                assert.equal(
                    Number(info.match(/bit rate: (\d+)/)?.[1]),
                    kbps * 1000,
                );
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    });
test('content bridge tolerates missing DOM and emits a single start per track', () => {
    const listeners = {},
        messages = [],
        selectors = new Map();
    const scope = vm.createContext({
        console,
        Date,
        setInterval() {},
        setTimeout,
        clearTimeout,
        window: { location: { pathname: '/playlist/example' } },
        document: {
            addEventListener(type, callback) {
                listeners[type] = callback;
            },
            querySelector: (selector) => selectors.get(selector) || null,
        },
        chrome: {
            runtime: {
                sendMessage(message) {
                    messages.push(message);
                },
                onMessage: { addListener() {} },
            },
        },
    });
    vm.runInContext(read('content/content.js'), scope);
    vm.runInContext('enabled = true; playing = true', scope);
    scope.updateTrack();
    assert.equal(messages.length, 0);
    selectors.set('[data-testid="context-item-info-title"]', {
        textContent: 'Song A',
    });
    selectors.set('[data-testid="context-item-info-subtitles"]', {
        textContent: 'Artist',
    });
    selectors.set('[data-testid="playback-duration"]', { textContent: '3:00' });
    scope.updateTrack();
    scope.updateTrack();
    assert.deepEqual(
        messages.map((m) => m.command),
        ['spotifyPlay', 'spotifyUpdateTrack'],
    );
    selectors.set('[data-testid="context-item-info-title"]', {
        textContent: 'Song B',
    });
    scope.updateTrack();
    assert.equal(messages.at(-1).command, 'spotifyPlay');
    assert.equal(messages.at(-1).data.track.duration, 180000);
});

test('internal seeks and aborts do not reset continuous song playback; real timeline jumps do', () => {
    const listeners = {},
        messages = [],
        selectors = new Map();
    const scope = vm.createContext({
        console,
        Date,
        setInterval() {},
        setTimeout,
        clearTimeout,
        window: { location: { pathname: '/playlist/example' } },
        document: {
            addEventListener(type, callback) {
                listeners[type] = callback;
            },
            querySelector: (selector) => selectors.get(selector) || null,
        },
        chrome: {
            runtime: {
                sendMessage(message) {
                    messages.push(message);
                },
                onMessage: { addListener() {} },
            },
        },
    });
    vm.runInContext(read('content/content.js'), scope);
    vm.runInContext('enabled = true; playing = true', scope);
    selectors.set('[data-testid="context-item-info-title"]', {
        textContent: 'Song A',
    });
    selectors.set('[data-testid="context-item-info-subtitles"]', {
        textContent: 'Artist',
    });
    selectors.set('[data-testid="playback-duration"]', { textContent: '3:00' });
    selectors.set('[data-testid="playback-position"]', { textContent: '0:10' });
    scope.updateTrack();
    for (const type of ['seeking', 'abort', 'ended', 'seeking']) {
        listeners['clipinc-media']({
            detail: { type, time: 0, duration: 180 },
        });
        scope.updateTrack();
    }
    assert.equal(messages.filter((m) => m.command === 'spotifyPlay').length, 1);
    assert.equal(
        messages.filter((m) =>
            ['spotifySeeking', 'spotifyAbort', 'spotifyEnded'].includes(
                m.command,
            ),
        ).length,
        0,
    );
    selectors.set('[data-testid="playback-position"]', { textContent: '1:00' });
    scope.updateTrack();
    assert.equal(
        messages.filter((m) => m.command === 'spotifySeeking').length,
        1,
    );
    assert.equal(messages.filter((m) => m.command === 'spotifyPlay').length, 2);
});

test('quality is latched per song despite settings changes and metadata updates', () => {
    const finished = [];
    class Recorder {
        startRecording() {}
        finishRecording(track) {
            finished.push(track);
        }
        cancelRecording() {}
    }
    const scope = vm.createContext({
        Recorder,
        setInterval() {},
        chrome: {
            runtime: { sendMessage() {}, onMessage: { addListener() {} } },
        },
    });
    vm.runInContext(
        read('background-page/offscreen.js').replace(
            "import { Recorder } from './recorder';",
            '',
        ),
        scope,
    );
    vm.runInContext(
        'session = { tabId: 1, recorder: new Recorder(), track: null }',
        scope,
    );
    const send = (command, id, kbps) =>
        scope.media({ command, tabId: 1, data: { track: { id, kbps } } });
    send('spotifyPlay', 'A', 192);
    send('spotifyUpdateTrack', 'A', 256);
    send('spotifyPlay', 'A', 320);
    send('spotifyPlay', 'B', 320);
    send('spotifyUpdateTrack', 'B', 256);
    send('spotifyEnded');
    assert.deepEqual(
        finished.map((t) => t.kbps),
        [192, 320],
    );
});

function stopHarness() {
    const events = [],
        timers = [],
        messages = [];
    const recorder = {
        jobs: new Set(),
        startRecording() {
            events.push('start');
        },
        finishRecording(track) {
            events.push(`finish:${track.id}`);
            this.jobs.add(track.id);
        },
        cancelRecording() {
            events.push('cancel');
        },
    };
    const scope = vm.createContext({
        recorder,
        stream: {
            getTracks: () => [{ stop: () => events.push('stream-stop') }],
        },
        monitor: { disconnect() {} },
        context: { close: () => events.push('context-close') },
        setInterval(fn, ms) {
            if (ms === 250) timers.push(fn);
        },
        clearInterval() {},
        chrome: {
            runtime: {
                sendMessage: (m) => messages.push(m),
                onMessage: { addListener() {} },
            },
        },
    });
    vm.runInContext(
        read('background-page/offscreen.js').replace(
            "import { Recorder } from './recorder';",
            '',
        ),
        scope,
    );
    vm.runInContext(
        'session = {tabId: 1, recorder, stream, monitor, context, track: null}',
        scope,
    );
    const send = (command, id = 'A') =>
        scope.media({ command, tabId: 1, data: { track: { id } } });
    send('spotifyPlay');
    return { scope, send, events, timers, recorder, messages };
}
for (const ending of ['spotifyEnded', 'spotifyPlay']) {
    test(`stop after song finishes exactly once through ${ending} and retains encoding job`, () => {
        const h = stopHarness();
        assert.equal(
            h.scope.setStopAfterTrack({ enabled: true, trackId: 'A' }).success,
            true,
        );
        h.send('spotifyPlay', 'A');
        assert.deepEqual(h.events, ['start']);
        h.send(ending, 'B');
        h.send('spotifyPlay', 'B');
        assert.deepEqual(h.events, [
            'start',
            'finish:A',
            'cancel',
            'stream-stop',
        ]);
        h.timers[0]();
        assert.equal(h.events.includes('context-close'), false);
        h.recorder.jobs.clear();
        h.timers[0]();
        assert.equal(h.events.at(-1), 'context-close');
        const state = h.messages
            .filter((m) => m.command === 'captureState')
            .at(-1).data;
        assert.equal(state.isRecording, false);
        assert.equal(state.stopAfterTrack, false);
    });
}
test('planned stop rejects stale title and can be revoked', () => {
    const h = stopHarness();
    assert.equal(
        h.scope.setStopAfterTrack({ enabled: true, trackId: 'old' }).success,
        false,
    );
    h.scope.setStopAfterTrack({ enabled: true, trackId: 'A' });
    h.scope.setStopAfterTrack({ enabled: false });
    h.send('spotifyPlay', 'B');
    assert.deepEqual(h.events, ['start', 'finish:A', 'start']);
});
test('seeking with planned stop does not carry it into another song', () => {
    const h = stopHarness();
    h.scope.setStopAfterTrack({ enabled: true, trackId: 'A' });
    h.send('spotifySeeking');
    h.send('spotifyPlay', 'B');
    assert.deepEqual(h.events, ['start', 'cancel', 'stream-stop']);
    assert.equal(
        h.scope.setStopAfterTrack({ enabled: true, trackId: 'B' }).success,
        false,
    );
});
