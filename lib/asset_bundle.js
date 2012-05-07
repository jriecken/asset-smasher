var AssetBundle = exports.AssetBundle = function AssetBundle() {
  // Map of assetFilePath to Asset
  this.assets = {};
  // Map of assetFilePath to Array of assetFilePath for dependencies for that asset
  this.dependencies = {};
  // Map of assetFilePath to Array of assetFilePath for required files (to be merged) for this asset
  this.requires = {};
};