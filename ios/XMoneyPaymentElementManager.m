#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>
#import "XMoneyReactNative-Swift.h"

@interface XMoneyPaymentElementManager : RCTViewManager
@end

@implementation XMoneyPaymentElementManager

RCT_EXPORT_MODULE(XMoneyPaymentElement)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView *)view
{
  return [XMoneyPaymentElementView new];
}

RCT_EXPORT_VIEW_PROPERTY(configuration, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onReady, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onProcessing, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onResult, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onAvailability, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onOrderUpdated, RCTDirectEventBlock)

RCT_EXPORT_METHOD(prepare:(nonnull NSNumber *)reactTag
                  orderPayload:(NSString *)orderPayload
                  orderChecksum:(NSString *)orderChecksum)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view prepareWithOrderPayload:orderPayload orderChecksum:orderChecksum];
    }
  }];
}

RCT_EXPORT_METHOD(updateOrder:(nonnull NSNumber *)reactTag
                  orderPayload:(NSString *)orderPayload
                  orderChecksum:(NSString *)orderChecksum
                  requestId:(NSString *)requestId)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view updateOrderWithOrderPayload:orderPayload orderChecksum:orderChecksum requestId:requestId];
    }
  }];
}

RCT_EXPORT_METHOD(updateAppearance:(nonnull NSNumber *)reactTag
                  appearanceJson:(NSString *)appearanceJson)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view updateAppearanceWithAppearanceJson:appearanceJson];
    }
  }];
}

RCT_EXPORT_METHOD(updateLocale:(nonnull NSNumber *)reactTag
                  locale:(NSString *)locale)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view updateLocaleWithLocale:locale];
    }
  }];
}

RCT_EXPORT_METHOD(updateStyle:(nonnull NSNumber *)reactTag
                  style:(NSString *)style)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view updateStyleWithStyle:style];
    }
  }];
}

RCT_EXPORT_METHOD(updateWalletAppearance:(nonnull NSNumber *)reactTag
                  appearanceJson:(NSString *)appearanceJson)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view updateWalletAppearanceWithAppearanceJson:appearanceJson];
    }
  }];
}

RCT_EXPORT_METHOD(confirm:(nonnull NSNumber *)reactTag)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPaymentElementView *view = (XMoneyPaymentElementView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPaymentElementView class]]) {
      [view confirm];
    }
  }];
}

@end
