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
var zlib = require('zlib');

var OutputAsset = exports.OutputAsset = function OutputAsset(options) {
  options = options || {};
  this.outputTo = options.outputTo;
  this.matchPattern = new Minimatch(options.only ? (
    options.only.length > 1 ?
      '{' + options.only.join(',') + '}' :
      options.only[0]
    ) :
    '**/*.*');
  this.gzip = options.gzip;
};
OutputAsset.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    var self = this;
    if (this.matchPattern.match(path.join(path.dirname(asset.logicalPath), path.basename(asset.assetFilePath)))) {
      var outputAssetTo = path.join(this.outputTo, asset.logicalPath);
      var outputHash = asset.logicalName !== asset.hashedName;
      var outputHashedAssetTo = path.join(path.dirname(outputAssetTo), asset.hashedName);
      asset.compiledAssetFilePath = outputAssetTo;
      async.waterfall([
        function (wfCb) {
          mkdirp(path.dirname(outputAssetTo), wfCb);
        },
        function (dir, wfCb) {
          async.parallel([
            // Output normal version
            function (pCb) {
              fs.writeFile(outputAssetTo, asset.contents, pCb);
            },
            // Output hashed version (if necessary)
            function (pCb) {
              if (outputHash) {
                fs.writeFile(outputHashedAssetTo, asset.contents, pCb);
              } else {
                pCb();
              }
            },
            // Output gzipped versions (if necessary)
            function (pCb) {
              if (self.gzip) {
                zlib.gzip(asset.contents, function (e, zipped) {
                  if (e) {
                    pCb(e);
                  } else {
                    async.parallel([
                      function (pCb2) {
                        fs.writeFile(outputAssetTo + '.gz', zipped, pCb2);
                      },
                      function (pCb2) {
                        if (outputHash) {
                          fs.writeFile(outputHashedAssetTo + '.gz', zipped, pCb2);
                        } else {
                          pCb2();
                        }
                      }
                    ], pCb);
                  }
                });
              } else {
                pCb();
              }
            }
          ], wfCb);
        },
        function (x, wfCb) {
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