// One serialized request stream and one persistent decision per artist/album.
const CACHE_KEY = 'musicbrainzGenresV1';
const DAY = 86400000;
const normal = (value) =>
    String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
const baseAlbum = (value) =>
    String(value)
        .replace(
            /\s*[([][^)\]]*\b(deluxe|edition|remaster(?:ed)?)\b[^)\]]*[)\]]/gi,
            '',
        )
        .trim();
const quote = (value) =>
    '"' + value.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1') + '"';
const mbid = (id) =>
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id || '');
export function selectGenre(genres = []) {
    return (
        genres
            .filter(
                (g) =>
                    typeof g.name === 'string' &&
                    g.name.length < 100 &&
                    Number(g.count) > 0,
            )
            .sort(
                (a, b) =>
                    Number(b.count) - Number(a.count) ||
                    a.name.localeCompare(b.name, 'en'),
            )[0]?.name || ''
    );
}
export function createGenreLookup({
    fetchData,
    storage,
    now = Date.now,
    wait = (ms) => new Promise((r) => setTimeout(r, ms)),
    identify = async () => {},
}) {
    let queue = Promise.resolve(),
        lastRequest = 0;
    const pending = new Map();
    async function request(path, params, deadline) {
        const delay = Math.max(0, lastRequest + 1100 - now());
        if (now() + delay >= deadline) throw new Error('MusicBrainz timeout');
        await wait(delay);
        await identify();
        lastRequest = now();
        const url = new URL('https://musicbrainz.org/ws/2/' + path);
        url.search = new URLSearchParams({ ...params, fmt: 'json' }).toString();
        const response = await fetchData(url.href, {
            credentials: 'omit',
            signal: AbortSignal.timeout(
                Math.max(1, Math.min(8000, deadline - now())),
            ),
        });
        if (!response.ok)
            throw new Error('MusicBrainz HTTP ' + response.status);
        return response.json();
    }
    async function search(artist, album) {
        const deadline = now() + 20000;
        const title = baseAlbum(album);
        const result = await request(
            'release-group',
            {
                query: `releasegroup:${quote(title)} AND artist:${quote(
                    artist,
                )}`,
                limit: 25,
            },
            deadline,
        );
        const groups = (result['release-groups'] || []).filter(
            (g) =>
                normal(g.title) === normal(title) &&
                normal(
                    (g['artist-credit'] || [])
                        .map(
                            (c) =>
                                (c.name || c.artist?.name || '') +
                                (c.joinphrase || ''),
                        )
                        .join(''),
                ) === normal(artist),
        );
        if (groups.length > 1) return { genre: '', source: 'ambiguous-album' };
        let artistId;
        if (groups.length === 1 && mbid(groups[0].id)) {
            const group = await request(
                'release-group/' + groups[0].id,
                { inc: 'genres+artist-credits' },
                deadline,
            );
            const genre = selectGenre(group.genres);
            if (genre) return { genre, source: 'album', mbid: group.id };
            const credits =
                group['artist-credit'] || groups[0]['artist-credit'] || [];
            if (credits.length === 1) artistId = credits[0].artist?.id;
            else return { genre: '', source: 'no-album-genre' };
        } else {
            const result = await request(
                'artist',
                { query: `artist:${quote(artist)}`, limit: 25 },
                deadline,
            );
            const artists = (result.artists || []).filter(
                (a) => normal(a.name) === normal(artist),
            );
            if (artists.length !== 1)
                return { genre: '', source: 'ambiguous-artist' };
            artistId = artists[0].id;
        }
        if (
            !mbid(artistId) ||
            artistId === '89ad4ac3-39f7-470e-963a-56509c546377'
        )
            return { genre: '', source: 'no-artist' };
        const entity = await request(
            'artist/' + artistId,
            { inc: 'genres' },
            deadline,
        );
        return {
            genre: selectGenre(entity.genres),
            source: 'artist',
            mbid: artistId,
        };
    }
    return function lookup({ album, albumArtist, artist } = {}) {
        artist = albumArtist || artist;
        if (
            typeof album !== 'string' ||
            typeof artist !== 'string' ||
            !normal(album) ||
            !normal(artist) ||
            album.length > 300 ||
            artist.length > 300
        )
            return Promise.resolve({ genre: '', source: 'missing-album' });
        const key = JSON.stringify([normal(artist), normal(album)]);
        if (pending.has(key)) return pending.get(key);
        const work = queue
            .then(async () => {
                const cache = (await storage.get(CACHE_KEY))[CACHE_KEY] || {};
                if (cache[key]?.expires > now()) return cache[key].value;
                let value;
                try {
                    value = await search(artist, album);
                } catch {
                    value = { genre: '', source: 'unavailable' };
                }
                cache[key] = {
                    value,
                    expires:
                        now() +
                        (value.genre
                            ? 90 * DAY
                            : value.source === 'unavailable'
                            ? 300000
                            : DAY),
                };
                const entries = Object.entries(cache)
                    .filter(([, v]) => v.expires > now())
                    .sort((a, b) => b[1].expires - a[1].expires)
                    .slice(0, 500);
                await storage.set({ [CACHE_KEY]: Object.fromEntries(entries) });
                return value;
            })
            .catch(() => ({ genre: '', source: 'unavailable' }));
        queue = work;
        pending.set(key, work);
        work.finally(() => pending.delete(key));
        return work;
    };
}
