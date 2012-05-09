var async = require('async');
var crypto = require('crypto');
var Minimatch = require('minimatch').Minimatch;
var path = require('path');

var AssetHasher = exports.AssetHasher = function (options) {
  options = options || {};
  this.algorithm = options.algorithm || 'md5';
  this.version = options.version || '1.0';
  this.matchPattern = new Minimatch(options.onlyMatching ? (
    options.onlyMatching.length > 1 ?
      '{' + options.onlyMatching.join(',') + '}' :
      options.onlyMatching[0]
    ) :
    '**/*.*');
};
AssetHasher.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    if(this.matchPattern.match(path.join(path.dirname(asset.logicalPath), path.basename(asset.assetFilePath)))) {
      try {
        var hash = crypto.createHash(this.algorithm);
        hash.update(asset.contents);
        hash.update(this.version);
        var assetName = asset.logicalName;
        var extn = path.extname(assetName);
        var basename = path.basename(assetName, extn);
        asset.hashedName = basename + '-' + hash.digest('hex') + extn;
        cb(null, asset);
      } catch (e) {
        cb(e);
      }
    } else {
      cb(null, asset);
    }
  }
};