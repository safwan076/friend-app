import SwiftUI

// MARK: - 1. LOGIN VIEW WITH STRICT PRIVACY GUARANTEE
struct LoginView: View {
    @Binding var isAuthenticated: Bool
    @State private var phoneNumber = "+1"
    @State private var otpCode = "123456"
    @State private var step = 1

    var body: some View {
        ZStack {
            Color(red: 0.04, green: 0.05, blue: 0.09).ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "shield.lefthalf.filled")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 50, height: 50)
                    .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95))

                VStack(spacing: 4) {
                    Text("Welcome to Friend App")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("Anonymous Calls & Hyper-Local Events")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                // Privacy Guarantee Banner
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "lock.shield.fill")
                        .foregroundColor(Color.green)
                        .font(.subheadline)
                    Text("Privacy Guaranteed: Your phone number is strictly encrypted and will NEVER be revealed to strangers, callers, or celebrities.")
                        .font(.system(size: 11))
                        .foregroundColor(Color(red: 0.65, green: 0.95, blue: 0.82))
                        .lineLimit(nil)
                }
                .padding()
                .background(Color.green.opacity(0.12))
                .cornerRadius(14)

                if step == 1 {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Mobile Number (E.164)").font(.caption).foregroundColor(.gray)
                        TextField("+1234567890", text: $phoneNumber)
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                            .keyboardType(.phonePad)
                    }

                    Button(action: { step = 2 }) {
                        Text("Send SMS Verification Code")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(red: 0.39, green: 0.40, blue: 0.95))
                            .foregroundColor(.white)
                            .cornerRadius(14)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("6-Digit Code (Default: 123456)").font(.caption).foregroundColor(.gray)
                        TextField("123456", text: $otpCode)
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                            .keyboardType(.numberPad)
                    }

                    Button(action: { isAuthenticated = true }) {
                        Text("Verify & Continue")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(red: 0.39, green: 0.40, blue: 0.95))
                            .foregroundColor(.white)
                            .cornerRadius(14)
                    }
                }

                Spacer()
            }
            .padding(24)
        }
    }
}

// MARK: - 2. RANDOM MATCH VIEW (WEBRTC AUDIO/VIDEO)
struct RandomMatchView: View {
    @State private var isVideo = true
    @State private var inCall = false
    @State private var isSearching = false

    var body: some View {
        ZStack {
            Color(red: 0.04, green: 0.05, blue: 0.09).ignoresSafeArea()

            if !inCall {
                VStack(spacing: 20) {
                    Spacer()

                    ZStack {
                        Circle()
                            .fill(Color(red: 0.39, green: 0.40, blue: 0.95).opacity(0.2))
                            .frame(width: 90, height: 90)
                        Image(systemName: isVideo ? "video.fill" : "mic.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Color(red: 0.39, green: 0.40, blue: 0.95))
                    }

                    Text("Connect with Random People Online")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Instant voice and video chat with strangers worldwide. 100% anonymous.")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)

                    Picker("Mode", selection: $isVideo) {
                        Text("Video Call").tag(true)
                        Text("Voice Call").tag(false)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal, 40)

                    Spacer()

                    Button(action: { inCall = true }) {
                        HStack {
                            Image(systemName: "sparkles")
                            Text("Start Random Call")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(red: 0.39, green: 0.40, blue: 0.95))
                        .cornerRadius(18)
                        .padding(.horizontal, 24)
                    }

                    Spacer()
                }
            } else {
                // In Call Screen
                VStack {
                    ZStack {
                        Color(red: 0.12, green: 0.16, blue: 0.23).ignoresSafeArea()
                        VStack(spacing: 12) {
                            Image(systemName: "person.circle.fill")
                                .resizable()
                                .frame(width: 80, height: 80)
                                .foregroundColor(.gray)
                            Text("Random Peer Connected")
                                .font(.headline)
                                .foregroundColor(.white)
                        }
                    }

                    HStack(spacing: 30) {
                        Button(action: { inCall = false }) {
                            Image(systemName: "phone.down.fill")
                                .font(.title2)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .clipShape(Circle())
                        }

                        Button(action: { /* next match */ }) {
                            HStack {
                                Image(systemName: "forward.fill")
                                Text("Next")
                            }
                            .font(.headline)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.39, green: 0.40, blue: 0.95))
                            .foregroundColor(.white)
                            .cornerRadius(25)
                        }

                        Button(action: { /* report */ }) {
                            Image(systemName: "flag.fill")
                                .font(.title3)
                                .padding()
                                .background(Color.yellow.opacity(0.2))
                                .foregroundColor(.yellow)
                                .clipShape(Circle())
                        }
                    }
                    .padding(.bottom, 30)
                }
            }
        }
    }
}
