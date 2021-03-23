const fs = require('fs');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { merge } = require('webpack-merge');

const outputPath = path.join(__dirname, 'dist');

fs.rmSync(outputPath, { recursive: true, force: true });

function getCommonConfig(env) {
    const isDevelopment = Boolean(env.development);

    return {
        mode: isDevelopment ? 'development' : 'production',
        devtool: isDevelopment ? 'cheap-module-source-map' : false,
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
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 8192,
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [new MiniCssExtractPlugin()],
    };
}

module.exports = [
    function popup(env) {
        return merge(getCommonConfig(env), {
            entry: { popup: './popup/index.js' },
            output: { path: path.join(outputPath, 'popup') },
            plugins: [
                new HtmlWebpackPlugin({
                    template: './popup/index.html',
                }),
                new MiniCssExtractPlugin(),
            ],
        });
    },
    function content(env) {
        return merge(getCommonConfig(env), {
            entry: {
                content: './content/content.js',
                inject: './content/inject.js',
            },
            output: { path: path.join(outputPath, 'content') },
            plugins: [
                new CopyPlugin({
                    patterns: [{ from: './content/slider.css', to: '.' }],
                }),
            ],
        });
    },
    function backgroundPage(env) {
        return merge(getCommonConfig(env), {
            entry: { background: './background-page/index.js' },
            output: { path: path.join(outputPath, 'background-page') },
            plugins: [
                new CopyPlugin({
                    patterns: [
                        { from: 'manifest.json', to: '../manifest.json' },
                        { from: './assets/**/*', to: '..' },
                        {
                            from: './_locales/**/*',
                            to: '..',
                        },
                        {
                            from: './background-page/encoders/*',
                            to: './encoders/[name][ext]',
                        },
                    ],
                }),
                new HtmlWebpackPlugin({
                    template: './background-page/index.html',
                }),
            ],
        });
    },
];
