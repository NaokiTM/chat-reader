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
      {/* PROFILE HEADER */}
      <View style={styles.profileRow}>
        <View style={styles.textContainer}>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>john.doe@email.com</Text>
        </View>
      </View>

      {/* ACCOUNT */}
      <Text style={styles.sectionTitle}>Account</Text>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Profile</Text>
      </Pressable>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Change Password</Text>
      </Pressable>

      {/* READING */}
      <Text style={styles.sectionTitle}>Reading</Text>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Font Size</Text>
      </Pressable>

      <Pressable style={styles.item}>
        <Text style={styles.rowText}>Theme</Text>
      </Pressable>
    </ScrollView>
  );
}

