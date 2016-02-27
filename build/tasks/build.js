var gulp = require('gulp');
var runSequence = require('run-sequence');
var changed = require('gulp-changed');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var paths = require('../paths');
var ts = require('gulp-typescript');
var Builder = require('systemjs-builder');

var tsProject = ts.createProject('./tsconfig.json', {
  typescript: require('typescript'),
  noExternalResolve: true
});

gulp.task('build',['clean'], function() {
  var tsResult = gulp.src([paths.source, paths.typings[0]])
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(ts(tsProject));

  return tsResult.js
    .pipe(sourcemaps.write({ includeContent: true }))
    .pipe(gulp.dest(paths.output));
});

gulp.task('bundle', ['clean'],function(done) {
  var builder = new Builder(paths.root, paths.root + 'jspm.config.js');

  builder.buildStatic('src/*', paths.output + 'main-built.js', { minify: false }).then(function() { done();});
});


