var async = require('async');
var path = require('path');
var _ = require('underscore');

var AssetBundle = require('./asset_bundle').AssetBundle;
var Phase = require('./phase').Phase;
var AssetFinder = require('./discovery/finder').AssetFinder;
var DependencyResolver = require('./discovery/finder').DependencyResolver;
var ManifestWalker = require('./discovery/manifest').ManifestWalker;
var SingleManifestWalker = require('./discovery/manifest').SingleManifestWalker;
var Transformer = require('./compilation/transformer').Transformer;
var RequireMerger = require('./compilation/merger').RequireMerger;
var JsMinifier = require('./compilation/minifier').JsMinifier;
var AssetHasher = require('./compilation/hasher').AssetHasher;
var OutputAsset = require('./output/save').OutputAsset;
var CleanupAsset = require('./output/save').CleanupAsset;

var transforms = require('./compilation/transformer').transforms;
var postTransforms = require('./compilation/transformer').postTransforms;

/**
 * Options:
 *
 *  - paths
 *  - only
 *  - prefix
 *
 *  - compress
 *  - hash
 *  - hashVersion
 *
 *  - transforms
 *  - postTransforms
 *  - helpers
 *
 *  - outputTo
 *
 */
function Snassets(options) {
  // Make the paths absolute
  options.paths = _.map(options.paths, function (p) {
    return path.resolve(p);
  });
  options.outputTo = path.resolve(options.outputTo);
  // Remember the asset dirs
  this.paths = options.paths;
  // Create the asset bundle
  var bundle = this.bundle = new AssetBundle();
  // Register an "asset_src" helper that can replace asset URLs in other files
  var prefix = options.prefix;
  options.helpers = _.extend({
    asset_src:function (logicalPath) {
      var asset = bundle.getAssetByLogicalPath(logicalPath);
      if (asset) {
        return prefix + '/' + asset.hashedPath;
      } else {
        return prefix + '/' + logicalPath;
      }
    }
  }, options.helpers);
  // Set up the compilation phases
  var phases = this.phases = {
    // Phase that discovers assets and resolves dependencies
    discovery:new Phase('discovery'),
    // Phase that just "discovers" a single asset
    singleDiscovery:new Phase('singleDiscovery'),
    // Phase that only transforms the logicalName of an asset to what it will actually be
    nameTransformation:new Phase('nameTransformation'),
    // Phase that actually transforms an asset, merges it, etc.
    compilation:new Phase('compilation'),
    // Phase that post-processes the compiled/merged assets
    postCompilation:new Phase('postCompilation'),
    // Phase that outputs assets
    output:new Phase('output')
  };

  var transformer = new Transformer({
    transforms:_.map(transforms, function (transform) {
      return new transform(options);
    }),
    postTransforms:_.map(postTransforms, function (transform) {
      return transform;
    })
  });

  /*
   * Finding assets
   */

  var depResolver = new DependencyResolver({
    lookFor:[/asset_src\s*\(\s*['"]([^'"]+)['"]\s*\)/g] // Find the asset_src helper
  });

  phases.discovery.add(new AssetFinder({
    paths:this.paths,
    only:options.only ? options.only : null
  }).asOperation());
  phases.discovery.add(new ManifestWalker({
    paths:this.paths,
    extensions:transformer.getExtensions()
  }).asOperation());
  phases.discovery.add(depResolver.asOperation());

  phases.singleDiscovery.add(new SingleManifestWalker({
    paths:this.paths,
    extensions:transformer.getExtensions(),
    bundle:this.bundle
  }).asOperation());
  phases.singleDiscovery.add(depResolver.asOperation());

  /*
   * Transforming assets
   */

  phases.nameTransformation.add(transformer.asDryRunOperation());

  phases.compilation.add(transformer.asOperation());
  phases.compilation.add(new RequireMerger({
    bundle:this.bundle
  }).asOperation());
  if (options.hash) {
    phases.compilation.add(new AssetHasher({
      algorithm:'md5',
      hashVersion:options.hashVersion,
      only:options.only ? options.only : null
    }).asOperation());
  }
  if (options.compress) {
    phases.postCompilation.add(new JsMinifier().asOperation());
  }

  /*
   * Saving compiled assets
   */

  phases.output.add(new OutputAsset({
    outputTo:options.outputTo,
    only:options.only ? options.only : null,
    gzip:options.gzip
  }).asOperation());
  phases.output.add(new CleanupAsset().asOperation());
}
Snassets.prototype = {
  compileAssets:function (cb) {
    var bundle = this.bundle;
    bundle.clear();
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.phases.discovery.execute(bundle, wfCb);
      },
      function (b, wfCb) {
        try {
          // Get the correct order of asset dependencies
          var orderedAssets = _.map(bundle.getProcessingOrder(), function (assetFilePath) {
            return bundle.getAsset(assetFilePath);
          });
          async.forEachSeries(orderedAssets, function (asset, eachCb) {
            self.phases.compilation.execute(asset, eachCb);
          }, wfCb);
        }
        catch (e) {
          wfCb(e);
        }
      }, function (wfCb) {
        async.forEach(bundle.getAllAssets(), function (asset, eachCb) {
          self.phases.postCompilation.execute(asset, eachCb);
        }, wfCb);
      }, function (wfCb) {
        async.forEach(bundle.getAllAssets(), function (asset, eachCb) {
          self.phases.output.execute(asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  compileSingleAsset:function (assetFilePath, cb) {
    var self = this;
    // Find which asset root the file is in
    var baseDir;
    for (var i = 0; i < this.paths.length; ++i) {
      var p = this.paths[i];
      if (assetFilePath.indexOf(p) === 0) {
        baseDir = p;
        break;
      }
    }
    if (!baseDir) {
      cb(new Error('Asset must be in one of the asset paths'));
    } else {
      var asset = this.bundle.addAsset(baseDir, assetFilePath);
      async.waterfall([
        function (wfCb) {
          self.phases.singleDiscovery.execute(asset, wfCb);
        },
        function (a, wfCb) {
          var deps = _.map(self.bundle.getRequiredFiles(assetFilePath), function (dep) {
            return self.bundle.getAsset(dep);
          });
          deps.push(asset); // Add the final asset we're making to the end
          async.forEachSeries(deps, function (dep, eachCb) {
            self.phases.compilation.execute(dep, eachCb);
          }, wfCb);
        },
        function (wfCb) {
          self.phases.postCompilation.execute(asset, wfCb);
        },
        function (a, wfCb) {
          self.phases.output.execute(asset, wfCb);
        }
      ], cb);
    }
  },
  findAssets:function (cb) {
    var bundle = this.bundle;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.phases.discovery.execute(bundle, wfCb);
      },
      function (b, wfCb) {
        async.forEach(bundle.getAllAssets(), function (asset, eachCb) {
          self.phases.nameTransformation.execute(asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  getAssetByLogicalPath:function (logicalPath) {
    return this.bundle.getAssetByLogicalPath(logicalPath);
  }
};

exports.version = require('../package.json').version;
exports.transforms = transforms;
exports.postTransforms = postTransforms;
exports.Snassets = Snassets;