/*global describe: false, it: false, should: false*/
var path = require('path');
var _ = require('underscore');

var AssetBundle = require('../lib/asset_bundle.js').AssetBundle;
var AssetFinder = require('../lib/discovery/finder').AssetFinder;

var TEST_FILES = path.join(__dirname, '../test_files');

describe('Finder', function () {

  describe('In normal mode', function() {

    it('Should find no files if there are no asset paths', function (done) {
      var finder = new AssetFinder();
      finder.execute(new AssetBundle(), function(e, bundle) {
        _.size(bundle.assets).should.equal(0);
        done();
      });
    });

    it('Should find all files in the provided asset paths', function (done) {
      var finder = new AssetFinder({
        paths: [
          path.join(TEST_FILES, 'dir1'),
          path.join(TEST_FILES, 'dir2')
        ]
      });
      finder.execute(new AssetBundle(), function(e, bundle) {
        _.size(bundle.assets).should.equal(6);
        var logicalPaths = _.pluck(bundle.assets, 'logicalPath');
        _.contains(logicalPaths, 'dir1_one.js.ejs').should.equal(true);
        _.contains(logicalPaths, 'dir1_two.js').should.equal(true);
        _.contains(logicalPaths, 'dir1_three.css.less').should.equal(true);
        _.contains(logicalPaths, 'dir1_four.dust').should.equal(true);
        _.contains(logicalPaths, 'dir2_1/dir2_1_one.js').should.equal(true);
        _.contains(logicalPaths, 'dir2_one.js').should.equal(true);
        done();
      });
    });

  });

  describe('in precompile mode', function () {
    it('Should find no files if there are no asset paths', function (done) {
      var finder = new AssetFinder({
        precompile: ['**/*one.js'],
        precompiling: true
      });
      finder.execute(new AssetBundle(), function(e, bundle) {
        _.size(bundle.assets).should.equal(0);
        done();
      });
    });

    it('Should find only the files to precompile in the provided asset paths', function (done) {
      var finder = new AssetFinder({
        paths: [
          path.join(TEST_FILES, 'dir1'),
          path.join(TEST_FILES, 'dir2')
        ],
        precompile: ['**/*one.*'],
        precompiling: true
      });
      finder.execute(new AssetBundle(), function(e, bundle) {
        _.size(bundle.assets).should.equal(3);
        var logicalPaths = _.pluck(bundle.assets, 'logicalPath');
        _.contains(logicalPaths, 'dir1_one.js.ejs').should.equal(true);
        _.contains(logicalPaths, 'dir1_two.js').should.not.equal(true);
        _.contains(logicalPaths, 'dir1_three.css.less').should.not.equal(true);
        _.contains(logicalPaths, 'dir1_four.dust').should.not.equal(true);
        _.contains(logicalPaths, 'dir2_1/dir2_1_one.js').should.equal(true);
        _.contains(logicalPaths, 'dir2_one.js').should.equal(true);
        done();
      });
    });
  });

});