var async = require('async');
var _ = require('underscore');

exports.version = require('../package.json').version;

var Asset = require('./asset').Asset;
var AssetPackage = require('./asset_package').AssetPackage;
var Phase = require('./phase').Phase;
var ManifestParser = require('./discovery/manifest').ManifestParser;
var Transformer = require('./transformation/transformer').Transformer;
var transforms = require('./transformation/transformer').transforms;

var Snassets = exports.Snassets = function Snassets(options) {
  this.options = options;
  this.paths = options.paths;
  this.precompiling = options.precompiling;
  this.precompile = options.precompile || [];

  this.assets = new AssetPackage();

  var phases = this.phases = {
    // Phase that discovers assets and resolves dependencies
    discovery: new Phase('discovery'),
    // Phase that only transforms the logicalName of an asset to what it will actually be
    nameTransformation: new Phase('nameTransformation'),
    // Phase that actually transforms an asset, merges it, compresses it, etc.
    compilation: new Phase('compilation')
  };

  var manifestParser = new ManifestParser({
    paths: this.paths
  });
  var transformer = new Transformer([
    new (transforms.Dust)(),
    new (transforms.Ejs)(options.helpers),
    new (transforms.Less)(options.compress)
  ]);

  //phases.discovery.add(assetFinder.asOperation());
  phases.discovery.add(manifestParser.asOperation());

  phases.nameTransformation.add(transformer.asDryRunOperation());

  //phases.compilation.add(loadAsset.asOperation());
  phases.compilation.add(transformer.asOperation());
  //phases.compilation.add(contentCleanup.asOperation());
  //phases.compilation.add(manifestMerge.asOperation());
  //phases.compilation.add(jsCompressor.asOperation());
  //phases.compilation.add(writeAsset.asOperation());
  //phases.compilation.add(hashAsset.asOperation());
};
Snassets.prototype = {
  discoverAssets: function(cb) {
    this.phases.discovery.execute(this.assets, cb);
  },
  compileAsset: function(asset, cb) {
    this.phases.compilation.execute(asset, cb);
  },
  getAsset: function(logicalPath) {
    return _.find(this.assets.assets, function(asset) {
      return asset.logicalPath() === logicalPath;
    });
  }
};
