// reset storage after installation
chrome.runtime.onInstalled.addListener(resetStorage);

// reset storage when chrome starts
chrome.runtime.onStartup.addListener(resetStorage);

//handle tab / window removed
chrome.tabs.onRemoved.addListener(handleTabRemove);
chrome.windows.onRemoved.addListener(handleWindowRemove);

//handle tab / window focus change
chrome.tabs.onActivated.addListener(handleFocusChange);
chrome.windows.onFocusChanged.addListener(handleFocusChange);

chrome.runtime.onMessage.addListener(({command, data}) => {
    console.log('background.js: ', command, data);

    switch(command) {
        case 'startCapture':
            startCapture(data.volume);
            break;
        case 'spotifyPlay':
            chrome.storage.local.set({'track': data.track});
            break;
        case 'spotifyEnded':
            break;
        case 'spotifyPause':
            break;
        case 'spotifyAbort':
            break;
    }
});

// start tab capturing
function startCapture(initialVolume) {
    chrome.tabs.query({'active': true}, (tabs) => {
        const tab = tabs[0];

        chrome.tabs.sendMessage(tab.id, {command: 'prepareRecording'}, {}, (response) => {
            if (response && response.error) {
                chrome.notifications.create('clipincError', {
                    type: 'basic',
                    title: chrome.i18n.getMessage('name'),
                    message: chrome.i18n.getMessage('errorChangeDevice'),
                    iconUrl: 'images/clipinc-128.png'
                }, console.log.bind(console));

                console.error(response.error);
                return;
            }

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
                console.log(initialVolume);
                audio.volume = initialVolume;
                audio.play();

                const stopRecording = () => chrome.tabs.query({'active': true}, (tabs) => {
                    const tab = tabs[0];
                    
                    if (currentTab.id !== tab.id) {
                        return;
                    }

                    chrome.runtime.onMessage.removeListener(mediaListener);

                    mediaRecorder.cancelRecording();
                    mediaRecorder.onComplete = () => {};

                    audioCtx.close();
                    stream.getAudioTracks()[0].stop();

                    setDefaultIcon();
                    resetStorage();
                    chrome.tabs.sendMessage(tab.id, {command: 'stopRecording', data: {volume: audio.volume}});
                });

                const mediaListener = ({command, data}) => {
                    console.log('background.js', "mediaListener", command, data);

                    switch (command) {
                        case 'setVolume':
                            audio.volume = data.volume;
                            break;
                        case 'spotifyPlay':
                            mediaRecorder.startRecording();
                            break;
                        case 'spotifyEnded':
                            // used to skip ads
                            if (!data.track.isPremium && data.track.duration <= 30) {
                                console.log('track is shorter than or equal to 30 seconds, user has no premium, discarding track');
                                mediaRecorder.cancelRecording();
                                break;
                            }

                            mediaRecorder.finishRecording(data.track);
                            break;
                        case 'spotifyPause':
                        case 'spotifyAbort':
                            mediaRecorder.cancelRecording();
                            break;
                        case 'stopCapture':
                            stopRecording();
                            break;
                    }
                };

                chrome.runtime.onMessage.addListener(mediaListener);
                chrome.tabs.sendMessage(tab.id, {command: 'startRecording'});

                chrome.storage.local.set({isRecording: true, tabId: tab.id});
                setRecordingIcon();
            });
        });
    });
}

// delete storage if the tab that was recorded is closed
function handleTabRemove(id) {
    chrome.storage.local.get(['tabId'], ({tabId}) => {
        if (tabId && id === tabId) {
            resetStorage();
        }
    });
}

// delete storage if the window that was recording was closed
function handleWindowRemove() {
    chrome.storage.local.get(['tabId'], ({tabId}) => {
        chrome.tabs.get(tabId, (tab) => {
            if (tab !== 0 && (chrome.runtime.lastError || !tab)) {
                resetStorage();
            }
        });
    });
}

// called when focus of tab / window changes
// if the website that is opened is not spotify, set the icon to the disabled one
// otherwise check if the current spotify tab is the tab that is recorded
// start / stop recording based on state
function handleFocusChange() {
    chrome.tabs.query({'active': true}, (tabs) => {
        const tab = tabs[0];

        if (chrome.runtime.lastError || !tab || tab.url.indexOf('https://open.spotify.com') === -1) {
            setDisabledIcon();
        } else {
            chrome.storage.local.get(['tabId', 'isRecording'], ({tabId, isRecording}) => {
                if (!tab.tabId || tab.tabId === id) {
                    if (isRecording) {
                        setRecordingIcon();
                    } else {
                        setDefaultIcon();
                    }
                } else {
                    setDisabledIcon();
                }
            });
        }
    });
}

// clear storage
function resetStorage() {
    chrome.storage.local.set({isRecording: false, tabId: 0, track: null});
}

// download file
function download(recorder, track) {
    chrome.downloads.onChanged.addListener(cleanDownloadShelf);

    const regex = /[\\/:*?"<>|.]/g;
    const dir = `clipinc/${track.directory.replace(regex, ' ').trim()}`;

    let filename = `${dir}/${track.artist.replace(regex, ' ').trim()} - ${track.title.replace(regex, ' ').trim()}.mp3`;
    console.log('download mp3: ', filename);
    chrome.downloads.download({url: track.url, filename, conflictAction: 'overwrite'});
}

// remove files from download shelf to stop spam
function cleanDownloadShelf(delta) {
    if (!delta || !delta.state || delta.state.current !== 'complete') {
        return;
    }

    chrome.downloads.search({id: delta.id}, (downloads) => {
        if (downloads[0].filename.indexOf('clipinc') === -1) {
            return;
        }

        chrome.downloads.erase({id: delta.id});
        chrome.downloads.onChanged.removeListener(cleanDownloadShelf);
    });
}

//set icon to default
function setDefaultIcon() {
    chrome.browserAction.setIcon({
        path: {
            '16': 'images/clipinc-16.png',
            '32': 'images/clipinc-32.png',
            '48': 'images/clipinc-48.png',
            '128': 'images/clipinc-128.png'
        }
    });

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage('nameStart')
    });
}

// set icon to recording
function setRecordingIcon() {
    chrome.browserAction.setIcon({
        path: {
            '16': 'images/clipinc-16-record.png',
            '32': 'images/clipinc-32-record.png',
            '48': 'images/clipinc-48-record.png',
            '128': 'images/clipinc-128-record.png'
        }
    });

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage('nameRecording')
    });
}

// set icon to disabled
function setDisabledIcon() {
    chrome.browserAction.setIcon({
        path: {
            '16': 'images/clipinc-16-disable.png',
            '32': 'images/clipinc-32-disable.png',
            '48': 'images/clipinc-48-disable.png',
            '128': 'images/clipinc-128-disable.png'
        }
    });

    chrome.browserAction.setTitle({
        title: chrome.i18n.getMessage('name')
    });
}
