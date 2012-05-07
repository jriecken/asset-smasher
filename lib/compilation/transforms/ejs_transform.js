var path = require('path');
var util = require('util');
var _ = require('underscore');
var Transform = require('./transform').Transform;
var ejs;

/**
 * Transform that takes files and runs them through EJS.
 *
 * @param locals Variables to expose to the EJS processing.
 */
var EjsTransform = module.exports = function EjsTransform(locals) {
  Transform.call(this);
  if (!ejs) {
    try {
      ejs = require('ejs');
    } catch (e) {
      throw new Error('ejs could not be found');
    }
  }
  this.locals = locals;
};
util.inherits(EjsTransform, Transform);
_.extend(EjsTransform.prototype, {
  shouldTransform:function (file) {
    return path.extname(file) === '.ejs';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.ejs');
  },
  transform:function (asset, cb) {
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Transform the contents
    try {
      asset.contents = ejs.render(contents, this.locals || {});
      cb(null, asset);
    } catch (e) {
      cb(e);
    }
  }
});