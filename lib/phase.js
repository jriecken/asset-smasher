var async = require('async');
var events = require('events');
var _ = require('underscore');
var util = require('util');

/**
 * A phase.  Contains a set of functions to be applied
 * one after the other on a piece of data
 *
 * @param name The name of the phase.
 */
var Phase = exports.Phase = function (name) {
  events.EventEmitter.call(this);

  this.name = name;
  this.ops = [];
};
util.inherits(Phase, events.EventEmitter);

_.extend(Phase.prototype, {
  add:function (op, at) {
    if (typeof op !== 'function') {
      throw new Error('Op must be a function');
    }
    this.ops.splice(at !== undefined ? at : this.ops.length, 0, op);
    this.emit('add', this, op, at);
  },
  remove:function (op) {
    var idx = typeof op === 'function' ? this.ops.indexOf(op) : op;
    if (idx >= 0 && idx < this.ops.length) {
      this.ops.splice(idx, 1);
      this.emit('remove', this, op, idx);
    }
  },
  execute:function (data, cb) {
    this.emit('startExecute', this, data);
    var ops = [function (cb) {
      cb(null, data);
    }];
    Array.prototype.push.apply(ops, this.ops);
    var self = this;
    async.waterfall(ops, function (e, data) {
      if (e) {
        cb(e);
      } else {
        self.emit('finishExecute', self, data);
        cb(null, data);
      }
    });
  }
});