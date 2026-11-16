import Foundation
import CallKit

class CallKitProvider: NSObject, CXProviderDelegate {
    static let shared = CallKitProvider()
    private let provider: CXProvider
    private let callController = CXCallController()

    override init() {
        let configuration = CXProviderConfiguration(localizedName: "Friend App")
        configuration.supportsVideo = true
        configuration.maximumCallsPerCallGroup = 1
        configuration.supportedHandleTypes = [.generic]
        configuration.iconTemplateImageData = nil

        self.provider = CXProvider(configuration: configuration)
        super.init()
        self.provider.setDelegate(self, queue: nil)
    }

    // Reports an incoming lock-screen call to iOS system UI
    func reportIncomingCall(uuid: UUID, handle: String, hasVideo: Bool, completion: @escaping (Error?) -> Void) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: handle)
        update.hasVideo = hasVideo
        update.localizedCallerName = handle

        provider.reportNewIncomingCall(with: uuid, update: update) { error in
            completion(error)
        }
    }

    // MARK: - CXProviderDelegate
    func providerDidReset(_ provider: CXProvider) {}

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        // Connect WebRTC audio/video track
        action.fulfill()
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        // Disconnect WebRTC room
        action.fulfill()
    }
}
