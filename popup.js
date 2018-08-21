const icon = document.getElementById('icon');
chrome.storage.sync.get('isRecording', ({isRecording}) => {
    if (isRecording) {
        startCapture(false)
    } else {
        stopCapture(false)
    }
});

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', () => startCapture(true));

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', () => stopCapture(true));

const volumeSlider = document.getElementById('volume');
chrome.storage.sync.get('volume', ({volume}) => {
    volumeSlider.value = volume;
});
volumeSlider.addEventListener('input', (event) => {
    chrome.runtime.sendMessage({command: 'setVolume', data: event.target.value})
});
volumeSlider.addEventListener('change', (event) => {
    chrome.storage.sync.set({'volume': event.target.value});
});

function startCapture(send) {
    icon.setAttribute('src', './images/clipinc-128-record.png');
    volumeSlider.removeAttribute("disabled");

    if (send) {
        chrome.runtime.sendMessage('startCapture')
    }
}

function stopCapture(send) {
    icon.setAttribute('src', './images/clipinc-128.png');
    volumeSlider.setAttribute("disabled", "");

    if (send) {
        chrome.runtime.sendMessage('stopCapture')
    }
}
