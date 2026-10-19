
import { ScrollView, StyleSheet, Text, Pressable, View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../../tabstyles/settingsStyles";
import * as DocumentPicker from "expo-document-picker";
import Slider from "@react-native-community/slider";
import { useState, useRef, useEffect } from "react";

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
  const [fontSize, setFontSize] = useState(16);
  const [bookmarkBarEnabled, setBookmarkBarEnabled] = useState(true);
  const [chapterSummaryEnabled, setChapterSummaryEnabled] = useState(true);
  // const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState("light");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = theme === "dark";

  // for changing the colours in themes
  const colors = {
    background: isDark ? "#121212" : "#FFFFFF",
    surface: isDark ? "#1E1E1E" : "#F2F2F2",
    button: isDark ? "#333333" : "#E5E5E5",
    text: isDark ? "#FFFFFF" : "#111111",
    secondaryText: isDark ? "#BBBBBB" : "#666666",
    border: isDark ? "#444444" : "#DDDDDD",
    accent: isDark ? "#FFFFFF" : "#555555",
  };

  // allows the user to import their own fonts into the app to use
  async function pickFont() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["font/ttf", "font/otf", "font/woff", "font/woff2"],
      copyToCacheDirectory: true,
    });

    // if they cancel file selection
    if (result.canceled) {
      console.log("User cancelled");
      return;
    }

    const file = result.assets[0];

    console.log("Name:", file.name);
    console.log("URI:", file.uri);
  }

  // theme
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDark]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FFFFFF", "#121212"],
  });

  const textColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#111111", "#FFFFFF"],
  });

  return (
    <Animated.ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 20,
      }}
    >
      {/* READING */}
      <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
        Reader
      </Animated.Text>

      <Pressable
        style={[
          styles.toggleItem,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
        onPress={() => setBookmarkBarEnabled(prev => !prev)}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          Bookmark bar
        </Text>
        <Text style={[styles.toggleStatus, { color: colors.secondaryText }]}>
          {bookmarkBarEnabled ? "Enabled" : "Disabled"}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.toggleItem,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
        onPress={() => setChapterSummaryEnabled(prev => !prev)}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          Toggle chapter summary
        </Text>
        <Text style={[styles.toggleStatus, { color: colors.secondaryText }]}>
          {chapterSummaryEnabled ? "Enabled" : "Disabled"}
        </Text>
      </Pressable>

      {/* FONTS */}
      <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
        Fonts
      </Animated.Text>

      <Pressable
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
        onPress={pickFont}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          Import font
        </Text>
      </Pressable>

      <View
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
      >
        <View style={styles.sliderHeader}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            Font size
          </Text>
          <Text style={[styles.fontSizeLabel, { color: colors.secondaryText }]}>
            {fontSize}px
          </Text>
        </View>

        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={8}
          maximumValue={30}
          step={1}
          value={fontSize}
          onValueChange={setFontSize}
          onSlidingComplete={(value) => {
            setFontSize(value);
            // Save the selected font size here
          }}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />

        <Text
          style={{
            fontSize,
            color: colors.text,
            fontFamily:
              selectedFont === "System" ? undefined : selectedFont,
          }}
        >
          Preview your reading text.
        </Text>
      </View>

      {/* font selector carousel */}
      <View
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          Change font
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
        >
          {fonts.map((font) => {
            const selected = selectedFont === font.family;

            // selected = inverted (stands out), unselected = matches the other buttons
            const cardBackground = selected
              ? (isDark ? colors.text : "#333333")
              : colors.button;
            const cardText = selected ? colors.background : colors.text;

            return (
              <Pressable
                key={font.name}
                onPress={() => setSelectedFont(font.family)}
                style={[
                  styles.fontCard,
                  {
                    backgroundColor: cardBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontPreview,
                    {
                      color: cardText,
                      fontFamily:
                        font.family === "System" ? undefined : font.family,
                    },
                  ]}
                >
                  Aa Bb
                </Text>

                <Text style={[styles.fontName, { color: cardText }]}>
                  {font.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* THEME */}
      <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
        Theme
      </Animated.Text>

      <Pressable
        style={[
          styles.toggleItem,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
        onPress={() =>
          setTheme(prev => (prev === "light" ? "dark" : "light"))
        }
      >
        <Animated.Text style={[styles.rowText, { color: textColor }]}>
          Current theme
        </Animated.Text>

        <Animated.Text style={[styles.toggleStatus, { color: textColor }]}>
          {theme === "dark" ? "Dark" : "Light"}
        </Animated.Text>
      </Pressable>

      {/* AI FEATURES */}
      <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
        AI & assistance
      </Animated.Text>

      <Pressable
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          placeholder
        </Text>
      </Pressable>

      {/* App and storage */}
      <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
        App & storage
      </Animated.Text>

      <Pressable
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>Cache</Text>
      </Pressable>

      <Pressable
        style={[
          styles.item,
          { backgroundColor: colors.button, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>About</Text>
      </Pressable>
    </Animated.ScrollView>
  );
}
