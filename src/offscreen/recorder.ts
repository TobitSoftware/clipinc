import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export class Recorder {
    chunks: Blob[] = [];

    mediaRecorder: MediaRecorder;

    isCanceled = false;

    filename: string | null = null;

    constructor(stream: MediaStream) {
        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.addEventListener('dataavailable', this.#handleDataAvailable);

        this.mediaRecorder.addEventListener('stop', () => void this.#handleStop());
    }

    #handleDataAvailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) {
            this.chunks.push(ev.data);
        }
    };

    #handleStop = async () => {
        if (this.isCanceled) {
            return;
        }
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const target = new ArrayBufferTarget();

        const muxer = new Muxer({
            audio: {
                codec: 'aac',
                numberOfChannels: audioBuffer.numberOfChannels,
                sampleRate: audioBuffer.sampleRate,
            },
            target,
            fastStart: 'in-memory'
        });

        const encoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: console.error,
        });

        encoder.configure({
            codec: 'mp4a.40.2',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
        });

        const { sampleRate } = audioBuffer;
        let totalFramesProcessed = 0;
        const targetBlockSize = 512;

        for (let i = 0; i < audioBuffer.length; i += targetBlockSize) {
            const blockSize = Math.min(targetBlockSize, audioBuffer.length - i);

            const interleavedData = new Float32Array(blockSize * audioBuffer.numberOfChannels);

            for (let channel = 0; channel < audioBuffer.numberOfChannels; ++channel) {
                const channelData = audioBuffer.getChannelData(channel).subarray(i, i + blockSize);
                for (let sampleIndex = 0; sampleIndex < blockSize; ++sampleIndex) {
                    interleavedData[sampleIndex * audioBuffer.numberOfChannels + channel] =
                        channelData[sampleIndex];
                }
            }

            const timestamp = (totalFramesProcessed / sampleRate) * 1000000;

            encoder.encode(
                new AudioData({
                    timestamp,
                    data: interleavedData,
                    format: 'f32',
                    sampleRate: audioBuffer.sampleRate,
                    numberOfFrames: blockSize,
                    numberOfChannels: audioBuffer.numberOfChannels,
                }),
            );
            totalFramesProcessed += blockSize;
        }
        await encoder.flush();
        muxer.finalize();

        const finalBlob = new Blob([target.buffer], { type: 'audio/mp4' });

        const url = URL.createObjectURL(finalBlob);

        void chrome.runtime.sendMessage({
            command: 'downloadFile',
            data: {
                url,
                filename: this.filename,
            },
        });
    };

    setFilename = (name: string) => {
        this.filename = name;
    }

    start = () => {
        this.mediaRecorder.start();
    };

    stop = () => {
        this.mediaRecorder.stop();
    };

    cancel = () => {
        this.isCanceled = true;
    };
}
