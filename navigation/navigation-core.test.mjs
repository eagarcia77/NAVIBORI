import test from "node:test";
import assert from "node:assert/strict";
import { NavigationTracker } from "./navigation-core.js";

test("distance returns zero for same coordinate", () => {
  assert.equal(NavigationTracker.distanceMeters({lat:18,lng:-66},{lat:18,lng:-66}),0);
});
test("segment distance is near zero on a straight segment", () => {
  assert.ok(NavigationTracker.distanceToSegmentMeters({lat:18.0005,lng:-66},{lat:18,lng:-66},{lat:18.001,lng:-66}) < 1);
});
test("segment distance detects a 100m departure", () => {
  const d = NavigationTracker.distanceToSegmentMeters({lat:18.0005,lng:-65.999},{lat:18,lng:-66},{lat:18.001,lng:-66});
  assert.ok(d > 90 && d < 120);
});
test("invalid coordinates are rejected", () => {
  const t = new NavigationTracker();
  assert.throws(() => t.setRoute([{lat:91,lng:0}]), TypeError);
  assert.throws(() => t.setRoute([{lat:18,lng:181}]), TypeError);
  assert.throws(() => t.setRoute([null]), TypeError);
});
test("negative deviation threshold is rejected", () => {
  assert.throws(() => new NavigationTracker({deviationMeters:-1}), RangeError);
});
test("route can be replaced", () => {
  const t = new NavigationTracker();
  t.setRoute([{lat:18,lng:-66},{lat:18.1,lng:-66.1}]);
  assert.equal(t.route.length,2);
});
