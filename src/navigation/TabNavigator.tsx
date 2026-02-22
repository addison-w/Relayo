import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {MainTabParamList, ConfigStackParamList} from './types';
import DashboardScreen from '../screens/DashboardScreen';
import LogsScreen from '../screens/LogsScreen';
import SmtpConfigScreen from '../screens/SmtpConfigScreen';
import SimManagementScreen from '../screens/SimManagementScreen';
import CustomTabBar from '../components/CustomTabBar';
import {colors} from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ConfigStack = createNativeStackNavigator<ConfigStackParamList>();

const ConfigNavigator = () => {
  return (
    <ConfigStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.bg},
      }}>
      <ConfigStack.Screen name="SmtpConfig" component={SmtpConfigScreen} />
      <ConfigStack.Screen
        name="SimManagement"
        component={SimManagementScreen}
      />
    </ConfigStack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Logs" component={LogsScreen} />
      <Tab.Screen name="Config" component={ConfigNavigator} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
