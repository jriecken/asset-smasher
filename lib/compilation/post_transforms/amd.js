/**
 * AMD support
 *
 * - Wrap files that follow CommonJS and contain an @amd pragma comment in them with AMD module
*  - Give anonymous/simplified commonjs define calls module ids/dependency arrays
 */
var path = require('path');
var _ = require('underscore');

function getRequirements(contents) {
  var REQUIRE_RE = /(?:^\s*|[^0-9a-zA-Z_$.\s]\s*)require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  // Always add the CommonJS methods
  var requirements = ['require', 'exports', 'module'];
  // Add any dependencies from require() calls
  var requireMatch;
  while ((requireMatch = REQUIRE_RE.exec(contents)) !== null) {
    requirements.push(requireMatch[2]);
  }
  // Make sure we didn't add a requirement twice
  requirements = _.uniq(requirements);
  return requirements;
}

function getDependencyArrayString(requirements) {
  // Construct the arguments for the AMD define call
  return '[' + _.map(requirements, function (r) {
    return '\'' + r + '\'';
  }).join(',') + ']';
}

var AMD_PRAGMA_RE = /\/\*\*\s+@amd\s+(.*)\s*\*\//;
var SIMPLIFIED_COMMON_JS_RE = /(^\s*|[^0-9a-zA-Z_$.\s]\s*)define\s*\(\s*([0-9a-zA-Z_$])/g;
var ANONYMOUS_AMD_RE = /(^\s*|[^0-9a-zA-Z_$.\s]\s*)define\s*\(\s*([\[\{])/g;

/**
 * Create the Amd processor
 *
 * options
 *  - amd - either a boolean or an object containing any of the following:
 *    - baseLogicalPath - Base logical path will be stripped off the front of all module ids. (default is the empty string - nothing is stripped off)
 *                        E.g. if the logical path is "js/foo/bar/baz.js" and baseLogicalPath is "js", the computed module id will be "foo/ba/baz"
 */
var Amd = module.exports = function Amd(options) {
  var amd = options.amd;
  this.enabled = !!amd;
  if (this.enabled) {
    amd = _.defaults(_.isObject(amd) ? amd : {}, {
      baseLogicalPath: ''
    });
    this.baseLogicalPath = amd.baseLogicalPath;
  }
};
Amd.prototype = {
  transform:function (asset, cb) {
    var logicalName = asset.logicalName;
    var logicalPath = asset.logicalPath;
    if (this.enabled && path.extname(logicalName) === '.js') {
      var moduleDir = path.relative(this.baseLogicalPath, path.dirname(logicalPath));
      var moduleId =  (moduleDir ? moduleDir + '/' : '') + path.basename(logicalPath, '.js');
      var contents = asset.contents;
      if (Buffer.isBuffer(contents)) {
        contents = contents.toString('utf-8');
      }
      // Only wrap if the file contains the AMD pragma
      var match = AMD_PRAGMA_RE.exec(contents);
      if (match) {
        // Find require() calls
        requirements = getRequirements(contents);
        // Add any additional dependencies defined in the pragma
        var additionalReqs = match[1];
        if (additionalReqs) {
          requirements = requirements.concat(_.map(additionalReqs.split(','), function (d) {
            return d.trim();
          }));
        }
        // Make sure we didn't add a requirement twice
        var requirements = _.uniq(requirements);

        var dependencies = getDependencyArrayString(requirements);
        // Construct the AMD wrapper
        var prefix = 'define(\''+moduleId+'\', ' + dependencies + ', function(require, exports, module) {\n';
        var postfix = '\n});\n';
        asset.contents = prefix + contents + postfix;
      } else {
        // Look for "simplified CommonJS wrapper" define call, look for what's 'require'd, and give it a module id and dependencies
        if (SIMPLIFIED_COMMON_JS_RE.test(contents)) {
          // Find require() calls and construct the dependency string
          var deps = getDependencyArrayString(getRequirements(contents));
          asset.contents = contents.replace(SIMPLIFIED_COMMON_JS_RE, '$1define(\'' + moduleId + '\', '+ deps + ', $2');
          // Look for "normal" anonymous define call and give it a module id
        } else if (ANONYMOUS_AMD_RE.test(contents)) {
          asset.contents = contents.replace(ANONYMOUS_AMD_RE, '$1define(\'' + moduleId + '\', $2');
        }
      }
    }
    cb();
  },
  priority:1
};