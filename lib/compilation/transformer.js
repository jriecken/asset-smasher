/**
 *
 * This operation runs an asset through a set of transformations,
 * based on file extensions.
 *
 * E.g
 *
 *   foo.js.coffee.ejs
 *
 * First runs through the EJS preprocessor, then the coffee-script compiler.
 *
 */
var async = require('async');
var path = require('path');
var _ = require('underscore');

// Use setImmediate if available
var setImmediateCompat = global.setImmediate || process.nextTick;

exports.transforms = {
  CoffeeScript:require('./transforms/coffee_transform'),
  Dust:require('./transforms/dust_transform'),
  Ejs:require('./transforms/ejs_transform'),
  Handlebars:require('./transforms/handlebars_transform'),
  Less:require('./transforms/less_transform'),
  Stylus:require('./transforms/stylus_transform'),
  Jsx:require('./transforms/jsx_transform'),
  Mf:require('./transforms/mf_transform')
};
exports.postTransforms = {
  Amd:require('./post_transforms/amd'),
  EndJsSemicolon:require('./post_transforms/end_js_semicolon')
};

var Transformer = exports.Transformer = function (options) {
  options = options || {};
  this.transforms = options.transforms || [];
  this.postTransforms = options.postTransforms || [];
};

Transformer.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  asDryRunOperation:function () {
    return this.executeDry.bind(this);
  },
  asGlobalDryRunOperation:function () {
    return this.executeGlobalDry.bind(this);
  },
  execute:function (asset, cb) {
    var transforms = this.transforms;
    var postTransforms = this.postTransforms;
    var currentTransform = null;
    // Reset the logical name and transform info
    asset.logicalName = path.basename(asset.assetFilePath);
    asset.transformInfo = {};
    // Transform the asset
    async.waterfall([
      function (wfCb) {
        // Load the asset (if it's not a manifest file/dir)
        if (!asset.isManifest() && !asset.contents) {
          asset.loadOriginalContents(wfCb);
        }
        else {
          wfCb();
        }
      },
      function (wfCb) {
        // Keep transforming while there are transformers to execute on the file
        async.whilst(function () {
          for (var i = 0; i < transforms.length; ++i) {
            if (transforms[i].shouldTransform(asset.logicalName, asset)) {
              currentTransform = transforms[i];
              return true;
            }
          }
          return false;
        }, function (whilstCb) {
          currentTransform.transform(asset, whilstCb);
        }, wfCb);
      },
      function (wfCb) {
        // Do any post-transform processing that needs to be done
        async.eachSeries(postTransforms, function (postTransform, eachCb) {
          setImmediateCompat(function() {
            postTransform.transform(asset, eachCb);
          });
        }, wfCb);
      }
    ], function (e) {
      cb(e, asset);
    });
  },
  executeGlobalDry:function (assetBundle, cb) {
    var self = this;
    async.eachLimit(assetBundle.getAllAssets(), 50, function(asset, eachCb) {
      self.executeDry(asset, eachCb);
    }, function (e) {
      cb(e, assetBundle);
    });
  },
  executeDry:function (asset, cb) {
    var transforms = this.transforms;
    var currentTransform = null;
    // Reset the logical name and transform info
    asset.logicalName = path.basename(asset.assetFilePath);
    asset.transformInfo = {};
    // Perform "dry" - name only transformation
    async.waterfall([
      function (wfCb) {
        // Load the asset (if it's not a manifest file/dir)
        if (!asset.isManifest() && !asset.contents) {
          asset.loadOriginalContents(wfCb);
        }
        else {
          wfCb();
        }
      },
      function (wfCb) {
        // Just transform the name
        async.whilst(function () {
          for (var i = 0; i < transforms.length; ++i) {
            if (transforms[i].shouldTransform(asset.logicalName, asset)) {
              currentTransform = transforms[i];
              return true;
            }
          }
          return false;
        }, function (whilstCb) {
          asset.logicalName = currentTransform.transformedFileName(asset.logicalName, asset);
          whilstCb();
        }, wfCb);
      }
    ], function (e) {
      cb(e, asset);
    });
  },
  getExtensions:function () {
    return _.uniq(_.flatten(_.map(this.transforms, function (transform) {
      return transform.extensions();
    })));
  }
};

