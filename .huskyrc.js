module.exports = {
    hooks: {
        // Run lint-staged before committing, config is defined in lintstagedrc.
        'pre-commit': 'lint-staged',
    },
};
