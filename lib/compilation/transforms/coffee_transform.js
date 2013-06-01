/**
 *
 * This transformer takes CoffeeScript .coffee files and compiles them
 * to JavaScript.
 *
 */
var path = require('path');
var coffee;

var CoffeeTransform = module.exports = function CoffeeTransform(options) {
  this.options = options || {};
};
CoffeeTransform.prototype = {
  extensions:function () {
    return ['.coffee'];
  },
  shouldTransform:function (fileName, asset) {
    return path.extname(fileName) === '.coffee';
  },
  transformedFileName:function (fileName) {
    return path.basename(fileName, '.coffee');
  },
  transform:function (asset, cb) {
    // Load coffee-script if necessary
    if (!coffee) {
      try {
        coffee = require('coffee-script');
      } catch (e) {
        cb(new Error('coffee-script could not be found'));
      }
    }
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    try {
      asset.contents = coffee.compile(contents, {
        filename:asset.assetFilePath
      });
      cb();
    } catch (e) {
      cb(e);
    }
  }
};