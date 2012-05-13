var path = require('path');

/**
 * Stupid transform that just strips the ".mf" off of manifest files.
 */
var MfTransform = module.exports = function MfTransform(options) {
  this.options = options || {};
};
MfTransform.prototype = {
  extensions:function () {
    return ['.mf', '.css', '.js'];
  },
  shouldTransform:function (file) {
    return path.extname(file) === '.mf';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.mf');
  },
  transform:function (asset, cb) {
    asset.logicalName = this.transformedFileName(asset.logicalName);
    cb();
  }
};