import {NativeModules} from 'react-native';
import type {RelayLog} from '../types';

interface LogModuleInterface {
  getLogs(limit: number, offset: number): Promise<RelayLog[]>;
  getLatestLog(): Promise<RelayLog | null>;
  getLogCount(): Promise<number>;
  deleteLog(id: number): Promise<boolean>;
  clearAllLogs(): Promise<boolean>;
}

const {LogModule} = NativeModules as {LogModule: LogModuleInterface};

export default {
  getLogs: (limit: number, offset: number): Promise<RelayLog[]> =>
    LogModule.getLogs(limit, offset),

  getLatestLog: (): Promise<RelayLog | null> =>
    LogModule.getLatestLog(),

  getLogCount: (): Promise<number> =>
    LogModule.getLogCount(),

  deleteLog: (id: number): Promise<boolean> =>
    LogModule.deleteLog(id),

  clearAllLogs: (): Promise<boolean> =>
    LogModule.clearAllLogs(),
};
