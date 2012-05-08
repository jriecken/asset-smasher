var async = require('async');
var path = require('path');

exports.transforms = {
  Dust:require('./transforms/dust_transform'),
  Less:require('./transforms/less_transform'),
  Ejs:require('./transforms/ejs_transform'),
  Mf:require('./transforms/mf_transform')
};
exports.postTransforms = {
  /**
   * Ensure that .js files end in a semicolon
   */
  EndSemicolon: function(asset, cb) {
    if(path.extname(asset.logicalName) === '.js') {
      var contents = asset.contents;
      if(Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      if(!/s*;[\s\n]*$/.test(contents)) {
        contents += ';\n';
        asset.contents = contents;
      }
    }
    cb();
  }
};

var Transformer = exports.Transformer = function (options) {
  options = options || {};
  this.transforms = options.transforms || [];
  this.postTransforms = options.postTransforms || [];
};

Transformer.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  asDryRunOperation:function () {
    return this.executeDry.bind(this);
  },
  execute:function (asset, cb) {
    var transforms = this.transforms;
    var postTransforms = this.postTransforms;
    var currentTransform = null;
    async.waterfall([
      function(wfCb) {
        async.whilst(function () {
          for (var i = 0; i < transforms.length; ++i) {
            if (transforms[i].shouldTransform(asset.logicalName)) {
              currentTransform = transforms[i];
              return true;
            }
          }
          return false;
        }, function (whilstCb) {
          currentTransform.transform(asset, whilstCb);
        }, wfCb);
      },
      function(wfCb) {
        async.forEachSeries(postTransforms, function(postTransform, eachCb) {
          postTransform(asset, eachCb);
        }, wfCb);
      }
    ], function(e) {
      cb(e, asset);
    });
  },
  executeDry:function (asset, cb) {
    var transforms = this.transforms;
    var currentTransform = null;
    async.whilst(function () {
      for (var i = 0; i < transforms.length; ++i) {
        if (transforms[i].shouldTransform(asset.logicalName)) {
          currentTransform = transforms[i];
          return true;
        }
      }
      return false;
    }, function (whilstCb) {
      asset.logicalName = currentTransform.transformedFileName(asset.logicalName);
      whilstCb();
    }, function (e) {
      cb(e, asset);
    });
  }
};

