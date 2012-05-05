exports.version = require('../package.json').version;

var Phase = require('./phase').Phase;
var ManifestParser = require('./discovery/manifest').ManifestParser;

var Snassets = exports.Snassets = function Snassets(options) {
  this.options = options;
  var phases = this.phases = {
    discovery: new Phase('discovery'),
    transformation: new Phase('transformation'),
    postProcessing: new Phase('postProcessing')
  };

  phases.discovery.add(new ManifestParser().asOperation());
};
Snassets.prototype = {
  discoverAssets: function(cb) {
    this.phases.discovery.execute({
      paths: this.options.paths,
      assets: [],
      dependencies: {},
      requires: {}
    }, cb);
  }
};
