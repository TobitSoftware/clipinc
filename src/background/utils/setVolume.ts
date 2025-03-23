type SessionState = {
    authorization?: string;
    clientToken?: string;
    deviceId?: string;
};

export const setVolume = async (volume: number) => {
    const { authorization, clientToken, deviceId } = await new Promise<SessionState>((resolve) => {
        chrome.storage.session.get(['deviceId', 'authorization', 'clientToken'], (result) =>
            resolve(result),
        );
    });

    if (!deviceId || !authorization || !clientToken) {
        throw new Error('Unable to set volume');
    }

    void fetch(
        `https://gew4-spclient.spotify.com/connect-state/v1/connect/volume/from/${deviceId}/to/${deviceId}`,
        {
            method: 'PUT',
            headers: {
                accept: '*/*',
                authorization,
                'client-token': clientToken,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                volume: volume * 65535,
            }),
        },
    );
};
