/**
 *
 * This operation outputs a compiled asset (and its hash-named version if a hash-name
 * was generated)
 *
 */
var async = require('async');
var mkdirp = require('mkdirp');
var Minimatch = require('minimatch').Minimatch;
var fs = require('fs');
var path = require('path');

var OutputAsset = exports.OutputAsset = function OutputAsset(options) {
  options = options || {};
  this.outputTo = options.outputTo;
  this.matchPattern = new Minimatch(options.onlyMatching ? (
    options.onlyMatching.length > 1 ?
      '{' + options.onlyMatching.join(',') + '}' :
      options.onlyMatching[0]
    ) :
    '**/*.*');
};
OutputAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if (this.matchPattern.match(path.join(path.dirname(asset.logicalPath), path.basename(asset.assetFilePath)))) {
      var outputAssetTo = path.join(this.outputTo, asset.logicalPath);
      asset.compiledAssetFilePath = outputAssetTo;
      async.waterfall([
        function (wfCb) {
          mkdirp(path.dirname(outputAssetTo), wfCb);
        },
        function (dir, wfCb) {
          fs.writeFile(outputAssetTo, asset.contents, wfCb);
        },
        function (wfCb) {
          // Output the hashed version if it's been made
          if (asset.logicalName !== asset.hashedName) {
            fs.writeFile(path.join(path.dirname(outputAssetTo), asset.hashedName), asset.contents, wfCb)
          } else {
            wfCb();
          }
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