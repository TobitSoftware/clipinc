import { hijackVolumeControl, releaseVolumeControl } from './components/VolumeSlider';
import {
    getNowPlayingWidget,
    getPlayButton,
    getPreviousButton,
    getTrackInfo,
    getVolume,
} from './utils/selectors';

let lastTrackInfo: ReturnType<typeof getTrackInfo> | null = null;

const mutationObserver = new MutationObserver(() => {
    console.log('mutationObserver', lastTrackInfo);
    const filename = lastTrackInfo ? `${lastTrackInfo.title} - ${lastTrackInfo.subTitle}.m4a`: null;
    void chrome.runtime.sendMessage({
        command: 'saveFile',
        data: {
            filename,
        },
        target: 'offscreen',
    });
    lastTrackInfo = getTrackInfo();
})

chrome.runtime.onMessage.addListener((request: { command: string, data: unknown }, sender, sendResponse) => {
    console.log('[content] received message', request);
    switch (request.command) {
        case 'prepareRecording': {
            const volume = getVolume();
            if (volume !== 1) {
                sendResponse({ error: new Error('volume has to be 100%')});
            } else {
                sendResponse({ volume });
                hijackVolumeControl();
            }
            break;
        }
        case 'startRecording':
            getPreviousButton()?.click();
            getPlayButton()?.click();

            lastTrackInfo = getTrackInfo();

            mutationObserver.observe(getNowPlayingWidget() as Element, { attributes: true });

            break;
        case 'stopRecording': {
            // TODO: release volume control and set volume
            const { volume } = request.data as { volume: number };

            mutationObserver.disconnect();

            releaseVolumeControl();

            break;
        }
        default:
            break;
    }
});
