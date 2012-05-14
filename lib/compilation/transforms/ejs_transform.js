/**
 *
 * This transform passes files through EJS, allowing files to
 * be modified before being passed to other transformers.
 *
 * It takes in a "helpers" option, which is an object of helpers that
 * will be passed into the execution of EJS (i.e. they will be
 * accessible in the template)
 *
 */
var path = require('path');
var ejs;

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
      asset.contents = ejs.render(contents, this.options.helpers || {});
      cb();
    } catch (e) {
      cb(e);
    }
  }
};