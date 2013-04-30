var async = require('async');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var _ = require('underscore');

var AssetBundle = require('./asset_bundle').AssetBundle;
var AssetFinder = require('./discovery/finder').AssetFinder;
var DependencyResolver = require('./discovery/finder').DependencyResolver;
var ManifestWalker = require('./discovery/manifest').ManifestWalker;
var Transformer = require('./compilation/transformer').Transformer;
var RequireMerger = require('./compilation/merger').RequireMerger;
var JsMinifier = require('./compilation/minifier').JsMinifier;
var CSSMinifier = require('./compilation/minifier').CSSMinifier;
var AssetHasher = require('./compilation/hasher').AssetHasher;
var OutputAsset = require('./output/save').OutputAsset;
var CleanupAsset = require('./output/save').CleanupAsset;

var transforms = require('./compilation/transformer').transforms;
var postTransforms = require('./compilation/transformer').postTransforms;

// Use setImmediate if available
var setImmediateCompat = global.setImmediate || process.nextTick;
// Get "exists" from the right place
var existsCompat = fs.exists || path.exists;

function executePhase(phase, target, cb) {
  async.eachSeries(phase, function (operation, cb) {
    operation(target, cb);
  }, function (e) {
    cb(e, target);
  });
}

/**
 * Options:
 *
 *  - paths
 *  - only
 *  - prefix
 *  - compress
 *  - hash
 *  - hashVersion
 *  - gzip
 *  - helpers
 *  - outputTo
 */
function Smasher(options) {
  // Make the paths absolute
  options.paths = options.paths.map(function (p) {
    return path.resolve(p);
  });
  // Remember the output location
  this.outputTo = options.outputTo = path.resolve(options.outputTo);
  // Remember the asset dirs
  this.paths = options.paths;
  // Remember whether to not nuke the output directory
  this.noclean = options.noclean;
  // Are we outputing verbose logging info
  this.verbose = options.verbose;
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
    // Phase that discovers assets and resolves dependencies from all paths
    discovery:[],
    // Phase that just "discovers" a single asset
    singleDiscovery:[],
    // Phase that only transforms the logicalName of an asset to what it will actually be
    nameTransformation:[],
    // Phase that actually transforms an asset, merges it, etc.
    compilation:[],
    // Phase that post-processes the compiled/merged assets
    postCompilation:[],
    // Phase that outputs assets
    output:[]
  };

  var transformer = new Transformer({
    transforms:_.map(transforms, function (transform) {
      return new transform(options);
    }),
    postTransforms:_.map(postTransforms, function (transform) {
      return transform;
    })
  });

  var depResolver = new DependencyResolver({
    lookFor:[/asset_src\s*\(\s*['"]([^'"]+)['"]\s*\)/g] // Find the asset_src helper
  });

  var manifestWalker = new ManifestWalker({
    paths:this.paths,
    extensions:transformer.getExtensions(),
    verbose:options.verbose
  });

  /*
   * Finding assets
   */

  phases.discovery.push(new AssetFinder({
    paths:this.paths,
    only:options.only ? options.only : null
  }).asOperation());
  phases.discovery.push(manifestWalker.asOperation());
  phases.discovery.push(transformer.asGlobalDryRunOperation());
  phases.discovery.push(depResolver.asOperation());

  phases.singleDiscovery.push(manifestWalker.asSingleOperation(bundle));
  phases.singleDiscovery.push(depResolver.asSingleOperation(bundle));

  /*
   * Transforming assets
   */

  phases.nameTransformation.push(transformer.asDryRunOperation());

  phases.compilation.push(transformer.asOperation());
  phases.compilation.push(new RequireMerger({
    bundle:this.bundle
  }).asOperation());
  if (options.hash) {
    phases.compilation.push(new AssetHasher({
      algorithm:'md5',
      hashVersion:options.hashVersion,
      only:options.only ? options.only : null
    }).asOperation());
  }
  if (options.compress) {
    phases.postCompilation.push(new JsMinifier().asOperation());
    phases.postCompilation.push(new CSSMinifier().asOperation());
  }

  /*
   * Saving compiled assets
   */

  phases.output.push(new OutputAsset({
    outputTo:options.outputTo,
    only:options.only ? options.only : null,
    gzip:options.gzip
  }).asOperation());
  phases.output.push(new CleanupAsset().asOperation());
}
Smasher.prototype = {
  /**
   * Clear out the asset metadata.
   */
  reset:function () {
    this.bundle.clear();
  },
  /**
   * Compile all the assets according to the options
   */
  compileAssets:function (cb) {
    this.reset();
    var bundle = this.bundle;
    var self = this;
    async.waterfall([
      function (wfCb) {
        if (self.noclean) {
          wfCb();
        } else {
          // Remove the output directory if it exists
          existsCompat(self.outputTo, function (exists) {
            if (exists) {
              if (self.verbose) {
                console.log('compileAssets: removing output directory: ' + self.outputTo);
              }
              rimraf(self.outputTo, wfCb);
            } else {
              wfCb();
            }
          });
        }
      },
      function (wfCb) {
        if (self.verbose) {
          console.log('compileAssets: starting asset discovery phase.');
        }
        executePhase(self.phases.discovery, bundle, wfCb);
      },
      function (b, wfCb) {
        if (self.verbose) {
          console.log('compileAssets: starting compilation phase.');
        }
        try {
          // Get the correct order of asset dependencies
          var orderedAssets = bundle.getProcessingOrder().map(function (assetFilePath) {
            return bundle.getAsset(assetFilePath);
          });
          async.eachSeries(orderedAssets, function (asset, eachCb) {
            setImmediateCompat(function() {
              executePhase(self.phases.compilation, asset, eachCb);
            });
          }, wfCb);
        }
        catch (e) {
          wfCb(e);
        }
      }, function (wfCb) {
        if (self.verbose) {
          console.log('compileAssets: starting post-compilation phase.');
        }
        async.eachLimit(bundle.getAllAssets(), 50, function (asset, eachCb) {
          executePhase(self.phases.postCompilation, asset, eachCb);
        }, wfCb);
      }, function (wfCb) {
        if (self.verbose) {
          console.log('compileAssets: starting output phase.');
        }
        async.eachLimit(bundle.getAllAssets(), 50, function (asset, eachCb) {
          executePhase(self.phases.output, asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  /**
   * Compile a single asset (the asset must be in one of the configured paths)
   *
   * Will not compile an asset that's already been compiled.  Call reset() first
   * if you want to asset to be recompiled.
   *
   * @param assetFilePath Path to the asset file
   */
  compileSingleAsset:function (assetFilePath, cb) {
    if (this.verbose) {
      console.log('compileSingleAsset: compiling ' + assetFilePath);
    }
    var self = this;
    // Normalize the path
    assetFilePath = path.resolve(assetFilePath);
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
      if (!asset.compiled) {
        async.waterfall([
          function (wfCb) {
            executePhase(self.phases.singleDiscovery, asset, wfCb);
          },
          function (a, wfCb) {
            var dependencies = self.bundle.getRequiredFiles(assetFilePath).map(function (dependency) {
              return self.bundle.getAsset(dependency);
            });
            dependencies.push(asset); // Add the final asset we're making to the end
            async.eachSeries(dependencies, function (dep, eachCb) {
              setImmediateCompat(function() {
                dep.reset(); // Ensure the file gets compiled even if it's already been compiled before
                executePhase(self.phases.compilation, dep, eachCb);
              });
            }, wfCb);
          },
          function (wfCb) {
            executePhase(self.phases.postCompilation, asset, wfCb);
          },
          function (a, wfCb) {
            executePhase(self.phases.output, asset, wfCb);
          }
        ], cb);
      } else {
        cb(null, asset);
      }
    }
  },
  /**
   * Find, but do not compile all the assets according to the options.
   *
   */
  findAssets:function (cb) {
    this.reset();
    var bundle = this.bundle;
    var self = this;
    async.waterfall([
      function (wfCb) {
        if (self.verbose) {
          console.log('findAssets: starting discovery phase');
        }
        executePhase(self.phases.discovery, bundle, wfCb);
      },
      function (b, wfCb) {
        if (self.verbose) {
          console.log('findAssets: starting name transformation phase');
        }
        async.eachLimit(bundle.getAllAssets(), 50, function (asset, eachCb) {
          executePhase(self.phases.nameTransformation, asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  /**
   * Get an asset by its logical path
   */
  getAssetByLogicalPath:function (logicalPath) {
    return this.bundle.getAssetByLogicalPath(logicalPath);
  },
  /**
   * Get the mapping of logical file name to hashed file name
   *
   * Only relevant if the "hash" option is true.  Otherwise this wil
   * return an empty object.
   */
  getHashedFileMapping:function () {
    return this.bundle.getHashedFileMapping();
  },
  /**
   * Get a list of logical paths that the specified asset
   * "requires" (i.e. should be comprised of if the file is being merged together)
   */
  getRequiredLogicalPathsFor:function (asset) {
    var bundle = this.bundle;
    var requires = bundle.getRequiredFiles(asset.assetFilePath);
    if (requires.length > 0) {
      return requires.map(function (file) {
        return bundle.getAsset(file).logicalPath;
      });
    } else {
      return [asset.logicalPath];
    }
  },
  /**
   * Get a list of logical paths in the order that the assets will be processed in
   */
  getProcessingOrderLogicalPaths:function () {
    var bundle = this.bundle;
    var order = bundle.getProcessingOrder();
    return order.map(function (file ) {
      return bundle.getAsset(file).logicalPath;
    });
  }
};

exports.Smasher = Smasher;
exports.transforms = transforms;
exports.postTransforms = postTransforms;
exports.middleware = require('./middleware');
