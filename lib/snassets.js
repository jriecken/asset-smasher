var async = require('async');
var _ = require('underscore');

exports.version = require('../package.json').version;

var AssetBundle = require('./asset_bundle').AssetBundle;
var Phase = require('./phase').Phase;
var AssetFinder = require('./discovery/finder').AssetFinder;
var ManifestWalker = require('./discovery/manifest').ManifestWalker;
var Transformer = require('./compilation/transformer').Transformer;
var transforms = require('./compilation/transformer').transforms;
var postTransforms = require('./compilation/transformer').postTransforms;
var RequireMerger = require('./compilation/merger').RequireMerger;
var JsMinifier = require('./compilation/minifier').JsMinifier;
var AssetHasher = require('./compilation/hasher').AssetHasher;
var OutputAsset = require('./output/save').OutputAsset;
var CleanupAsset = require('./output/save').CleanupAsset;

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
    // Phase that actually transforms an asset, merges it
    compilation:new Phase('compilation'),
    // Phase that post-processes the compiled/merged assets
    postCompilation:new Phase('postCompilation'),
    // Phase that outputs assets
    output:new Phase('output')
  };

  var transformer = new Transformer({
    transforms:[
      new (transforms.Mf)(),
      new (transforms.Dust)(),
      new (transforms.Ejs)(options.helpers),
      new (transforms.Less)(options.compress)
    ],
    postTransforms:[
      postTransforms.EndJsSemicolon
    ]
  });

  phases.discovery.add(new AssetFinder({
    paths:this.paths,
    onlyMatching:options.precompiling ? options.precompile : null
  }).asOperation());
  phases.discovery.add(new ManifestWalker({
    paths:this.paths,
    extensions:['.mf', '.js', '.css', '.ejs', '.dust', '.less']
  }).asOperation());

  phases.nameTransformation.add(transformer.asDryRunOperation());

  phases.compilation.add(transformer.asOperation());
  phases.compilation.add(new RequireMerger(this.bundle).asOperation());


  if (options.compress) {
    phases.postCompilation.add(new JsMinifier().asOperation());
  }
  if( options.hash) {
    phases.postCompilation.add(new AssetHasher({
      algorithm: 'md5',
      version: options.version,
      onlyMatching:options.precompiling ? options.precompile : null
    }).asOperation());
  }

  phases.output.add(new OutputAsset({
    outputTo:options.outputTo,
    onlyMatching:options.precompiling ? options.precompile : null
  }).asOperation());
  phases.output.add(new CleanupAsset().asOperation());
};
Snassets.prototype = {
  compileAssets:function (cb) {
    var bundle = this.bundle;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.phases.discovery.execute(bundle, wfCb);
      },
      function (b, wfCb) {
        try {
          // Get the correct order of asset dependencies
          var orderedAssets = _.map(bundle.getDependencyGraph().overallOrder(), function(assetFilePath) {
            return bundle.assets[assetFilePath];
          });
          async.forEachSeries(orderedAssets, function (asset, eachCb) {
            self.phases.compilation.execute(asset, eachCb)
          }, wfCb);
        }
        catch(e) {
          wfCb(e);
        }
      },function(wfCb) {
        async.forEach(_.values(bundle.assets), function (asset, eachCb) {
          self.phases.postCompilation.execute(asset, eachCb);
        }, wfCb);
      },function(wfCb) {
        async.forEach(_.values(bundle.assets), function (asset, eachCb) {
          self.phases.output.execute(asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  compileSingleAsset:function(asset, cb) {

  },
  findAssets: function(cb) {
    var bundle = this.bundle;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.phases.discovery.execute(bundle, wfCb);
      },
      function (b, wfCb) {
        async.forEach(_.values(bundle.assets), function (asset, eachCb) {
          self.phases.nameTransformation.execute(asset, eachCb);
        }, wfCb);
      }
    ], cb);
  },
  getAssetByLogicalPath:function (logicalPath) {
    return this.bundle.getAssetByLogicalPath(logicalPath);
  }
};
