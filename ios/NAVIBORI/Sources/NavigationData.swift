import Foundation
import Combine
import CoreLocation
import MapKit

struct NAVDestination: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let address: String
    let latitude: Double
    let longitude: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var isInPuertoRico: Bool {
        latitude.isFinite && longitude.isFinite &&
        (17.5...18.7).contains(latitude) && (-67.5 ... -65.0).contains(longitude)
    }
}

struct NAVDestinationsEnvelope: Decodable {
    let destinations: [NAVDestination]
}

struct NAVRouteGeometry: Decodable {
    let type: String
    let coordinates: [[Double]] // Server contract: [longitude, latitude].
    var points: [CLLocationCoordinate2D] {
        guard type == "LineString" else { return [] }
        return coordinates.compactMap { pair in
            guard pair.count == 2, pair[0].isFinite, pair[1].isFinite,
                  (-67.5 ... -65.0).contains(pair[0]),
                  (17.5...18.7).contains(pair[1]) else { return nil }
            return CLLocationCoordinate2D(latitude: pair[1], longitude: pair[0])
        }
    }
}

struct NAVRouteStep: Decodable {
    let instruction: String
    let type: String
    let distanceMeters: Double
    let durationSeconds: Double
}

struct NAVRoute: Decodable {
    let distanceMeters: Double
    let durationSeconds: Double
    let geometry: NAVRouteGeometry
    let steps: [NAVRouteStep]

    var isValid: Bool {
        distanceMeters.isFinite && distanceMeters > 0 &&
        durationSeconds.isFinite && durationSeconds >= 0 &&
        geometry.points.count >= 2
    }
}

enum NAVServiceError: LocalizedError {
    case invalidResponse
    case noValidRoute
    case destinationOutsidePuertoRico

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "NAVIBORI no respondió. Inténtalo nuevamente."
        case .noValidRoute: return "No se encontró una ruta real disponible."
        case .destinationOutsidePuertoRico: return "Esta versión navega únicamente dentro de Puerto Rico."
        }
    }
}

enum NAVClient {
    private static let origin = URL(string: "https://navibori.onrender.com")!

    static func destinations() async throws -> [NAVDestination] {
        var request = URLRequest(url: origin.appendingPathComponent("api/carplay/destinations"))
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 15
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw NAVServiceError.invalidResponse
        }
        return try JSONDecoder().decode(NAVDestinationsEnvelope.self, from: data)
            .destinations.filter(\.isInPuertoRico)
    }

    static func drivingRoute(from location: CLLocation, to destination: NAVDestination) async throws -> NAVRoute {
        guard destination.isInPuertoRico,
              (17.5...18.7).contains(location.coordinate.latitude),
              (-67.5 ... -65.0).contains(location.coordinate.longitude) else {
            throw NAVServiceError.destinationOutsidePuertoRico
        }
        var request = URLRequest(url: origin.appendingPathComponent("api/routing"))
        request.httpMethod = "POST"
        request.timeoutInterval = 26
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "mode": "driving",
            "locale": "es-PR",
            "origin": [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude
            ],
            "destination": [
                "latitude": destination.latitude,
                "longitude": destination.longitude
            ]
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw NAVServiceError.noValidRoute
        }
        let route = try JSONDecoder().decode(NAVRoute.self, from: data)
        guard route.isValid else { throw NAVServiceError.noValidRoute }
        return route
    }
}

@MainActor
final class NAVStore: ObservableObject {
    static let shared = NAVStore()

    @Published private(set) var verifiedDestinations: [NAVDestination] = []
    @Published private(set) var searchResults: [NAVDestination] = []
    @Published var selectedDestination: NAVDestination?
    @Published var message: String?

    private init() {}

    func refresh() async {
        do {
            verifiedDestinations = try await NAVClient.destinations()
            message = verifiedDestinations.isEmpty
                ? "Todavía no hay comercios públicos verificados. Busca un lugar real en el iPhone."
                : nil
        } catch {
            message = error.localizedDescription
        }
    }

    /// MapKit provides real POIs until the merchant onboarding workflow is ready.
    /// Search takes place on the PHONE, not via a custom keyboard on the CarPlay screen.
    func search(_ query: String) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 3 else {
            searchResults = []
            return
        }
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = trimmed
        request.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 18.22, longitude: -66.43),
            span: MKCoordinateSpan(latitudeDelta: 1.1, longitudeDelta: 2.3))
        do {
            let response = try await MKLocalSearch(request: request).start()
            searchResults = response.mapItems.prefix(15).compactMap { item in
                let location = item.placemark.coordinate
                let result = NAVDestination(
                    id: "mapkit-\(location.latitude)-\(location.longitude)",
                    name: item.name ?? "Lugar",
                    category: "lugar",
                    address: item.placemark.title ?? "Puerto Rico",
                    latitude: location.latitude, longitude: location.longitude
                )
                return result.isInPuertoRico ? result : nil
            }
            message = searchResults.isEmpty ? "No se encontraron lugares en Puerto Rico." : nil
        } catch {
            message = "No se pudo completar la búsqueda de lugares."
        }
    }
}

@MainActor
final class LocationTracker: NSObject, ObservableObject, CLLocationManagerDelegate {
    static let shared = LocationTracker()
    @Published private(set) var latestLocation: CLLocation?
    @Published private(set) var authorized: Bool = false
    private let manager = CLLocationManager()

    private override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.distanceFilter = 7
        authorized = manager.authorizationStatus == .authorizedWhenInUse ||
            manager.authorizationStatus == .authorizedAlways
    }

    func requestAccess() {
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways: manager.startUpdatingLocation()
        default: authorized = false
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorized = manager.authorizationStatus == .authorizedWhenInUse ||
            manager.authorizationStatus == .authorizedAlways
        if authorized { manager.startUpdatingLocation() }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last,
              location.horizontalAccuracy >= 0,
              location.horizontalAccuracy <= 100,
              abs(location.timestamp.timeIntervalSinceNow) < 20 else { return }
        latestLocation = location
    }
}
