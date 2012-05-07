var Transform = exports.Transform = function () {
};
Transform.prototype = {
  shouldTransform:function (file) {
    return false;
  },
  transformedFileName:function (file) {
    return file;
  },
  transform:function (asset, cb) {
    cb(null, asset);
  }
};