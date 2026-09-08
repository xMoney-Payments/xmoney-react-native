import {NativeModules, Share} from 'react-native';

export async function copyToClipboard(text: string): Promise<void> {
  const clipboard =
    NativeModules.Clipboard ??
    NativeModules.RNCClipboard ??
    NativeModules.ClipboardModule;
  if (clipboard && typeof clipboard.setString === 'function') {
    clipboard.setString(text);
    return;
  }
  await Share.share({message: text});
}
