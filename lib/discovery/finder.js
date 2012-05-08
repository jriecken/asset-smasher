var async = require('async');
var glob = require('glob');
var path = require('path');
var _ = require('underscore');

var Asset = require('../asset').Asset;

var AssetFinder = exports.AssetFinder = function AssetFinder(options) {
  options = options || {};
  this.paths = options.paths || [];
  this.precompile = options.precompile || [];
  this.precompiling = options.precompiling;
};
AssetFinder.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (assetBundle, cb) {
    // Set up the glob pattern - if precompiling, just the files to precompile,
    // otherwise, all files
    var globPattern = this.precompiling ? (
      this.precompile.length > 1 ?
        '{' + this.precompile.join(',') + '}' :
        this.precompile[0]
      ) :
      '**/*.*';
    async.forEach(this.paths, function (p, eachCb) {
      glob(globPattern, { cwd:p }, function (e, matches) {
        if (e) {
          eachCb(e);
        } else {
          _.each(matches, function (match) {
            var assetFilePath = path.join(p, match);
            assetBundle.assets[assetFilePath] = new Asset({
              assetBaseDir:p,
              assetFilePath:assetFilePath
            });
          });
          eachCb();
        }
      });
    }, function (e) {
      cb(e, assetBundle);
    });
  }
};