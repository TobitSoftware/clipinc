import { Recorder } from './recorder';

export class RecordManager {
    mediaStream: MediaStream | null = null;

    recorder: Recorder | null = null;

    gainNode: GainNode | null = null;

    isRecording(): this is RecordManager & { mediaStream: MediaStream; recorder: Recorder, gainNode: GainNode } {
        return !!this.recorder;
    }

    start = async (streamId: string, volume: number) => {
        if (this.isRecording()) {
            throw new Error('Already recording');
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                // @ts-expect-error wrong type in offscreen document?
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            },
            video: false,
        });
        const output = new AudioContext();
        const gainNode = output.createGain();
        this.gainNode = gainNode;
        const source = output.createMediaStreamSource(mediaStream);
        source.connect(gainNode);
        gainNode.connect(output.destination);
        gainNode.gain.value = volume;

        this.mediaStream = mediaStream;
        this.recorder = new Recorder(mediaStream);
        this.recorder.start();
    };

    save = (filename: string) => {
        if (this.isRecording()) {
            this.recorder.setFilename(filename)
            this.recorder.stop();
            this.recorder = new Recorder(this.mediaStream);
            this.recorder.start();
        }
    };

    stop = () => {
        if (this.isRecording()) {
            this.recorder.cancel();
        }
        this.gainNode = null;
        this.recorder = null;
        this.mediaStream = null;
    };

    setVolume = (volume: number) => {
        if (this.isRecording()) {
            this.gainNode.gain.value = volume;
        }
    }
}
