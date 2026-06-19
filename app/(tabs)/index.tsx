import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';  

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import { useState } from 'react';

//READ PAGE - SHOWS CURRENT BOOK BEING READ 

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showBar, setShowBar] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;

          // show when near top
          setShowBar(y < 50);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
        }}
      >
        <Text style={styles.text}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.

                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.


                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.

                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </Text>
      </ScrollView>
      {showBar && (
        <View style={styles.popup}>
          <Pressable style={styles.arrow}>
            <Text style={styles.arrowText}>← Prev</Text>
          </Pressable>

          <Pressable style={styles.arrow}>
            <Text style={styles.arrowText}>Next →</Text>
          </Pressable>
        </View>
      )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#cbfeff",
  },

  text: {
    fontSize: 20,
    lineHeight: 26,
    color: "#000",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  popup: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    flexDirection: "row",
    justifyContent: "space-between",

    backgroundColor: "#111",

    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  arrow: {
    padding: 10,
  },

  arrowText: {
    color: "white",
    fontSize: 20,
  },
});
