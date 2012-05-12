var _ = require('underscore');
var DepGraph = require('./dep_graph').DepGraph;

var AssetBundle = exports.AssetBundle = function AssetBundle() {
  // Map of Compiled assetFilePath to Asset
  this.assets = {};
  // Map of assetFilePath to Array of assetFilePath for required files (to be merged) for this asset
  this.requires = {};
};
AssetBundle.prototype = {
  getAssetByLogicalPath:function (logicalPath) {
    return _.find(this.assets, function (asset) {
      return asset.logicalPath === logicalPath;
    });
  },
  getHashedFileMapping: function() {
    var mapping = {};
    _.each(this.assets, function(asset) {
      var logicalPath = asset.logicalPath;
      var hashedPath = asset.hashedPath;
      if(logicalPath !== hashedPath) {
        mapping[logicalPath] = hashedPath;
      }
    });
    return mapping;
  },
  getDependencyGraph: function() {
    var graph = new DepGraph();
    _.each(_.keys(this.assets), function(asset) {
      graph.addNode(asset);
    });
    _.each(this.requires, function(required, asset) {
      _.each(required, function(requiredAsset) {
        graph.addDependency(asset, requiredAsset);
      });
    });
    return graph;
  }
};