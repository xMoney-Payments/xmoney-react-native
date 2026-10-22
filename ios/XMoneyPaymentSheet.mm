#import "XMoneyPaymentSheet.h"

#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#ifdef RCT_NEW_ARCH_ENABLED
#import <ReactCommon/RCTTurboModule.h>
#endif

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

RCT_EXPORT_METHOD(initPaymentSheet:(NSDictionary *)configuration)
{
  [[XMoneyPaymentSheetHost shared] initPaymentSheet:configuration];
}

RCT_EXPORT_METHOD(presentPaymentSheet:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(dismiss)
{
  [[XMoneyPaymentSheetHost shared] dismiss];
}

RCT_EXPORT_METHOD(initApplePay:(NSDictionary *)configuration)
{
  [[XMoneyPaymentSheetHost shared] initApplePay:configuration];
}

RCT_EXPORT_METHOD(presentApplePay:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(dismissApplePay)
{
  [[XMoneyPaymentSheetHost shared] dismissApplePay];
}

RCT_EXPORT_METHOD(initGooglePay:(NSDictionary *)configuration)
{
  [[XMoneyPaymentSheetHost shared] initGooglePay:configuration];
}

RCT_EXPORT_METHOD(presentGooglePay:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(dismissGooglePay)
{
  [[XMoneyPaymentSheetHost shared] dismissGooglePay];
}

RCT_EXPORT_METHOD(getApplePayState:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  resolve([[XMoneyPaymentSheetHost shared] applePayState]);
}

RCT_EXPORT_METHOD(getGooglePayState:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  (void)intent;
  resolve([[XMoneyPaymentSheetHost shared] googlePayState]);
}

RCT_EXPORT_METHOD(updateApplePayOrder:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(beginApplePayUpdateOrder:(NSString *)requestId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[XMoneyPaymentSheetHost shared]
      beginApplePayUpdateOrder:requestId
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

RCT_EXPORT_METHOD(resolveApplePayOrder:(NSString *)requestId
                  orderPayload:(NSString *)orderPayload
                  orderChecksum:(NSString *)orderChecksum)
{
  [[XMoneyPaymentSheetHost shared]
      resolveApplePayOrder:requestId
              orderPayload:orderPayload
             orderChecksum:orderChecksum];
}

RCT_EXPORT_METHOD(rejectApplePayOrder:(NSString *)requestId)
{
  [[XMoneyPaymentSheetHost shared] rejectApplePayOrder:requestId];
}

RCT_EXPORT_METHOD(updateGooglePayOrder:(NSDictionary *)intent
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(beginGooglePayUpdateOrder:(NSString *)requestId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  [[XMoneyPaymentSheetHost shared]
      beginGooglePayUpdateOrder:requestId
      onResolve:^(NSDictionary *result) {
        resolve(result);
      }
      onReject:^(NSString *code, NSString *message) {
        reject(code, message, nil);
      }];
}

RCT_EXPORT_METHOD(resolveGooglePayOrder:(NSString *)requestId
                  orderPayload:(NSString *)orderPayload
                  orderChecksum:(NSString *)orderChecksum)
{
  [[XMoneyPaymentSheetHost shared]
      resolveGooglePayOrder:requestId
               orderPayload:orderPayload
              orderChecksum:orderChecksum];
}

RCT_EXPORT_METHOD(rejectGooglePayOrder:(NSString *)requestId)
{
  [[XMoneyPaymentSheetHost shared] rejectGooglePayOrder:requestId];
}

RCT_EXPORT_METHOD(answerCardHolderVerification:(NSString *)requestId accepted:(BOOL)accepted)
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

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeXMoneyPaymentSheetSpecJSI>(params);
}
#endif

@end
