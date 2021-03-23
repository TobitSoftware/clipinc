const OPTIONS = {
    numChannels: 2,
    bufferSize: undefined,
};

export class Recorder {
    constructor(source) {
        this.context = source.context;
        if (this.context.createScriptProcessor == null) {
            this.context.createScriptProcessor = this.context.createJavaScriptNode;
        }

        this.input = this.context.createGain();
        source.connect(this.input);

        this.initWorker();
    }

    isRecording() {
        return this.processor != null;
    }

    startRecording() {
        if (this.isRecording()) {
            return;
        }

        const buffer = [];
        const worker = this.worker;

        this.processor = this.context.createScriptProcessor(
            OPTIONS.bufferSize,
            OPTIONS.numChannels,
            OPTIONS.numChannels
        );
        this.input.connect(this.processor);
        this.processor.connect(this.context.destination);

        this.processor.onaudioprocess = (event) => {
            for (let ch = 0; ch < OPTIONS.numChannels; ++ch) {
                buffer[ch] = event.inputBuffer.getChannelData(ch);
            }
            worker.postMessage({ command: 'record', buffer: buffer });
        };

        this.worker.postMessage({
            command: 'start',
        });
    }

    cancelRecording() {
        if (!this.isRecording()) {
            return;
        }

        this.input.disconnect();
        this.processor.disconnect();
        delete this.processor;
        this.worker.postMessage({ command: 'cancel' });
    }

    finishRecording(track) {
        if (!this.isRecording()) {
            return;
        }

        this.input.disconnect();
        this.processor.disconnect();
        delete this.processor;
        this.worker.postMessage({ command: 'finish', track });
    }

    initWorker() {
        if (this.worker != null) {
            this.worker.terminate();
        }

        this.worker = new Worker(new URL('./Mp3Worker.js', import.meta.url));
        this.worker.onmessage = (event) => {
            const data = event.data;
            switch (data.command) {
                case 'progress':
                    this.onEncodingProgress(this, data.progress);
                    break;
                case 'complete':
                    this.onComplete(this, data.track);
                    break;
                case 'error':
                    this.onError(this, data.message);
                    break;
            }
        };

        this.worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate,
                numChannels: OPTIONS.numChannels,
            },
            options: OPTIONS,
        });
    }

    onEncodingProgress(recorder, progress) {}

    onComplete(recorder, blob) {}

    onError(recorder, error) {}
}
