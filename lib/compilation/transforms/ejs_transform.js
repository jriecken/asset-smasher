var path = require('path');
var _ = require('underscore');
var ejs;

/**
 * Transform that takes files and runs them through EJS.
 *
 * @param locals Variables to expose to the EJS processing.
 */
var EjsTransform = module.exports = function EjsTransform(locals) {
  this.locals = locals;
};
EjsTransform.prototype = {
  shouldTransform:function (file) {
    return path.extname(file) === '.ejs';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.ejs');
  },
  transform:function (asset, cb) {
    // Load ejs if necessary
    if (!ejs) {
      try {
        ejs = require('ejs');
      } catch (e) {
        cb(new Error('ejs could not be found'));
      }
    }
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
      cb();
    } catch (e) {
      cb(e);
    }
  }
};