var async = require('async');
var _ = require('underscore');

exports.version = require('../package.json').version;

var AssetBundle = require('./asset_bundle').AssetBundle;
var Phase = require('./phase').Phase;
var AssetFinder = require('./discovery/finder').AssetFinder;
var LoadAsset = require('./compilation/load_save').LoadAsset;
var OutputAsset = require('./compilation/load_save').OutputAsset;
var OutputHashNamedAsset = require('./compilation/load_save').OutputHashNamedAsset;
var Transformer = require('./compilation/transformer').Transformer;
var transforms = require('./compilation/transformer').transforms;

var Snassets = exports.Snassets = function Snassets(options) {
  this.paths = options.paths;
  this.precompiling = options.precompiling;
  this.precompile = options.precompile || [];

  this.bundle = new AssetBundle();

  var phases = this.phases = {
    // Phase that discovers assets and resolves dependencies
    discovery:new Phase('discovery'),
    // Phase that only transforms the logicalName of an asset to what it will actually be
    nameTransformation:new Phase('nameTransformation'),
    // Phase that actually transforms an asset, merges it, compresses it, etc.
    compilation:new Phase('compilation')
  };

  var assetFinder = new AssetFinder({
    paths:this.paths,
    precompile:this.precompile,
    precompiling:this.precompiling
  });

  var transformer = new Transformer([
    new (transforms.Dust)(),
    new (transforms.Ejs)(options.helpers),
    new (transforms.Less)(options.compress)
  ]);

  phases.discovery.add(assetFinder.asOperation());
  //phases.discovery.add(manifestParser.asOperation());

  phases.nameTransformation.add(transformer.asDryRunOperation());

  phases.compilation.add(new LoadAsset().asOperation());
  phases.compilation.add(transformer.asOperation());
  phases.compilation.add(new OutputAsset(options.outputTo).asOperation());
  phases.compilation.add(new OutputHashNamedAsset(options.outputTo, options.version).asOperation());
  phases.compilation.add(function (asset, cb) {
    // Clear out the memory taken by the contents
    asset.contents = null;
    cb(null, asset);
  });
  //phases.compilation.add(contentCleanup.asOperation());
  //phases.compilation.add(manifestMerge.asOperation());
  //phases.compilation.add(jsCompressor.asOperation());
  //phases.compilation.add(hashAsset.asOperation());
};
Snassets.prototype = {
  precompileAssets:function (cb) {
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.discoverAssets(wfCb);
      },
      function (bundle, wfCb) {
        async.forEach(_.values(bundle.assets), function (asset, eachCb) {
          self.compileAsset(asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  discoverAssets:function (cb) {
    this.phases.discovery.execute(this.bundle, cb);
  },
  compileAsset:function (asset, cb) {
    this.phases.compilation.execute(asset, cb);
  },
  getAssetByLogicalPath:function (logicalPath) {
    return _.find(this.bundle.assets, function (asset) {
      return asset.logicalPath === logicalPath;
    });
  }
};
