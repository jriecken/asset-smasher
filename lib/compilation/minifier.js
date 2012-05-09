var path = require('path');
var uglifyjs;

var JsMinifier = exports.JsMinifier = function JsMinifier() {
};
JsMinifier.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (path.extname(asset.logicalPath) === '.js') {
      if (!uglifyjs) {
        try {
          uglifyjs = require('uglify-js');
        } catch (e) {
          cb(new Error('uglify-js could not be loaded'));
        }
      }
      try {
        var contents = asset.contents;
        if (Buffer.isBuffer(contents)) {
          contents = contents.toString('utf-8');
        }
        var jsp = uglifyjs.parser;
        var pro = uglifyjs.uglify;
        var ast = jsp.parse(contents);
        ast = pro.ast_mangle(ast);
        ast = pro.ast_squeeze(ast);
        asset.contents = pro.gen_code(ast);
        cb(null, asset);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(null, asset);
    }
  }
};
