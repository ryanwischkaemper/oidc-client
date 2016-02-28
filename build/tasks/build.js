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

gulp.task('bundle',['clean'], function() {
  var tsResult = gulp.src([paths.source, paths.typings[0]])
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(ts(tsProject));

  return tsResult.js
    .pipe(sourcemaps.write({ includeContent: true }))
    .pipe(gulp.dest(paths.output));
});

gulp.task('build', ['clean'], function() {
  var builder = new Builder(paths.root, paths.jspmconfig);

  builder.bundle('src', paths.output + 'oidc-client.js', { minify: false }).then(function() {
    return gulp.src([paths.output + 'oidc-client.js', paths.systemjs.default, paths.jspmconfig])
      .pipe(gulp.dest(paths.outputSample));
  });
});


