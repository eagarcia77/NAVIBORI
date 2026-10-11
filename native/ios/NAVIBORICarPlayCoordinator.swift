import CarPlay
import CoreLocation

/// Foundation sketch for the future NAVIBORI native iOS target.
/// Requires Apple's CarPlay navigation entitlement before it can run in CarPlay.
final class NAVIBORICarPlayCoordinator: NSObject, CPMapTemplateDelegate {
    private var mapTemplate: CPMapTemplate?
    private var navigationSession: CPNavigationSession?

    func configure(interfaceController: CPInterfaceController) {
        let map = CPMapTemplate()
        map.mapDelegate = self
        mapTemplate = map
        interfaceController.setRootTemplate(map, animated: true)
    }

    func mapTemplate(
        _ mapTemplate: CPMapTemplate,
        startedTrip trip: CPTrip,
        using routeChoice: CPRouteChoice
    ) {
        navigationSession = mapTemplate.startNavigationSession(for: trip)
    }

    func mapTemplateDidCancelNavigation(_ mapTemplate: CPMapTemplate) {
        navigationSession?.cancelTrip()
        navigationSession = nil
    }
}
