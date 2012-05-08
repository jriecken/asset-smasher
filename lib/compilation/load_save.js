var async = require('async');
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var Minimatch = require('minimatch').Minimatch;
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
      cb(e, asset);
    });
  }
};

var OutputAsset = exports.OutputAsset = function OutputAsset(options) {
  options = options || {};
  this.outputTo = options.outputTo;
  this.onlyMatching = options.onlyMatching;
  this.matchPattern = new Minimatch(this.onlyMatching ? (
    this.onlyMatching.length > 1 ?
      '{' + this.onlyMatching.join(',') + '}' :
      this.onlyMatching[0]
    ) :
    '**/*.*');
};
OutputAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (this.matchPattern.match(asset.logicalPath)) {
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
    } else {
      cb(null, asset);
    }
  }
};

var OutputHashNamedAsset = exports.OutputHashNamedAsset = function OutputHashNamedAsset(options) {
  options = options || {};
  this.outputTo = options.outputTo;
  this.version = options.version || '1.0';
  this.onlyMatching = options.onlyMatching;
  this.matchPattern = new Minimatch(this.onlyMatching ? (
    this.onlyMatching.length > 1 ?
      '{' + this.onlyMatching.join(',') + '}' :
      this.onlyMatching[0]
    ) :
    '**/*.*');
};
OutputHashNamedAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (this.matchPattern.match(asset.logicalPath)) {
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
    } else {
      cb(null, asset);
    }
  }
};

var CleanupAsset = exports.CleanupAsset = function CleanupAsset() {
};
CleanupAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    // Clear out the memory taken by the asset contents
    asset.contents = null;
    cb(null, asset);
  }
};