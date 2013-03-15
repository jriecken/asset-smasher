/**
 *
 * Minify JavaScript using uglify-js
 * Minify CSS using ycssmin
 *
 */
var path = require('path');
var uglify = require('uglify-js');
var cssmin = require('ycssmin').cssmin;

var JsMinifier = exports.JsMinifier = function JsMinifier() {
};
JsMinifier.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (path.extname(asset.logicalPath) === '.js') {
      try {
        var contents = asset.contents;
        if (Buffer.isBuffer(contents)) {
          contents = contents.toString('utf-8');
        }
        asset.contents = uglify.minify(contents, {
          fromString: true
        }).code;
        cb(null, asset);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(null, asset);
    }
  }
};

var CSSMinifier = exports.CSSMinifier = function CSSMinifier() {
};
CSSMinifier.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (path.extname(asset.logicalPath) === '.css') {
      try {
        var contents = asset.contents;
        if (Buffer.isBuffer(contents)) {
          contents = contents.toString('utf-8');
        }
        asset.contents = cssmin(contents, 32000); // Max line length of 32000
        cb(null, asset);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(null, asset);
    }
  }
};
