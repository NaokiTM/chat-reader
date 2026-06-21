import { Image } from 'expo-image';
import { Button, FlatList, Platform,  Pressable,  StyleSheet, Text, View } from 'react-native'
import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { SafeAreaView} from 'react-native-safe-area-context';
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from 'expo-file-system'; 
import { useEffect, useState } from 'react';
import { router } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";
import AsyncStorage from '@react-native-async-storage/async-storage';


// type outside to avoid re-render
type Book = {
  id: string;
  title: string;
  uri: string;
  type: "epub" | "pdf" | "docx";
};


export default function TabTwoScreen() {

const BOOKS_KEY = 'stored_books';

  const [books, setBooks] = useState<Book[]>([]);

  // Load books from storage on mount
  useEffect(() => {
    const loadBooks = async () => {
      const json = await AsyncStorage.getItem(BOOKS_KEY);
      if (json) {
        const parsed: Book[] = JSON.parse(json);
        // Migrate old books that don't have a type
        const migrated = parsed.map((b) => ({
          ...b,
          type: b.type ?? "epub",
        }));
        setBooks(migrated);
      }
    };
    loadBooks();
  }, []);

  // Save books to storage whenever list changes
  useEffect(() => {
    AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  }, [books]);

  const importBook = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/epub+zip",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      multiple: true, // optional: allow importing multiple at once
    });

    if (result.canceled) return;

    const booksDir = new Directory(Paths.document, "books");
    if (!booksDir.exists) booksDir.create();

    const newBooks: Book[] = [];

    for (const asset of result.assets) {
      const destination = new File(booksDir, asset.name);
      if (destination.exists) destination.delete();

      const source = new File(asset.uri);
      source.copy(destination);

      const extension = asset.name.split(".").pop()?.toLowerCase();
      const fileType: Book["type"] =
        extension === "pdf" ? "pdf"
        : extension === "docx" ? "docx"
        : "epub";

      newBooks.push({
        id: Date.now().toString() + Math.random(),
        title: asset.name.replace(/\.(epub|pdf|docx)$/i, ""),
        uri: destination.uri,
        type: fileType,
      });
    }

    setBooks((prev) => [...prev, ...newBooks]);
  };


  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.badge}>{item.type?.toUpperCase() ?? "EPUB"}</Text>
          </Pressable>
        )}
      />
      <View style={styles.addBookButton}>
        <View>
          <Text>My Books</Text>
        </View>

        <Pressable style={styles.squareButton} onPress={importBook}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>


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
    padding: 35,
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
  badge: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
