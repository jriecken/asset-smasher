var path = require('path');
var uglify;

var JsMinifier = exports.JsMinifier = function JsMinifier() {
};
JsMinifier.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (path.extname(asset.logicalPath) === '.js') {
      if (!uglify) {
        try {
          uglify = require('uglify-js');
        } catch (e) {
          cb(new Error('uglify-js could not be loaded'));
        }
      }
      try {
        var contents = asset.contents;
        if (Buffer.isBuffer(contents)) {
          contents = contents.toString('utf-8');
        }
        asset.contents = uglify(contents);
        cb(null, asset);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(null, asset);
    }
  }
};
