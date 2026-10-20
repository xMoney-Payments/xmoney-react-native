import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Double,
  UnsafeMixed,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativePaymentElementResultEvent {
  resultJson: string;
}

export interface NativeProcessingEvent {
  isProcessing: boolean;
}

export interface NativeHeightEvent {
  height: Double;
}

export interface NativeAvailabilityEvent {
  isOrderConsumed: boolean;
  isInteractionEnabled: boolean;
}

export interface NativeOrderUpdatedEvent {
  requestId: string;
  success: boolean;
  error?: string;
}

export interface NativeUpdateFailedEvent {
  code: string;
  message: string;
}

export interface NativeEmptyEvent {}

export interface NativePaymentElementProps extends ViewProps {
  configuration?: UnsafeMixed;
  onReady?: DirectEventHandler<Readonly<NativeEmptyEvent>>;
  onProcessing?: DirectEventHandler<Readonly<NativeProcessingEvent>>;
  onResult?: DirectEventHandler<Readonly<NativePaymentElementResultEvent>>;
  onHeightChange?: DirectEventHandler<Readonly<NativeHeightEvent>>;
  onAvailability?: DirectEventHandler<Readonly<NativeAvailabilityEvent>>;
  onOrderUpdated?: DirectEventHandler<Readonly<NativeOrderUpdatedEvent>>;
  onUpdateFailed?: DirectEventHandler<Readonly<NativeUpdateFailedEvent>>;
}

interface NativeCommands {
  prepare: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    orderPayload: string,
    orderChecksum: string
  ) => void;
  confirm: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>
  ) => void;
  updateOrder: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  beginUpdateOrder: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    requestId: string
  ) => void;
  resolveOrder: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    orderPayload: string,
    orderChecksum: string,
    requestId: string
  ) => void;
  rejectOrder: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    requestId: string
  ) => void;
  updateAppearance: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    appearanceJson: string
  ) => void;
  updateLocale: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    locale: string
  ) => void;
  updateStyle: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    style: string
  ) => void;
  updateWalletAppearance: (
    viewRef: React.ElementRef<HostComponent<NativePaymentElementProps>>,
    appearanceJson: string
  ) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'prepare',
    'confirm',
    'updateOrder',
    'beginUpdateOrder',
    'resolveOrder',
    'rejectOrder',
    'updateAppearance',
    'updateLocale',
    'updateStyle',
    'updateWalletAppearance',
  ],
});

export default codegenNativeComponent<NativePaymentElementProps>(
  'XMoneyPaymentElement'
);
