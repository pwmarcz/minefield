'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var babel = require('gulp-babel');

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
    .pipe(babel())
    .pipe(rename(function(path) {
      path.basename += '.auto';
    }))
    .pipe(gulp.dest('./static/js'));
});

gulp.task('js:watch', function () {
  gulp.watch(['./static/babel/**/*.js',
              './static/babel/**/*.jsx'],
             ['js']);
});

gulp.task('watch', ['css:watch', 'js:watch']);
