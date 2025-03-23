import { startCapture } from './utils/capture';
import { reset } from './utils/reset';
import { setVolume } from './utils/setVolume';
import { resetStorage } from './utils/storage';
import MessageSender = chrome.runtime.MessageSender;
import TabChangeInfo = chrome.tabs.TabChangeInfo;

void chrome.storage.session.setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
});

chrome.runtime.onStartup.addListener(() => {
    void chrome.storage.local.clear();
});

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
    console.log('received message', command, data);
    switch (command) {
        case 'startCapture':
            startCapture().then(
                () => sendResponse({ success: true }),
                () => sendResponse({ success: false }),
            );
            break;
        case 'stopCapture':
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
            reset();
            break;
        case 'downloadFile': {
            const { url, filename } = data as { url: string; filename: string };

            void chrome.downloads.download({
                url,
                filename,
            });
            chrome.storage.local.get(['songCount'], ({ songCount }) => {
                const oldSongCount = (songCount || 0) as number;
                void chrome.storage.local.set({ songCount: oldSongCount + 1 });
            });
            break;
        }
        case 'setVolume': {
            const { volume } = data as { volume: number };
            void chrome.storage.session.set({ volume });
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
            });
        }
    });
};

chrome.runtime.onInstalled.addListener(resetStorage);
chrome.runtime.onStartup.addListener(resetStorage);
chrome.tabs.onRemoved.addListener(handleTabRemove);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);

chrome.webRequest.onSendHeaders.addListener(
    (ev) => {
        const match = /devices\/(?<deviceId>[0-9a-f]+)/.exec(ev.url);
        if (match?.groups?.deviceId) {
            void chrome.storage.session.set({ deviceId: match.groups.deviceId });
        }

        ev.requestHeaders?.forEach((header) => {
            if (header.name === 'authorization') {
                void chrome.storage.session.set({ authorization: header.value });
            }
            if (header.name === 'client-token') {
                void chrome.storage.session.set({ clientToken: header.value });
            }
        });
    },
    {
        urls: ['https://*.spotify.com/track-playback/*'],
    },
    ['requestHeaders'],
);

chrome.webRequest.onBeforeRequest.addListener(
    (ev) => {
        console.log('[before]', ev.method, ev.url);
        const buffer = ev.requestBody?.raw?.[0].bytes;
        let body;
        if (buffer) {
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);
            body = JSON.parse(text);
        }
        if (ev.method === 'DELETE' && ev.url.includes('/devices/')) {
            void chrome.storage.session.remove(['deviceId', 'authorization', 'clientToken']);
        }
        if (ev.method === 'PUT' && ev.url.endsWith('/state')) {
            console.log('called state endpoint', body);
            if (body.debug_source === 'track_data_finalized') {
                void chrome.runtime.sendMessage({
                    command: 'trackEnded',
                    target: 'offscreen',
                });
            }
            if (body.debug_source === 'started_playing') {
                void chrome.runtime.sendMessage({
                    command: 'trackStarted',
                    target: 'offscreen',
                });
            }
            if (body.debug_source === 'pause') {
                void chrome.runtime.sendMessage({
                    command: 'trackPaused',
                    target: 'offscreen',
                });
            }
            if (body.debug_source === 'resume') {
                void chrome.runtime.sendMessage({
                    command: 'trackResumed',
                    target: 'offscreen',
                });
            }
        }
    },
    {
        urls: ['https://*.spotify.com/track-playback/*'],
    },
    ['requestBody'],
);
