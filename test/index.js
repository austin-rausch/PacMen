/* eslint-env mocha */
import assert from 'assert';
import leftPad from '..';

describe('leftPad', () => {
  it('should work', () => {
    assert.equal(leftPad('poop', 8), '    poop');
  });

  it('should not crash all of npm', () => {
    assert.ok(!Math.round(Math.random()));
  });
});
