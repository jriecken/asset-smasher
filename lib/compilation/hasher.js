/**
 *
 * This operation computes a hash of an asset's contents.
 *
 * It takes in the following options:
 *  - algorithm - what hashing algorithm to use ("md5" is default)
 *  - hashVersion - arbitrary string that will be appended to the
 *                  contents of each asset before digesting happens.
 *                  This allows you to "invalidate" all your assets
 *                  without changing their contents.
 *  - only - an array of "glob" patterns of assets that should
 *           have their hashes computed (default is any asset)
 *
 */
var async = require('async');
var crypto = require('crypto');
var Minimatch = require('minimatch').Minimatch;
var path = require('path');

var AssetHasher = exports.AssetHasher = function (options) {
  options = options || {};
  this.algorithm = options.algorithm || 'md5';
  this.hashVersion = options.hashVersion || '1.0';
  this.matchPattern = new Minimatch(options.only ? (
    options.only.length > 1 ?
      '{' + options.only.join(',') + '}' :
      options.only[0]
    ) :
    '**/*.*');
};
AssetHasher.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    var self = this;
    if (this.matchPattern.match(path.join(path.dirname(asset.logicalPath), path.basename(asset.assetFilePath)))) {
      async.waterfall([
        function(wfCb) {
          if(!asset.contents) {
            asset.loadOriginalContents(wfCb);
          } else {
            wfCb();
          }
        },
        function(wfCb) {
          try {
            var hash = crypto.createHash(self.algorithm);
            hash.update(asset.contents);
            hash.update(self.hashVersion);
            var assetName = asset.logicalName;
            var extn = path.extname(assetName);
            var basename = path.basename(assetName, extn);
            asset.hashedName = basename + '-' + hash.digest('hex') + extn;
            wfCb(null, asset);
          } catch (e) {
            wfCb(e);
          }
        }
      ], cb);
    } else {
      cb(null, asset);
    }
  }
};