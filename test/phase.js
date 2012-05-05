/*global describe: false, it: false, should: false*/
var Phase = require('../lib/phase').Phase;

describe('Phase', function () {

  describe('Initializing', function () {
    it('should have a name', function () {
      var p = new Phase('test');
      p.name.should.equal('test');
    });
  });

  describe('Adding operations', function () {
    it('should only add functions', function () {
      var p = new Phase('test');
      try {
        p.add('foo');
        should.fail('Expected error');
      } catch (e) {
        e.message.should.equal('Op must be a function');
      }
    });
    it('should allow ops to be added', function () {
      var p = new Phase('test');
      p.add(function one() {
      });
      p.ops.length.should.equal(1);
      p.add(function two() {
      });
      p.ops.length.should.equal(2);
    });
    it('should allow ops to be added at specific location', function () {
      var fns = [
        function () {
        },
        function () {
        },
        function () {
        },
        function () {
        }
      ];
      var p = new Phase('test');
      p.add(fns[0]);
      p.add(fns[1], 0);
      p.ops[0].should.equal(fns[1]);
      p.add(fns[2]);
      p.ops[2].should.equal(fns[2]);
      p.add(fns[3], 1);
      p.ops[1].should.equal(fns[3]);
      p.ops[3].should.equal(fns[2]);
    });
  });

  describe('Removing operations', function () {
    it('should not remove nonexistent items', function () {
      var p = new Phase('test');
      p.add(function one() {
      });
      p.add(function two() {
      });
      p.ops.length.should.equal(2);

      p.remove(function () {
      });
      p.ops.length.should.equal(2);
    });
    it('should allow items to be removed', function () {
      var fns = [
        function () {
        },
        function () {
        },
        function () {
        },
        function () {
        }
      ];
      var p = new Phase('test');
      p.add(fns[0]);
      p.add(fns[1]);
      p.ops.length.should.equal(2);
      p.remove(fns[1]);
      p.ops.length.should.equal(1);
      p.ops.indexOf(fns[1]).should.equal(-1);
    });
  });

  describe('Executing', function () {
    it('should execute functions in order', function (done) {
      var p = new Phase('test');
      p.add(function (data, cb) {
        data.foo = 12;
        cb(null, data);
      });
      p.add(function (data, cb) {
        data.bar = data.foo + 24;
        cb(null, data);
      });
      p.add(function (data, cb) {
        data.baz = data.bar + data.foo;
        cb(null, data);
      });

      p.execute({
        test:'hello world'
      }, function (e, data) {
        data.foo.should.equal(12);
        data.bar.should.equal(36);
        data.baz.should.equal(48);
        done();
      });
    });
  });

  describe('Events', function () {
    it('should emit the right events', function (done) {
      var emitted = [];
      var p = new Phase('test');
      p.on('add', function () {
        emitted.push('add');
      });
      p.on('remove', function () {
        emitted.push('remove');
      });
      p.on('startExecute', function () {
        emitted.push('startExecute');
      });
      p.on('finishExecute', function () {
        emitted.push('finishExecute');
      });

      p.add(function (data, cb) {
        cb(null, data);
      });
      p.add(function (data, cb) {
        cb(null, data);
      });
      p.add(function (data, cb) {
        cb(null, data);
      });
      p.remove(0);
      p.remove(10);
      p.execute({}, function () {
        emitted.should.eql(['add', 'add', 'add', 'remove', 'startExecute', 'finishExecute']);
        done();
      });
    });
  });
});