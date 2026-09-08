require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "xmoney-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://xmoney.com"
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.0" }
  s.source       = { :git => "https://github.com/xMoney-Payments/xmoney-react-native.git", :tag => "#{s.version}" }

  s.module_name  = "XMoneyReactNative"
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.9"
  s.private_header_files = "ios/**/*.h"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "XMoneyReactNative-Swift.h",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20"
  }

  s.dependency "XMoneyPaymentSheet", "1.0.0"

  install_modules_dependencies(s)
end
