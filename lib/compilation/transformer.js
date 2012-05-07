var async = require('async');

exports.transforms = {
  Dust:require('./transforms/dust_transform'),
  Less:require('./transforms/less_transform'),
  Ejs:require('./transforms/ejs_transform')
};

var Transformer = exports.Transformer = function (transforms) {
  this.transforms = transforms;
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
      currentTransform.transform(asset, whilstCb);
    }, function (e) {
      if (e) {
        cb(e);
      } else {
        cb(null, asset);
      }
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
      if (e) {
        cb(e);
      } else {
        cb(null, asset);
      }
    });
  }
};

