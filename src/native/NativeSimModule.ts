import { NativeModules } from 'react-native';

export interface SimInfo {
  slotIndex: number;
  subscriptionId: number;
  carrierName: string;
  detectedNumber: string;
  manualNumber: string;
  iccId: string;
  isActive: boolean;
}

interface SimModuleInterface {
  getSimInfo(): Promise<SimInfo[]>;
  setManualNumber(subId: number, number: string): Promise<boolean>;
}

const { SimModule } = NativeModules as { SimModule: SimModuleInterface };

export default {
  getSimInfo: (): Promise<SimInfo[]> =>
    SimModule.getSimInfo(),

  setManualNumber: (subId: number, number: string): Promise<boolean> =>
    SimModule.setManualNumber(subId, number),
};
