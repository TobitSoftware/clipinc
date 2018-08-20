(function () {
    const createElement = document.createElement;

    function dispatchToDocument(event) {
        document.dispatchEvent(new Event(event.type, event))
    }

    document.createElement = function (tag) {
        const element = createElement.call(document, tag);

        if (tag === 'video') {
            element.addEventListener("play", dispatchToDocument);
            element.addEventListener("ended", dispatchToDocument);
            element.addEventListener("abort", dispatchToDocument);
        }

        return element
    };
})();
