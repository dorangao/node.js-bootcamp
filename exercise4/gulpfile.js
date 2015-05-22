var gulp = require('gulp');
var stylus = require('gulp-stylus');
var autoprefixer = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');

var paths = {
  scripts: 'client/js/*.js'
};

// Linting
// ----------------------------------------
gulp.task('lint', function () {
  return gulp.src('client/js/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('scripts', function () {
  browserify({
    entries: 'client/js/cli-index.js',
    debug: true
  })
    .transform(babelify)
    .bundle()
    .pipe(source('main.js'))
    .pipe(gulp.dest('public/js'));
});


gulp.task('css', function () {
  gulp.src('client/stylus/main.styl')
    .pipe(stylus({compress: false, paths: ['client/stylus']}))
    .pipe(autoprefixer())
    .pipe(minifyCSS())
    .pipe(rename('style.css'))
    .pipe(gulp.dest('public/css'))
});

gulp.task('watch', function () {
  gulp.watch('client/stylus/*.styl', ['css']);
});

gulp.task('default', ['css']);