var _ = require('underscore');

var AssetBundle = exports.AssetBundle = function AssetBundle() {
  // Map of Compiled assetFilePath to Asset
  this.assets = {};
  // Map of assetFilePath to Array of assetFilePath for required files (to be merged) for this asset
  this.requires = {};
};
AssetBundle.prototype = {
  getAssetByLogicalPath: function(logicalPath) {
    return _.find(this.assets, function (asset) {
      return asset.logicalPath === logicalPath;
    });
  }
};