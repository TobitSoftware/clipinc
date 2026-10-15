export class Recorder {
    constructor(source) {
        this.context = source.context;
        this.input = this.context.createGain();
        source.connect(this.input);
        this.active = null;
        this.jobs = new Set();
        this.ready = this.context.audioWorklet.addModule(
            new URL('./RecorderWorklet.js', import.meta.url),
        );
    }

    isRecording() {
        return this.active !== null;
    }

    startRecording() {
        if (this.active) return;
        // Each song owns its encoder. Finishing the previous song must never
        // reset or terminate the encoder currently receiving audio.
        const worker = new Worker(new URL('./Mp3Worker.js', import.meta.url));
        const node = new AudioWorkletNode(this.context, 'recorder-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: 'explicit',
        });
        const job = { worker, node, frames: 0, startedAt: Date.now() };
        this.onDiagnostic({ event: 'recorder-start' });
        this.jobs.add(job);
        this.active = job;
        worker.onmessage = ({ data }) => {
            if (data.command === 'metadata') {
                Promise.resolve()
                    .then(() => this.onMetadata(data.track))
                    .catch(() => ({}))
                    .then((metadata) => {
                        if (this.jobs.has(job))
                            worker.postMessage({
                                command: 'metadata',
                                metadata,
                            });
                    });
            }
            if (data.command === 'progress')
                this.onEncodingProgress(this, data.progress);
            if (data.command === 'complete' || data.command === 'error') {
                this.jobs.delete(job);
                worker.terminate();
                if (data.command === 'complete')
                    this.onComplete(this, data.track, data.buffer);
                else this.onError(this, data.message);
            }
        };
        worker.onerror = (event) => {
            if (this.active === job) this.cancelRecording();
            this.jobs.delete(job);
            worker.terminate();
            this.onError(this, event.message);
        };
        node.port.onmessage = ({ data }) => {
            if (data.command === 'record') {
                job.frames += data.buffer[0].length;
                worker.postMessage(
                    data,
                    data.buffer.map((ch) => ch.buffer),
                );
            }
            if (data.command === 'flushed') {
                this.diagnose(job, 'recorder-finish');
                node.port.onmessage = null;
                node.disconnect();
                worker.postMessage({ command: 'finish', track: job.track });
            }
        };
        worker.postMessage({
            command: 'init',
            config: { sampleRate: this.context.sampleRate, numChannels: 2 },
        });
        worker.postMessage({ command: 'start' });
        this.input.connect(node);
        // The worklet outputs silence; connecting to the destination keeps the
        // graph pulled without duplicating the separately monitored tab audio.
        node.connect(this.context.destination);
    }

    diagnose(job, event) {
        this.onDiagnostic({
            event,
            title: job.track?.title,
            wallMs: Date.now() - job.startedAt,
            audioMs: Math.round((job.frames / this.context.sampleRate) * 1000),
            contextState: this.context.state,
        });
    }

    cancelRecording() {
        const job = this.active;
        if (!job) return;
        this.diagnose(job, 'recorder-cancel');
        this.active = null;
        this.input.disconnect(job.node);
        job.node.port.onmessage = null;
        job.node.disconnect();
        job.worker.terminate();
        this.jobs.delete(job);
    }

    finishRecording(track) {
        const job = this.active;
        if (!job) return;
        this.active = null;
        job.track = { ...track };
        this.input.disconnect(job.node);
        // Flush is acknowledged on the same ordered port as the samples.
        job.node.port.postMessage({ command: 'flush' });
    }

    onMetadata() {
        return {};
    }

    onDiagnostic() {}

    onEncodingProgress() {}
    onComplete() {}
    onError() {}
}
