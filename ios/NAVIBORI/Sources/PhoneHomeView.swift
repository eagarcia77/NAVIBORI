import SwiftUI
import MapKit

struct PhoneHomeView: View {
    @ObservedObject private var store = NAVStore.shared
    @ObservedObject private var gps = LocationTracker.shared
    @State private var query = ""
    @State private var camera: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 18.22, longitude: -66.43),
            span: MKCoordinateSpan(latitudeDelta: 0.8, longitudeDelta: 1.3)
        )
    )

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Map(position: $camera) {
                        UserAnnotation()
                        if let destination = store.selectedDestination {
                            Marker(destination.name, coordinate: destination.coordinate)
                        }
                    }
                    .frame(height: 240)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .listRowInsets(EdgeInsets())
                }
                Section("GPS") {
                    if gps.authorized {
                        Label("Ubicación habilitada", systemImage: "location.fill")
                    } else {
                        Button("Activar ubicación") { gps.requestAccess() }
                    }
                    Text("Para mostrar NAVIBORI en la pantalla del carro, conecta tu iPhone a CarPlay.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Section("Buscar un destino real en Puerto Rico") {
                    TextField("Dirección, comercio o lugar", text: $query)
                        .textInputAutocapitalization(.words)
                        .submitLabel(.search)
                        .onSubmit { Task { await store.search(query) } }
                    Button("Buscar lugares") { Task { await store.search(query) } }
                    ForEach(store.searchResults) { destination in
                        destinationRow(destination)
                    }
                }
                Section("Comercios verificados de NAVIBORI") {
                    if store.verifiedDestinations.isEmpty {
                        Text("Aún no hay comercios verificados publicados.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(store.verifiedDestinations) { destination in
                        destinationRow(destination)
                    }
                }
                if let destination = store.selectedDestination {
                    Section("Destino seleccionado") {
                        Label(destination.name, systemImage: "car.side.fill")
                        Text(destination.address).font(.footnote)
                        Text("Con CarPlay conectado, NAVIBORI mostrará la vista previa de la ruta en el carro.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                if let message = store.message {
                    Section { Text(message).font(.footnote).foregroundStyle(.secondary) }
                }
            }
            .navigationTitle("NAVIBORI")
            .task {
                gps.requestAccess()
                await store.refresh()
            }
            .refreshable { await store.refresh() }
        }
    }

    private func destinationRow(_ destination: NAVDestination) -> some View {
        Button {
            store.selectedDestination = destination
            camera = .region(MKCoordinateRegion(
                center: destination.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.015, longitudeDelta: 0.015)))
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(destination.name).font(.headline)
                Text(destination.address).font(.footnote).foregroundStyle(.secondary)
            }
        }
    }
}
