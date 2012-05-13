var path = require('path');
var ejs;

/**
 * Transform that takes files and runs them through EJS.
 *
 * @param options Compilation options
 *  - locals - local variables to expose to the template execution
 */
var EjsTransform = module.exports = function EjsTransform(options) {
  this.options = options || {};
};
EjsTransform.prototype = {
  extensions:function () {
    return ['.ejs'];
  },
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
      asset.contents = ejs.render(contents, this.options.locals || {});
      cb();
    } catch (e) {
      cb(e);
    }
  }
};