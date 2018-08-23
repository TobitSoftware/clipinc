chrome.runtime.onInstalled.addListener(() => {
    resetStorage();

    chrome.runtime.onStartup.addListener(resetStorage);
    chrome.tabs.onRemoved.addListener(handleTabRemove);
    chrome.windows.onRemoved.addListener(handleWindowRemove);

    chrome.tabs.onActivated.addListener(handleIconChange);
    chrome.windows.onFocusChanged.addListener(handleIconChange);

    chrome.browserAction.onClicked.addListener(handleIconClick);
});

function handleTabRemove(id) {
    chrome.storage.local.get(['tabId'], ({tabId}) => {
        if (tabId && id === tabId) {
            resetStorage();
        }
    });
}

function handleWindowRemove() {
    chrome.storage.local.get(["tabId"], ({tabId}) => {
        chrome.tabs.get(tabId, (tab) => {
            if (tab !== 0 && (chrome.runtime.lastError || !tab)) {
                resetStorage();
            }
        });
    });
}

function resetStorage() {
    chrome.storage.local.set({isRecording: false, tabId: 0});
}

function handleIconChange() {
    chrome.tabs.getSelected((tab) => {
        if (chrome.runtime.lastError || !tab || tab.url.indexOf("https://open.spotify.com") === -1) {
            setDisabledIcon();
        } else {
            chrome.storage.local.get(["tabId", "isRecording"], ({tabId, isRecording}) => {
                if (!tab.tabId || tab.tabId === id) {
                    if (isRecording) {
                        setRecordingIcon();
                    } else {
                        setDefautIcon();
                    }
                } else {
                    setDisabledIcon();
                }
            });
        }
    });
}

function handleIconClick() {
    chrome.storage.local.get(['isRecording', 'tabId'], ({isRecording, tabId}) => {
        chrome.tabs.getSelected((tab) => {
            if (tab && tabId && tab.id !== tabId) {
                chrome.tabs.get(tabId, ({index}) => {
                    chrome.tabs.highlight({
                        tabs: [index]
                    });
                });
            } else if (chrome.runtime.lastError || tab.url.indexOf("https://open.spotify.com") === -1) {
                chrome.tabs.create({
                    url: 'https://open.spotify.com'
                });
            } else if (!isRecording) {
                console.log("startCapture");
                startCapture();
            }
        });
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

                const handleStopIconClick = () => chrome.tabs.getSelected((currentTab) => {
                    if (currentTab.id !== tab.id) {
                        return;
                    }

                    console.log("clean up");

                    chrome.runtime.onMessage.removeListener(mediaListener);
                    chrome.downloads.onChanged.removeListener(cleanDownloadShelf);
                    chrome.browserAction.onClicked.removeListener(handleStopIconClick);

                    mediaRecorder.cancelRecording();
                    mediaRecorder.onComplete = () => {
                    };

                    audioCtx.close();
                    stream.getAudioTracks()[0].stop();

                    setDefautIcon();
                    chrome.storage.local.set({isRecording: false, tabId: 0});
                    chrome.tabs.sendMessage(tab.id, {command: "stopRecording", data: {volume: audio.volume}});
                });

                chrome.runtime.onMessage.addListener(mediaListener);
                chrome.downloads.onChanged.addListener(cleanDownloadShelf);
                chrome.browserAction.onClicked.addListener(handleStopIconClick);
                chrome.tabs.sendMessage(tab.id, {command: "startRecording"});

                chrome.storage.local.set({isRecording: true, tabId: tab.id});
                setRecordingIcon();
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
    let dir = "clipinc";

    if (track.playlist) {
        dir += `/${track.playlist}`;
    }

    chrome.downloads.download({url: track.url, filename: `${dir}/${track.artist} - ${track.title}.mp3`});
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

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage("nameStart")
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

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage("nameRecording")
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

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage("name")
    });
}
