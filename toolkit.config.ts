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
            'background-page/index': {
                pathIndex: './src/background-page/index',
                pathHtml: './src/background-page/index.html',
            },
            'background/index': {
                pathIndex: './src/background/index',
            },
            'content/content': {
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
            'content/inject': {
                pathIndex: './src/content/inject',
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

        const defaultJsFileName = config.output.filename?.js;
        config.output.filename ??= {};
        config.output.filename.js = (pathData) => {
            if (['content/content', 'content/inject'].includes(pathData.chunk?.name as string)) {
                return `[name].js`;
            }
            if (typeof defaultJsFileName === 'function') {
                return defaultJsFileName(pathData);
            }
            return defaultJsFileName ?? '[name].js';
        };

        config.dev ??= {};
        config.dev.writeToDisk = true;

        return config;
    },
});
