import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * TurboModule spec. Nested config is a map (`Object` for codegen).
 * Native methods stay `initPaymentSheet` / `presentPaymentSheet`
 * because Objective-C reserves `init`. JS public API is `init` / `present`.
 */
export interface Spec extends TurboModule {
  initPaymentSheet(configuration: Object): void;
  presentPaymentSheet(intent: Object): Promise<Object>;
  dismiss(): void;
  initApplePay(configuration: Object): void;
  presentApplePay(intent: Object): Promise<Object>;
  dismissApplePay(): void;
  initGooglePay(configuration: Object): void;
  presentGooglePay(intent: Object): Promise<Object>;
  dismissGooglePay(): void;
  getApplePayState(): Promise<Object>;
  getGooglePayState(intent: Object): Promise<Object>;
  updateApplePayOrder(intent: Object): Promise<void>;
  updateGooglePayOrder(intent: Object): Promise<void>;
  answerCardHolderVerification(requestId: string, accepted: boolean): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const module =
  TurboModuleRegistry.get<Spec>('XMoneyPaymentSheet') ?? null;

export default module;
