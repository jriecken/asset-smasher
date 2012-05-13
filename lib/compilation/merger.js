/**
 *
 * This operation creates a merged file containing all of the
 * assets that the specified asset requires.
 *
 */
var path = require('path');
var _ = require('underscore');

var RequireMerger = exports.RequireMerger = function RequireMerger(options) {
  this.options = options;
};
RequireMerger.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    try {
      var assetBundle = this.options.bundle;
      var toRequire = assetBundle.getRequiredFiles(asset.assetFilePath);
      if (toRequire.length > 0) {
        asset.contents = '';
        _.each(toRequire, function (req) {
          var otherContents = assetBundle.getAsset(req).contents;
          asset.contents += Buffer.isBuffer(otherContents) ? otherContents.toString('utf-8') : otherContents;
        });
      }
      cb(null, asset);
    }
    catch (e) {
      cb(e);
    }
  }
};