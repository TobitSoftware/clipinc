!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t())
        : 'function' == typeof define && define.amd
        ? define(t)
        : (e.ID3Writer = t());
})(this, function () {
    'use strict';
    function e(e) {
        return String(e)
            .split('')
            .map(function (e) {
                return e.charCodeAt(0);
            });
    }
    function t(t) {
        return new Uint8Array(e(t));
    }
    function r(t) {
        var r = new Uint8Array(2 * t.length);
        return new Uint16Array(r.buffer).set(e(t)), r;
    }
    return (function () {
        var e = n.prototype;
        function n(e) {
            if (!(e && 'object' == typeof e && 'byteLength' in e))
                throw new Error(
                    'First argument should be an instance of ArrayBuffer or Buffer'
                );
            (this.arrayBuffer = e),
                (this.padding = 4096),
                (this.frames = []),
                (this.url = '');
        }
        return (
            (e._setIntegerFrame = function (e, t) {
                var r,
                    n = parseInt(t, 10);
                this.frames.push({
                    name: e,
                    value: n,
                    size: ((r = n.toString().length), 11 + r),
                });
            }),
            (e._setStringFrame = function (e, t) {
                var r,
                    n = t.toString();
                this.frames.push({
                    name: e,
                    value: n,
                    size: ((r = n.length), 13 + 2 * r),
                });
            }),
            (e._setPictureFrame = function (e, t, r, n, a) {
                var i,
                    s,
                    c,
                    o,
                    u = r.toString();
                if (
                    !n &&
                    !(n = (function (e) {
                        if (!e || !e.length) return null;
                        if (255 === e[0] && 216 === e[1] && 255 === e[2])
                            return 'image/jpeg';
                        if (
                            137 === e[0] &&
                            80 === e[1] &&
                            78 === e[2] &&
                            71 === e[3]
                        )
                            return 'image/png';
                        if (71 === e[0] && 73 === e[1] && 70 === e[2])
                            return 'image/gif';
                        if (
                            87 === e[8] &&
                            69 === e[9] &&
                            66 === e[10] &&
                            80 === e[11]
                        )
                            return 'image/webp';
                        var t =
                                73 === e[0] &&
                                73 === e[1] &&
                                42 === e[2] &&
                                0 === e[3],
                            r =
                                77 === e[0] &&
                                77 === e[1] &&
                                0 === e[2] &&
                                42 === e[3];
                        return t || r
                            ? 'image/tiff'
                            : 66 === e[0] && 77 === e[1]
                            ? 'image/bmp'
                            : 0 === e[0] &&
                              0 === e[1] &&
                              1 === e[2] &&
                              0 === e[3]
                            ? 'image/x-icon'
                            : null;
                    })(new Uint8Array(t)))
                )
                    throw new Error('Unknown picture MIME type');
                r || (a = !1),
                    this.frames.push({
                        name: 'APIC',
                        value: t,
                        pictureType: e,
                        mimeType: n,
                        useUnicodeEncoding: a,
                        description: u,
                        size:
                            ((i = t.byteLength),
                            (s = n.length),
                            (c = u.length),
                            (o = a),
                            11 + s + 1 + 1 + (o ? 2 + 2 * (c + 1) : c + 1) + i),
                    });
            }),
            (e._setLyricsFrame = function (e, t) {
                var r,
                    n,
                    a = e.toString(),
                    i = t.toString();
                this.frames.push({
                    name: 'USLT',
                    value: i,
                    description: a,
                    size:
                        ((r = a.length),
                        (n = i.length),
                        16 + 2 * r + 2 + 2 + 2 * n),
                });
            }),
            (e._setCommentFrame = function (e, t) {
                var r,
                    n,
                    a = e.toString(),
                    i = t.toString();
                this.frames.push({
                    name: 'COMM',
                    value: i,
                    description: a,
                    size:
                        ((r = a.length),
                        (n = i.length),
                        16 + 2 * r + 2 + 2 + 2 * n),
                });
            }),
            (e._setUserStringFrame = function (e, t) {
                var r,
                    n,
                    a = e.toString(),
                    i = t.toString();
                this.frames.push({
                    name: 'TXXX',
                    description: a,
                    value: i,
                    size:
                        ((r = a.length),
                        (n = i.length),
                        13 + 2 * r + 2 + 2 + 2 * n),
                });
            }),
            (e._setUrlLinkFrame = function (e, t) {
                var r,
                    n = t.toString();
                this.frames.push({
                    name: e,
                    value: n,
                    size: ((r = n.length), 10 + r),
                });
            }),
            (e.setFrame = function (e, t) {
                switch (e) {
                    case 'TPE1':
                    case 'TCOM':
                    case 'TCON':
                        if (!Array.isArray(t))
                            throw new Error(
                                e + ' frame value should be an array of strings'
                            );
                        var r = 'TCON' === e ? ';' : '/',
                            n = t.join(r);
                        this._setStringFrame(e, n);
                        break;
                    case 'TIT2':
                    case 'TALB':
                    case 'TPE2':
                    case 'TPE3':
                    case 'TPE4':
                    case 'TRCK':
                    case 'TPOS':
                    case 'TMED':
                    case 'TPUB':
                        this._setStringFrame(e, t);
                        break;
                    case 'TBPM':
                    case 'TLEN':
                    case 'TYER':
                        this._setIntegerFrame(e, t);
                        break;
                    case 'USLT':
                        if (
                            !(
                                'object' == typeof t &&
                                'description' in t &&
                                'lyrics' in t
                            )
                        )
                            throw new Error(
                                'USLT frame value should be an object with keys description and lyrics'
                            );
                        this._setLyricsFrame(t.description, t.lyrics);
                        break;
                    case 'APIC':
                        if (
                            !(
                                'object' == typeof t &&
                                'type' in t &&
                                'data' in t &&
                                'description' in t
                            )
                        )
                            throw new Error(
                                'APIC frame value should be an object with keys type, data and description'
                            );
                        if (t.type < 0 || t.type > 20)
                            throw new Error(
                                'Incorrect APIC frame picture type'
                            );
                        this._setPictureFrame(
                            t.type,
                            t.data,
                            t.description,
                            t.mimeType,
                            !!t.useUnicodeEncoding
                        );
                        break;
                    case 'TXXX':
                        if (
                            !(
                                'object' == typeof t &&
                                'description' in t &&
                                'value' in t
                            )
                        )
                            throw new Error(
                                'TXXX frame value should be an object with keys description and value'
                            );
                        this._setUserStringFrame(t.description, t.value);
                        break;
                    case 'TKEY':
                        if (!/^([A-G][#b]?m?|o)$/.test(t))
                            throw new Error(
                                e +
                                    ' frame value should be like Dbm, C#, B or o'
                            );
                        this._setStringFrame(e, t);
                        break;
                    case 'WCOM':
                    case 'WCOP':
                    case 'WOAF':
                    case 'WOAR':
                    case 'WOAS':
                    case 'WORS':
                    case 'WPAY':
                    case 'WPUB':
                        this._setUrlLinkFrame(e, t);
                        break;
                    case 'COMM':
                        if (
                            !(
                                'object' == typeof t &&
                                'description' in t &&
                                'text' in t
                            )
                        )
                            throw new Error(
                                'COMM frame value should be an object with keys description and text'
                            );
                        this._setCommentFrame(t.description, t.text);
                        break;
                    default:
                        throw new Error('Unsupported frame ' + e);
                }
                return this;
            }),
            (e.removeTag = function () {
                if (!(this.arrayBuffer.byteLength < 10)) {
                    var e,
                        t,
                        r = new Uint8Array(this.arrayBuffer),
                        n = r[3],
                        a =
                            ((e = [r[6], r[7], r[8], r[9]])[0] << 21) +
                            (e[1] << 14) +
                            (e[2] << 7) +
                            e[3] +
                            10;
                    if (
                        !(
                            73 !== (t = r)[0] ||
                            68 !== t[1] ||
                            51 !== t[2] ||
                            n < 2 ||
                            n > 4
                        )
                    )
                        this.arrayBuffer = new Uint8Array(r.subarray(a)).buffer;
                }
            }),
            (e.addTag = function () {
                this.removeTag();
                var e,
                    n,
                    a = [255, 254],
                    i = [101, 110, 103],
                    s =
                        10 +
                        this.frames.reduce(function (e, t) {
                            return e + t.size;
                        }, 0) +
                        this.padding,
                    c = new ArrayBuffer(this.arrayBuffer.byteLength + s),
                    o = new Uint8Array(c),
                    u = 0,
                    h = [];
                return (
                    (h = [73, 68, 51, 3]),
                    o.set(h, u),
                    (u += h.length),
                    u++,
                    u++,
                    (h = [
                        ((e = s - 10) >>> 21) & (n = 127),
                        (e >>> 14) & n,
                        (e >>> 7) & n,
                        e & n,
                    ]),
                    o.set(h, u),
                    (u += h.length),
                    this.frames.forEach(function (e) {
                        var n, s;
                        switch (
                            ((h = t(e.name)),
                            o.set(h, u),
                            (u += h.length),
                            (n = e.size - 10),
                            (h = [
                                (n >>> 24) & (s = 255),
                                (n >>> 16) & s,
                                (n >>> 8) & s,
                                n & s,
                            ]),
                            o.set(h, u),
                            (u += h.length),
                            (u += 2),
                            e.name)
                        ) {
                            case 'WCOM':
                            case 'WCOP':
                            case 'WOAF':
                            case 'WOAR':
                            case 'WOAS':
                            case 'WORS':
                            case 'WPAY':
                            case 'WPUB':
                                (h = t(e.value)), o.set(h, u), (u += h.length);
                                break;
                            case 'TPE1':
                            case 'TCOM':
                            case 'TCON':
                            case 'TIT2':
                            case 'TALB':
                            case 'TPE2':
                            case 'TPE3':
                            case 'TPE4':
                            case 'TRCK':
                            case 'TPOS':
                            case 'TKEY':
                            case 'TMED':
                            case 'TPUB':
                                (h = [1].concat(a)),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = r(e.value)),
                                    o.set(h, u),
                                    (u += h.length);
                                break;
                            case 'TXXX':
                            case 'USLT':
                            case 'COMM':
                                (h = [1]),
                                    ('USLT' !== e.name && 'COMM' !== e.name) ||
                                        (h = h.concat(i)),
                                    (h = h.concat(a)),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = r(e.description)),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = [0, 0].concat(a)),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = r(e.value)),
                                    o.set(h, u),
                                    (u += h.length);
                                break;
                            case 'TBPM':
                            case 'TLEN':
                            case 'TYER':
                                u++,
                                    (h = t(e.value)),
                                    o.set(h, u),
                                    (u += h.length);
                                break;
                            case 'APIC':
                                (h = [e.useUnicodeEncoding ? 1 : 0]),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = t(e.mimeType)),
                                    o.set(h, u),
                                    (u += h.length),
                                    (h = [0, e.pictureType]),
                                    o.set(h, u),
                                    (u += h.length),
                                    e.useUnicodeEncoding
                                        ? ((h = [].concat(a)),
                                          o.set(h, u),
                                          (u += h.length),
                                          (h = r(e.description)),
                                          o.set(h, u),
                                          (u += h.length),
                                          (u += 2))
                                        : ((h = t(e.description)),
                                          o.set(h, u),
                                          (u += h.length),
                                          u++),
                                    o.set(new Uint8Array(e.value), u),
                                    (u += e.value.byteLength);
                        }
                    }),
                    (u += this.padding),
                    o.set(new Uint8Array(this.arrayBuffer), u),
                    (this.arrayBuffer = c),
                    c
                );
            }),
            (e.getBlob = function () {
                return new Blob([this.arrayBuffer], { type: 'audio/mpeg' });
            }),
            (e.getURL = function () {
                return (
                    this.url ||
                        (this.url = URL.createObjectURL(this.getBlob())),
                    this.url
                );
            }),
            (e.revokeURL = function () {
                URL.revokeObjectURL(this.url);
            }),
            n
        );
    })();
});
