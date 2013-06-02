/**
 * Wrap JS files in AMD 'define' call
 */
var path = require('path');
var _ = require('underscore');

var AmdWrapper = module.exports = function AmdWrapper(options) {
  this.options = options;
};
AmdWrapper.prototype = {
  transform:function (asset, cb) {
    var AMD_PRAGMA_RE = /\/\*\*\s+@amd\s+(.*)\s*\*\//;
    var REQUIRE_RE = /(?:^|\s)require\((['"])([^'"]+)\1\)/g;

    var logicalName = asset.logicalName;
    var logicalPath = asset.logicalPath;
    if (path.extname(logicalName) === '.js') {
      var contents = asset.contents;
      if (Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      // Only wrap if the file contains the AMD pragma
      var match = AMD_PRAGMA_RE.exec(contents);
      if (match) {
        // Always add the CommonJS methods
        var requirements = ['require', 'exports', 'module'];
        // Add any additional dependencies defined in the pragma
        var additionalReqs = match[1];
        if (additionalReqs) {
          requirements = requirements.concat(_.map(additionalReqs.split(','), function (d) {
            return d.trim();
          }));
        }
        // Add any dependencies from require() calls
        var requireMatch;
        while ((requireMatch = REQUIRE_RE.exec(contents)) !== null) {
          requirements.push(requireMatch[2]);
        }
        // Make sure we didn't add a requirement twice
        requirements = _.uniq(requirements);
        // Construct the arguments for the AMD define call
        var dependencies = '[' + _.map(requirements, function (r) {
          return '\'' + r + '\'';
        }).join(',') + ']';
        var args = _.map(requirements, function (r) {
          return path.basename(r);
        }).join(',');
        // Construct the AMD wrapper
        var moduleId = path.dirname(logicalPath) + '/' + path.basename(logicalPath, '.js');
        var prefix = 'define(\''+moduleId+'\', ' + dependencies + ', function(' + args + ') {\n';
        var postfix = '\n});\n';
        asset.contents = prefix + contents + postfix;
      }
    }
    cb();
  },
  priority:1
};