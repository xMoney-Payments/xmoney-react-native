#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>
#import "XMoneyReactNative-Swift.h"

@interface XMoneyPlatformPayButtonManager : RCTViewManager
@end

@implementation XMoneyPlatformPayButtonManager

RCT_EXPORT_MODULE(XMoneyPlatformPayButton)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView *)view
{
  return [XMoneyPlatformPayButtonView new];
}

RCT_EXPORT_VIEW_PROPERTY(configuration, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(appearance, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
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
    XMoneyPlatformPayButtonView *view = (XMoneyPlatformPayButtonView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPlatformPayButtonView class]]) {
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
    XMoneyPlatformPayButtonView *view = (XMoneyPlatformPayButtonView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPlatformPayButtonView class]]) {
      [view updateOrderWithOrderPayload:orderPayload orderChecksum:orderChecksum requestId:requestId];
    }
  }];
}

RCT_EXPORT_METHOD(updateAppearance:(nonnull NSNumber *)reactTag
                  appearanceJson:(NSString *)appearanceJson)
{
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *,UIView *> *viewRegistry) {
    XMoneyPlatformPayButtonView *view = (XMoneyPlatformPayButtonView *)viewRegistry[reactTag];
    if ([view isKindOfClass:[XMoneyPlatformPayButtonView class]]) {
      [view updateAppearanceWithAppearanceJson:appearanceJson];
    }
  }];
}

@end
