var async = require('async');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var _ = require('underscore');

var DIRECTIVE_REGEX = /^(\w+)\s+"([^"]+)"\s*$/;
var ABSOLUTE_PATH = /^\//;
var RELATIVE_PATH = /^\.{1,2}/;

var ManifestWalker = exports.ManifestWalker = function ManifestWalker(options) {
  options = options || {};
  this.paths = options.paths || [];
  this.extensions = options.extensions || ['.mf', '.js', '.css'];
};
ManifestWalker.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (assetBundle, cb) {
    var self = this;
    async.forEach(assetBundle.getAllAssets(), function (asset, eachCb) {
      if (path.extname(asset.assetFilePath) === '.mf') {
        self.walkManifest(asset, assetBundle, eachCb);
      } else {
        eachCb();
      }
    }, function (e) {
      cb(e, assetBundle);
    });
  },
  walkManifest:function (manifest, assetBundle, cb) {
    var manifestFilePath = manifest.assetFilePath;
    var self = this;
    async.waterfall([
      // Read the file
      function (wfCb) {
        fs.readFile(manifestFilePath, 'utf-8', wfCb);
      },
      // For each line, process the directive on that line
      function (contents, wfCb) {
        async.forEachSeries(contents.split('\n'), function (line, eachCb) {
          if (line && line.indexOf('#') !== 0) {
            var directive = line.match(DIRECTIVE_REGEX);
            if (!directive) {
              eachCb(new Error('Bad directive in manifest file: ' + line));
            } else {
              var cmd = directive[1];
              var file = directive[2];
              if (self[cmd]) {
                self[cmd](manifest, assetBundle, file, eachCb);
              } else {
                eachCb(new Error('Bad directive in manifest file: ' + line));
              }
            }
          }
        }, wfCb);
      }
    ], cb);
  },
  require:function (manifest, assetBundle, file, cb) {
    var manifestFilePath = manifest.assetFilePath;
    var manifestDir = path.dirname(manifestFilePath);
    var self = this;

    function afterResolve(e, f) {
      if (e) {
        cb(e);
      } else {
        self.registerRequiredAsset(manifest, assetBundle, f, cb);
      }
    }

    if (file.match(ABSOLUTE_PATH)) {
      this.resolveFile(file, '', afterResolve);
    } else if (file.match(RELATIVE_PATH)) {
      this.resolveFile(file, manifestDir, afterResolve);
    } else {
      async.forEachSeries(this.paths, function (p, eachCb) {
        self.resolveFile(file, p, function (e, f) {
          if (e) {
            eachCb(e);
          } else if (f) {
            afterResolve(null, f);
            eachCb('break');
          } else {
            eachCb();
          }
        });
      }, function (e) {
        if (!e || e !== 'break') {
          afterResolve(e);
        }
      });
    }
  },
  require_dir:function (manifest, assetBundle, file, cb) {
    var manifestFilePath = manifest.assetFilePath;
    var dirPath;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.resolveDir(file, path.dirname(manifestFilePath), wfCb);
      },
      function (dir, wfCb) {
        dirPath = dir;
        fs.readdir(dir, wfCb);
      },
      function (files, wfCb) {
        async.forEachSeries(files, function (f, eachCb) {
          var filePath = path.join(dirPath, f);
          var extn = path.extname(f);
          if (filePath !== manifestFilePath && _.contains(self.extensions, extn)) {
            self.registerRequiredAsset(manifest, assetBundle, filePath, eachCb);
          } else {
            eachCb();
          }
        }, wfCb);
      }
    ], cb);
  },
  require_tree:function (manifest, assetBundle, file, cb) {
    var manifestFilePath = manifest.assetFilePath;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.resolveDir(file, path.dirname(manifestFilePath), wfCb);
      },
      function (dir, wfCb) {
        glob(path.join(dir, '**/*.*'), wfCb);
      },
      function (files, wfCb) {
        async.forEachSeries(files, function (f, eachCb) {
          var extn = path.extname(f);
          if (f !== manifestFilePath && _.contains(self.extensions, extn)) {
            self.registerRequiredAsset(manifest, assetBundle, f, eachCb);
          } else {
            eachCb();
          }
        }, wfCb);
      }
    ], cb);
  },
  resolveDir:function (dir, manifestDir, cb) {
    var result;
    if (dir.match(ABSOLUTE_PATH)) {
      result = dir;
    } else if (dir.match(RELATIVE_PATH)) {
      result = path.join(manifestDir, dir);
    } else {
      cb(new Error('Directory must be an absolute or relative path: ' + dir));
      return;
    }
    if (!this.isFileInPaths(result)) {
      cb(new Error('Directory must be inside one of the asset paths: ' + dir));
    } else {
      cb(null, result);
    }
  },
  resolveFile:function (file, dir, cb) {
    var filePath = path.join(dir, file);
    var fileDir = path.dirname(filePath);
    var self = this;
    async.waterfall([
      function (wfCb) {
        path.exists(fileDir, function (exists) {
          if (exists) {
            wfCb();
          } else {
            // Directory doesn't exist, no point looking further.
            wfCb('break');
          }
        });
      },
      function (wfCb) {
        fs.readdir(fileDir, wfCb);
      },
      function (files, wfCb) {
        async.forEachSeries(files, function (f, eachCb) {
          var lookupBase = path.basename(filePath);
          var fBase = path.basename(f);
          var found = false;
          if (lookupBase === fBase) {
            found = true;
          } else {
            var extn;
            do {
              extn = path.extname(fBase);
              fBase = path.basename(fBase, extn);
              if (lookupBase === fBase) {
                found = true;
                break;
              }
            } while (_.contains(self.extensions, extn));
          }
          if (found) {
            wfCb(null, path.join(fileDir, f));
            eachCb('break');
          } else {
            eachCb();
          }
        }, function (e) {
          if (!e || e !== 'break') {
            cb(e);
          }
        });
      }
    ], function (e, result) {
      if (e && e !== 'break') {
        cb(e);
      } else {
        cb(null, result);
      }
    });
  },
  isFileInPaths:function (file) {
    for (var i = 0; i < this.paths.length; ++i) {
      var p = this.paths[i];
      if (file.indexOf(p) === 0) {
        return true;
      }
    }
    return false;
  },
  pathForFile:function (file) {
    for (var i = 0; i < this.paths.length; ++i) {
      var p = this.paths[i];
      if (file.indexOf(p) === 0) {
        return p;
      }
    }
    return null;
  },
  registerRequiredAsset:function (manifest, assetBundle, file, cb) {
    if (file) {
      if (!this.isFileInPaths(file)) {
        cb(new Error('File must be inside one of the asset roots'));
      } else {
        // Add an asset entry for the file if it hasn't been found before
        if (!assetBundle.hasAsset(file)) {
          assetBundle.addAsset(this.pathForFile(file), file);
        }
        // Add requirement
        var manifestFilePath = manifest.assetFilePath;
        assetBundle.addRequire(manifestFilePath, file);
        // Check that we didn't introduce a cycle
        try {
          assetBundle.getRequiredFiles(manifestFilePath);
        } catch(e) {
          cb(e);
        }
        // If the required asset is also a manifest, recursively walk it
        if (path.extname(file) === '.mf') {
          this.walkManifest(assetBundle.getAsset(file), assetBundle, cb);
        } else {
          cb();
        }
      }
    } else {
      cb();
    }
  }
};

var SingleManifestWalker = exports.SingleManifestWalker = function SingleManifestWalker(options) {
  this.walker = new ManifestWalker(options);
  this.bundle = options.bundle;
};
SingleManifestWalker.prototype = {
  asOperation: function() {
    return this.execute.bind(this);
  },
  execute: function(asset, cb) {
    if(path.extname(asset.assetFilePath) === '.mf') {
      this.walker.walkManifest(asset, this.bundle, cb);
    } else {
      cb(null, asset);
    }
  }
};
