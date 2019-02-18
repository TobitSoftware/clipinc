chrome.runtime.onMessage.addListener(({command, data}) => {
    console.log('popup.js', command, data);
    switch(command) {
        case 'spotifyPlay':
            updateTrack(data.track);
            break;
    }
});

const $slider = document.querySelector('#record');
$slider.addEventListener('change', (event) => {
    if (event.target.checked) {
        chrome.runtime.sendMessage({command: 'startCapture', data: {}});
        $volume.removeAttribute('disabled');
    } else {
        chrome.runtime.sendMessage({command: 'stopCapture', data: {}});
        $volume.setAttribute('disabled', 'true');
    }
});

const $volume = document.querySelector('#volume');
$volume.addEventListener('change', (event) => {
    chrome.storage.local.set({volume: event.target.value});
});
$volume.addEventListener('input', (event) => {
    chrome.runtime.sendMessage({command: 'setVolume', data: {volume: parseFloat(event.target.value, 10) / 100}});
});

chrome.storage.local.get(['isRecording', 'volume', 'track'], ({isRecording, volume, track}) => {
    $slider.checked = isRecording;
    $volume.setAttribute('value', volume);

    if (!isRecording) {
        $volume.setAttribute('disabled', 'true');
    }

    if (track) {
        updateTrack(track);
    }
});

function updateTrack(track) {
    document.querySelector('.title').innerHTML = track.title;
    document.querySelector('.artist').innerHTML = track.artist;
    document.querySelector('.cover').setAttribute('src', track.cover);
}
