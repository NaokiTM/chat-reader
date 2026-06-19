import { Image } from 'expo-image';
import { Button, FlatList, Platform,  Pressable,  StyleSheet, Text, View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { SafeAreaView} from 'react-native-safe-area-context';

const books = Array.from({ length: 10 }).map((_, i) => ({
  id: String(i),
  title: `Book ${i + 1}`,
}));

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.container}>

      {/* FOR WHEN I WANT TO IMPORT REAL BOOKS */}
      {/* <FlatList
        data={books}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/book/${item.id}`)}
          >
            <Text style={styles.title}>{item.title}</Text>
          </Pressable>
        )}
      /> */}

      <View style={styles.addBookButton}>
        <View>
          <Text>My Books</Text>
        </View>

        <Pressable style={styles.squareButton}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => console.log(`Pressed ${item.title}`)}
          >
            <Text style={styles.title}>{item.title}</Text>
          </Pressable>
        )}
      />  
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    margin: 6,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  addBookButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },

  squareButton: {
    width: 40,
    height: 40,

    borderRadius: 8,

    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
});
