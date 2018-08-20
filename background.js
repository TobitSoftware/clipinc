chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({volume: 50, isRecording: false});
});

chrome.commands.onCommand.addListener(handleStartCapture);

chrome.runtime.onMessage.addListener(handleStartCapture);

chrome.tabs.onActivated.addListener(({tabId}) => {
    chrome.tabs.get(tabId, ({url}) => {
        if (url.indexOf("https://open.spotify.com") === -1) {
            chrome.browserAction.setPopup({
                popup: ''
            });

            chrome.browserAction.setIcon({
                path: {
                    "16": "images/clipinc-16-disable.png",
                    "32": "images/clipinc-32-disable.png",
                    "48": "images/clipinc-48-disable.png",
                    "128": "images/clipinc-128-disable.png"
                }
            });
        } else {
            chrome.browserAction.setPopup({
                popup: 'popup.html'
            });

            chrome.storage.sync.get("isRecording", ({isRecording}) => {
                if (isRecording) {
                    chrome.browserAction.setIcon({
                        path: {
                            "16": "images/clipinc-16-record.png",
                            "32": "images/clipinc-32-record.png",
                            "48": "images/clipinc-48-record.png",
                            "128": "images/clipinc-128-record.png"
                        }
                    });
                } else {
                    chrome.browserAction.setIcon({
                        path: {
                            "16": "images/clipinc-16.png",
                            "32": "images/clipinc-32.png",
                            "48": "images/clipinc-48.png",
                            "128": "images/clipinc-128.png"
                        }
                    });
                }
            });
        }
    });
});

chrome.browserAction.onClicked.addListener(openSpotify);

function openSpotify() {
    chrome.tabs.create({
        url: 'https://open.spotify.com'
    });

    chrome.browserAction.setPopup({
        popup: 'popup.html'
    });

    chrome.browserAction.setIcon({
        path: {
            "16": "images/clipinc-16.png",
            "32": "images/clipinc-32.png",
            "48": "images/clipinc-48.png",
            "128": "images/clipinc-128.png"
        }
    });
}

function handleStartCapture(command) {
    if (command === "startCapture") {
        startCapture();
    }
}

function startCapture() {
    chrome.storage.sync.set({isRecording: true});
    chrome.tabCapture.capture({audio: true}, (stream) => {
        if (!stream) {
            console.error(chrome.runtime.lastError);
            return;
        }

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);

        const mediaRecorder = new Recorder(source);

        //restore audio for user
        const audio = new Audio();
        audio.srcObject = stream;
        chrome.storage.sync.get('volume', ({volume}) => {
            audio.volume = (volume / 100);
            audio.play();
        });

        const onMessageListener = ({command, data}) => {
            switch (command) {
                case "play":
                    console.log("start recording");
                    mediaRecorder.startRecording(data);
                    break;
                case "ended":
                    console.log("finish recording");
                    mediaRecorder.finishRecording();
                    break;
                case "abort":
                    console.log("cancel recording");
                    mediaRecorder.cancelRecording();
                    break;
                default:
                    console.log("unknown command: ", command);
                    break;
            }
        };

        const deleteListener = (downloadDelta) => {
            if (downloadDelta && downloadDelta.state && downloadDelta.state.current === "complete") {
                chrome.downloads.erase({id: downloadDelta.id});
            }
        };

        chrome.runtime.onMessage.addListener(onMessageListener);
        chrome.downloads.onChanged.addListener(deleteListener);

        mediaRecorder.onComplete = (recorder, track) => {
            chrome.downloads.download({url: track.url, filename: `clipinc/${track.artist} - ${track.title}.mp3`});
        };

        mediaRecorder.onEncodingProgress = (recorder, progress) => {
            console.log("encoding progress: ", progress)
        };

        chrome.browserAction.setIcon({
            path: {
                "16": "images/clipinc-16-record.png",
                "32": "images/clipinc-32-record.png",
                "48": "images/clipinc-48-record.png",
                "128": "images/clipinc-128-record.png"
            }
        });

        const stopCapture = (command) => {
            if (command === 'setVolume') {
                chrome.storage.sync.get('volume', ({volume}) => {
                   audio.volume = (volume / 100);
                });
                return
            }

            if (command !== "stopCapture") {
                return
            }

            console.log("stopCapture");
            chrome.storage.sync.set({isRecording: false});
            chrome.runtime.onMessage.removeListener(stopCapture);
            chrome.commands.onCommand.removeListener(stopCapture);
            chrome.runtime.onMessage.removeListener(onMessageListener);
            chrome.downloads.onChanged.removeListener(deleteListener);

            mediaRecorder.cancelRecording();

            audioCtx.close();
            stream.getAudioTracks()[0].stop();

            chrome.browserAction.setIcon({
                path: {
                    "16": "images/clipinc-16.png",
                    "32": "images/clipinc-32.png",
                    "48": "images/clipinc-48.png",
                    "128": "images/clipinc-128.png"
                }
            });
        };

        chrome.runtime.onMessage.addListener(stopCapture);
        chrome.commands.onCommand.addListener(stopCapture);
    });
}
