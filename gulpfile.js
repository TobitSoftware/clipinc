const gulp = require('gulp');
const uglify = require('gulp-uglify');
const pump = require('pump');
const babel = require('gulp-babel');

gulp.task('default', ['build', 'copy', 'copyEncoders']);

gulp.task('copy', function (cb) {
    pump([
            gulp.src(['src/**/*', '!src/**/*.js']),
            gulp.dest('build')
        ],
        cb
    );
});

gulp.task('copyEncoders', function (cb) {
    pump([
            gulp.src(['src/encoders/*']),
            gulp.dest('build/encoders')
        ],
        cb
    );
});

gulp.task('build', function (cb) {
    pump([
            gulp.src(['src/**/*.js', '!src/encoders/*.js']),
            babel({
                "presets": ["env"]
            }),
            uglify(),
            gulp.dest('build')
        ],
        cb
    );
});