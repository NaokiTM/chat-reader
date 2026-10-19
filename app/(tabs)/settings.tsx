import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "../../tabstyles/settingsStyles";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

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

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Import font</Text>
      </Pressable>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Change font</Text>
      </Pressable>

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

