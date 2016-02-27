var outputRoot = 'dist/';
var appRoot = 'src/';
var root = './';

module.exports = {
  root: root,
  source: appRoot + '**/*.ts',
  output: outputRoot,

  typings: [
    './typings/browser/**/*.d.ts'
  ]
}