import { Platform } from 'react-native';
import type { Spec } from '../specs/NativeXMoneyPaymentSheet';

jest.mock('../specs/NativeXMoneyPaymentSheet', () => ({
  __esModule: true,
  default: {
    initPaymentSheet: jest.fn(),
    presentPaymentSheet: jest.fn(),
    dismiss: jest.fn(),
    initApplePay: jest.fn(),
    presentApplePay: jest.fn(),
    dismissApplePay: jest.fn(),
    initGooglePay: jest.fn(),
    presentGooglePay: jest.fn(),
    dismissGooglePay: jest.fn(),
    getApplePayState: jest.fn(),
    getGooglePayState: jest.fn(),
    updateApplePayOrder: jest.fn(),
    updateGooglePayOrder: jest.fn(),
    answerCardHolderVerification: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

import NativeXMoneyPaymentSheet from '../specs/NativeXMoneyPaymentSheet';
import { ApplePay, resetApplePayState } from '../ApplePay';
import { GooglePay, resetGooglePayState } from '../GooglePay';

const native = NativeXMoneyPaymentSheet as Spec;
const presentApplePay = native.presentApplePay as jest.Mock;
const presentGooglePay = native.presentGooglePay as jest.Mock;
const getApplePayState = native.getApplePayState as jest.Mock;
const getGooglePayState = native.getGooglePayState as jest.Mock;
const updateApplePayOrder = native.updateApplePayOrder as jest.Mock;
const updateGooglePayOrder = native.updateGooglePayOrder as jest.Mock;

const config = { publicKey: 'pk_test_x' };
const intent = { orderPayload: 'payload', orderChecksum: 'checksum' };

describe('ApplePay / GooglePay', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    resetApplePayState();
    resetGooglePayState();
    presentApplePay.mockReset();
    presentGooglePay.mockReset();
    getApplePayState.mockReset();
    getGooglePayState.mockReset();
    updateApplePayOrder.mockReset();
    updateGooglePayOrder.mockReset();
  });

  it('ApplePay.present fails on Android without calling native', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    await expect(ApplePay.present(intent)).resolves.toEqual({
      status: 'failed',
      error: {
        code: 'APPLE_PAY',
        message: 'Apple Pay is only available on iOS.',
      },
    });
    expect(presentApplePay).not.toHaveBeenCalled();
  });

  it('GooglePay.present fails on iOS without calling native', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    await expect(GooglePay.present(intent)).resolves.toEqual({
      status: 'failed',
      error: {
        code: 'GOOGLE_PAY',
        message: 'Google Pay is only available on Android.',
      },
    });
    expect(presentGooglePay).not.toHaveBeenCalled();
  });

  it('ApplePay.init then present on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    presentApplePay.mockResolvedValue({ status: 'canceled' });
    await ApplePay.init(config);
    await expect(ApplePay.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    expect(native.initApplePay).toHaveBeenCalledWith(config);
    expect(presentApplePay).toHaveBeenCalled();
  });

  it('cancels a second ApplePay.present while the first is in flight', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    presentApplePay.mockImplementation(() => new Promise(() => {}));
    ApplePay.present(intent);
    await expect(ApplePay.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    expect(presentApplePay).toHaveBeenCalledTimes(1);
  });

  it('ApplePay.getState parses native flags', async () => {
    getApplePayState.mockResolvedValue({
      isAvailable: true,
      isReady: true,
      isOrderConsumed: false,
      isInteractionEnabled: true,
    });
    await expect(ApplePay.getState()).resolves.toEqual({
      isAvailable: true,
      isReady: true,
      isOrderConsumed: false,
      isInteractionEnabled: true,
    });
  });

  it('GooglePay.getState parses native flags', async () => {
    getGooglePayState.mockResolvedValue({
      isAvailable: true,
      isReady: false,
      isOrderConsumed: true,
      isInteractionEnabled: false,
    });
    await expect(GooglePay.getState()).resolves.toEqual({
      isAvailable: true,
      isReady: false,
      isOrderConsumed: true,
      isInteractionEnabled: false,
    });
    expect(getGooglePayState).toHaveBeenCalledWith({});
  });

  it('GooglePay.getState passes intent for a native probe', async () => {
    getGooglePayState.mockResolvedValue({
      isAvailable: true,
      isReady: true,
      isOrderConsumed: false,
      isInteractionEnabled: true,
    });
    await expect(GooglePay.getState(intent)).resolves.toEqual({
      isAvailable: true,
      isReady: true,
      isOrderConsumed: false,
      isInteractionEnabled: true,
    });
    expect(getGooglePayState).toHaveBeenCalledWith(intent);
  });

  it('allows a second GooglePay.present after the first resolves canceled', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    presentGooglePay.mockResolvedValue({ status: 'canceled' });
    await expect(GooglePay.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    await expect(GooglePay.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    expect(presentGooglePay).toHaveBeenCalledTimes(2);
  });

  it('cancels a second GooglePay.present while the first is in flight', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    presentGooglePay.mockImplementation(() => new Promise(() => {}));
    GooglePay.present(intent);
    await expect(GooglePay.present(intent)).resolves.toEqual({
      status: 'canceled',
    });
    expect(presentGooglePay).toHaveBeenCalledTimes(1);
  });

  it('ApplePay.updateOrder throws on Android without calling native', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    await expect(ApplePay.updateOrder(intent)).rejects.toMatchObject({
      code: 'APPLE_PAY',
    });
    expect(updateApplePayOrder).not.toHaveBeenCalled();
  });

  it('GooglePay.updateOrder throws on iOS without calling native', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    await expect(GooglePay.updateOrder(intent)).rejects.toMatchObject({
      code: 'GOOGLE_PAY',
    });
    expect(updateGooglePayOrder).not.toHaveBeenCalled();
  });

  it('ApplePay.updateOrder calls native on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    updateApplePayOrder.mockResolvedValue(undefined);
    await ApplePay.init(config);
    await expect(ApplePay.updateOrder(intent)).resolves.toBeUndefined();
    expect(updateApplePayOrder).toHaveBeenCalled();
  });

  it('GooglePay.updateOrder calls native on Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    updateGooglePayOrder.mockResolvedValue(undefined);
    await GooglePay.init(config);
    await expect(GooglePay.updateOrder(intent)).resolves.toBeUndefined();
    expect(updateGooglePayOrder).toHaveBeenCalled();
  });
});
