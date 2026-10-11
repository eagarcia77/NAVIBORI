# NAVIBORI — Merchant Journey Integration

`MerchantJourney` combines `CommerceDiscovery` and `NavigationSession` without making location requests automatically.

## User interface integration
1. Obtain foreground geolocation only after the user requests nearby businesses or navigation.
2. Call `journey.findNearby(position)` and show verified results in an accessible list and map pins.
3. When the user taps a merchant, call `journey.chooseCommerce(id)`.
4. Present merchant details and a **Directions** button.
5. Let the user select `driving`, `walking`, `cycling` or `scooter` with `journey.setTransportMode(mode)`.
6. Call `journey.navigateToSelected()` only after explicit confirmation.
7. Show loading, route error, GPS denied and offline states clearly; never simulate successful navigation.
8. Call `journey.stop()` when navigation ends.

## Release blockers
- Implement real same-origin merchant and directions APIs with verified data.
- Connect the module to the deployed app's actual frontend and MapLibre instance.
- Confirm provider-specific transport support; do not claim scooter-safe routes without validation.
- Run CI and test in real Puerto Rico driving, walking and cycling scenarios.
- Validate iPhone Safari GPS permissions and lifecycle behavior.
- Deploy to the correct Render service after the workspace/service is confirmed.
