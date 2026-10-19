import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Pressable } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        

        // remove ripple effect on tab button press (not tested on ios)
        tabBarButton: (props) => (
          <Pressable
            {...props}
            android_ripple={null}
            style={props.style}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Read',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="glasses" color={color} />,
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: 'Books',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
