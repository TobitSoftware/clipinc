export type ClipincStorageState = {
    authorization?: string;
    clientToken?: string;
    coverSrc?: string;
    deviceId?: string;
    isRecording?: boolean;
    progress?: number;
    songCount?: number;
    subTitle?: string;
    title?: string;
    volume?: number;
};

export type ClipincStorageChange = {
    [key in keyof ClipincStorageState]: {
        newValue?: ClipincStorageState[key];
        oldValue?: ClipincStorageState[key];
    };
};
