/**
 *
 * This operation finds assets in the configured paths.
 *
 * Takes in the following options:
 *  - paths - file system paths to look in
 *  - only - only find files in the directories matching one of the specified
 *           glob patterns.
 *
 */
var async = require('async');
var glob = require('glob');
var path = require('path');

var AssetFinder = exports.AssetFinder = function AssetFinder(options) {
  options = options || {};
  this.paths = options.paths || [];
  this.matchPattern = options.only ? (
    options.only.length > 1 ?
      '{' + options.only.join(',') + '}' :
      options.only[0]
    ) :
    '**/*.*';
};
AssetFinder.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (assetBundle, cb) {
    var self = this;
    async.each(this.paths, function (p, eachCb) {
      glob(self.matchPattern, { cwd:p }, function (e, matches) {
        if (e) {
          eachCb(e);
        } else {
          matches.forEach(function (match) {
            var assetFilePath = path.join(p, match);
            assetBundle.addAsset(p, assetFilePath);
          });
          eachCb();
        }
      });
    }, function (e) {
      cb(e, assetBundle);
    });
  }
};

/**
 * Looks through the assets, finding dependencies as specified in regexes in the
 * lookFor parameter.
 */
var DependencyResolver = exports.DependencyResolver = function DependencyResolver(options) {
  // Array of regexes to look for.  Dependency logical path is in group 1
  this.lookFor = options.lookFor || [];
};
DependencyResolver.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  asSingleOperation:function (bundle) {
    var self = this;
    return function(asset, cb) {
      self.executeSingle(asset, bundle, cb);
    };
  },
  execute:function (assetBundle, cb) {
    var self = this;
    if (this.lookFor.length > 0) {
      async.each(assetBundle.getAllAssets(), function(asset, eachCb) {
        self.executeSingle(asset, assetBundle, eachCb);
      }, function (e) {
        cb(e, assetBundle);
      });
    } else {
      cb(null, assetBundle);
    }
  },
  executeSingle: function(asset, bundle, cb) {
    var self = this;
    if (this.lookFor.length > 0) {
      async.waterfall([
        function (wfCb) {
          if (!asset.contents) {
            asset.loadOriginalContents(wfCb);
          } else {
            wfCb();
          }
        },
        function (wfCb) {
          var contents = Buffer.isBuffer(asset.contents) ? asset.contents.toString('utf8') : asset.contents;
          try {
            self.lookFor.forEach(function (lf) {
              lf.lastIndex = 0; // Reset the regexp
              var result;
              while ((result = lf.exec(contents)) !== null) {
                var logicalDepPath = result[1];
                var depAsset = bundle.getAssetByLogicalPath(logicalDepPath);
                if (depAsset) {
                  bundle.addDependency(asset.assetFilePath, depAsset.assetFilePath);
                } else {
                  throw new Error('Asset dependency not found: ' + logicalDepPath);
                }
              }
            });
            wfCb();
          } catch (e) {
            wfCb(e);
          }
        }
      ], function(e) {
        cb(e, asset);
      });
    } else {
      cb(null, asset);
    }
  }
};