var path = require('path');
var util = require('util');
var _ = require('underscore');
var Transform = require('./transform').Transform;

var less;
var LessTransform = module.exports = function LessTransform(compress) {
  Transform.call(this);
  if (!less) {
    try {
      less = require('less');
    } catch (e) {
      throw new Error('less could not be found');
    }
  }
  this.compress = compress;
};
util.inherits(LessTransform, Transform);
_.extend(LessTransform.prototype, {
  shouldTransform:function (file) {
    return path.extname(file) === '.less';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.less');
  },
  transform:function (asset, cb) {
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
            cb(null, asset);
          } catch (e) {
            cb(e);
          }
        }
      });
    } catch (e) {
      cb(e);
    }
  }
});