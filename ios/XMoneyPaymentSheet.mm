#import "XMoneyPaymentSheet.h"

#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <ReactCommon/RCTTurboModule.h>

#if __has_include(<XMoneyPaymentSheetSpec/XMoneyPaymentSheetSpec.h>)
#import <XMoneyPaymentSheetSpec/XMoneyPaymentSheetSpec.h>
#else
#import "XMoneyPaymentSheetSpec.h"
#endif

#import "XMoneyReactNative-Swift.h"

@interface XMoneyPaymentSheet () <NativeXMoneyPaymentSheetSpec>
@end

@implementation XMoneyPaymentSheet {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
  if (self = [super init]) {
    __weak __typeof(self) weakSelf = self;
    [XMoneyPaymentSheetHost shared].eventSink = ^(NSDictionary *body) {
      __strong __typeof(weakSelf) strongSelf = weakSelf;
      if (strongSelf == nil || !strongSelf->_hasListeners) {
        return;
      }
      [strongSelf sendEventWithName:@"XMoneyPaymentSheetEvent" body:body];
    };
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"XMoneyPaymentSheetEvent" ];
}

- (void)startObserving
{
  _hasListeners = YES;
}

- (void)stopObserving
{
  _hasListeners = NO;
}

- (void)initPaymentSheet:(NSDictionary *)configuration
{
  [[XMoneyPaymentSheetHost shared] initPaymentSheet:configuration];
}

- (void)presentPaymentSheet:(NSDictionary *)intent
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
  __weak __typeof(self) weakSelf = self;
  [[XMoneyPaymentSheetHost shared]
      presentPaymentSheet:intent
      onEvent:^(NSDictionary *body) {
        __strong __typeof(weakSelf) strongSelf = weakSelf;
        if (strongSelf == nil || !strongSelf->_hasListeners) {
          return;
        }
        [strongSelf sendEventWithName:@"XMoneyPaymentSheetEvent" body:body];
      }
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

- (void)dismiss
{
  [[XMoneyPaymentSheetHost shared] dismiss];
}

- (void)initApplePay:(NSDictionary *)configuration
{
  [[XMoneyPaymentSheetHost shared] initApplePay:configuration];
}

- (void)presentApplePay:(NSDictionary *)intent
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  __weak __typeof(self) weakSelf = self;
  [[XMoneyPaymentSheetHost shared]
      presentApplePay:intent
      onEvent:^(NSDictionary *body) {
        __strong __typeof(weakSelf) strongSelf = weakSelf;
        if (strongSelf == nil || !strongSelf->_hasListeners) {
          return;
        }
        [strongSelf sendEventWithName:@"XMoneyPaymentSheetEvent" body:body];
      }
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

- (void)dismissApplePay
{
  [[XMoneyPaymentSheetHost shared] dismissApplePay];
}

- (void)initGooglePay:(NSDictionary *)configuration
{
  [[XMoneyPaymentSheetHost shared] initGooglePay:configuration];
}

- (void)presentGooglePay:(NSDictionary *)intent
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  [[XMoneyPaymentSheetHost shared]
      presentGooglePay:intent
      onEvent:^(NSDictionary *body) {
      }
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

- (void)dismissGooglePay
{
  [[XMoneyPaymentSheetHost shared] dismissGooglePay];
}

- (void)getApplePayState:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  resolve([[XMoneyPaymentSheetHost shared] applePayState]);
}

- (void)getGooglePayState:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  (void)intent;
  resolve([[XMoneyPaymentSheetHost shared] googlePayState]);
}

- (void)updateApplePayOrder:(NSDictionary *)intent
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
  [[XMoneyPaymentSheetHost shared]
      updateApplePayOrder:intent
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

- (void)updateGooglePayOrder:(NSDictionary *)intent
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject
{
  [[XMoneyPaymentSheetHost shared]
      updateGooglePayOrder:intent
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

- (void)answerCardHolderVerification:(NSString *)requestId accepted:(BOOL)accepted
{
  [[XMoneyPaymentSheetHost shared] answerCardHolderVerification:requestId accepted:accepted];
}

- (void)addListener:(NSString *)eventName
{
  [super addListener:eventName];
}

- (void)removeListeners:(double)count
{
  [super removeListeners:(NSInteger)count];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeXMoneyPaymentSheetSpecJSI>(params);
}

@end
