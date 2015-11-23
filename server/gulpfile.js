'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var babel = require('gulp-babel');

// See https://github.com/gulpjs/gulp/issues/71,
// https://github.com/wincent/corpus/commit/85c31dae7e7942e3ba4fe5c79bdbaf20e93f52d0
var watching = false;
function wrap(stream) {
  stream.on('error', function(error) {
    gutil.log(gutil.colors.red(error.message));
    gutil.log(error.stack);
    if (watching) {
      gutil.log(gutil.colors.yellow('[aborting]'));
      stream.end();
    } else {
      gutil.log(gutil.colors.yellow('[exiting]'));
      process.exit(1);
    }
  });
  return stream;
}

function catchErrors(stream) {
  stream.on('error', function(error) {
    gutil.log(gutil.colors.red(error.message));
    gutil.log(error.stack);
    gutil.log(gutil.colors.yellow('[aborting]'));
  });
  return stream;
}

gulp.task('css', function () {
  gulp.src('./static/scss/*.scss')
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(rename(function(path) {
      path.basename += '.auto';
    }))
    .pipe(gulp.dest('./static/css'));
});

gulp.task('css:watch', function () {
  gulp.watch('./static/scss/**/*.scss', ['css']);
});

gulp.task('js', function () {
  gulp.src(['./static/babel/*.js',
            './static/babel/*.jsx'])
    .pipe(wrap(babel()))
    .pipe(rename(function(path) {
      path.basename += '.auto';
    }))
    .pipe(gulp.dest('./static/js'));
});

gulp.task('js:watch', function () {
  watching = true;
  gulp.watch(['./static/babel/**/*.js',
              './static/babel/**/*.jsx'],
             ['js']);
});

gulp.task('watch', ['css:watch', 'js:watch']);
