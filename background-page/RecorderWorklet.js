class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.stopped = false;
        this.port.onmessage = ({ data }) => {
            if (data.command === 'flush') {
                this.stopped = true;
                this.port.postMessage({ command: 'flushed' });
            }
        };
    }
    process(inputs) {
        if (this.stopped) return false;
        const input = inputs[0];
        if (input && input.length && input[0].length) {
            const channels = [input[0].slice(), (input[1] || input[0]).slice()];
            this.port.postMessage(
                { command: 'record', buffer: channels },
                channels.map((ch) => ch.buffer),
            );
        }
        return true;
    }
}
registerProcessor('recorder-processor', RecorderProcessor);
