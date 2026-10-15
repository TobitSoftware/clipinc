const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const scope = vm.createContext({
    URL,
    URLSearchParams,
    AbortSignal,
    setTimeout,
});
vm.runInContext(
    read('background-page/musicbrainz.js').replaceAll(
        'export function',
        'function',
    ),
    scope,
);
const artistId = 'd6fce139-7e18-4cd7-a56f-ac394fba5bf4';
const groupId = '11111111-1111-1111-1111-111111111111';
const credit = [
    { name: 'Betterov', artist: { id: artistId, name: 'Betterov' } },
];
const group = { id: groupId, title: 'Olympia', 'artist-credit': credit };
const album = { album: 'OLYMPIA (Ehrenrunde Deluxe)', artist: 'Betterov' };
function harness(responses) {
    const saved = {},
        calls = [];
    let clock = 10000;
    const config = {
        storage: {
            get: async () => saved,
            set: async (value) => Object.assign(saved, value),
        },
        now: () => clock,
        wait: async (ms) => {
            clock += ms;
        },
        fetchData: async (url, options) => {
            calls.push({ url, at: clock, options });
            const response = responses.shift();
            if (response instanceof Error) throw response;
            return { ok: true, json: async () => response };
        },
    };
    return { lookup: scope.createGenreLookup(config), calls, config };
}
test('album genre wins; concurrent songs and a restarted service worker reuse the album decision', async () => {
    const h = harness([
        { 'release-groups': [group] },
        {
            ...group,
            genres: [
                { name: 'indie rock', count: 2 },
                { name: 'pop', count: 1 },
            ],
        },
    ]);
    const [a, b] = await Promise.all([h.lookup(album), h.lookup(album)]);
    assert.equal(a.genre, 'indie rock');
    assert.equal(a.source, 'album');
    assert.equal(b.genre, a.genre);
    assert.equal(
        (await scope.createGenreLookup(h.config)(album)).genre,
        a.genre,
    );
    assert.equal(h.calls.length, 2);
    assert.ok(h.calls[1].at - h.calls[0].at >= 1000);
    assert.match(
        new URL(h.calls[0].url).searchParams.get('query'),
        /releasegroup:"OLYMPIA"/,
    );
    assert.equal(h.calls[0].options.credentials, 'omit');
});
test('missing album genre falls back to the matched album artist', async () => {
    const h = harness([
        { 'release-groups': [group] },
        { ...group, genres: [] },
        { genres: [{ name: 'indie rock', count: 3 }] },
    ]);
    const result = await h.lookup({
        ...album,
        albumArtist: 'Betterov',
        artist: 'Guest',
    });
    assert.equal(result.genre, 'indie rock');
    assert.equal(result.source, 'artist');
    assert.ok(h.calls.at(-1).url.includes(artistId));
});
test('ambiguous albums never pick an arbitrary first result', async () => {
    const h = harness([
        { 'release-groups': [group, { ...group, id: artistId }] },
    ]);
    assert.equal((await h.lookup(album)).genre, '');
    assert.equal(h.calls.length, 1);
});
test('no album, ambiguous artist, missing genres and network failure leave genre empty', async () => {
    const h = harness([]);
    assert.equal((await h.lookup({ artist: 'Betterov' })).genre, '');
    assert.equal(h.calls.length, 0);
    for (const responses of [
        [new Error('offline')],
        [
            { 'release-groups': [] },
            {
                artists: [
                    { name: 'Betterov', id: artistId },
                    { name: 'Betterov', id: groupId },
                ],
            },
        ],
        [
            { 'release-groups': [group] },
            { ...group, genres: [] },
            { genres: [] },
        ],
    ]) {
        const h = harness(responses);
        assert.equal((await h.lookup(album)).genre, '');
        const count = h.calls.length;
        await h.lookup(album);
        assert.equal(h.calls.length, count);
    }
});
test('genre ranking is deterministic on ties and excludes unvoted genres', () => {
    const genres = [
        { name: 'rock', count: 2 },
        { name: 'pop', count: 2 },
        { name: 'noise', count: -1 },
    ];
    assert.equal(
        scope.selectGenre(genres),
        scope.selectGenre([...genres].reverse()),
    );
    assert.equal(scope.selectGenre([{ name: 'unknown', count: 0 }]), '');
});
test('album extraction matches song ID, retains metadata after navigation and rejects unrelated tracks', () => {
    const link = {
        textContent: 'Böller aus Polen',
        getAttribute: () => '/intl-de/track/songA',
    };
    const row = {
        innerText: '2\nBöller aus Polen\nBetterov\n2:50',
        querySelectorAll: () => [link],
    };
    const header = {
        innerText:
            'Album\nOLYMPIA (Ehrenrunde Deluxe)\nBetterov\n•\n2023\n•\n21 Songs',
        querySelectorAll: () => [{ textContent: 'Betterov' }],
    };
    const heading = {
        textContent: 'OLYMPIA (Ehrenrunde Deluxe)',
        parentElement: header,
    };
    const main = {
        querySelector: () => heading,
        querySelectorAll: () => [row],
    };
    const window = { location: { pathname: '/intl-de/album/albumA' } };
    const s = vm.createContext({
        window,
        document: { querySelector: () => main, addEventListener() {} },
        setInterval() {},
        chrome: { runtime: { onMessage: { addListener() {} } } },
    });
    vm.runInContext(read('content/content.js'), s);
    const metadata = s.getAlbumMetadata('songA', 'Böller aus Polen');
    assert.equal(metadata.albumArtist, 'Betterov');
    assert.equal(metadata.albumReleaseYear, 2023);
    assert.equal(metadata.trackNumber, 2);
    assert.equal(s.getAlbumMetadata('other', 'Other').album, undefined);
    window.location.pathname = '/playlist/list';
    assert.equal(
        s.getAlbumMetadata('songA', 'Böller aus Polen').album,
        metadata.album,
    );
    assert.equal(s.getAlbumMetadata('other', 'Other').album, undefined);
});
for (const timeout of [false, true]) {
    test(`real ID3 writer saves audio and album tags when genre ${
        timeout ? 'times out' : 'arrives'
    }`, async () => {
        let resolve, timer;
        const complete = new Promise((r) => {
            resolve = r;
        });
        const s = vm.createContext({
            console: { debug() {} },
            Blob,
            AbortSignal,
            setTimeout: (fn) => {
                timer = fn;
                return 1;
            },
            clearTimeout() {},
            FileReader: class {
                readAsArrayBuffer(b) {
                    b.arrayBuffer().then((result) =>
                        this.onload({ target: { result } }),
                    );
                }
            },
            Mp3LameEncoder: class {
                encode() {}
                finish() {
                    return new Blob([new Uint8Array(5000)]);
                }
            },
            importScripts(url) {
                if (url.includes('browser-id3'))
                    vm.runInContext(
                        read('background-page/encoders/browser-id3-writer.js'),
                        s,
                    );
                else s.Mp3LameEncoderConfig.onRuntimeInitialized();
            },
            postMessage(data) {
                if (data.command === 'metadata') {
                    if (timeout) timer();
                    else
                        s.onmessage({
                            data: {
                                command: 'metadata',
                                metadata: { genre: 'indie rock' },
                            },
                        });
                }
                if (['complete', 'error'].includes(data.command)) resolve(data);
            },
        });
        s.self = s;
        vm.runInContext(read('background-page/Mp3Worker.js'), s);
        s.onmessage({ data: { command: 'start' } });
        s.onmessage({
            data: {
                command: 'record',
                buffer: [new Float32Array(44100), new Float32Array(44100)],
            },
        });
        s.onmessage({
            data: {
                command: 'finish',
                track: {
                    ...album,
                    albumArtist: 'Betterov',
                    albumReleaseYear: 2023,
                    title: 'Song',
                    duration: 1000,
                },
            },
        });
        const result = await complete;
        assert.equal(result.command, 'complete', result.message);
        const buffer = Buffer.from(result.buffer);
        const frames = {};
        let pos = 10;
        while (pos + 10 < buffer.length) {
            const id = buffer.toString('ascii', pos, pos + 4);
            const size = buffer.readUInt32BE(pos + 4);
            if (!size) break;
            frames[id] = buffer.subarray(pos + 10, pos + 10 + size);
            pos += 10 + size;
        }
        assert.ok(frames.TALB);
        assert.ok(frames.TPE2);
        assert.ok(frames.TYER);
        assert.equal(Boolean(frames.TCON), !timeout);
        if (!timeout)
            assert.ok(
                frames.TCON.includes(Buffer.from('indie rock', 'utf16le')),
            );
    });
}
