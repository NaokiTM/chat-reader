import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from 'react';
import { Directory, File, Paths } from "expo-file-system";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import styles from './styles/booksStyles';


// type outside to avoid re-render
type Book = {
  id: string;
  title: string;
  uri: string;
  type: "epub" | "pdf" | "docx";
};

const BOOKS_KEY = 'stored_books';

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);

  const deleteBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  // Load books from storage on mount
  useEffect(() => {
    const loadBooks = async () => {
      const json = await AsyncStorage.getItem(BOOKS_KEY);  
      if (json) {
        const parsed: Book[] = JSON.parse(json);
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
      multiple: true,
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card}   onPress={() => !deleteMode && router.push({ 
              pathname: "/", 
              params: { uri: item.uri, title: item.title, type: item.type } 
            })}
          >
            {deleteMode && (
              <Pressable
                style={styles.deleteX}
                onPress={() => deleteBook(item.id)}
              >
                <Text style={styles.deleteXText}>✕</Text>
              </Pressable>
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.badge}>{item.type?.toUpperCase() ?? "EPUB"}</Text>
          </Pressable>
        )}
      />
      <View style={styles.bottomRow}>
        <Pressable
          style={[styles.squareButton, deleteMode && styles.squareButtonActive]}
          onPress={() => setDeleteMode((prev) => !prev)}
        >
          <IconSymbol name="trash.fill" color="white" size={30} />
        </Pressable>
        <Pressable style={styles.squareButton} onPress={importBook}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

