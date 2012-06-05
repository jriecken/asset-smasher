var path = require('path');
var url = require('url');
var Smasher = require('./asset-smasher').Smasher;
var staticMiddleware;

function Middleware(options) {
  this.smasher = new Smasher(options);
  this.outputTo = options.outputTo;
  this.prefix = options.prefix;
  this.serve = options.serve;
  this.debug = options.debug;
  if (options.serve) {
    this.findAssets();
  } else {
    this.loadAssetMap();
  }
}
Middleware.prototype = {
  execute:function (req, res, next) {
    var self = this;
    this.registerHelpers(res);
    if (!this.serve) {
      next();
    } else {
      var reqUrl = url.parse(req.url).pathname;
      if (reqUrl.indexOf(this.prefix) === 0) {
        var logicalPath = reqUrl.substr(this.prefix.length + 1);
        var asset = this.smasher.getAssetByLogicalPath(logicalPath);
        if (asset) {
          if (asset.compiled) {
            this.serveAsset(req, res, next, asset);
          } else {
            this.smasher.compileSingleAsset(asset.assetFilePath, function (e) {
              if (e) {
                next(e);
              } else {
                self.serveAsset(req, res, next, asset);
              }
            });
          }
        } else {
          next();
        }
      } else {
        next();
      }
    }
  },
  serveAsset:function (req, res, next, asset) {
    staticMiddleware.serve(req, res, next, {
      path:asset.compiledAssetFilePath
    });
  },
  loadAssetMap:function () {
    try {
      this.assetMap = require(path.join(this.outputTo, 'map.json'));
    } catch (e) {
      this.assetMap = {};
    }
  },
  findAssets:function () {
    var self = this;
    var st = Date.now();
    this.smasher.findAssets(function (e) {
      if (e) {
        console.error('Error finding assets', e);
      } else if (self.debug) {
        console.log('Assets discovered in ' + (Date.now() - st) + ' ms.');
      }
    });
  },
  registerHelpers:function (res) {
    var self = this;
    res.locals({
      js_asset:function (logicalPath) {
        var assets = self.getAssetsForLogicalPath(logicalPath);
        assets.map(function (asset) {
          return '<script src="' + self.prefix + '/' + asset + '"></script>';
        }).join('\n');
      },
      css_asset:function (logicalPath) {
        var assets = self.getAssetsForLogicalPath(logicalPath);
        assets.map(function (asset) {
          return '<link rel="stylesheet" href="' + self.prefix + '/' + asset + '">';
        }).join('\n');
      }
    });
  },
  getAssetsForLogicalPath:function (logicalPath) {
    if (this.assetMap[logicalPath]) {
      return this.assetMap[logicalPath];
    } else {
      var asset = this.smasher.getAssetByLogicalPath(logicalPath);
      if (asset) {
        return this.smasher.getRequiredLogicalPathsFor(asset);
      } else {
        return [logicalPath];
      }
    }
  }
};

module.exports = function (options) {
  if (!staticMiddleware) {
    try {
      staticMiddleware = require('express')['static'];
    } catch (e) {
      throw new Error('Express is not available.');
    }
  }
  var middleware = new Middleware(options);
  return middleware.execute.bind(middleware);
};