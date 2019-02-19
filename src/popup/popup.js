chrome.runtime.onMessage.addListener(({command, data}) => {
    console.log('popup.js', command, data);
    switch(command) {
        case 'spotifyPlay':
            updateTrack(data.track);
            
            chrome.storage.local.get(['isRecording'], ({isRecording}) => {
                if (isRecording) {
                    $body.classList.remove('hidden');
                } else {
                    $body.classList.add('hidden');
                }
            });
            break;
    }
});

const $cover = document.querySelector('.cover');
$cover.addEventListener('error', () => {
    $cover.setAttribute('src', '../images/placeholder.png');
});

const $body = document.querySelector('.body');
const $recordLabel = document.querySelector('.record-label')
const $switch = document.querySelector('#record');
$switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        chrome.storage.local.get(['volume'], ({volume}) => {
            chrome.runtime.sendMessage({command: 'startCapture', data: {volume: volume || 1}});
        });
        $recordLabel.innerHTML = 'Aufnahme läuft...';
        $body.classList.remove('hidden');
    } else {
        chrome.runtime.sendMessage({command: 'stopCapture', data: {}});
        chrome.storage.local.set({track: null});
        updateTrack(null);
        $recordLabel.innerHTML = 'Aufnahme starten';
        $body.classList.add('hidden');
    }
});

function updateTrack(track) {
    document.querySelector('.title').innerHTML = track.title;
    document.querySelector('.artist').innerHTML = track.artist;
    document.querySelector('.cover').setAttribute('src', track.cover);

    updateProgressBar(track);
}

function updateProgressBar(track) {
    const progress = track ? `${Math.floor((Date.now() - new Date(track.startTime) + (track.progress || 0)) / track.duration * 100)}%` : '0%';
    document.querySelector('.progress-bar-track').style.width = progress;
}
chrome.tabs.query({'active': true}, (tabs) => {
    chrome.storage.local.get(['isRecording', 'track'], ({isRecording, track}) => {
        $switch.checked = isRecording;
        if (isRecording) {
            $recordLabel.innerHTML = 'Aufnahme läuft...';
            $body.classList.remove('hidden');
        } else {
            $recordLabel.innerHTML = 'Aufnahme starten';
            $body.classList.add('hidden');
        }

        if (track) {
            updateTrack(track);
        }
    });
});

setInterval(() => {
    chrome.storage.local.get(['isRecording', 'track'], ({isRecording, track}) => {
        if (isRecording) {
            updateProgressBar(track);
        }
    });
}, 1000);
