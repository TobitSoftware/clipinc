chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({isRecording: false, tabId: 0});

    chrome.tabs.onRemoved.addListener(handleRemove);
    chrome.tabs.onActivated.addListener(handleIconChange);
    chrome.windows.onFocusChanged.addListener(handleIconChange);

    chrome.browserAction.onClicked.addListener(handleIconClick);
});

function handleIconChange() {
    chrome.tabs.getSelected(({url, id}) => {
        if (url.indexOf("https://open.spotify.com") === -1) {
            setDisabledIcon()
        } else {
            chrome.storage.local.get(["tabId", "isRecording"], ({tabId, isRecording}) => {
                if (!tabId || tabId === id) {
                    if (isRecording) {
                        setRecordingIcon()
                    } else {
                        setDefautIcon()
                    }
                } else {
                    setDisabledIcon()
                }
            });
        }
    });
}

function handleIconClick() {
    chrome.storage.local.get(['isRecording', 'tabId'], ({isRecording, tabId}) => {
        chrome.tabs.getSelected((tab) => {
            if (tabId && tab.id !== tabId) {
                chrome.tabs.get(tabId, ({index}) => {
                    chrome.tabs.highlight({
                        tabs: [index]
                    });
                });
                return;
            } else if (tab.url.indexOf("https://open.spotify.com") === -1) {
                chrome.tabs.create({
                    url: 'https://open.spotify.com'
                });
            } else if (!isRecording) {
                console.log("startCapture");
                startCapture()
            }
        });
    });
}

function handleRemove(id) {
    chrome.storage.local.get(['tabId'], ({tabId}) => {
        if (id === tabId) {
            chrome.storage.local.set({isRecording: false, tabId: 0});
        }
    });
}

function startCapture() {
    chrome.tabs.getSelected((tab) => {
        chrome.tabs.sendMessage(tab.id, {command: "prepareRecording"}, {}, (response) => {
            chrome.tabCapture.capture({audio: true}, (stream) => {
                if (!stream) {
                    console.error(chrome.runtime.lastError);
                    return;
                }

                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(stream);

                const mediaRecorder = new Recorder(source);
                mediaRecorder.onComplete = download;

                //restore audio for user
                const audio = new Audio();
                audio.srcObject = stream;
                audio.volume = response.volume;
                audio.play();

                chrome.storage.local.set({isRecording: true, tabId: tab.id});
                setRecordingIcon();

                const mediaListener = ({command, data}) => {
                    switch (command) {
                        case "setVolume":
                            console.log("set volume to", data.volume);
                            audio.volume = data.volume;
                            break;
                        case "play":
                            console.log("start recording");
                            mediaRecorder.startRecording();
                            break;
                        case "ended":
                            console.log("finish recording");

                            // used to skip ads
                            if (data.track.duration <= 30) {
                                console.log("track is shorter or equal than 30sec, discarding");
                                mediaRecorder.cancelRecording();
                                break;
                            }

                            mediaRecorder.finishRecording(data.track);
                            break;
                        case "pause":
                        case "abort":
                            console.log("cancel current track");
                            mediaRecorder.cancelRecording();
                            break;
                    }
                };
                chrome.runtime.onMessage.addListener(mediaListener);

                chrome.downloads.onChanged.addListener(cleanDownloadShelf);

                const stopCapture = () => chrome.tabs.getSelected((currentTab) => {
                    if (currentTab.id !== tab.id) {
                        return;
                    }
                    console.log("stopCapture");

                    chrome.runtime.onMessage.removeListener(mediaListener);
                    chrome.downloads.onChanged.removeListener(cleanDownloadShelf);
                    chrome.browserAction.onClicked.removeListener(stopCapture);

                    mediaRecorder.cancelRecording();
                    mediaRecorder.onComplete = () => {
                    };

                    audioCtx.close();
                    stream.getAudioTracks()[0].stop();

                    setDefautIcon();
                    chrome.storage.local.set({isRecording: false, tabId: 0});
                    chrome.tabs.sendMessage(tab.id, {command: "stopRecording", data: {volume: audio.volume}});
                });

                chrome.browserAction.onClicked.addListener(stopCapture);
                chrome.tabs.sendMessage(tab.id, {command: "startRecording"});
            });
        });
    });
}

function cleanDownloadShelf(delta) {
    if (delta && delta.state && delta.state.current === "complete") {
        chrome.downloads.erase({id: delta.id});
    }
}

function download(recorder, track) {
    chrome.downloads.download({url: track.url, filename: `clipinc/${track.artist} - ${track.title}.mp3`});
}

function setDefautIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "images/clipinc-16.png",
            "32": "images/clipinc-32.png",
            "48": "images/clipinc-48.png",
            "128": "images/clipinc-128.png"
        }
    });
}

function setRecordingIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "images/clipinc-16-record.png",
            "32": "images/clipinc-32-record.png",
            "48": "images/clipinc-48-record.png",
            "128": "images/clipinc-128-record.png"
        }
    });
}

function setDisabledIcon() {
    chrome.browserAction.setIcon({
        path: {
            "16": "images/clipinc-16-disable.png",
            "32": "images/clipinc-32-disable.png",
            "48": "images/clipinc-48-disable.png",
            "128": "images/clipinc-128-disable.png"
        }
    });
}
