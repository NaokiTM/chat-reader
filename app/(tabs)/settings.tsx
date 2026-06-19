import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  profileRow: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    marginBottom: 20,
  },

  textContainer: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },

  item: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    marginBottom: 10,
  },

  rowText: {
    fontSize: 16,
    color: "#111",
  },
});