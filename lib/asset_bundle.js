var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var DepGraph = require('dependency-graph').DepGraph;

/**
 *
 * Represents a single asset
 *
 */
var Asset = exports.Asset = function Asset(options) {
  options = options || {};
  this.assetBaseDir = options.assetBaseDir;
  this.assetFilePath = options.assetFilePath;
  this.transformInfo = {};
  this.contents = null;
  this.compiled = false;
};
Asset.prototype = {
  get assetFilePath() {
    return this._assetFilePath;
  },
  set assetFilePath(assetFilePath) {
    this._assetFilePath = assetFilePath;
    this.logicalName = path.basename(assetFilePath);
    this.compiledAssetFilePath = assetFilePath;
  },
  get logicalName() {
    return this._logicalName;
  },
  set logicalName(logicalName) {
    this._logicalName = logicalName;
    this.hashedName = logicalName;
  },
  get logicalPath() {
    var rel = path.relative(this.assetBaseDir, this.assetFilePath);
    return path.join(path.dirname(rel), this.logicalName);
  },
  get hashedPath() {
    return path.join(path.dirname(this.logicalPath), this.hashedName);
  },
  reset:function () {
    this.assetFilePath = this._assetFilePath;
    this._assetFileStat = null;
    this.transformInfo = {};
    this.contents = null;
    this.compiled = false;
  },
  isManifest:function () {
    return path.extname(this.assetFilePath) === '.mf';
  },
  getAssetFileStats:function (cb, force) {
    var self = this;
    if (!force && this._assetFileStats) {
      cb(null, this._assetFileStats);
    } else {
      fs.stat(this.assetFilePath, function(e, stats) {
        if (e) {
          cb(e);
        } else {
          self._assetFileStats = stats;
          cb(null, stats);
        }
      });
    }
  },
  loadOriginalContents:function (cb, sync) {
    var self = this;
    if (sync) {
      try {
        self.contents = fs.readFileSync(this.assetFilePath);
        cb();
      } catch (e) {
        cb(e);
      }
    } else {
      fs.readFile(this.assetFilePath, function (e, contents) {
        if (e) {
          cb(e);
        } else {
          self.contents = contents;
          cb();
        }
      });
    }
  }
};

/**
 *
 * Represents the set of all known assets and the dependencies
 * between them.
 *
 */
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