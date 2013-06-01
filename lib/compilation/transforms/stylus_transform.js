/**
 *
 * This transform takes Stylus .styl files and compiles them to CSS.
 *
 * Any @imports in the files are relative to the path that the file is in.
 *
 */
var path = require('path');
var stylus;

var StylusTransform = module.exports = function StylusTransform(options) {
  this.options = options || {};
};
StylusTransform.prototype = {
  extensions:function () {
    return ['.styl'];
  },
  shouldTransform:function (fileName, asset) {
    return path.extname(fileName) === '.styl';
  },
  transformedFileName:function (fileName, asset) {
    return path.basename(fileName, '.styl');
  },
  transform:function (asset, cb) {
    // Load stylus if necessary
    if (!stylus) {
      try {
        stylus = require('stylus');
      } catch (e) {
        cb(new Error('stylus could not be found'));
      }
    }
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName, asset);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    var assetFilePath = asset.assetFilePath;
    var importDir = path.dirname(assetFilePath);
    stylus(contents).
      set('filename', assetFilePath).
      set('paths', [importDir]).
      render(function(e, out) {
        if (e) {
          cb(e);
        } else {
          asset.contents = out;
          cb();
        }
    });
  }
};