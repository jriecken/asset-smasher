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

exports.transforms = {
  CoffeeScript:require('./transforms/coffee_transform'),
  Dust:require('./transforms/dust_transform'),
  Ejs:require('./transforms/ejs_transform'),
  Handlebars:require('./transforms/handlebars_transform'),
  Less:require('./transforms/less_transform'),
  Mf:require('./transforms/mf_transform')
};
exports.postTransforms = {
  /**
   * Ensure that .js files end in a semicolon
   */
  EndJsSemicolon:function (asset, cb) {
    if (path.extname(asset.logicalName) === '.js') {
      var contents = asset.contents;
      if (Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      if (!/\s*;[\s\n]*$/.test(contents)) {
        contents += ';\n';
      }
      if (!/\n$/.test(contents)) {
        contents += '\n';
      }
      asset.contents = contents;
    }
    cb();
  }
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
  execute:function (asset, cb) {
    var transforms = this.transforms;
    var postTransforms = this.postTransforms;
    var currentTransform = null;
    // Reset the logical name
    asset.logicalName = path.basename(asset.assetFilePath);
    // Transform the asset
    async.waterfall([
      function (wfCb) {
        // Load the asset
        if (!asset.contents) {
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
            if (transforms[i].shouldTransform(asset.logicalName)) {
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
        async.forEachSeries(postTransforms, function (postTransform, eachCb) {
          postTransform(asset, eachCb);
        }, wfCb);
      }
    ], function (e) {
      cb(e, asset);
    });
  },
  executeDry:function (asset, cb) {
    var transforms = this.transforms;
    var currentTransform = null;
    // Reset the logical name
    asset.logicalName = path.basename(asset.assetFilePath);
    // Just transform the name
    async.whilst(function () {
      for (var i = 0; i < transforms.length; ++i) {
        if (transforms[i].shouldTransform(asset.logicalName)) {
          currentTransform = transforms[i];
          return true;
        }
      }
      return false;
    }, function (whilstCb) {
      asset.logicalName = currentTransform.transformedFileName(asset.logicalName);
      whilstCb();
    }, function (e) {
      cb(e, asset);
    });
  },
  getExtensions:function () {
    return _.flatten(_.map(this.transforms, function (transform) {
      return transform.extensions();
    }));
  }
};

