import UIKit
import SwiftUI
import CarPlay

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        if connectingSceneSession.role == .carTemplateApplication {
            return UISceneConfiguration(name: "NAVIBORI CarPlay", sessionRole: connectingSceneSession.role)
        }
        return UISceneConfiguration(name: "NAVIBORI Phone", sessionRole: connectingSceneSession.role)
    }
}

final class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let phoneScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: phoneScene)
        window.rootViewController = UIHostingController(rootView: PhoneHomeView())
        self.window = window
        window.makeKeyAndVisible()
        LocationTracker.shared.requestAccess()
    }
}
