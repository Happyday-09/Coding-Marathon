// ============================================
// 🧭 App Navigator — Bottom Tabs + Stack
// ============================================

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { User, BottomTabParamList, RootStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import RunScreen from '../screens/RunScreen';
import CourseListScreen from '../screens/CourseListScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import BattleScreen from '../screens/BattleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PersonalParametersScreen from '../screens/PersonalParametersScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RunHistoryScreen from '../screens/RunHistoryScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  user: User;
  onLogout: () => void;
}

function TabNavigator({ user, onLogout }: AppNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Run') iconName = focused ? 'fitness' : 'fitness-outline';
          else if (route.name === 'Courses') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Battle') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return (
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? '#5B5FEF' : '#C0C0CC'}
              />
              {focused && <View style={styles.tabDot} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Run">
        {(props) => <RunScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Courses">
        {(props) => <CourseListScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Battle">
        {(props) => <BattleScreen {...props} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user, onLogout }: AppNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main">
        {() => <TabNavigator user={user} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen name="PersonalParameters">
        {(props) => (
          <PersonalParametersScreen
            {...props}
            userId={user.id}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Settings">
        {(props) => <SettingsScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="RunHistory">
        {(props) => (
          <RunHistoryScreen
            {...props}
            userId={(props.route.params as { userId: string }).userId}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 5,
  },
  tabIconContainer: {
    alignItems: 'center',
    gap: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5B5FEF',
  },
});
