(function () {
    const createElement = document.createElement;

    function dispatchToDocument(event) {
        // video tag dispatches pause and ended event when track ends
        // filter pause event if track has ended so it can be downloaded
        if (event.target.ended && event.type !== "ended") {
            return;
        }

        document.dispatchEvent(new Event(event.type, event))
    }

    document.createElement = function (tag) {
        const element = createElement.call(document, tag);

        if (tag === 'video') {
            window._svp = element;
            element.addEventListener("play", dispatchToDocument);
            element.addEventListener("ended", dispatchToDocument);
            element.addEventListener("pause", dispatchToDocument);
            element.addEventListener("abort", dispatchToDocument);
        }

        return element
    };
})();
