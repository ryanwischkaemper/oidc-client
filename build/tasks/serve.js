var gulp = require('gulp');
var browserSync = require('browser-sync');
var paths = require('../paths');

var bsConfig = {
  instancename: 'oidc-client-sample',
  config: {
    online: false,
    open: 'local',
    port: 21575,
    server: {
      baseDir: [paths.root,paths.outputSample],
      middleware: function(req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      }
    }
  }
};


gulp.task('serve:sample', function(done) {
  var bs = browserSync.create(bsConfig.instancename);
  bs.init(bsConfig.config, function() {
    done();
  });
});

gulp.task('serve', ['build'], function(done) {
  var bs = browserSync.create(bsConfig.instancename);
  bs.init(bsConfig.config, function() {
    done();
  });
});



