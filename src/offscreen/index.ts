import { RecordManager } from './recordManager';

const recorder = new RecordManager();
// @ts-expect-error only for debugging
// eslint-disable-next-line no-restricted-globals
self.recorder = recorder;

chrome.runtime.onMessage.addListener(
    (
        request: {
            command: string;
            target: string;
            data: unknown;
        },
        sender,
        sendResponse,
    ) => {
        if (request.target !== 'offscreen') return;
        console.log('[offscreen] message received', request);
        switch (request.command) {
            case 'startRecording': {
                const { streamId, volume } = request.data as { streamId: string; volume: number };
                void recorder.start(streamId, volume);
                break;
            }
            case 'saveFile': {
                const { filename } = request.data as { filename: string };
                recorder.save(filename);
                break;
            }
            case 'setVolume': {
                const { volume } = request.data as { volume: number };
                recorder.setVolume(volume);
                break;
            }
            case 'stopRecording':
                recorder.stop();
                break;
            default:
                break;
        }
    },
);
