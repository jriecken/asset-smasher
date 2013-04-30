/**
 *
 *  This operation processes manifest (.mf) files and determines the files that
 *  assets that are required by it
 *
 *  Supports the following directives:
 *
 *    require "foo" - require a single asset - if the path is not relative/absolute
 *                    will try to find the file in any of the asset roots.
 *    require_dir "foo" - require all the files in a directory.  Path must be relative/absolute
 *    require_tree "foo" - recursively require all the files in a directory.  Path must be relative/absolute
 *
 *  Options:
 *   - paths - The configured asset paths
 *   - extensions - The file extensions to look for (in require_dir and require_tree)
 *
 */
var async = require('async');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var _ = require('underscore');

// Use setImmediate if available
var setImmediateCompat = global.setImmediate || process.nextTick;
// Get "exists" from the right place
var existsCompat = fs.exists || path.exists;

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
  asSingleOperation:function (bundle) {
    var self = this;
    return function(asset, cb) {
      if (asset.isManifest()) {
        self.processManifest(asset, bundle, cb);
      } else {
        cb(null, asset);
      }
    };
  },
  execute:function (assetBundle, cb) {
    var self = this;
    async.eachSeries(assetBundle.getAllAssets(), function (asset, eachCb) {
      setImmediateCompat(function () {
        if (asset.isManifest()) {
          self.processManifest(asset, assetBundle, eachCb);
        } else {
          eachCb();
        }
      });
    }, function (e) {
      cb(e, assetBundle);
    });
  },
  processManifest:function (manifest, assetBundle, cb) {
    var self = this;
    manifest.getAssetFileStats(function (e, stats) {
      if (e) {
        cb(e);
      } else {
        if (stats.isDirectory()) {
          self.autoManifestDir(manifest, assetBundle, cb);
        } else {
          self.walkManifest(manifest, assetBundle, cb);
        }
      }
    });
  },
  autoManifestDir:function (manifest, assetBundle, cb) {
    // Require all of the files inside of the manifest directory
    this.require_tree(manifest, assetBundle, './' + path.basename(manifest.assetFilePath), cb);
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
        async.eachSeries(contents.split('\n'), function (line, eachCb) {
          setImmediateCompat(function() {
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
            } else {
              eachCb();
            }
          });
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
      async.eachSeries(this.paths, function (p, eachCb) {
        setImmediateCompat(function () {
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
        existsCompat(dir, function (exists) {
          if (exists) {
            fs.readdir(dir, wfCb);
          } else {
            wfCb(null, []);
          }
        });
      },
      function (files, wfCb) {
        async.eachSeries(files, function (f, eachCb) {
          setImmediateCompat(function () {
            var filePath = path.join(dirPath, f);
            var extn = path.extname(f);
            if (filePath !== manifestFilePath && _.contains(self.extensions, extn)) {
              self.registerRequiredAsset(manifest, assetBundle, filePath, eachCb);
            } else {
              eachCb();
            }
          });
        }, wfCb);
      }
    ], cb);
  },
  require_tree:function (manifest, assetBundle, file, cb) {
    var manifestFilePath = manifest.assetFilePath;
    var dirPath;
    var self = this;
    async.waterfall([
      function (wfCb) {
        self.resolveDir(file, path.dirname(manifestFilePath), wfCb);
      },
      function (dir, wfCb) {
        dirPath = dir;
        glob(path.join(dir, '**/*.*'), wfCb);
      },
      function (files, wfCb) {
        async.eachSeries(files, function (f, eachCb) {
          setImmediateCompat(function () {
            var extn = path.extname(f);
            if (f !== manifestFilePath && _.contains(self.extensions, extn)) {
              self.registerRequiredAsset(manifest, assetBundle, f, eachCb);
            } else {
              eachCb();
            }
          });
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
        existsCompat(fileDir, function (exists) {
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
        async.eachSeries(files, function (f, eachCb) {
          setImmediateCompat(function () {
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
          });
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
        } catch (e) {
          cb(e);
        }
        // If the required asset is also a manifest, recursively walk it
        if (path.extname(file) === '.mf') {
          this.processManifest(assetBundle.getAsset(file), assetBundle, cb);
        } else {
          cb();
        }
      }
    } else {
      cb();
    }
  }
};
