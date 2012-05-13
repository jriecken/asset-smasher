/**
 *
 * Represents the set of all known assets and the dependencies
 * between them.
 *
 */
var _ = require('underscore');
var Asset = require('./asset').Asset;
var DepGraph = require('./dep_graph').DepGraph;

var AssetBundle = exports.AssetBundle = function AssetBundle() {
  // Map of assetFilePath to Asset
  this.assets = {};
  // Dependencies between assets
  this.dependencies = new DepGraph();
  // Similar to dependencies, but only for files that should be merged together
  this.requires = new DepGraph();
};
AssetBundle.prototype = {
  getAssetByLogicalPath:function (logicalPath) {
    return _.find(this.assets, function (asset) {
      return asset.logicalPath === logicalPath;
    });
  },
  getHashedFileMapping:function () {
    var mapping = {};
    _.each(this.assets, function (asset) {
      var logicalPath = asset.logicalPath;
      var hashedPath = asset.hashedPath;
      if (logicalPath !== hashedPath) {
        mapping[logicalPath] = hashedPath;
      }
    });
    return mapping;
  },
  clear:function () {
    this.assets = {};
    this.dependencies = new DepGraph();
    this.requires = new DepGraph();
  },
  hasAsset:function (filePath) {
    return !!this.assets[filePath];
  },
  getAsset:function (filePath) {
    return this.assets[filePath];
  },
  getAllAssets:function () {
    return _.values(this.assets);
  },
  addAsset:function (baseDir, filePath) {
    if (!this.hasAsset(filePath)) {
      this.assets[filePath] = new Asset({
        assetBaseDir:baseDir,
        assetFilePath:filePath
      });
      this.dependencies.addNode(filePath);
      this.requires.addNode(filePath);
    }
    return this.getAsset(filePath);
  },
  addRequire:function (file, requirement) {
    this.addDependency(file, requirement);
    this.requires.addDependency(file, requirement);
  },
  getRequiredFiles:function (file) {
    return this.requires.dependenciesOf(file, true);
  },
  addDependency:function (file, dependency) {
    this.dependencies.addDependency(file, dependency);
  },
  getProcessingOrder:function () {
    return this.dependencies.overallOrder();
  }
};