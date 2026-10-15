import UIKit
import CarPlay
import MapKit
import Combine
import CoreLocation

/// Navigation-category CarPlay scene: the map is drawn inside CPWindow,
/// while all driver interactions use approved CarPlay templates.
@MainActor
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate, CPMapTemplateDelegate {
    private weak var interfaceController: CPInterfaceController?
    private var carWindow: CPWindow?
    private var mapTemplate: CPMapTemplate?
    private var mapView: MKMapView?
    private var cancellables = Set<AnyCancellable>()
    private var routeTask: Task<Void, Never>?
    private var pendingRoute: NAVRoute?
    private var pendingTrip: CPTrip?
    private var activeDestination: NAVDestination?
    private var navigationSession: CPNavigationSession?
    private var currentManeuver: CPManeuver?
    private var currentManeuverIndex: Int = -1
    private var wrongWayFixes = 0
    private var lastReplan = Date.distantPast

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        self.interfaceController = interfaceController
        self.carWindow = window

        let controller = UIViewController()
        let map = MKMapView(frame: .zero)
        map.showsUserLocation = true
        map.userTrackingMode = .followWithHeading
        map.pointOfInterestFilter = .excludingAll
        controller.view = map
        window.rootViewController = controller
        window.makeKeyAndVisible()
        mapView = map

        let template = CPMapTemplate()
        template.mapDelegate = self
        template.leadingNavigationBarButtons = [
            CPBarButton(title: "Destinos", handler: { [weak self] _ in
                self?.showDestinationList()
            })
        ]
        template.trailingNavigationBarButtons = [
            CPBarButton(title: "GPS", handler: { [weak self] _ in
                self?.recenter()
            }),
            CPBarButton(title: "Finalizar", handler: { [weak self] _ in
                self?.stopNavigation()
            })
        ]
        mapTemplate = template
        interfaceController.setRootTemplate(template, animated: false, completion: nil)

        LocationTracker.shared.requestAccess()
        LocationTracker.shared.$latestLocation
            .compactMap { $0 }
            .sink { [weak self] location in self?.updateGuidance(location: location) }
            .store(in: &cancellables)

        NAVStore.shared.$selectedDestination
            .dropFirst()
            .compactMap { $0 }
            .sink { [weak self] destination in
                self?.prepareRoute(to: destination)
            }
            .store(in: &cancellables)

        Task { [weak self] in
            await NAVStore.shared.refresh()
            guard let self else { return }
            if let selected = NAVStore.shared.selectedDestination {
                self.prepareRoute(to: selected)
            }
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        stopNavigation()
        routeTask?.cancel()
        cancellables.removeAll()
        mapTemplate = nil
        mapView = nil
        carWindow = nil
        self.interfaceController = nil
    }

    private func showDestinationList() {
        guard let controller = interfaceController else { return }
        Task { [weak self] in
            await NAVStore.shared.refresh()
            guard let self, self.interfaceController === controller else { return }

            // The phone can supply a real MapKit search destination. Never list mock data.
            var destinations = NAVStore.shared.verifiedDestinations
            if let selected = NAVStore.shared.selectedDestination,
               selected.isInPuertoRico, !destinations.contains(where: { $0.id == selected.id }) {
                destinations.insert(selected, at: 0)
            }

            let items: [CPListItem]
            if destinations.isEmpty {
                let empty = CPListItem(
                    text: "No hay destinos verificados",
                    detailText: "Busca un lugar real desde el iPhone"
                )
                empty.isEnabled = false
                items = [empty]
            } else {
                items = Array(destinations.prefix(40)).map { destination in
                    let item = CPListItem(text: destination.name, detailText: destination.address)
                    item.handler = { [weak self] _, done in
                        self?.prepareRoute(to: destination)
                        done()
                    }
                    return item
                }
            }

            let list = CPListTemplate(title: "NAVIBORI · Destinos", sections: [
                CPListSection(items: items)
            ])
            controller.pushTemplate(list, animated: true, completion: nil)
        }
    }

    private func prepareRoute(to destination: NAVDestination) {
        guard destination.isInPuertoRico else {
            showAlert("Solo rutas dentro de Puerto Rico")
            return
        }
        guard let origin = LocationTracker.shared.latestLocation else {
            LocationTracker.shared.requestAccess()
            showAlert("Activa ubicación precisa en el iPhone para calcular la ruta.")
            return
        }
        // Never reuse directions to a previous destination.
        routeTask?.cancel()
        activeDestination = destination
        pendingTrip = nil
        pendingRoute = nil

        routeTask = Task { [weak self] in
            do {
                let result = try await NAVClient.drivingRoute(from: origin, to: destination)
                guard !Task.isCancelled, let self,
                      self.activeDestination?.id == destination.id else { return }
                self.pendingRoute = result
                self.drawRoute(result)

                let from = MKMapItem(placemark: MKPlacemark(coordinate: origin.coordinate))
                from.name = "Mi ubicación"
                let to = MKMapItem(placemark: MKPlacemark(coordinate: destination.coordinate))
                to.name = destination.name
                let choice = CPRouteChoice(
                    summaryVariants: ["Ruta NAVIBORI"],
                    additionalInformationVariants: ["En carro"],
                    selectionSummaryVariants: ["A \(destination.name)"])
                let trip = CPTrip(origin: from, destination: to, routeChoices: [choice])
                trip.userInfo = destination.id
                self.pendingTrip = trip
                let estimates = CPTravelEstimates(
                    distanceRemaining: Measurement(value: result.distanceMeters, unit: UnitLength.meters),
                    timeRemaining: result.durationSeconds)
                self.mapTemplate?.updateEstimates(estimates, for: trip)
                let copy = CPTripPreviewTextConfiguration(
                    startButtonTitle: "Iniciar",
                    additionalRoutesButtonTitle: nil,
                    overviewButtonTitle: nil)
                self.interfaceController?.popToRootTemplate(animated: false, completion: nil)
                self.mapTemplate?.showTripPreviews([trip], textConfiguration: copy)
            } catch {
                guard !Task.isCancelled, let self else { return }
                self.showAlert("No se pudo calcular la ruta de NAVIBORI. Reintenta desde Destinos.")
            }
        }
    }

    private func drawRoute(_ route: NAVRoute) {
        guard let map = mapView else { return }
        map.removeOverlays(map.overlays)
        let coordinates = route.geometry.points
        guard coordinates.count > 1 else { return }
        let polyline = MKPolyline(coordinates: coordinates, count: coordinates.count)
        map.addOverlay(polyline)
        map.setVisibleMapRect(polyline.boundingMapRect,
                              edgePadding: UIEdgeInsets(top: 65, left: 30, bottom: 100, right: 30),
                              animated: true)
        map.delegate = self
    }

    private func recenter() {
        guard let map = mapView else { return }
        map.userTrackingMode = .followWithHeading
        if let location = LocationTracker.shared.latestLocation {
            map.setRegion(MKCoordinateRegion(
                center: location.coordinate,
                latitudinalMeters: 1200, longitudinalMeters: 1200), animated: true)
        }
    }

    func mapTemplate(_ mapTemplate: CPMapTemplate, startedTrip trip: CPTrip, using routeChoice: CPRouteChoice) {
        guard let prepared = pendingTrip, trip === prepared,
              pendingRoute != nil else {
            showAlert("Debes calcular una ruta real antes de comenzar.")
            return
        }
        navigationSession?.cancelTrip()
        navigationSession = mapTemplate.startNavigationSession(for: trip)
        currentManeuver = nil
        currentManeuverIndex = -1
        wrongWayFixes = 0
        lastReplan = Date()
        recenter()
        if let location = LocationTracker.shared.latestLocation {
            updateGuidance(location: location)
        }
    }

    func mapTemplateDidCancelNavigation(_ mapTemplate: CPMapTemplate) {
        stopNavigation()
    }

    private func updateGuidance(location: CLLocation) {
        guard let route = pendingRoute, let session = navigationSession,
              let trip = pendingTrip else { return }
        let progress = Self.projectProgress(on: route.geometry.points, from: location.coordinate)
        guard progress.ratio.isFinite else { return }

        if progress.offRouteMeters > 85 {
            wrongWayFixes += 1
        } else {
            wrongWayFixes = 0
        }
        // Safety: stop stale guidance, recalculate and ask user to confirm a new trip.
        if wrongWayFixes >= 3, Date().timeIntervalSince(lastReplan) > 25,
           let destination = activeDestination {
            lastReplan = Date()
            wrongWayFixes = 0
            session.cancelTrip()
            navigationSession = nil
            prepareRoute(to: destination)
            return
        }

        let remainingDistance = max(0, route.distanceMeters * (1 - progress.ratio))
        if remainingDistance < 35 && progress.offRouteMeters < 35 {
            session.finishTrip()
            navigationSession = nil
            mapView?.removeOverlays(mapView?.overlays ?? [])
            return
        }

        let remainingSeconds = max(0, route.durationSeconds * (1 - progress.ratio))
        let totalEstimates = CPTravelEstimates(
            distanceRemaining: Measurement(value: remainingDistance, unit: UnitLength.meters),
            timeRemaining: remainingSeconds)
        mapTemplate?.updateEstimates(totalEstimates, for: trip)

        // The server uses OSRM/Valhalla step distances. Update the upcoming
        // instruction with real traveled distance; no simulated progress.
        let traveled = route.distanceMeters - remainingDistance
        let steps = route.steps
        guard !steps.isEmpty else { return }

        var stepIndex = steps.count - 1
        var cumulative = 0.0
        for (index, step) in steps.enumerated() {
            cumulative += max(0, step.distanceMeters)
            if cumulative >= traveled {
                stepIndex = min(index + 1, steps.count - 1)
                break
            }
        }
        let next = steps[stepIndex]
        if stepIndex != currentManeuverIndex || currentManeuver == nil {
            let maneuver = CPManeuver()
            maneuver.instructionVariants = [next.instruction]
            maneuver.initialTravelEstimates = CPTravelEstimates(
                distanceRemaining: Measurement(value: max(0, next.distanceMeters), unit: UnitLength.meters),
                timeRemaining: max(0, next.durationSeconds))
            session.upcomingManeuvers = [maneuver]
            currentManeuver = maneuver
            currentManeuverIndex = stepIndex
        }
        if let maneuver = currentManeuver {
            let maneuverEstimate = CPTravelEstimates(
                distanceRemaining: Measurement(value: max(0, next.distanceMeters), unit: UnitLength.meters),
                timeRemaining: max(0, next.durationSeconds))
            session.updateEstimates(maneuverEstimate, for: maneuver)
        }
    }

    private func stopNavigation() {
        routeTask?.cancel()
        routeTask = nil
        navigationSession?.cancelTrip()
        navigationSession = nil
        pendingRoute = nil
        pendingTrip = nil
        activeDestination = nil
        currentManeuver = nil
        currentManeuverIndex = -1
        mapTemplate?.hideTripPreviews()
        if let map = mapView { map.removeOverlays(map.overlays) }
    }

    private func showAlert(_ message: String) {
        guard let controller = interfaceController else { return }
        let dismiss = CPAlertAction(title: "OK", style: .default, handler: { _ in })
        let alert = CPAlertTemplate(titleVariants: [message], actions: [dismiss])
        controller.presentTemplate(alert, animated: true, completion: nil)
    }

    /// Fraction along the nearest physical segment; off-route distance in meters.
    private static func projectProgress(
        on path: [CLLocationCoordinate2D],
        from point: CLLocationCoordinate2D
    ) -> (ratio: Double, offRouteMeters: Double) {
        guard path.count > 1 else { return (0, .infinity) }
        let scaleX = 111_195.0 * cos(point.latitude * .pi / 180)
        let scaleY = 111_195.0
        func xy(_ p: CLLocationCoordinate2D) -> (x: Double, y: Double) {
            ((p.longitude - point.longitude) * scaleX,
             (p.latitude - point.latitude) * scaleY)
        }
        let projected = path.map(xy)
        var total = 0.0
        var cumulative = 0.0
        var bestDistance = Double.infinity
        var nearestDistanceAlong = 0.0
        for i in 1..<projected.count {
            let a = projected[i - 1], b = projected[i]
            let dx = b.x - a.x, dy = b.y - a.y
            let length = hypot(dx, dy)
            guard length > 0 else { continue }
            let fraction = max(0, min(1, -(a.x * dx + a.y * dy) / (length * length)))
            let distance = hypot(a.x + fraction * dx, a.y + fraction * dy)
            if distance < bestDistance {
                bestDistance = distance
                nearestDistanceAlong = cumulative + fraction * length
            }
            cumulative += length
            total += length
        }
        return (total > 0 ? min(1, nearestDistanceAlong / total) : 0, bestDistance)
    }
}

// Apple CarPlay does not permit custom touch controls directly on the map.
// The MKMapView is only a visual layer behind the CPMapTemplate.
extension CarPlaySceneDelegate: MKMapViewDelegate {
    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        guard let polyline = overlay as? MKPolyline else {
            return MKOverlayRenderer(overlay: overlay)
        }
        let renderer = MKPolylineRenderer(polyline: polyline)
        renderer.strokeColor = UIColor(red: 0.0, green: 0.55, blue: 0.83, alpha: 1.0)
        renderer.lineWidth = 7
        return renderer
    }
}
