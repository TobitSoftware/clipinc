chrome.runtime.onMessage.addListener(({command, data}, sender, sendResponse) => {
    // set title, artist, logo
});

const $slider = document.querySelector('#record');
$slider.addEventListener('change', (event) => {
    if (event.target.checked) {
        chrome.runtime.sendMessage({command: 'startCapture', data: {}});
    } else {
        chrome.runtime.sendMessage({command: 'stopCatpure', data: {}});
    }
});

const $volume = document.querySelector('#volume');
$volume.addEventListener('change', (event) => {
    chrome.storage.local.set({volume: parseInt(event.target.value, 10)});
});
$volume.addEventListener('input', (event) => {
    console.log("popup.js volume input: ", event.target.value);
});

chrome.storage.local.get(['isRecording', 'volume'], ({isRecording, volume}) => {
    $slider.checked = isRecording;
    $volume.setAttribute('value', volume);
});


