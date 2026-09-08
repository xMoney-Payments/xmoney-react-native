import React from 'react';
import { create, act } from 'react-test-renderer';
import {
  markNativePrepareAcked,
  useNativePrepare,
  type NativePrepareLiveKeys,
  type NativeViewCommands,
} from '../components/useNativePrepare';
import type { PaymentConfig, PaymentIntent, PaymentResult } from '../types';

function Probe({
  configuration,
  intent,
  commands,
  onResult,
  appearance,
  localeIsStructural,
  ignoreMethodAppearance,
  layoutReady,
  liveKeys,
}: {
  configuration: PaymentConfig;
  intent: PaymentIntent;
  commands: NativeViewCommands<object>;
  onResult?: (result: PaymentResult) => void;
  appearance?: unknown;
  localeIsStructural?: boolean;
  ignoreMethodAppearance?: boolean;
  layoutReady?: boolean;
  liveKeys?: React.RefObject<NativePrepareLiveKeys>;
}) {
  const viewRef = React.useRef({ id: 1 });
  useNativePrepare(viewRef, commands, configuration, intent, onResult, {
    appearance,
    localeIsStructural,
    ignoreMethodAppearance,
    layoutReady,
    liveKeys,
  });
  return null;
}

function mockCommands(): NativeViewCommands<object> {
  return {
    prepare: jest.fn(),
    updateOrder: jest.fn(),
    updateAppearance: jest.fn(),
    updateLocale: jest.fn(),
    updateStyle: jest.fn(),
    updateWalletAppearance: jest.fn(),
  };
}

describe('useNativePrepare', () => {
  it('prepares even when publicKey is empty', async () => {
    const cmds = mockCommands();
    await act(async () => {
      create(
        <Probe
          configuration={{ publicKey: '' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.prepare).toHaveBeenCalledWith(
      { id: 1 },
      'p',
      'c'
    );
  });

  it('does not retrigger prepare when only the CHV callback identity changes', async () => {
    const cmds = mockCommands();
    const name = { firstName: 'Jane', lastName: 'Doe' };
    const intent = { orderPayload: 'p', orderChecksum: 'c' };
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            card: {
              cardHolderVerification: {
                name,
                onCardHolderVerification: () => true,
              },
            },
          }}
          intent={intent}
          commands={cmds}
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            card: {
              cardHolderVerification: {
                name,
                onCardHolderVerification: () => false,
              },
            },
          }}
          intent={intent}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('does not retrigger prepare for a new equal configuration object', async () => {
    const cmds = mockCommands();
    const intent = { orderPayload: 'p', orderChecksum: 'c' };
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={intent}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);

    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('dispatches updateOrder when only the intent changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p2', orderChecksum: 'c2' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateOrder).toHaveBeenCalledTimes(1);
    expect(cmds.updateOrder).toHaveBeenCalledWith(
      { id: 1 },
      'p2',
      'c2',
      ''
    );
  });

  it('dispatches updateAppearance when only appearance changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            options: { appearance: { colors: { primary: '#111' } } },
          }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            options: { appearance: { colors: { primary: '#222' } } },
          }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateAppearance).toHaveBeenCalledTimes(1);
    expect(cmds.updateLocale).not.toHaveBeenCalled();
  });

  it('dispatches updateLocale when only element locale changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x', options: { locale: 'en-US' } }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_test_x', options: { locale: 'el-GR' } }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateLocale).toHaveBeenCalledWith({ id: 1 }, 'el-GR');
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('rebuilds with prepare when wallet locale changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x', options: { locale: 'en-US' } }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
          localeIsStructural
          ignoreMethodAppearance
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_test_x', options: { locale: 'ro-RO' } }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
          localeIsStructural
          ignoreMethodAppearance
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(2);
    expect(cmds.updateLocale).not.toHaveBeenCalled();
  });

  it('rebuilds with prepare on structural publicKey change', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_live_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(2);
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('dispatches updateStyle when only options.style changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;
    const intent = { orderPayload: 'p', orderChecksum: 'c' };

    await act(async () => {
      root = create(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            options: { style: 'alwaysLight' },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            options: { style: 'alwaysDark' },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateStyle).toHaveBeenCalledTimes(1);
    expect(cmds.updateStyle).toHaveBeenCalledWith({ id: 1 }, 'alwaysDark');
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('dispatches updateWalletAppearance when only wallet appearance changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;
    const intent = { orderPayload: 'p', orderChecksum: 'c' };

    await act(async () => {
      root = create(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            paymentMethods: {
              applePay: { enabled: true, appearance: { color: 'black' } },
              googlePay: { enabled: true, appearance: { color: 'black' } },
            },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            paymentMethods: {
              applePay: { enabled: true, appearance: { color: 'white' } },
              googlePay: { enabled: true, appearance: { color: 'white' } },
            },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateWalletAppearance).toHaveBeenCalledTimes(1);
    expect(cmds.updateOrder).not.toHaveBeenCalled();
  });

  it('rebuilds with prepare when wallet enabled changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;
    const intent = { orderPayload: 'p', orderChecksum: 'c' };

    await act(async () => {
      root = create(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            paymentMethods: { applePay: { enabled: true } },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{
            publicKey: 'pk_test_x',
            paymentMethods: { applePay: { enabled: false } },
          }}
          intent={intent}
          commands={cmds}
          ignoreMethodAppearance
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(2);
    expect(cmds.updateWalletAppearance).not.toHaveBeenCalled();
  });

  it('dispatches updateAppearance when wallet button appearance changes', async () => {
    const cmds = mockCommands();
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
          appearance={{ color: 'black' }}
          ignoreMethodAppearance
        />
      );
    });
    await act(async () => {
      root?.update(
        <Probe
          configuration={{ publicKey: 'pk_test_x' }}
          intent={{ orderPayload: 'p', orderChecksum: 'c' }}
          commands={cmds}
          appearance={{ color: 'white' }}
          ignoreMethodAppearance
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);
    expect(cmds.updateAppearance).toHaveBeenCalledTimes(1);
  });

  it('retries prepare on layout when native has not acked', async () => {
    const cmds = mockCommands();
    const liveKeys: {current: NativePrepareLiveKeys} = {
      current: {
        intent: '',
        appearance: '',
        locale: '',
        style: '',
        walletAppearance: '',
        structural: '',
        prepared: false,
        acked: false,
      },
    };
    const intent = {orderPayload: 'p', orderChecksum: 'c'};
    const configuration = {publicKey: 'pk_test_x'};
    let root: ReturnType<typeof create> | undefined;

    await act(async () => {
      root = create(
        <Probe
          configuration={configuration}
          intent={intent}
          commands={cmds}
          liveKeys={liveKeys}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(1);

    await act(async () => {
      root?.update(
        <Probe
          configuration={configuration}
          intent={intent}
          commands={cmds}
          layoutReady
          liveKeys={liveKeys}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(2);

    markNativePrepareAcked(liveKeys);
    await act(async () => {
      root?.update(
        <Probe
          configuration={configuration}
          intent={intent}
          commands={cmds}
          layoutReady
          liveKeys={liveKeys}
        />
      );
    });
    expect(cmds.prepare).toHaveBeenCalledTimes(2);
  });
});
