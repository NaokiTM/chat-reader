import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from 'react';
import { Directory, File, Paths } from "expo-file-system";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import styles from '../../tabstyles/booksStyles';


//type outside function to avoid re-render
// defines the structure of every book object added to books list 
type Book = {
  id: string;
  title: string;
  uri: string;
  type: "epub" | "pdf" | "docx";
};

//a persistent key to store the books list in AsyncStorage. prevents reset of books list on app reload
const BOOKS_KEY = 'stored_books';

// function to render book list screen
export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();  //areas that shouldnt overlap. used for padding in styles
  const [books, setBooks] = useState<Book[]>([]);  //the array of books being stored
  const [deleteMode, setDeleteMode] = useState(false);   //triggered when the trash can is pressed so users can delete multiple books

  // resets the books but filters out the one the user wants to delete
  const deleteBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  // Load books from storage on mount. only gets books saved in BOOKS_KEY (asyncstorage)
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

  // Save book info to AsyncStorage whenever books list changes (not the book file itself)
  useEffect(() => {
    AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  }, [books]);


  const importBook = async () => {

    // lets the user select a document for MIME types epub, pdf, docx. 
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/epub+zip",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      multiple: true,  //user can select multiple files at once
    });

    // if the user leaves the document picker without selecting a file then stop function
    if (result.canceled) return;

    // create a directory for books if it doesn't exist
    const booksDir = new Directory(Paths.document, "books");
    if (!booksDir.exists) booksDir.create();

    // create an array to hold the new books that will be added to the books list
    const newBooks: Book[] = [];

    
    // loop through the selected files and copy them to the books directory, then add them to the books list  
    for (const asset of result.assets) {

      // create a destination file path for the selected book in the books directory
      const destination = new File(booksDir, asset.name);

      // delete duplicate files
      if (destination.exists) destination.delete();

      // find the book source file, and add it to the new destination file path in the app
      const source = new File(asset.uri);
      source.copy(destination);

      // determine the file type based on the extension, and set the book type accordingly. default is EPUB
      const extension = asset.name.split(".").pop()?.toLowerCase();
      let fileType: Book["type"];

      if (extension === "pdf") {
          fileType = "pdf";
      } else if (extension === "docx") {
          fileType = "docx";
      } else {
          fileType = "epub";
      }

      // push the new book onto the array (each book pushed seperately inside the loop above)
      newBooks.push({
        id: Date.now().toString() + Math.random(),
        title: asset.name.replace(/\.(epub|pdf|docx)$/i, ""),
        uri: destination.uri,
        type: fileType,
      });
    }

    // update the books array with the previous books, + all new books
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

