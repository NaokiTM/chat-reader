import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../../tabstyles/settingsStyles";
import * as DocumentPicker from 'expo-document-picker';
import { useState } from "react";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();


  // placeholder fonts to go into the font selector
  const fonts = [
    { name: "Default", family: "System" },
    { name: "Serif", family: "serif" },
    { name: "Sans", family: "sans-serif" },
    { name: "Mono", family: "monospace" },
  ];

  const [selectedFont, setSelectedFont] = useState("System");

  // allows the user to import their own fonts into the app to use
  async function pickFont() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["font/ttf", "font/otf", "font/woff", "font/woff2"],
      copyToCacheDirectory: true,
    });

    // if they cancel file selection
    if (result.canceled) {
      console.log('User cancelled');
      return;
    }

    const file = result.assets[0];

    console.log('Name:', file.name);
    console.log('URI:', file.uri);
  }

  

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 20,
      }}
    >
      {/* READING */}
      <Text style={styles.sectionTitle}>Reader</Text>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Hide bookmarks</Text>
      </Pressable>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Toggle chapter summary</Text>
      </Pressable>
      

      {/* FONTS */}
      <Text style={styles.sectionTitle}>Fonts</Text>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Font Size</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={pickFont}>
        <Text style={styles.rowText}>Import font</Text>
      </Pressable>

      <View>
        <Text style={styles.rowText}>Change font</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
        >
          {fonts.map((font) => (
            <Pressable
              key={font.name}
              onPress={() => setSelectedFont(font.family)}
              style={[
                styles.fontCard,
                selectedFont === font.family && styles.selectedFontCard,
              ]}
            >
              <Text
                style={[
                  styles.fontPreview,
                  { fontFamily: font.family === "System" ? undefined : font.family },
                ]}
              >
                Aa Bb
              </Text>

              <Text style={styles.fontName}>{font.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* THEME */}
      <Text style={styles.sectionTitle}>Theme</Text>
      <Pressable style={styles.item}>
        <Text style={styles.rowText}>dark / light</Text>
      </Pressable>

      {/* AI FEATURES */}
      <Text style={styles.sectionTitle}>AI & assistance</Text>
      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Cache</Text>
      </Pressable>

      {/* App and storage */}
      <Text style={styles.sectionTitle}>App & storage</Text>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Cache</Text>
      </Pressable>
      <Pressable style={styles.item}>
        <Text style={styles.rowText}>About</Text>
      </Pressable>
    </ScrollView>
  );
}

