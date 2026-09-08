import React from 'react';
import { create, act } from 'react-test-renderer';
import { usePaymentSheet } from '../hooks/usePaymentSheet';
import { PaymentSheet } from '../PaymentSheet';

jest.mock('../PaymentSheet', () => ({
  PaymentSheet: {
    init: jest.fn(),
    present: jest.fn(),
    dismiss: jest.fn(),
  },
}));

function Probe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof usePaymentSheet>) => void;
}) {
  const api = usePaymentSheet();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe('usePaymentSheet', () => {
  beforeEach(() => {
    (PaymentSheet.dismiss as jest.Mock).mockClear();
    (PaymentSheet.present as jest.Mock).mockReset();
    (PaymentSheet.init as jest.Mock).mockReset();
  });

  it('forwards full PaymentConfig on init', async () => {
    const init = PaymentSheet.init as jest.Mock;
    init.mockResolvedValue(undefined);

    let api: ReturnType<typeof usePaymentSheet> | undefined;
    await act(async () => {
      create(
        <Probe
          onReady={(value) => {
            api = value;
          }}
        />
      );
    });

    const configuration = {
      publicKey: 'pk_test_x',
      card: { savedCards: { enabled: true } },
    };
    await act(async () => {
      await api?.init(configuration);
    });

    expect(init).toHaveBeenCalledWith(configuration);
  });

  it('does not dismiss on unmount if this instance never presented', async () => {
    let root: ReturnType<typeof create> | undefined;
    await act(async () => {
      root = create(<Probe onReady={() => {}} />);
    });
    await act(async () => {
      root?.unmount();
    });
    expect(PaymentSheet.dismiss).not.toHaveBeenCalled();
  });

  it('dismisses on unmount while this instance has a present in flight', async () => {
    (PaymentSheet.present as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    let api: ReturnType<typeof usePaymentSheet> | undefined;
    let root: ReturnType<typeof create> | undefined;
    await act(async () => {
      root = create(
        <Probe
          onReady={(value) => {
            api = value;
          }}
        />
      );
    });

    await act(async () => {
      api?.present({
        orderPayload: 'payload',
        orderChecksum: 'checksum',
      });
    });

    await act(async () => {
      root?.unmount();
    });
    expect(PaymentSheet.dismiss).toHaveBeenCalled();
  });
});
