import { setDefaultIcon } from './icon';
import { setVolume } from './setVolume';

export const reset = () => {
    setDefaultIcon();
    void chrome.runtime.sendMessage({
        command: 'stopRecording',
        target: 'offscreen',
    })
    chrome.storage.session.get(['volume'], ({ volume }) => {
        void setVolume(Number(volume) ?? 1);
    });
    void chrome.storage.session.set({
        isRecording: false,
    });
};
