import { NativeModules } from 'react-native';

export interface AppStatus {
  lastAttemptAt: number;
  lastResult: string;
  lastErrorShort: string | null;
}

interface ServiceModuleInterface {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
  getLastStatus(): Promise<AppStatus | null>;
  getOutboxCount(): Promise<number>;
}

const { ServiceModule } = NativeModules as { ServiceModule: ServiceModuleInterface };

export default {
  startService: (): Promise<boolean> =>
    ServiceModule.startService(),

  stopService: (): Promise<boolean> =>
    ServiceModule.stopService(),

  isServiceRunning: (): Promise<boolean> =>
    ServiceModule.isServiceRunning(),

  getLastStatus: (): Promise<AppStatus | null> =>
    ServiceModule.getLastStatus(),

  getOutboxCount: (): Promise<number> =>
    ServiceModule.getOutboxCount(),
};
