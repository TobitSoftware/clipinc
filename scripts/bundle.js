const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const output = fs.createWriteStream(path.resolve('update.zip'));
const archive = archiver('zip');

output.on('close', () => {
    console.info(
        `\nBundle for extension created (update.zip). Total size: ${archive.pointer()}\n`
    );
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

archive.directory(path.resolve('dist'), false);

archive.finalize();
