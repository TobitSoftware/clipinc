/* eslint-disable no-param-reassign */
import { buildToolkitConfig } from 'chayns-toolkit';
import path from 'node:path';
import packageJson from './package.json';

export default buildToolkitConfig({
    development: {
        host: '0.0.0.0',
        port: 8080,
    },
    output: {
        entryPoints: {
            'background/index': {
                pathIndex: './src/background/index',
            },
            'content/index': {
                pathIndex: './src/content/index',
            },
            'offscreen/index': {
                pathIndex: './src/offscreen/index',
                pathHtml: './src/offscreen/index.html',
            },
            'popup/index': {
                pathIndex: './src/popup/index',
                pathHtml: './src/popup/index.html',
            },
        },
    },
    webpack: (config) => {
        config.output ??= {};
        config.output.target = 'web-worker';

        config.output.copy = [
            {
                from: './chrome',
                transform: (content, absoluteFilename) => {
                    if (!absoluteFilename.endsWith(`${path.sep}manifest.json`)) return content;
                    const text = content.toString('utf-8');
                    const json = JSON.parse(text) as { version: string };
                    json.version = packageJson.version;

                    return `${JSON.stringify(json, undefined, 4)}\n`;
                },
            },
        ];

        config.output.filename ??= {};
        config.output.filename.js = '[name].js';

        config.dev ??= {};
        config.dev.writeToDisk = true;

        return config;
    },
});
