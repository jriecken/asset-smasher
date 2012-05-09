var _ = require('underscore');

/**
 * Node for a dependency graph
 */
var GraphNode = function(name) {
  this.name = name;
  this.outgoing = {};
  this.incoming = {};
};
GraphNode.prototype = {
  addEdge: function(to) {
    this.outgoing[to.name] = to;
    to.incoming[this.name] = this;
  },
  removeEdge: function(to) {
    delete this.outgoing[to.name];
    delete to.incoming[this.name];
  }
};


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
  getAssetOrder: function() {
    var depGraph = {};
    _.each(_.keys(this.assets), function(asset) {
      depGraph[asset] = new GraphNode(asset);
    });
    _.each(this.requires, function(required, asset) {
      _.each(required, function(requiredAsset) {
        depGraph[asset].addEdge(depGraph[requiredAsset]);
      });
    });

    var startNodes = [];
    _.each(depGraph, function(node) {
      if(_.size(node.incoming) === 0) {
        startNodes.push(node);
      }
    });

    var ordered = [];
    while(startNodes.length > 0) {
      var node = startNodes.shift();
      ordered.push(node.name);
      var outgoing = node.outgoing;
      _.each(_.clone(outgoing), function(depNode) {
        node.removeEdge(depNode);
        if(_.size(depNode.incoming) === 0) {
          startNodes.push(depNode);
        }
      });
    }
    if (_.filter(depGraph, function(node) {
      return _.size(node.incoming) > 0 || _.size(node.outgoing) > 0;
    }).length > 0) {
      throw new Error('Dependency Cycle Detected');
    } else {
      return ordered.reverse();
    }
  }
};