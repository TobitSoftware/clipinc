const gulp = require('gulp');
const babel = require('gulp-babel');
const terser = require('gulp-terser');
const clean = require('gulp-clean');

gulp.task('clean', () =>
    gulp.src(['build/'], { allowEmpty: true }).pipe(clean())
);

gulp.task('copy-assets', () =>
    gulp.src(['src/**/*', '!src/**/*.js']).pipe(gulp.dest('build'))
);

gulp.task('copy-encoders', () =>
    gulp.src(['src/encoders/*']).pipe(gulp.dest('build/encoders'))
);

gulp.task('build-js', () =>
    gulp
        .src(['src/**/*.js', '!src/encoders/*.js'])
        .pipe(babel())
        .pipe(terser())
        .pipe(gulp.dest('build'))
);

gulp.task(
    'build',
    gulp.series(
        'clean',
        gulp.parallel('copy-assets', 'copy-encoders', 'build-js')
    )
);
