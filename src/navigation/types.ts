import type {NavigatorScreenParams} from '@react-navigation/native';

export type ConfigStackParamList = {
  SmtpConfig: undefined;
  SimManagement: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Logs: undefined;
  Config: NavigatorScreenParams<ConfigStackParamList>;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
