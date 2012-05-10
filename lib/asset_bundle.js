var _ = require('underscore');

/**
 * Node for a dependency graph
 */
var GraphNode = function(graph, name) {
  this.graph = graph;
  this.name = name;
  this.outgoing = {};
  this.incoming = {};
};
GraphNode.prototype = {
  addEdge: function(to) {
    var toNode = this.graph.nodes[to];
    this.outgoing[to] = true;
    toNode.incoming[this.name] = true;
  },
  removeEdge: function(to) {
    var toNode = this.graph.nodes[to];
    delete this.outgoing[to];
    delete toNode.incoming[this.name];
  },
};
GraphNode.clone = function(node, toGraph) {
  var newNode = new GraphNode(toGraph, node.name);
  newNode.outgoing = _.clone(node.outgoing);
  newNode.incoming = _.clone(node.incoming);
  return newNode;
};

/**
 * Dependency graph
 */
var DepGraph = function() {
  this.nodes = {};
};
DepGraph.prototype = {
  addNode: function(nameOrNode) {
    if(nameOrNode instanceof GraphNode) {
      nameOrNode.graph = this;
      this.nodes[nameOrNode.name] = nameOrNode;
    } else {
      this.nodes[nameOrNode] = new GraphNode(this, nameOrNode);
    }
  },
  hasCycles: function() {
    //TODO: make more efficient
    try {
      this.computeDependencyOrder();
      return false;

    } catch(e) {
      return true;
    }
  },
  getDependenciesOf: function(nodeName) {
    var self = this;
    var result = {};
    function helper(outgoing) {
      _.each(_.keys(outgoing), function(out) {
        var outNode = self.nodes[out];
        result[out] = true;
        helper(outNode.outgoing);
      });
    }
    helper(this.nodes[nodeName].outgoing);
    return _.keys(result);
  },
  getDependantsOf: function(nodeName) {
    var self = this;
    var result = {};
    function helper(incoming) {
      _.each(_.keys(incoming), function(inName) {
        var inNode = self.nodes[inName];
        result[inName] = true;
        helper(inNode.incoming);
      });
    }
    helper(this.nodes[nodeName].incoming);
    return _.keys(result);
  },
  computeDependencyOrder: function() {
    // Clone the graph
    var graphClone = new DepGraph();
    _.each(this.nodes, function(node) {
      graphClone.addNode(GraphNode.clone(node, graphClone));
    });
    var nodes = graphClone.nodes;
    // Get list of nodes that are depended on by noone.
    var startNodes = [];
    _.each(nodes, function(node) {
      if(_.size(node.incoming) === 0) {
        startNodes.push(node);
      }
    });
    // Traverse the graph building up the ordered list
    var ordered = [];
    while(startNodes.length > 0) {
      var node = startNodes.shift();
      ordered.push(node.name);
      var outgoing = node.outgoing;
      // For each dependency of the node
      _.each(_.keys(outgoing), function(edgeName) {
        node.removeEdge(edgeName);
        // Node has nobody else depending on it
        if(_.size(nodes[edgeName].incoming) === 0) {
          startNodes.push(nodes[edgeName]);
        }
      });
    }
    if (_.filter(nodes, function(node) {
      return _.size(node.incoming) > 0 || _.size(node.outgoing) > 0;
    }).length > 0) {
      throw new Error('Dependency Cycle Detected');
    } else {
      // Reverse the order as we want the depended on items first
      return ordered.reverse();
    }
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
        graph.nodes[asset].addEdge(requiredAsset);
      });
    });
    return graph;
  }
};