import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
  UnsafeMixed,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativePlatformPayResultEvent {
  resultJson: string;
}

export interface NativePlatformPayProcessingEvent {
  isProcessing: boolean;
}

export interface NativePlatformPayHeightEvent {
  height: Double;
}

export interface NativeAvailabilityEvent {
  isAvailable: boolean;
  isReady: boolean;
  isOrderConsumed: boolean;
  isInteractionEnabled: boolean;
}

export interface NativeOrderUpdatedEvent {
  requestId: string;
  success: boolean;
  error?: string;
}

export interface NativeEmptyEvent {}

export interface NativePlatformPayButtonProps extends ViewProps {
  configuration?: UnsafeMixed;
  appearance?: UnsafeMixed;
  disabled?: boolean;
  onReady?: DirectEventHandler<Readonly<NativeEmptyEvent>>;
  onProcessing?: DirectEventHandler<
    Readonly<NativePlatformPayProcessingEvent>
  >;
  onResult?: DirectEventHandler<Readonly<NativePlatformPayResultEvent>>;
  onHeightChange?: DirectEventHandler<Readonly<NativePlatformPayHeightEvent>>;
  onAvailability?: DirectEventHandler<Readonly<NativeAvailabilityEvent>>;
  onOrderUpdated?: DirectEventHandler<Readonly<NativeOrderUpdatedEvent>>;
}

interface NativeCommands {
  prepare: (
    viewRef: React.ElementRef<HostComponent<NativePlatformPayButtonProps>>,
    orderPayload: string,
    orderChecksum: string
  ) => void;
  updateOrder: (
    viewRef: React.ElementRef<HostComponent<NativePlatformPayButtonProps>>,
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  updateAppearance: (
    viewRef: React.ElementRef<HostComponent<NativePlatformPayButtonProps>>,
    appearanceJson: string
  ) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['prepare', 'updateOrder', 'updateAppearance'],
});

export default codegenNativeComponent<NativePlatformPayButtonProps>(
  'XMoneyPlatformPayButton'
);
