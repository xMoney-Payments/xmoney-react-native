const {
  withEntitlementsPlist,
  withAndroidManifest,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const pkg = require('./package.json');

/**
 * Merge incoming Apple Pay merchant IDs with any already in the entitlements.
 * @param {unknown} existing
 * @param {string | string[]} incoming
 * @returns {string[]}
 */
function mergeMerchantIdentifiers(existing, incoming) {
  const next = Array.isArray(incoming) ? incoming : [incoming];
  const previous = Array.isArray(existing)
    ? existing.filter((id) => typeof id === 'string')
    : typeof existing === 'string'
      ? [existing]
      : [];
  return [...new Set([...previous, ...next])];
}

/**
 * Expo config plugin for @xmoney/react-native.
 *
 * app.json:
 * {
 *   "plugins": [
 *     ["@xmoney/react-native", {
 *       "merchantIdentifier": "merchant.com.example",
 *       "enableGooglePay": true
 *     }]
 *   ]
 * }
 */
function withXMoneyIos(config, { merchantIdentifier } = {}) {
  if (!merchantIdentifier) return config;
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.in-app-payments'] =
      mergeMerchantIdentifiers(
        mod.modResults['com.apple.developer.in-app-payments'],
        merchantIdentifier
      );
    return mod;
  });
}

function withXMoneyAndroid(config, { enableGooglePay = false } = {}) {
  if (!enableGooglePay) return config;
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;
    app['meta-data'] = app['meta-data'] ?? [];
    const exists = app['meta-data'].some(
      (m) => m.$['android:name'] === 'com.google.android.gms.wallet.api.enabled'
    );
    if (!exists) {
      app['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.wallet.api.enabled',
          'android:value': 'true',
        },
      });
    }
    return mod;
  });
}

const withXMoney = (config, props = {}) => {
  config = withXMoneyIos(config, props);
  config = withXMoneyAndroid(config, props);
  return config;
};

module.exports = createRunOncePlugin(withXMoney, pkg.name, pkg.version);
module.exports.mergeMerchantIdentifiers = mergeMerchantIdentifiers;
