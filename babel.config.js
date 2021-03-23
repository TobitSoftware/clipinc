module.exports = {
    presets: [
        [
            '@babel/env',
            {
                loose: true,
                modules: false,
                useBuiltIns: 'usage',
                corejs: '3.9',
            },
        ],
        ['@babel/react', { runtime: 'automatic' }],
    ],
    plugins: ['@emotion'],
};