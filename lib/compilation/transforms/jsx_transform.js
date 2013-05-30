/**
 *
 * This transformer takes JSX files and transforms them to JS files.
 *
 * For use with React (https://github.com/facebook/react)
 *
 */
var path = require('path');
var reactTools;

var JSXTransform = module.exports = function JSXTransform(options) {
  this.options = options || {};
};
JSXTransform.prototype = {
  extensions:function () {
    return ['.jsx'];
  },
  shouldTransform:function (file) {
    return path.extname(file) === '.jsx';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.jsx');
  },
  transform:function (asset, cb) {
    // Load react-tools if necessary
    if (!reactTools) {
      try {
        reactTools = require('react-tools');
      } catch (e) {
        cb(new Error('react-tools could not be found'));
      }
    }
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Transform to js
    try {
      asset.contents = reactTools.transform(contents);
      cb();
    } catch (e) {
      cb(e);
    }
  }
};