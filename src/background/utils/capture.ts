import ContextType = chrome.runtime.ContextType;
import Reason = chrome.offscreen.Reason;
import { setRecordingIcon } from './icon';
import { setVolume } from './setVolume';

type PrepareRecordingMessage = { command: 'prepareRecording' };
type PrepareRecordingResponse = { error?: Error; volume?: number };

export const startCapture = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) return;
    const tabId = tab.id;

    const response = await chrome.tabs.sendMessage<
        PrepareRecordingMessage,
        PrepareRecordingResponse
    >(tab.id, { command: 'prepareRecording' });

    if (response?.error) {
        chrome.notifications.create('clipincError', {
            type: 'basic',
            title: chrome.i18n.getMessage('name'),
            message: chrome.i18n.getMessage('errorChangeDevice'),
            iconUrl: 'images/clipinc-128.png',
        });

        console.error(response.error);

        throw response.error;
    }

    const [offscreenDocument] = await chrome.runtime.getContexts({
        contextTypes: [ContextType.OFFSCREEN_DOCUMENT],
    });

    if (!offscreenDocument) {
        await chrome.offscreen.createDocument({
            url: 'offscreen/index.html',
            reasons: [Reason.USER_MEDIA, Reason.BLOBS],
            justification: 'Recording from chrome.tabCapture API',
        });
    }

    void chrome.storage.session.set({ volume: response?.volume ?? 1 });
    void setVolume(1);

    chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
        void chrome.runtime.sendMessage({
            command: 'startRecording',
            target: 'offscreen',
            data: { streamId, volume: response?.volume ?? 1 },
        });
        void chrome.tabs.sendMessage(tabId, {
            command: 'startRecording',
        });
        setRecordingIcon();
        void chrome.storage.session.set({
            isRecording: true
        })
    });
};
