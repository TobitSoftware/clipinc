export const resetStorage = () => {
    void chrome.storage.local.set({
        isRecording: false,
        tabId: 0,
        track: null,
        songCount: 0,
    });
}
