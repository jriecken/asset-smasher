var path = require('path');
var util = require('util');
var _ = require('underscore');
var Transform = require('./transform').Transform;
var dust;

/**
 * Transform that takes Dust templates and returns compiled javascript versions of them
 */
var DustTransform = module.exports = function DustTransform() {
  Transform.call(this);
  if (!dust) {
    try {
      dust = require('dustjs-linkedin');
    } catch (e) {
      try {
        dust = require('dustjs');
      } catch (e) {
        throw new Error('dust could not be found');
      }
    }
  }
};
util.inherits(DustTransform, Transform);
_.extend(DustTransform.prototype, {
  shouldTransform:function (file) {
    return path.extname(file) === '.dust';
  },
  transformedFileName:function (file) {
    return path.basename(file, '.dust') + '.js';
  },
  transform:function (asset, cb) {
    // Transform the file name
    asset.logicalName = this.transformedFileName(asset.logicalName);
    // Compute the name for the template (logical name minus the .dust/.js)
    var logicalPath = asset.logicalPath;
    var templateName = path.join(path.dirname(logicalPath), path.basename(logicalPath, '.js'));
    // Get the contents
    var contents = asset.contents;
    if (Buffer.isBuffer(contents)) {
      contents = contents.toString('utf-8');
    }
    // Compile the contents
    try {
      asset.contents = dust.compile(contents, templateName);
      cb(null, asset);
    } catch (e) {
      cb(e);
    }
  }
});