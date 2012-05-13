/**
 *
 * Represents a single asset
 *
 */
var path = require('path');
var fs = require('fs');

var Asset = exports.Asset = function Asset(options) {
  options = options || {};
  this.assetBaseDir = options.assetBaseDir;
  this.assetFilePath = options.assetFilePath;
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
  }
};
