var path = require('path');
var fs = require('fs');

var Asset = exports.Asset = function Asset(options) {
  options = options || {};
  this.assetBaseDir = options.assetBaseDir;
  this.assetFilePath = options.assetFilePath;
  if (options.compiledAssetFilePath) {
    this.compiledAssetFilePath = options.compiledAssetFilePath;
  }
  this.lastUpdated = typeof options.lastUpdated !== 'undefined' ? options.lastUpdated : -1;
  if (options.logicalName) {
    this.logicalName = options.logicalName;
  }
  if (options.hashedName) {
    this.hashedName = options.hashedName;
  }
  this.contents = null;
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
  },
  loadLastModified:function (cb, sync) {
    var self = this;
    if (sync) {
      try {
        var stats = fs.statSync(this.assetFilePath);
        self.lastModified = stats.mtime;
        cb();
      } catch (e) {
        cb(e);
      }
    } else {
      fs.stat(this.assetFilePath, function (e, stats) {
        if (e) {
          cb(e);
        } else {
          self.lastModified = stats.mtime;
          cb();
        }
      });
    }
  },
  toJSON:function () {
    return {
      assetBaseDir:this.assetBaseDir,
      assetFilePath:this.assetFilePath,
      compiledAssetFilePath:this.compiledAssetFilePath,
      lastUpdated:this.lastUpdated,
      logicalName:this.logicalName,
      hashedName:this.hashedName
    };
  }
};
Asset.fromJSON = function (json) {
  return new Asset(json);
};
