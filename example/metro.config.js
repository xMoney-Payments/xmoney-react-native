const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');
const modules = Object.keys(pak.peerDependencies ?? {});

/**
 * Watch the library root and pin peer deps to this app's node_modules
 * so Metro does not load two copies of react / react-native.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: exclusionList(
      modules.map(
        (m) =>
          new RegExp(
            `^${path.join(root, 'node_modules', m).replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`
          )
      )
    ),
    extraNodeModules: {
      ...Object.fromEntries(
        modules.map((name) => [name, path.join(__dirname, 'node_modules', name)])
      ),
      [pak.name]: root,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
