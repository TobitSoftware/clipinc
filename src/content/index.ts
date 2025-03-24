import { hijackVolumeControl, releaseVolumeControl } from './components/VolumeSlider';
import {
    getNowPlayingWidget,
    getPlayButton,
    getPreviousButton,
    getTrackInfo,
    getVolume,
} from './utils/selectors';

const mutationObserver = new MutationObserver(() => {
    const trackInfo = getTrackInfo();

    const filename = trackInfo.title || trackInfo.subTitle ? `${trackInfo.title} - ${trackInfo.subTitle}.mp4`: null;
    void chrome.runtime.sendMessage({
        command: 'setFilename',
        target: 'offscreen',
        data: {
            filename,
        },
    });
    void chrome.storage.session.set({
        title: trackInfo.title,
        subTitle: trackInfo.subTitle,
        coverSrc: trackInfo.coverImageUrl,
    });
})

chrome.runtime.onMessage.addListener((request: { command: string, data: unknown }, sender, sendResponse) => {
    console.debug('[clipinc] content script received message:', request);
    switch (request.command) {
        case 'prepareRecording': {
            const volume = getVolume();
            sendResponse({ volume });
            hijackVolumeControl(volume);
            break;
        }
        case 'startRecording': {
            getPreviousButton()?.click();
            getPlayButton()?.click();

            const trackInfo = getTrackInfo();
            const filename = trackInfo.title || trackInfo.subTitle ? `${trackInfo.title} - ${trackInfo.subTitle}.mp4`: null;

            void chrome.runtime.sendMessage({
                command: 'setFilename',
                target: 'offscreen',
                data: {
                    filename,
                }
            });
            void chrome.storage.session.set({
                title: trackInfo.title,
                subTitle: trackInfo.subTitle,
                coverSrc: trackInfo.coverImageUrl,
            });

            mutationObserver.observe(getNowPlayingWidget() as Element, { attributes: true });

            break;
        }
        default:
            break;
    }
});

chrome.storage.session.onChanged.addListener((change) => {
    if ('isRecording' in change) {
        if (change.isRecording.newValue === false) {
            mutationObserver.disconnect();

            releaseVolumeControl();
        }
    }
});
