(function () {
    const createElement = document.createElement;

    function dispatchToDocument(event) {
        // video tag dispatches pause and ended event when track ends
        // filter pause event if track has ended so it can be downloaded
        if (event.target.ended && event.type !== "ended") {
            return;
        }
        const e = new CustomEvent(event.type, {
            detail: {
                volume: event.target.volume
            }
        });
        document.dispatchEvent(e)
    }

    document.createElement = function (tag) {
        const element = createElement.call(document, tag);

        if (tag === 'video') {
            window._svp = element;

            element.addEventListener("play", dispatchToDocument);
            element.addEventListener("ended", dispatchToDocument);
            element.addEventListener("pause", dispatchToDocument);
            element.addEventListener("abort", dispatchToDocument);

            document.addEventListener("setvolume", (event) => element.volume = event.detail.volume);
        }

        return element
    };
})();
