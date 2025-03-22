import { RecordManager } from './recordManager';

const recordManager = new RecordManager();
// @ts-expect-error only for debugging
// eslint-disable-next-line no-restricted-globals
self.recordManager = recordManager;

chrome.runtime.onMessage.addListener(
    (
        request: {
            command: string;
            target: string;
            data: unknown;
        },
    ) => {
        if (request.target !== 'offscreen') return;
        console.log('[offscreen] message received', request);
        switch (request.command) {
            case 'startRecording': {
                const { streamId, volume } = request.data as { streamId: string; volume: number };
                void recordManager.start(streamId, volume);
                break;
            }
            case 'trackStarted': {
                const { filename } = request.data as { filename: string };
                recordManager.startTrack(filename);
                break;
            }
            case 'trackPaused':
                recordManager.pauseRecording();
                break;
            case 'trackResumed':
                recordManager.resumeRecording();
                break;
            case 'trackEnded':
                recordManager.finishTrack();
                break;
            case 'setVolume': {
                const { volume } = request.data as { volume: number };
                recordManager.setVolume(volume);
                break;
            }
            case 'stopRecording':
                recordManager.stop();
                break;
            default:
                break;
        }
    },
);
