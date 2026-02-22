import { NativeModules } from 'react-native';

export interface PermissionStatus {
  RECEIVE_SMS: boolean;
  READ_SMS: boolean;
  READ_PHONE_STATE: boolean;
  POST_NOTIFICATIONS?: boolean;
}

interface PermissionModuleInterface {
  checkAllPermissions(): Promise<PermissionStatus>;
  openBatteryOptimizationSettings(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
}

const { PermissionModule } = NativeModules as { PermissionModule: PermissionModuleInterface };

export default {
  checkAllPermissions: (): Promise<PermissionStatus> =>
    PermissionModule.checkAllPermissions(),

  openBatteryOptimizationSettings: (): Promise<boolean> =>
    PermissionModule.openBatteryOptimizationSettings(),

  openAppSettings: (): Promise<boolean> =>
    PermissionModule.openAppSettings(),
};
