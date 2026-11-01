import { requireOptionalNativeModule } from 'expo-modules-core';
import type * as DeviceActivityPackage from 'react-native-device-activity';

type DeviceActivityModule = typeof DeviceActivityPackage;

let deviceActivityModule: DeviceActivityModule | null | undefined;

export function getDeviceActivityModule(): DeviceActivityModule | null {
  if (deviceActivityModule !== undefined) return deviceActivityModule;

  if (!requireOptionalNativeModule('ReactNativeDeviceActivity')) {
    deviceActivityModule = null;
    return deviceActivityModule;
  }

  // Metro needs a synchronous conditional load so Expo Go never evaluates the native view module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  deviceActivityModule = require('react-native-device-activity') as DeviceActivityModule;
  return deviceActivityModule;
}
