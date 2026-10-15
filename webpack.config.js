const fs = require('fs');
const path = require('path');

const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { merge } = require('webpack-merge');

const outputPath = path.join(__dirname, 'dist');

fs.rmSync(outputPath, { recursive: true, force: true });

/** @type {(env: Record<string, string>) => import("webpack").Configuration} */
function getCommonConfig(env) {
    const isDevelopment = Boolean(env.development);

    return {
        mode: isDevelopment ? 'development' : 'production',
        devtool: isDevelopment ? 'cheap-module-source-map' : false,

        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },

        module: {
            rules: [
                {
                    test: /\.(js|jsx|ts|tsx)$/,
                    use: 'babel-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/i,
                    use: [MiniCssExtractPlugin.loader, 'css-loader'],
                },
                {
                    test: /\.(png|jpg|gif)$/i,
                    type: 'asset',
                    parser: {
                        dataUrlCondition: {
                            maxSize: 8192,
                        },
                    },
                },
            ],
        },

        plugins: [
            new MiniCssExtractPlugin(),
        ],
    };
}

module.exports = [
    function popup(env) {
        return merge(getCommonConfig(env), {
            entry: {
                popup: './popup/index.js',
            },

            output: {
                path: path.join(outputPath, 'popup'),
            },

            plugins: [
                new HtmlWebpackPlugin({
                    template: './popup/index.html',
                }),
            ],
        });
    },

    function content(env) {
        return merge(getCommonConfig(env), {
            entry: {
                content: './content/content.js',
                inject: './content/inject.js',
            },

            output: {
                path: path.join(outputPath, 'content'),
            },

            plugins: [
                new CopyPlugin({
                    patterns: [
                        {
                            from: './content/slider.css',
                            to: '.',
                        },
                    ],
                }),
            ],
        });
    },

    function backgroundPage(env) {
        return merge(getCommonConfig(env), {
            target: 'webworker',

            entry: {
                background: './background-page/index.js',
            },

            output: {
                path: path.join(outputPath, 'background-page'),
                publicPath: '',
                globalObject: 'self',
            },

            plugins: [
                new CopyPlugin({
                    patterns: [
                        {
                            from: './manifest.json',
                            to: path.join(outputPath, 'manifest.json'),
                        },
                        {
                            from: './assets',
                            to: path.join(outputPath, 'assets'),
                        },
                        {
                            from: './_locales',
                            to: path.join(outputPath, '_locales'),
                        },
                        {
                            // AudioWorklet modules must be separate files
                            // (not bundled) and loaded via addModule(url).
                            from: './background-page/RecorderWorklet.js',
                            to: path.join(outputPath, 'background-page/RecorderWorklet.js'),
                        },
                        {
                            // Offscreen document HTML – loaded by chrome.offscreen.createDocument
                            from: './background-page/offscreen.html',
                            to: path.join(outputPath, 'background-page/offscreen.html'),
                        },
                        {
                            // Mp3Worker uses importScripts() with relative paths,
                            // so the encoder files must sit next to the worker bundle.
                            from: './background-page/encoders',
                            to: path.join(outputPath, 'background-page/encoders'),
                        },
                    ],
                }),
            ],
        });
    },

    // Offscreen document script – runs in a real browser page context (not a
    // service worker), so it can use AudioContext, getUserMedia, etc.
    function offscreen(env) {
        return merge(getCommonConfig(env), {
            entry: {
                offscreen: './background-page/offscreen.js',
            },

            output: {
                path: path.join(outputPath, 'background-page'),
                publicPath: '',
            },
        });
    },
];
