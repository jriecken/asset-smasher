var path = require('path');
var fs = require('fs');

var Asset = exports.Asset = function Asset(options) {
  options = options || {};
  this._assetBaseDir = options.assetBaseDir;
  this._assetFilePath = options.assetFilePath;
  this._compiledAssetFilePath = options.compiledAssetFilePath;
  this._lastUpdated = typeof options.lastUpdated !== 'undefined' ? options.lastUpdated : -1;
  this._logicalName = options.logicalName;
  this._actualName = options.actualName;

  this._contents = null;
};
Asset.prototype = {
  assetBaseDir:function (assetBaseDir) {
    if (typeof assetBaseDir !== 'undefined') {
      this._assetBaseDir = assetBaseDir;
    }
    return this._assetBaseDir;
  },
  assetFilePath:function (assetFilePath) {
    if (typeof assetFilePath !== 'undefined') {
      this._assetFilePath = assetFilePath;
      this.logicalName(path.basename(assetFilePath));
      this.compiledAssetFilePath(assetFilePath);
    }
    return this._assetFilePath;
  },
  compiledAssetFilePath:function (compiledAssetFilePath) {
    if (typeof compiledAssetFilePath !== 'undefined') {
      this._compiledAssetFilePath = compiledAssetFilePath;
    }
    return this._compiledAssetFilePath;
  },
  lastUpdated:function (lastUpdated) {
    if (typeof lastUpdated !== 'undefined') {
      this._lastUpdated = lastUpdated;
    }
    return this._lastUpdated;
  },
  logicalName:function (logicalName) {
    if (typeof logicalName !== 'undefined') {
      this._logicalName = logicalName;
      this.actualName(logicalName);
    }
    return this._logicalName;
  },
  actualName:function (actualName) {
    if (typeof actualName !== 'undefined') {
      this._actualName = actualName;
    }
    return this._actualName;
  },
  contents: function(contents) {
    if (typeof contents !== 'undefined') {
      this._contents = contents;
    }
    return this._contents;
  },
  logicalPath:function () {
    var assetDir = path.dirname(this._assetFilePath);
    return path.join(assetDir.substr(assetDir.indexOf(this._assetBaseDir)), this._logicalName);
  },
  actualPath:function () {
    return path.join(path.dirname(this.logicalPath()), this._actualName);
  },
  loadOriginalContents: function(cb) {
    fs.readFile(this._assetFilePath, cb);
  },
  toJSON:function () {
    return {
      assetBaseDir:this._assetBaseDir,
      assetFilePath:this._assetFilePath,
      compiledAssetFilePath:this._compiledAssetFilePath,
      lastUpdated:this._lastUpdated,
      logicalName:this._logicalName,
      actualName:this._actualName
    };
  }
};
Asset.fromJSON = function (json) {
  return new Asset(json);
};
