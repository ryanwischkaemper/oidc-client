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

  jspmconfig: './jspm.config.js',

  systemjs: {
    default: './jspm_packages/system.js',
    csp: './jspm_packages/system-csp-production.js'
  }
};