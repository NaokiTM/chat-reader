import { Pressable, StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '@/constants/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Bookmark } from '@/components/ui/bookmark';
import { buildReaderHtml } from '@/constants/readerHtml';

// message template to send to AI chat
type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
};

// type to indicate what information a active bookmark contains
type BookmarkSlot = { chapterIndex: number; scrollY: number } | null;

// template languages for MagicTranslate
const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Mandarin Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian",
  "Dutch", "Turkish",
];

export default function HomeScreen() {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const PANEL_WIDTH = SCREEN_WIDTH;
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const translateSlideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const [chatOpen, setChatOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [base64, setBase64] = useState<string | null>(null);
  const [chapterInfo, setChapterInfo] = useState({ index: 0, total: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookReady, setBookReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkSlot[]>([null, null, null]);
  const webViewRef = useRef<WebView>(null);
  const pendingSaveSlotRef = useRef<number | null>(null);

  //visibility of nav bar and menu (invisible when scrolling down)
  //navAnim controls this visibility by setting opacity accordingly (opacity set using a style below)
  const [navVisible, setNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(1)).current;

  const bookmarkBottom = useRef(new Animated.Value(56)).current;

  useEffect(() => {
    Animated.timing(bookmarkBottom, {
      toValue: navVisible ? 55 : 0,  // ← was 56
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [navVisible]);

  // an easing effect is added when the nav goes invisible
  useEffect(() => {
    Animated.timing(navAnim, {
      toValue: navVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [navVisible]);

  // close nav menus when nav goes invisible
  // (pointerEvents: "none") chrome.
  useEffect(() => {
    if (!navVisible) {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }, [navVisible]);

  // OPENS the ai chat window. close interfering menus too. 
  const openChat = () => {
    if (translateOpen) closeTranslate();
    setChatOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // CLOSES the ai chat window. 
  const closeChat = () => {
    Animated.timing(slideAnim, {
      toValue: -PANEL_WIDTH,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setChatOpen(false));
  };

  // OPENS the translate panel. close interfering menus too. 
  const openTranslate = () => {
    if (chatOpen) closeChat();
    setTranslateOpen(true);
    Animated.timing(translateSlideAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // CLOSES the translate panel.
  const closeTranslate = () => {
    Animated.timing(translateSlideAnim, {
      toValue: -PANEL_WIDTH,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setTranslateOpen(false));
  };

  // helper function to pass a menu in and open or close it. closes the menu after the action is performed.
  const handleMenuSelect = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  // uri is effectively the file path to the epub book that the reader sends to the webview. 
  const { uri } = useLocalSearchParams<{ uri: string; title: string; type: string }>();

  // load base64 (the book contents) from the books uri, when the uri changes
  useEffect(() => {
    if (!uri || typeof uri !== "string") return;
    const load = async () => {
      try {
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setBase64(b64);
      } catch (e) {
        console.log("Read error:", e);
      }
    };
    load();
  }, [uri]);

  //sends the next or previous chapter action to webview. the webview can then rerender the chapter to either previous or next
  const sendToWebView = (action: "next" | "prev") => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "${action}" }) }));
      true;
    `);
  };

  //sends the search action to the webview to search in the book contents loaded in webview. 
  const runSearch = (query: string) => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "search", query: ${JSON.stringify(query)} }) }));
      true;
    `);
  };

  // close the search bar. 
  const closeSearch = () => {
    runSearch(""); // empty query clears existing highlights
    setSearchOpen(false);
    setSearchQuery("");
  };

  //save the now active bookmark slot, and send the bookmark position to the webview
  const saveBookmark = (slot: number) => {
    pendingSaveSlotRef.current = slot;
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "scrollPos", y: window.scrollY }));
      true;
    `);
  };

  // when the bookmark is pressed, it uses the goto action to scroll to the position its saved as 
  const handleBookmarkPress = (slot: number) => {
    const bm = bookmarks[slot];
    if (bm) {
      webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "goto", index: ${bm.chapterIndex}, scrollY: ${bm.scrollY} }) }));
        true;
      `);
    } else {
      saveBookmark(slot);
    }
  };

  // on long press remove the bookmark
  const handleBookmarkLongPress = (slot: number) => {
    setBookmarks((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  };

  //ask the question to ai, and await the response. throw an error and stop loading if response doesnt load
  const askQuestion = async () => {
    if (!input.trim() || !bookReady) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", text: question }]);
    setLoading(true);

    try {
      const bookId = uri!.split("/").pop() ?? uri!;
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, question, currentChapter: chapterInfo.index }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: Date.now().toString() + "ai", role: "ai", text: data.answer }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: Date.now().toString() + "ai", role: "ai", text: "Failed to get answer." }]);
    } finally {
      setLoading(false);
    }
  };

  // Extra top padding inside the WebView's own document so the chapter title
  // starts below the burger button initially. Lives in the page's own
  // scroll content (not a fixed RN overlay), so it scrolls away naturally.
  const topInset = insets.top + 70;

  // loads the webview html including the top inset spacing above
  const html = buildReaderHtml(base64 ?? "", topInset);

  // if the uri of a book isnt loaded then show placeholder text
  if (!uri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>No book selected. Go to the Books tab to pick one.</Text>
      </View>
    );
  }

  // if the book (uri) is exists but its content hasnt loaded, then show loading text
  if (!base64) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>Loading book...</Text>
      </View>
    );
  }

  // here set the fading opacity of the nav when the book is scrolled down.
  const navStyle = {
    opacity: navAnim,
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html }}
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "chapterChange") {
              setChapterInfo({ index: msg.index, total: msg.total });
            }
            if (msg.type === "nav") {
              setNavVisible(msg.visible);
            }
            if (msg.type === "scrollPos" && pendingSaveSlotRef.current !== null) {
              const slot = pendingSaveSlotRef.current;
              pendingSaveSlotRef.current = null;
              setBookmarks((prev) => {
                const next = [...prev];
                next[slot] = { chapterIndex: chapterInfo.index, scrollY: msg.y };
                return next;
              });
            }
            if (msg.type === "chapters") {
              const bookId = uri!.split("/").pop() ?? uri!;
              fetch(`${API_URL}/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId, chapters: msg.chapters }),
              })
                .then((r) => r.json())
                .then((data) => {
                  console.log("Indexed:", data);
                  setBookReady(true);
                })
                .catch((e) => console.log("Index error:", e));
            }
          } catch {}
        }}
      />

      {/* TOP RIGHT BAR: bookmarks + burger menu, or search bar */}
      <Animated.View
        style={[styles.topBar, { top: insets.top + 8 }, navStyle]}
        pointerEvents={navVisible ? "auto" : "none"}
      >
        {searchOpen ? (
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search this chapter..."
              placeholderTextColor="#999"
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => runSearch(searchQuery)}
            />
            <Pressable style={styles.searchIconButton} onPress={() => runSearch(searchQuery)}>
              <IconSymbol size={18} name="magnifyingglass" color="white" />
            </Pressable>
            <Pressable style={styles.searchIconButton} onPress={closeSearch}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable style={styles.burgerButton} onPress={() => setMenuOpen((v) => !v)}>
              <IconSymbol size={22} name="line.horizontal.3" color="white" />
            </Pressable>

            {menuOpen && (
              <View style={styles.dropdown}>
                <Pressable style={styles.dropdownItem} onPress={() => handleMenuSelect(openTranslate)}>
                  <Text style={styles.dropdownText}>MagicTranslate</Text>
                </Pressable>
                <Pressable style={styles.dropdownItem} onPress={() => handleMenuSelect(() => setSearchOpen(true))}>
                  <Text style={styles.dropdownText}>Search Chapter</Text>
                </Pressable>
                <Pressable style={[styles.dropdownItem, styles.dropdownItemLast]} onPress={() => handleMenuSelect(openChat)}>
                  <Text style={styles.dropdownText}>Ask AI</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </Animated.View>

      {/* BOTTOM CHAPTER NAV */}
      <Animated.View style={[styles.bottomNav, navStyle]} pointerEvents={navVisible ? "auto" : "none"}>
        <Pressable onPress={() => sendToWebView("prev")}>
          <Text style={styles.arrowText}>← Prev</Text>
        </Pressable>

        <Text style={styles.chapterIndicator}>
          {chapterInfo.total ? `${chapterInfo.index + 1} / ${chapterInfo.total}` : ""}
        </Text>

        <Pressable onPress={() => sendToWebView("next")}>
          <Text style={styles.arrowText}>Next →</Text>
        </Pressable>
      </Animated.View>

      {/* BOOKMARK BAR */}
      <Animated.View
        style={[styles.bookmarkBar, { bottom: bookmarkBottom }]}
        pointerEvents="auto"
      >
        <Bookmark
          size={25}
          activeColor="#d20f39"
          inactiveColor="#d20f39"
          active={!!bookmarks[0]}
          onPress={() => handleBookmarkPress(0)}
          onLongPress={() => handleBookmarkLongPress(0)}
        />
        <Bookmark
          size={25}
          activeColor="#df8e1d"
          inactiveColor="#df8e1d"
          active={!!bookmarks[1]}
          onPress={() => handleBookmarkPress(1)}
          onLongPress={() => handleBookmarkLongPress(1)}
        />
        <Bookmark
          size={25}
          activeColor="#7287fd"
          inactiveColor="#7287fd"
          active={!!bookmarks[2]}
          onPress={() => handleBookmarkPress(2)}
          onLongPress={() => handleBookmarkLongPress(2)}
        />
      </Animated.View>

      {/* AI CHAT PANEL — transparent + blurred */}
      {chatOpen && (
        <Animated.View
          style={[
            styles.chatPanel,
            {
              width: PANEL_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.chatTint]} />

          <View style={styles.chatContent}>
            <View style={[styles.chatHeader, { paddingTop: insets.top + 12 }]}>
              <Text style={styles.chatTitle}>Ask about the book</Text>
              <Pressable onPress={closeChat}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                  <Text style={styles.bubbleText}>{item.text}</Text>
                </View>
              )}
            />

            {loading && <Text style={styles.loadingText}>Thinking...</Text>}
            {!bookReady && <Text style={styles.loadingText}>Indexing book...</Text>}

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask something..."
                  placeholderTextColor="#aaa"
                  onSubmitEditing={askQuestion}
                />
                <Pressable style={styles.sendButton} onPress={askQuestion}>
                  <Text style={styles.sendText}>→</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      )}

      {/* MAGICTRANSLATE PANEL */}
      {translateOpen && (
        <Animated.View
          style={[
            styles.translatePanel,
            {
              width: PANEL_WIDTH,
              transform: [{ translateX: translateSlideAnim }],
            },
          ]}
        >
          <View style={[styles.chatHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.chatTitle}>MagicTranslate</Text>
            <Pressable onPress={closeTranslate}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable style={styles.languageRow}>
                <Text style={styles.languageText}>{item}</Text>
              </Pressable>
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fef0d8" },
  webview: { flex: 1, backgroundColor: "transparent" },
  placeholder: { fontSize: 18, color: "#333", padding: 20 },

  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",  // ← was space-between
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 10,
  },
  burgerButton: {
    backgroundColor: "#111",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    right: 8,
  },

  dropdown: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 190,
    backgroundColor: "#111",
    borderRadius: 14,
    overflow: "hidden",
  },

  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },

  dropdownItemLast: {
    borderBottomWidth: 0,
  },

  dropdownText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    backgroundColor: "#111",
    color: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
  },

  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#151515",
    paddingHorizontal: 20,
    // borderTopLeftRadius and borderTopRightRadius removed
    zIndex: 10,
    elevation: 10,
  },
  arrowText: { color: "white", fontSize: 20, fontWeight: "600" },
  chapterIndicator: { color: "white" },

  chatPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
    zIndex: 20,
    elevation: 20,
    overflow: "hidden",
  },

  chatTint: {
    backgroundColor: "rgba(10,10,10,0.35)",
  },

  chatContent: {
    flex: 1,
  },

  translatePanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#1a1a1a",
    zIndex: 20,
    elevation: 20,
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  chatTitle: {
    color: "white",
    fontSize: 18,
  },

  closeText: {
    color: "white",
    fontSize: 20,
  },

  bubble: {
    padding: 10,
    margin: 6,
    borderRadius: 10,
  },

  userBubble: { backgroundColor: "#333", alignSelf: "flex-end" },
  aiBubble: { backgroundColor: "#2a2a2a", alignSelf: "flex-start" },
  bubbleText: { color: "white" },

  loadingText: { color: "#aaa", padding: 8, textAlign: "center" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },

  input: {
    flex: 1,
    backgroundColor: "rgba(51,51,51,0.6)",
    color: "white",
    padding: 10,
    borderRadius: 8,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  sendText: { color: "white", fontSize: 20 },

  languageRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },

  languageText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  bookmarkBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    backgroundColor: "#111",
    zIndex: 11,       // ← was 9, now above chapter bar's 10
    elevation: 11,    // ← same for Android
  },
});