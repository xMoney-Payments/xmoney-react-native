module.exports = {
  preset: 'react-native',
  watchman: false,
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.test.js',
  ],
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/example/'],
};
