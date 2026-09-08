export type ExampleSecrets = {
  PUBLIC_KEY: string;
  API_KEY: string;
  API_BASE: string;
  CURRENCY: string;
  DESCRIPTION: string;
};

const FALLBACK: ExampleSecrets = {
  PUBLIC_KEY: 'pk_test_xxxxx',
  API_KEY: 'your_api_key',
  API_BASE: 'https://demo.xmoney.com',
  CURRENCY: 'EUR',
  DESCRIPTION: 'Embeddable Configuration - Payment Card',
};

function readSecrets(): ExampleSecrets {
  try {
    // example/secrets.json (gitignored). Metro fails the bundle if the file is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require('../secrets.json') as Partial<ExampleSecrets>;
    return {
      PUBLIC_KEY: raw.PUBLIC_KEY ?? FALLBACK.PUBLIC_KEY,
      API_KEY: raw.API_KEY ?? FALLBACK.API_KEY,
      API_BASE: raw.API_BASE ?? FALLBACK.API_BASE,
      CURRENCY: raw.CURRENCY ?? FALLBACK.CURRENCY,
      DESCRIPTION: raw.DESCRIPTION ?? FALLBACK.DESCRIPTION,
    };
  } catch {
    return FALLBACK;
  }
}

export const secrets = readSecrets();
