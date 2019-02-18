// overwrite createElement function to attach event listener
(function () {
    const createElement = document.createElement;

    function dispatchToDocument(event) {
        // video tag dispatches pause and ended event when track ends
        // filter pause event if track has ended so it can be downloaded
        if (event.target.ended && event.type !== 'ended') {
            return;
        }

        const e = new CustomEvent(event.type, {});
        document.dispatchEvent(e)
    }

    document.createElement = function (tag) {
        const element = createElement.call(document, tag);

        if (tag === 'audio') {
            window._svp = element;

            element.addEventListener('play', dispatchToDocument);
            element.addEventListener('ended', dispatchToDocument);
            element.addEventListener('pause', dispatchToDocument);
            element.addEventListener('abort', dispatchToDocument);

            document.addEventListener('setvolume', (event) => element.volume = event.detail.volume);

            const e = new CustomEvent('initplayer');
            document.dispatchEvent(e)
        }

        return element
    };
})();
