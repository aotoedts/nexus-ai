import React from 'react';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../screens/LoginScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootStackParamList = {
  Chat: { conversationId?: string } | undefined;
  Conversations: undefined;
};

export type TabParamList = {
  ChatTab: undefined;
  SettingsTab: undefined;
};

const ChatStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createNativeStackNavigator();

/** Tema escuro do React Navigation, alinhado com a paleta do Nexus AI. */
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
      <ChatStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'Histórico' }}
      />
    </ChatStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.ink[900], borderTopColor: colors.ink[800] },
        tabBarActiveTintColor: colors.nexus[400],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'ChatTab'
              ? ('chatbubble-ellipses-outline' as const)
              : ('settings-outline' as const);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ChatTab" component={ChatStackNavigator} options={{ title: 'Chat' }} />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Configurações', headerShown: true }}
      />
    </Tab.Navigator>
  );
}

/**
 * Raiz da navegacao: mostra o fluxo de login enquanto nao ha sessao
 * autenticada, e troca para as abas principais (Chat + Configuracoes)
 * assim que o usuario entra. A troca acontece automaticamente porque
 * useAuthStore e reativo (zustand).
 */
export function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer theme={navTheme}>
      {token ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
