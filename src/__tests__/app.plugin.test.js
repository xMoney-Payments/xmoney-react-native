const { mergeMerchantIdentifiers } = require('../../app.plugin.js');

describe('mergeMerchantIdentifiers', () => {
  it('merges with existing entitlements instead of replacing', () => {
    expect(
      mergeMerchantIdentifiers(['merchant.already'], 'merchant.new')
    ).toEqual(['merchant.already', 'merchant.new']);
  });

  it('dedupes identifiers', () => {
    expect(
      mergeMerchantIdentifiers(['merchant.a'], ['merchant.a', 'merchant.b'])
    ).toEqual(['merchant.a', 'merchant.b']);
  });

  it('treats a missing existing value as empty', () => {
    expect(mergeMerchantIdentifiers(undefined, 'merchant.a')).toEqual([
      'merchant.a',
    ]);
  });
});
