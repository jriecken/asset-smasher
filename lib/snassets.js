var async = require('async');
var _ = require('underscore');

exports.version = require('../package.json').version;

var AssetBundle = require('./asset_bundle').AssetBundle;
var Phase = require('./phase').Phase;
var AssetFinder = require('./discovery/finder').AssetFinder;
var ManifestWalker = require('./discovery/manifest').ManifestWalker;
var LoadAsset = require('./compilation/load_save').LoadAsset;
var Transformer = require('./compilation/transformer').Transformer;
var transforms = require('./compilation/transformer').transforms;
var postTransforms = require('./compilation/transformer').postTransforms;
var RequireMerger = require('./compilation/merger').RequireMerger;
var JsMinifier = require('./compilation/minifier').JsMinifier;
var OutputAsset = require('./compilation/load_save').OutputAsset;
var OutputHashNamedAsset = require('./compilation/load_save').OutputHashNamedAsset;
var CleanupAsset = require('./compilation/load_save').CleanupAsset;

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

  var transformer = new Transformer({
    transforms: [
      new (transforms.Mf)(),
      new (transforms.Dust)(),
      new (transforms.Ejs)(options.helpers),
      new (transforms.Less)(options.compress)
    ],
    postTransforms: [
      postTransforms.EndSemicolon
    ]
  });

  phases.discovery.add(new AssetFinder({
    paths:this.paths,
    precompile:this.precompile,
    precompiling:this.precompiling
  }).asOperation());
  phases.discovery.add(new ManifestWalker({
    paths: this.paths,
    extensions: ['.mf', '.js', '.css', '.ejs', '.dust', '.less']
  }).asOperation());

  phases.nameTransformation.add(transformer.asDryRunOperation());

  phases.compilation.add(new LoadAsset().asOperation());
  phases.compilation.add(transformer.asOperation());
  phases.compilation.add(new RequireMerger(this.bundle).asOperation());
  if(options.compress) {
    phases.compilation.add(new JsMinifier().asOperation());
  }
  phases.compilation.add(new OutputAsset({
    outputTo: options.outputTo,
    onlyMatching: options.precompiling ? options.precompile : null
  }).asOperation());
  if(options.hash) {
    phases.compilation.add(new OutputHashNamedAsset({
      outputTo: options.outputTo,
      onlyMatching: options.precompiling ? options.precompile : null,
      version: options.version
    }).asOperation());
  }
  phases.compilation.add(new CleanupAsset().asOperation());
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
    return this.bundle.getAssetByLogicalPath(logicalPath);
  }
};
