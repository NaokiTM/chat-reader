import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.titleContainer}>
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText type="subtitle">This is the settings screen.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});