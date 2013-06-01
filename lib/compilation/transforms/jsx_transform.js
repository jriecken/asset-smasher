/**
 *
 * This transformer takes JSX files and transforms them to JS files.
 *
 * For use with React (https://github.com/facebook/react)
 *
 */
var path = require('path');
var reactTools;

var JSX_PRAGMA = '/** @jsx React.DOM */';

var JSXTransform = module.exports = function JSXTransform(options) {
  this.options = options || {};
};
JSXTransform.prototype = {
  extensions:function () {
    return ['.jsx', '.js'];
  },
  shouldTransform:function (fileName, asset) {
    var ext = path.extname(fileName);
    // Don't transform files more than once
    if (asset.transformInfo.isJsxTransformed) {
      return false;
    // .jsx files are explicitly transformed
    } else if (ext === '.jsx') {
      return true;
    // a .js file that contains the @jsx pragma comment is implicitly transformed
    } else if (ext === '.js' && asset.contents) {
      var contents = asset.contents;
      if (Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      return contents.indexOf(JSX_PRAGMA) >= 0;
    } else {
      return false;
    }
  },
  transformedFileName:function (fileName, asset) {
    asset.transformInfo.isJsxTransformed = true;
    if (path.extname(fileName) === '.jsx') {
      return path.basename(fileName, '.jsx');
    } else {
      return fileName; // it's just a .js file - no transformation necessary
    }
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
    asset.logicalName = this.transformedFileName(asset.logicalName, asset);
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // If the file is missing the @jsx pragma, add it
    if (contents.indexOf(JSX_PRAGMA) < 0) {
      contents = JSX_PRAGMA + '\n' + contents;
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