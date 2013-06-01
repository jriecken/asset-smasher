/**
 * Ensure that .js files end in a semicolon
 */
var path = require('path');

var EndJsSemicolon = module.exports = function EndJsSemicolon(options) {
  this.options = options || {};
};
EndJsSemicolon.prototype = {
  transform:function (asset, cb) {
    if (path.extname(asset.logicalName) === '.js') {
      var contents = asset.contents;
      if (Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      if (!/\s*;[\s\n]*$/.test(contents)) {
        contents += ';\n';
      }
      if (!/\n$/.test(contents)) {
        contents += '\n';
      }
      asset.contents = contents;
    }
    cb();
  }
};