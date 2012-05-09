var async = require('async');
var glob = require('glob');
var path = require('path');
var _ = require('underscore');

var Asset = require('../asset').Asset;

var AssetFinder = exports.AssetFinder = function AssetFinder(options) {
  options = options || {};
  this.paths = options.paths || [];
  this.matchPattern = options.onlyMatching ? (
    options.onlyMatching.length > 1 ?
      '{' + options.onlyMatching.join(',') + '}' :
      options.onlyMatching[0]
    ) :
    '**/*.*';
};
AssetFinder.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (assetBundle, cb) {
    var self = this;
    async.forEach(this.paths, function (p, eachCb) {
      glob(self.matchPattern, { cwd:p }, function (e, matches) {
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