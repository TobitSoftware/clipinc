chrome.tabs.getSelected((tab) => {
    chrome.tabs.sendMessage(tab.id, {command: 'getPlaylists'}, {}, (response) => {
        console.log(response);

        for (let i = 0, l = response.items.length; i < l; i++) {
            console.log(response.items[i]);
            addPlaylistElement(response.items[i]);
        }
    });
});

function addPlaylistElement(data) {
    const playlists = document.querySelector('#playlists');

    const pl = document.createElement('div');
    pl.classList.add('playlist');

    const img = document.createElement('img');
    img.classList.add('playlist-image');
    if (data.images.length > 2) {
        img.setAttribute('src', data.images[2].url);
    }

    const name = document.createElement('span');
    name.classList.add('playlist-name');
    name.innerText = data.name;

    const cb = document.createElement('input');
    cb.classList.add('playlist-cb');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('playlistId', data.id);
    cb.setAttribute('uri', data.uri);
    cb.setAttribute('playlistName', data.name);
    cb.setAttribute('tracksTotal', data.tracks.total);

    pl.append(img);
    pl.append(name);
    pl.append(cb);

    playlists.append(pl);
}

document.querySelector('#download').addEventListener('click', () => {
    console.log('download event listener called');

    let playlistNodes = document.querySelectorAll('.playlist-cb:checked');
    let playlists = [];

    for (let i = 0, l = playlistNodes.length; i < l; i++) {
        console.log(playlistNodes[i].value);
        playlists.push({
            id: playlistNodes[i].getAttribute('playlistId'),
            uri: playlistNodes[i].getAttribute('uri'),
            name: playlistNodes[i].getAttribute('playlistName'),
            tracksTotal: parseInt(playlistNodes[i].getAttribute('tracksTotal'), 10),
            tracksDownloaded: 0
        });
    }

    startCapture(playlists);
});

function startCapture(playlists) {
    chrome.runtime.sendMessage({command: 'startCapture', data: {playlists}}, {}, () => {
        // show recording state
    });
}
