export const setDefaultIcon = () => {
    void chrome.action.setIcon({
        path: {
            16: '/images/clipinc-16.png',
            32: '/images/clipinc-32.png',
            48: '/images/clipinc-48.png',
            128: '/images/clipinc-128.png',
        },
    });
};

// set icon to recording
export const setRecordingIcon = () => {
    void chrome.action.setIcon({
        path: {
            16: '/images/clipinc-16-record.png',
            32: '/images/clipinc-32-record.png',
            48: '/images/clipinc-48-record.png',
            128: '/images/clipinc-128-record.png',
        },
    });
};
