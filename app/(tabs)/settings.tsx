
import { ScrollView, StyleSheet, Text, Pressable, View, Animated, Dimensions, Easing } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../../tabstyles/settingsStyles";
import * as DocumentPicker from "expo-document-picker";
import Slider from "@react-native-community/slider";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Directory, File, Paths } from "expo-file-system";

type PanelKind = "about" | "howto";

const PANELS: Record<PanelKind, { title: string; sections: { heading?: string; body: string }[] }> = {
  about: {
    title: "About",
    sections: [
      {
        body: "AI Chat Reader is an ebook reader with an AI assistant built in. Open a book, read it chapter by chapter, and get help without leaving the page.",
      },
      {
        heading: "What it can do",
        body: "Ask questions about the book you're reading, translate a word in context, get a line explained in plain language, and get a short recap of your last chapter when you come back to a book.",
      },
      {
        heading: "Made for reading",
        body: "Search within a chapter, drop up to three colour-coded bookmarks, and switch between light and dark themes. You can also change the font and font size, or import your own fonts.",
      },
      {
        heading: "Good to know",
        body: "Only EPUB files can be read at the moment. AI features work once a book has finished indexing.",
      },
    ],
  },
  howto: {
    title: "How to use",
    sections: [
      {
        heading: "1. Add a book",
        body: "Go to the Books tab and tap +. Pick one or more EPUB files. Tap a book to open it in the reader.",
      },
      {
        heading: "2. Read",
        body: "Scroll to read. The bars hide as you scroll down and return when you scroll up. Use Prev and Next at the bottom to change chapter. The app remembers where you stopped.",
      },
      {
        heading: "3. Ask AI",
        body: "Open Menu, then Ask AI. Type a question about the book. You can ask once the Indexing book bar at the bottom disappears.",
      },
      {
        heading: "4. Translate or explain",
        body: "Choose a language under Menu, then MagicTranslate. Then select text in the book and tap Translate to replace it with the translation, or Explain this line for a simple explanation.",
      },
      {
        heading: "5. Search a chapter",
        body: "Open Menu, then Search Chapter. Matches in the current chapter are highlighted.",
      },
      {
        heading: "6. Bookmarks",
        body: "Tap an empty bookmark to save your spot. Tap a saved one to jump back. Double-tap it to clear it. Bookmarks reset when you reopen a book.",
      },
      {
        heading: "7. Make it yours",
        body: "In Settings, switch theme, pick a font, change the font size, or import your own font file.",
      },
    ],
  },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  // placeholder fonts to go into the font selector
  const fonts = [
    { name: "Default", family: "System" },
    { name: "Serif", family: "serif" },
    { name: "Sans", family: "sans-serif" },
    { name: "Mono", family: "monospace" },
  ];

  const [bookmarkBarEnabled, setBookmarkBarEnabled] = useState(true);
  const [chapterSummaryEnabled, setChapterSummaryEnabled] = useState(true);
  // const [isDarkMode, setIsDarkMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const PANEL_WIDTH = Dimensions.get("window").width;
  const [slideAnim] = useState(() => new Animated.Value(-PANEL_WIDTH));
  const [panel, setPanel] = useState<PanelKind | null>(null);

  const openPanel = (kind: PanelKind) => {
    setPanel(kind);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(slideAnim, {
      toValue: -PANEL_WIDTH,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setPanel(null));
  };

  const panelContent = panel ? PANELS[panel] : null;


  const {
    theme, isDark, colors, toggleTheme,
    fontFamily: selectedFont, setFontFamily: setSelectedFont,
    fontSize, setFontSize,
    customFonts, addCustomFont,
  } = useTheme();

  // allows the user to import their own fonts into the app to use
  async function pickFont() {
    // font MIME types are unreliable on Android, so accept anything and check the extension
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const ext = asset.name.split(".").pop()?.toLowerCase() ?? "";
    const formats = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" } as const;
    const format = formats[ext as keyof typeof formats];
    if (!format) return; // not a font file

    const dir = new Directory(Paths.document, "fonts");
    if (!dir.exists) dir.create();

    const id = Date.now().toString();
    const dest = new File(dir, `${id}.${ext}`);
    new File(asset.uri).copy(dest);

    addCustomFont({
      id,
      name: asset.name.replace(/\.\w+$/, ""),
      family: `custom-${id}`,
      fileName: dest.name,
      format,
    });
  }

  const allFonts = [
    ...fonts,
    ...customFonts.map((f) => ({ name: f.name, family: f.family })),
  ];

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
    <View style={{ flex: 1 }}>
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
            {allFonts.map((font) => {
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
          onPress={toggleTheme}
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
          style={[styles.item, { backgroundColor: colors.button, borderColor: colors.border }]}
          onPress={() => openPanel("howto")}
        >
          <Text style={[styles.rowText, { color: colors.text }]}>How to use</Text>
        </Pressable>

        <Pressable
          style={[styles.item, { backgroundColor: colors.button, borderColor: colors.border }]}
          onPress={() => openPanel("about")}
        >
          <Text style={[styles.rowText, { color: colors.text }]}>About</Text>
        </Pressable>
      </Animated.ScrollView>
      
      {panelContent && (
        <Animated.View
          style={[
            styles.panel,
            { width: PANEL_WIDTH, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={[styles.panelHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.panelTitle}>{panelContent.title}</Text>
            <Pressable
              style={[styles.panelClose, { top: insets.top + 20 }]}
              onPress={closePanel}
            >
              <Text style={styles.panelCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: insets.bottom + 24,
              gap: 18,
            }}
          >
            {panelContent.sections.map((s, i) => (
              <View key={i}>
                {s.heading && <Text style={styles.panelHeading}>{s.heading}</Text>}
                <Text style={styles.panelBody}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}
