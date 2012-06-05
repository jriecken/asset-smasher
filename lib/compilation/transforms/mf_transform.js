/**
 *
 * This transform just strips the ".mf" extension off of
 * asset manifests.
 *
 */
var path = require('path');

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