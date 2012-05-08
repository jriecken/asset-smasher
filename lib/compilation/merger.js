var path = require('path');
var _ = require('underscore');

var RequireMerger = exports.RequireMerger = function RequireMerger(assetBundle) {
  this.assetBundle = assetBundle;
};
RequireMerger.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (asset, cb) {
    try {
      var assetBundle = this.assetBundle;
      var requires = assetBundle.requires[asset.assetFilePath];
      if (requires) {
        asset.contents = '';
        requires = this.fillInRequires(asset, assetBundle, requires);
        _.each(requires, function (toRequire) {
          var otherContents = assetBundle.assets[toRequire].contents;
          asset.contents += Buffer.isBuffer(otherContents) ? otherContents.toString('utf-8') : otherContents;
        });
      }
      cb(null, asset);
    }
    catch (e) {
      cb(e);
    }

  },
  fillInRequires:function (asset, assetBundle, requires) {
    var self = this;
    _.each(requires, function (toRequire, index) {
      var nestedRequires = assetBundle.requires[toRequire];
      if (nestedRequires) {
        requires[index] = self.fillInRequires(asset, assetBundle, nestedRequires);
      }
    });
    return _.uniq(_.flatten(requires));
  }
};