import 'babel-polyfill';
import 'babel-regenerator-runtime';
import 'source-map-support/register';

import path from 'path';
import del from 'del';
import gulp from 'gulp';
import babel from 'gulp-babel';
import gutil from 'gulp-util';
import mocha from 'gulp-mocha';
import eslint from 'gulp-eslint';
import sourcemaps from 'gulp-sourcemaps';
import glob from 'glob';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import es from 'event-stream';
import runSequence from 'run-sequence';

const assetDest = path.join(__dirname, 'public');
const assetSrc = path.join(__dirname, 'src', 'assets');

gulp.task('default', ['build']);

gulp.task('build', ['buildSrc', 'buildPublic']);

gulp.task('watch', ['build'], () => {
  gulp.watch(['src/**/*.js', '!src/assets/**/*'], ['buildSrc']);
  gulp.watch(['src/assets/**/*'], ['buildPublic']);
  // gulp.watch(['test/**'], ['mocha']);
});

gulp.task('cleanLib', () => {
  return del(['lib'], {force: true});
});

gulp.task('cleanPublic', () => {
  return del(['public'], {force: true});
});

gulp.task('buildPublic', done => {
  runSequence('cleanPublic', 'public', 'scripts', done);
});

gulp.task('buildSrc', done => {
  runSequence('cleanLib', 'lib', done);
});

gulp.task('lib', () => {
  return gulp
    .src([
      'src/**/*.js',
      '!src/assets/**/*'
    ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('lib'));
});

gulp.task('scripts', done => {
  const basedir = 'src/assets/scripts';
  glob('**/*.js', {cwd: basedir}, (error, files) => {
    if(error) return done(error);
    if(!files.length) return done(null);

    const bundles = [
      'index.js'
    ];
    const entries = files.filter(file => bundles.includes(file));
    const tasks = entries.map(entry => {
      return browserify({
        entries: entry,
        debug: false,
        basedir
      })
      .transform(babelify)
      .bundle()
      .pipe(source(entry))
      .pipe(buffer())
      .pipe(sourcemaps.init({
        // loads map from browserify file
        loadMaps: true
      }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(path.join(assetDest, 'scripts')));
    });

    es.merge(tasks).on('end', done);
  });
});

gulp.task('public', () => {
  const src = path.join(assetSrc, 'static');
  return gulp
    .src(`${src}/**/*`, {base: src})
    .pipe(gulp.dest(assetDest));
});

gulp.task('mocha', () => {
  return gulp.src(['test/**/*.js'], { read: false })
  .pipe(mocha({
    compilers: 'js:babel-register'
  }))
  .on('error', gutil.log);
});
