# iPhone navigation UI audit — October 2026

## Evidence from supplied screenshot
- Safari iPhone address bar shows navibori.onrender.com.
- Map fills the viewport but top maneuver and bottom controls occupy significant map area.
- English labels ("Turn left", "Remaining", "Following", "End") appear in a Spanish-market app.
- Merchant/navigation subtitle includes "Demo"; a demo must never be represented as live GPS.
- Speed displays an unknown value; avoid showing a fabricated speed.
- Maneuver distance in feet and remaining route in miles, which can be confusing when switching locale.

## Implementation requirements
1. Render a compact, accessible top maneuver card, with collapsible technical telemetry.
2. Keep a compact bottom trip bar using CSS `env(safe-area-inset-bottom)` and dynamic viewport units `100dvh`; avoid covering Safari controls.
3. Localize every navigation label and spoken maneuver to device language, with an in-app override.
4. Show a prominent demo/live status. Do not display ETA, remaining route or turn prompts as live unless routing and GPS are verified.
5. Default PR navigation units to km/km/h, allow a manual imperial preference.
6. Do not start GPS tracking or promotional alerts until permission/consent is given.
7. Maintain large touch targets and a safe driving interface. Avoid promotional overlays while maneuver instructions are critical.
8. Verify on actual iPhone Safari, Android Chrome, portrait and landscape.

## Integration note
`navigation-presentation.js` supplies labels and formatted state, **not** the actual frontend or GPS engine. Its presence alone does not change the deployed app.
