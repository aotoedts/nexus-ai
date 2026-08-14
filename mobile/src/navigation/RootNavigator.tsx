import React from 'react';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../screens/LoginScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootStackParamList = {
  Chat: { conversationId?: string } | undefined;
  Settings: undefined;
};

const ChatStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink[950],
    card: colors.ink[900],
    border: colors.ink[800],
    text: colors.text.primary,
    primary: colors.nexus[500],
  },
};

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink[900] },
        headerTitleStyle: { color: colors.text.primary, fontSize: 16 },
        headerTintColor: colors.text.primary,
      }}
    >
      <ChatStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Nexus AI' }} />
      <ChatStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
    </ChatStack.Navigator>
  );
}

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer theme={navTheme}>
      {token ? (
        <ChatStackNavigator />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
