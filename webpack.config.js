const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @type {import("webpack").Configuration} */
module.exports = {
    mode: 'production',
    entry: {
        popup: './src/popup/popup.js',
        content: './src/content.js',
        recorder: './src/recorder.js',
        background: './src/background.js',
        inject: './src/inject.js',
        worker: './src/workers/Mp3Worker.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
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
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: './src/images/*', to: 'images/[name][ext]' },
                { from: './src/slider.css', to: 'slider.css' },
                {
                    from: './src/_locales/de/*',
                    to: '_locales/de/[name][ext]',
                },
                { from: './src/encoders/*', to: 'encoders/[name][ext]' },
            ],
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/background.html',
            chunks: ['recorder', 'background'],
            filename: 'background.html',
        }),
        new HtmlWebpackPlugin({
            template: './src/popup/popup.html',
            chunks: ['popup'],
            filename: 'popup.html',
        }),
        new MiniCssExtractPlugin(),
    ],
};
