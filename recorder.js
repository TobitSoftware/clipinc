const OPTIONS = {
    numChannels: 2,
    bufferSize: undefined,
    bitRate: 256
};

class Recorder {

    constructor(source) {
        this.context = source.context;
        if (this.context.createScriptProcessor == null) {
            this.context.createScriptProcessor = this.context.createJavaScriptNode;
        }

        this.input = this.context.createGain();
        source.connect(this.input);
        this.buffer = [];

        this.initWorker();
    }

    isRecording() {
        return this.processor != null;
    }

    startRecording(track) {
        if (this.isRecording()) {
            return;
        }

        const buffer = this.buffer;
        const worker = this.worker;

        this.processor = this.context.createScriptProcessor(OPTIONS.bufferSize, OPTIONS.numChannels, OPTIONS.numChannels);
        this.input.connect(this.processor);
        this.processor.connect(this.context.destination);

        this.processor.onaudioprocess = (event) => {
            for (let ch = 0; ch < OPTIONS.numChannels; ++ch) {
                buffer[ch] = event.inputBuffer.getChannelData(ch);
            }
            worker.postMessage({command: "record", buffer: buffer});
        };

        this.worker.postMessage({
            command: "start",
            track
        });
    }

    cancelRecording() {
        if (!this.isRecording()) {
            return;
        }

        this.input.disconnect();
        this.processor.disconnect();
        delete this.processor;
        this.worker.postMessage({command: "cancel"});
    }

    finishRecording() {
        if (!this.isRecording()) {
            return;
        }

        this.input.disconnect();
        this.processor.disconnect();
        delete this.processor;
        this.worker.postMessage({command: "finish"});
    }

    cancelEncoding() {
        if (this.isRecording()) {
            return;
        }

        this.onEncodingCanceled(this);
        this.initWorker();
    }

    initWorker() {
        if (this.worker != null) {
            this.worker.terminate();
        }

        this.onEncoderLoading(this, this.encoding);

        this.worker = new Worker("/workers/Mp3Worker.js");
        this.worker.onmessage = (event) => {
            const data = event.data;
            switch (data.command) {
                case "loaded":
                    this.onEncoderLoaded(this, this.encoding);
                    break;
                case "timeout":
                    this.onTimeout(this);
                    break;
                case "progress":
                    this.onEncodingProgress(this, data.progress);
                    break;
                case "complete":
                    this.onComplete(this, data.track);
            }
        };

        this.worker.postMessage({
            command: "init",
            config: {
                sampleRate: this.context.sampleRate,
                numChannels: OPTIONS.numChannels
            },
            options: OPTIONS
        });
    }

    onEncoderLoading(recorder, encoding) {}

    onEncoderLoaded(recorder, encoding) {}

    onTimeout(recorder) {}

    onEncodingProgress(recorder, progress) {}

    onEncodingCanceled(recorder) {}

    onComplete(recorder, blob) {}

}