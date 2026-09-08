import Foundation
import React
import UIKit

enum BridgePresenter {
    static func topViewController() -> UIViewController? {
        if let fromReact = topMostPresentable(from: RCTPresentedViewController()) {
            return fromReact
        }
        return topMostPresentable(from: keyWindow()?.rootViewController)
    }

    private static func keyWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }
    }

    private static func topMostPresentable(from root: UIViewController?) -> UIViewController? {
        guard var current = root else { return nil }
        while let presented = current.presentedViewController, !presented.isBeingDismissed {
            current = presented
        }
        current = unwrapContainers(current)
        guard isPresentable(current) else { return nil }
        return current
    }

    private static func unwrapContainers(_ vc: UIViewController) -> UIViewController {
        if let nav = vc as? UINavigationController, let visible = nav.visibleViewController {
            return unwrapContainers(visible)
        }
        if let tab = vc as? UITabBarController, let selected = tab.selectedViewController {
            return unwrapContainers(selected)
        }
        return vc
    }

    private static func isPresentable(_ vc: UIViewController) -> Bool {
        !vc.isBeingDismissed && vc.viewIfLoaded?.window != nil
    }
}

enum BridgeMaps {
    static func jsonObject(_ json: String) -> [String: Any]? {
        guard let data = json.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data),
              let dict = object as? [String: Any]
        else {
            return nil
        }
        return dict
    }

    static func stringMap(_ value: Any?) -> [String: Any]? {
        if let dict = value as? [String: Any] {
            return dict
        }
        guard let ns = value as? NSDictionary else { return nil }
        var result: [String: Any] = [:]
        ns.enumerateKeysAndObjects { key, object, _ in
            guard let key = key as? String else { return }
            result[key] = object
        }
        return result
    }

    static func bool(_ value: Any?, default defaultValue: Bool) -> Bool {
        if let bool = value as? Bool { return bool }
        if let number = value as? NSNumber { return number.boolValue }
        return defaultValue
    }

    static func double(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() { return nil }
            return number.doubleValue
        }
        if let double = value as? Double { return double }
        return nil
    }
}
