// Runs in Spotify's MAIN world, before the player creates its media elements.
(() => {
    if (window.__clipincMediaBridge) return;
    window.__clipincMediaBridge = true;
    const attached = new WeakSet();
    let active;
    function emit(type, element) {
        document.dispatchEvent(
            new CustomEvent('clipinc-media', {
                detail: {
                    type,
                    time: element?.currentTime || 0,
                    duration: Number.isFinite(element?.duration)
                        ? element.duration
                        : 0,
                },
            }),
        );
    }
    function attach(element) {
        if (attached.has(element)) return;
        attached.add(element);
        ['play', 'ended', 'pause', 'abort', 'seeking'].forEach((type) => {
            element.addEventListener(type, () => {
                if (type === 'play') active = element;
                if (element !== active || (element.ended && type !== 'ended'))
                    return;
                emit(type, element);
            });
        });
        if (!element.paused) active = element;
    }
    const createElement = document.createElement;
    document.createElement = function (...args) {
        const element = Reflect.apply(createElement, this, args);
        if (['AUDIO', 'VIDEO'].includes(element.tagName)) attach(element);
        return element;
    };
    // Also covers media elements inserted through HTML and new Audio().
    document.addEventListener(
        'play',
        (event) => {
            if (['AUDIO', 'VIDEO'].includes(event.target.tagName))
                attach(event.target);
        },
        true,
    );
    document.addEventListener('clipinc-request-state', () => {
        document.querySelectorAll('audio, video').forEach(attach);
        if (active && !active.paused) emit('play', active);
    });
    document.addEventListener('setvolume', (event) => {
        if (active) active.volume = event.detail.volume;
    });
})();
