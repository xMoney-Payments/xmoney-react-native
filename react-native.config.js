module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        packageImportPath: 'import com.xmoney.reactnative.XMoneyPaymentSheetPackage;',
        packageInstance: 'new XMoneyPaymentSheetPackage()',
      },
    },
  },
};
