import SwiftUI

@main
struct FriendApp: App {
    @State private var isAuthenticated = true

    var body: some Scene {
        WindowGroup {
            if !isAuthenticated {
                LoginView(isAuthenticated: $isAuthenticated)
            } else {
                TabView {
                    RandomMatchView()
                        .tabItem {
                            Label("Random", systemImage: "sparkles")
                        }

                    Text("Celebrity Hub & Subscriptions")
                        .foregroundColor(.white)
                        .tabItem {
                            Label("Celebrities", systemImage: "star.fill")
                        }

                    Text("Location-Based Events")
                        .foregroundColor(.white)
                        .tabItem {
                            Label("Events", systemImage: "mappin.and.ellipse")
                        }

                    Text("Customer Support Desk")
                        .foregroundColor(.white)
                        .tabItem {
                            Label("Support", systemImage: "headphones")
                        }
                }
                .accentColor(Color(red: 0.39, green: 0.40, blue: 0.95))
            }
        }
    }
}
