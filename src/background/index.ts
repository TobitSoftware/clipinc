import { startCapture } from './utils/capture';
import { reset } from './utils/reset';
import { resetStorage } from './utils/storage';
import MessageSender = chrome.runtime.MessageSender;
import TabChangeInfo = chrome.tabs.TabChangeInfo;

const handleMessage = (
    {
        command,
        data,
    }: {
        command: string;
        data: unknown;
    },
    _sender: MessageSender,
    sendResponse: (response?: unknown) => void,
) => {
    switch (command) {
        case 'startCapture':
            startCapture().then(
                () => sendResponse({ success: true }),
                () => sendResponse({ success: false }),
            );
            break;
        case 'stopCapture':
            reset();
            break;
        case 'downloadFile': {
            const { url, fileName } = data as { url: string, fileName: string };

            void chrome.downloads.download({
                url,
                filename: fileName,
            });
            break;
        }
        default:
            break;
    }
};

const handleTabRemove = (id: number) => {
    chrome.storage.local.get(['tabId'], ({ tabId }) => {
        // delete storage if the tab that was recorded is closed
        if (tabId && id === tabId) {
            reset();
        }
    });
};

const handleTabUpdate = (id: number, changeInfo: TabChangeInfo) => {
    chrome.storage.local.get(['tabId'], ({ tabId }) => {
        if (tabId === id && changeInfo.status === 'loading') {
            void chrome.runtime.sendMessage({
                command: 'stopRecording',
                target: 'offscreen',
            })
        }
    })
}

chrome.runtime.onInstalled.addListener(resetStorage);
chrome.runtime.onStartup.addListener(resetStorage);
chrome.tabs.onRemoved.addListener(handleTabRemove);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
