var path = require('path');
var _ = require('underscore');

var RequireMerger = exports.RequireMerger = function RequireMerger(assetBundle) {
  this.assetBundle = assetBundle;
};
RequireMerger.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    try {
      var assetBundle = this.assetBundle;
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