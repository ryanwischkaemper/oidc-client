var outputRoot = 'dist/';
var appRoot = 'src/';
var root = './';

module.exports = {
  root: root,
  source: appRoot + '**/*.ts',
  output: outputRoot,
  outputSample: root + 'sample/',

  typings: [
    './typings/browser/**/*.d.ts'
  ],

  jspm: {
    config: './jspm.config.js',
    browserConfig: './jspm.browser.js'
  },

  systemjs: {
    default: './jspm_packages/system.js',
    csp: './jspm_packages/system-csp-production.js'
  }
}
