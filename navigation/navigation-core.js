/**
 * NAVIBORI Navigation Core v2
 * Framework-independent browser GPS tracker.
 * Routing, map matching, and turn instructions must be supplied by a routing provider.
 */
export class NavigationTracker {
  constructor({ onPosition = () => {}, onStatus = () => {}, onDeviation = () => {}, route = [], deviationMeters = 55 } = {}) {
    this.onPosition = onPosition;
    this.onStatus = onStatus;
    this.onDeviation = onDeviation;
    this.route = [];
    this.setRoute(route);
    if (!Number.isFinite(deviationMeters) || deviationMeters <= 0) throw new RangeError("deviationMeters must be positive");
    this.deviationMeters = deviationMeters;
    this.watchId = null;
    this.lastPosition = null;
    this.lastDeviationAt = 0;
  }
  static distanceMeters(a, b) {
    const rad = Math.PI / 180, lat1 = a.lat * rad, lat2 = b.lat * rad;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }
  static distanceToSegmentMeters(p, a, b) {
    const rad = Math.PI / 180, scale = 6371000 * rad, cos = Math.cos(p.lat * rad);
    const ax = (a.lng - p.lng) * cos * scale, ay = (a.lat - p.lat) * scale;
    const bx = (b.lng - p.lng) * cos * scale, by = (b.lat - p.lat) * scale;
    const dx = bx - ax, dy = by - ay, denom = dx * dx + dy * dy;
    const t = denom ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denom)) : 0;
    return Math.hypot(ax + t * dx, ay + t * dy);
  }
  setRoute(points) {
    if (!Array.isArray(points) || !points.every(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)) {
      throw new TypeError("Route must be an array of {lat,lng} coordinates");
    }
    this.route = points;
    this.lastDeviationAt = 0;
  }
  start() {
    if (this.watchId !== null) return;
    if (!globalThis.isSecureContext || !navigator.geolocation) {
      this.onStatus({ type: "unavailable", message: "GPS requires HTTPS and browser geolocation support" });
      return;
    }
    this.onStatus({ type: "acquiring" });
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        const c = pos.coords;
        const point = { lat: c.latitude, lng: c.longitude, accuracyMeters: c.accuracy,
          headingDegrees: Number.isFinite(c.heading) ? c.heading : null,
          speedMps: Number.isFinite(c.speed) ? c.speed : null, timestamp: pos.timestamp };
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180 || !Number.isFinite(point.accuracyMeters) || point.accuracyMeters < 0) {
          this.onStatus({ type: "invalid-fix" });
          return;
        }
        if (point.timestamp > Date.now() + 5000 || Date.now() - point.timestamp > 15000) {
          this.onStatus({ type: "stale-fix" });
          return;
        }
        this.lastPosition = point;
        this.onPosition(point);
        this.onStatus({ type: "tracking", accuracyMeters: c.accuracy });
        if (this.route.length < 2 || c.accuracy > 45) return;
        let nearest = Infinity;
        for (let i = 1; i < this.route.length; i++) {
          nearest = Math.min(nearest, NavigationTracker.distanceToSegmentMeters(point, this.route[i - 1], this.route[i]));
        }
        const now = Date.now();
        if (nearest > Math.max(this.deviationMeters, c.accuracy * 2) && now - this.lastDeviationAt > 15000) {
          this.lastDeviationAt = now;
          this.onDeviation({ position: point, distanceMeters: nearest });
        }
      },
      err => {
        const types = { 1: "permission-denied", 2: "position-unavailable", 3: "timeout" };
        if (err.code === 1) this.stop();
        this.onStatus({ type: types[err.code] || "error", message: err.message });
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );
  }
  stop() {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.onStatus({ type: "stopped" });
  }
}
export function preferredNavigationLanguage() {
  return (navigator.languages?.[0] || navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
}
