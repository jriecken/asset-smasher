var path = require('path');
var url = require('url');
var async = require('async');
var Smasher = require('./asset-smasher').Smasher;
var staticMiddleware;

function Middleware(options) {
  this.assetMapLocation = options.assetMapLocation;
  this.prefix = options.prefix;
  this.serve = options.serve;
  this.debug = options.debug;
  if (options.serve) {
    this.compileQueue = async.queue(this.loadOrCompileAsset.bind(this), 1);
    this.smasher = new Smasher(options);
    this.findAssets();
  }
  this.loadAssetMap();
}
Middleware.prototype = {
  execute:function (req, res, next) {
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
            // Assets must be compiled non-concurrently
            this.compileQueue.push({
              req:req,
              res:res,
              asset:asset,
              next:next
            }, function (e) {
              // If there's an error, we need to continue the request
              if (e) {
                next(e);
              }
              // Otherwise the asset will be processed and next() will
              // have already been called.
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
  loadOrCompileAsset:function(task, done) {
    var self = this;
    // Asset might have been compiled while we were waiting
    if (task.asset.compiled) {
      this.serveAsset(task.req, task.res, task.next, task.asset);
      done();
    } else {
      this.smasher.compileSingleAsset(task.asset.assetFilePath, function (e) {
        if (e) {
          done(e);
        } else {
          self.serveAsset(task.req, task.res, task.next, task.asset);
          done();
        }
      });
    }
  },
  serveAsset:function (req, res, next, asset) {
    staticMiddleware.send(req, res, next, {
      path:asset.compiledAssetFilePath
    });
  },
  loadAssetMap:function () {
    try {
      if (this.assetMapLocation) {
        this.assetMap = require(this.assetMapLocation);
      } else {
        this.assetMap = {};
      }
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
      /**
       * Create a script tag (or bunch of script tags for a manifest when serve is true)
       * for a JavaScript asset
       */
      js_asset:function (logicalPath) {
        var assets = self.getAssetsForLogicalPath(logicalPath);
        return assets.map(function (asset) {
          return '<script src="' + self.prefix + '/' + asset + '"></script>';
        }).join('\n');
      },
      /**
       * Create a link tag (or bunch of link tags for a manifest when serve is true)
       * for a CSS asset
       */
      css_asset:function (logicalPath) {
        var assets = self.getAssetsForLogicalPath(logicalPath);
        return assets.map(function (asset) {
          return '<link rel="stylesheet" href="' + self.prefix + '/' + asset + '">';
        }).join('\n');
      },
      /**
       * Return the raw URL for an asset.
       */
      raw_asset:function (logicalPath) {
        return self.prefix + '/' + (self.assetMap[logicalPath] || logicalPath);
      }
    });
  },
  /**
   * Get the assets required for the specified logical path.  This will separate any
   * manifests into their individual files (if not running with an asset map)
   */
  getAssetsForLogicalPath:function (logicalPath) {
    if (this.assetMap[logicalPath]) {
      return [this.assetMap[logicalPath]];
    } else {
      if (this.serve) {
        var asset = this.smasher.getAssetByLogicalPath(logicalPath);
        if (asset) {
          return this.smasher.getRequiredLogicalPathsFor(asset);
        } else {
          return [logicalPath];
        }
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
