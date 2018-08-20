chrome.runtime.onMessage.addListener((request, sender) => {
    console.log(request, sender);
});

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

const volume = document.getElementById('volume');
chrome.storage.sync.get('volume', (v) => {
    volume.value = v.volume;
});
volume.addEventListener('change', (event) => {
    console.log(event.target.value);
    chrome.storage.sync.set({'volume': event.target.value}, () => chrome.runtime.sendMessage('setVolume'));
});

function startCapture(send) {
    icon.setAttribute('src', './images/clipinc-128-record.png');
    volume.removeAttribute("disabled");

    if (send) {
        chrome.runtime.sendMessage('startCapture')
    }
}

function stopCapture(send) {
    icon.setAttribute('src', './images/clipinc-128.png');
    volume.setAttribute("disabled", "");

    if (send) {
        chrome.runtime.sendMessage('stopCapture')
    }
}