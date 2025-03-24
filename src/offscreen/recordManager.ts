import { Recorder } from './recorder';

const convertVolumeToGain = (volume: number) => volume ** 3;

export class RecordManager {
    mediaStream: MediaStream | null = null;

    recorder: Recorder | null = null;

    gainNode: GainNode | null = null;

    filename: string | null = null;

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
        gainNode.gain.value = convertVolumeToGain(volume);

        this.mediaStream = mediaStream;
        this.recorder = new Recorder(mediaStream);
        this.recorder.start();
    };

    stop = () => {
        if (this.isRecording()) {
            this.recorder.cancel();
            this.mediaStream?.getAudioTracks().forEach(track => track.stop());
        }
        this.gainNode = null;
        this.recorder = null;
        this.mediaStream = null;
    };

    setFilename = (filename: string) => {
        this.filename = filename;
        if (this.isRecording()) {
            this.recorder.setFilename(filename);
        }
    }

    setVolume = (volume: number) => {
        if (this.isRecording()) {
            this.gainNode.gain.value = convertVolumeToGain(volume);
        }
    }

    startTrack = () => {
        if (this.isRecording()) {
            this.recorder.cancel();
            this.recorder = new Recorder(this.mediaStream);
            this.recorder.start();
        }
    }

    finishTrack = () => {
        if (this.isRecording()) {
            if (this.filename) {
                this.recorder.setFilename(this.filename);
            }
            this.recorder.stop();
            this.recorder = new Recorder(this.mediaStream);
            this.recorder.start();
        }
    }

    pauseRecording = () => {
        if (this.isRecording()) {
            this.recorder.mediaRecorder.pause();
        }
    }

    resumeRecording = () => {
        if (this.isRecording()) {
            this.recorder.mediaRecorder.resume();
        }
    }
}
