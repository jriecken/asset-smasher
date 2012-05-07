var async = require('async');
var _ = require('underscore');

var ManifestParser = exports.ManifestParser = function () {

};

ManifestParser.prototype = {
  asOperation:function () {
    return this.execute.bind(this);
  },
  execute:function (data, cb) {
    var paths = data.paths;
    var assets = data.assets;
    var dependencies = data.dependencies;
    var requires = data.requires;
    console.log(paths, assets, dependencies, requires);

    assets.push('foo/bar');
    dependencies['foo/bar'] = ['baz/qux'];
    requires['foo/bar'] = ['baz/qux'];
    cb(null, data);
  }
};