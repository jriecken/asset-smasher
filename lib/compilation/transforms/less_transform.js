var path = require('path');
var _ = require('underscore');
var less;

/**
 * Transform that compiles .less files to .css.
 *
 * @param compress Whether to compress the CSS.
 */
var LessTransform = module.exports = function LessTransform(compress) {
  this.compress = compress;
};
LessTransform.prototype = {
  shouldTransform:function (file) {
    return path.extname(file) === '.less';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.less');
  },
  transform:function (asset, cb) {
    // Load less if necessary
    if (!less) {
      try {
        less = require('less');
      } catch (e) {
        cb(new Error('less could not be found'));
      }
    }
    var self = this;
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    var assetFilePath = asset.assetFilePath;
    var importDir = path.dirname(assetFilePath);
    try {
      var parser = new (less.Parser)({
        paths:[importDir],
        filename:assetFilePath
      });
      parser.parse(contents, function (e, tree) {
        if (e) {
          cb(e);
        } else {
          try {
            asset.contents = tree.toCSS({compress:self.compress});
            cb();
          } catch (e) {
            cb(e);
          }
        }
      });
    } catch (e) {
      cb(e);
    }
  }
};