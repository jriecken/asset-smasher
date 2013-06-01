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
  shouldTransform:function (fileName, asset) {
    return path.extname(fileName) === '.mf';
  },
  transformedFileName:function (fileName) {
    return path.basename(fileName, '.mf');
  },
  transform:function (asset, cb) {
    asset.logicalName = this.transformedFileName(asset.logicalName);
    cb();
  }
};