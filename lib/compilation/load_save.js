var async = require('async');
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

var LoadAsset = exports.LoadAsset = function LoadAsset() {
};
LoadAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    asset.loadOriginalContents(function (e) {
      if (e) {
        cb(e);
      } else {
        cb(null, asset);
      }
    });
  }
};

var OutputAsset = exports.OutputAsset = function OutputAsset(outputTo) {
  this.outputTo = outputTo;
};
OutputAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    var outputAssetTo = path.join(this.outputTo, asset.logicalPath);
    asset.compiledAssetFilePath = outputAssetTo;
    async.waterfall([
      function (wfCb) {
        mkdirp(path.dirname(outputAssetTo), wfCb);
      },
      function (dir, wfCb) {
        fs.writeFile(outputAssetTo, asset.contents, 'utf-8', wfCb);
      },
      function (wfCb) {
        wfCb(null, asset);
      }
    ], cb);
  }
};

var OutputHashNamedAsset = exports.OutputHashNamedAsset = function OutputHashNamedAsset(outputTo, version) {
  this.outputTo = outputTo;
  this.version = version || '1.0';
};
OutputHashNamedAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    var self = this;
    var outputAssetTo = path.join(this.outputTo, asset.logicalPath);
    async.waterfall([
      function (wfCb) {
        try {
          var hash = crypto.createHash('md5');
          hash.update(asset.contents);
          hash.update(self.version);
          var extn = path.extname(outputAssetTo);
          var basename = path.basename(outputAssetTo, extn);
          var dirname = path.dirname(outputAssetTo);
          outputAssetTo = path.join(dirname, basename + '-' + hash.digest('hex') + extn);
          asset.hashedName = path.basename(outputAssetTo);
          wfCb();
        }
        catch (e) {
          console.log(e);
          wfCb(e);
        }
      },
      function (wfCb) {
        mkdirp(path.dirname(outputAssetTo), wfCb);
      },
      function (dir, wfCb) {
        fs.writeFile(outputAssetTo, asset.contents, 'utf-8', wfCb);
      },
      function (wfCb) {
        wfCb(null, asset);
      }
    ], cb);
  }
};