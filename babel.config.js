module.exports = (api) => {
    if (api.env('test')) {
        return {
            presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
        };
    }

    return {
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
};
