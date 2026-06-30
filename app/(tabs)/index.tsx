import { Bookmark } from "@/components/ui/bookmark";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { API_URL } from "@/constants/api";
import { writeReaderHtmlFile } from "@/constants/readerHtml";
import { BlurView } from "expo-blur";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// message template to send to AI chat
type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
};

// type to indicate what information an active bookmark contains
type BookmarkSlot = { chapterIndex: number; scrollY: number } | null;

// template languages for MagicTranslate
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Mandarin Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
  "Dutch",
  "Turkish",
];

const BOOKMARK_BAR_WIDTH = 130;

export default function HomeScreen() {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const PANEL_WIDTH = SCREEN_WIDTH;

  // animation values for the AI chat and translate panels sliding in from the left
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const translateSlideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  const [chatOpen, setChatOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [chapterInfo, setChapterInfo] = useState({ index: 0, total: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // true once the backend has finished indexing the book and is ready to answer questions
  const [bookReady, setBookReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // three bookmark slots, each storing a chapter index and scroll position, or null if unset
  const [bookmarks, setBookmarks] = useState<BookmarkSlot[]>([
    null,
    null,
    null,
  ]);
  const webViewRef = useRef<WebView>(null);

  // holds the slot index while waiting for the WebView to reply with its current scrollY
  const pendingSaveSlotRef = useRef<number | null>(null);

  // visibility of nav bar and menu (invisible when scrolling down)
  // navAnim controls this visibility by setting opacity accordingly
  const [navVisible, setNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(1)).current;

  // drives the bookmark bar's lift/rounding when the chapter bar fades out.
  // separate from navAnim since layout props (bottom/right/borderRadius)
  // can't share a native-driven Animated.Value with opacity.
  const bookmarkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(bookmarkAnim, {
      toValue: navVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [navVisible]);

  // path to the reader.html file written to disk (null until it's been written)
  const [htmlUri, setHtmlUri] = useState<string | null>(null);

  // uri is effectively the file path to the epub book that the reader sends to the webview.
  // declared early since the effects below depend on it.
  const { uri } = useLocalSearchParams<{
    uri: string;
    title: string;
    type: string;
  }>();

  // extra top padding inside the WebView's own document so the chapter title
  // starts below the burger button initially. lives in the page's own
  // scroll content (not a fixed RN overlay), so it scrolls away naturally.
  const topInset = insets.top + 70;

  // slide the bookmark bar up/down in sync with nav visibility
  // useEffect(() => {
  //   Animated.timing(bookmarkBottom, {
  //     toValue: navVisible ? 55 : 0,
  //     duration: 220,
  //     easing: Easing.out(Easing.cubic),
  //     useNativeDriver: false, // 'bottom' is a layout prop, can't use native driver
  //   }).start();
  // }, [navVisible]);

  // an easing effect is added when the nav goes invisible
  useEffect(() => {
    Animated.timing(navAnim, {
      toValue: navVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [navVisible]);

  // close nav menus when nav goes invisible so they don't reappear mid-animation
  useEffect(() => {
    if (!navVisible) {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }, [navVisible]);

  // write the reader HTML out to an actual file on disk so the WebView loads it
  // with a real file:// origin (needed for it to be allowed to fetch() the epub).
  useEffect(() => {
    if (!uri || typeof uri !== "string") return;
    let cancelled = false;
    writeReaderHtmlFile(uri, topInset)
      .then((u) => {
        if (!cancelled) setHtmlUri(u);
      })
      .catch((e) => console.log("HTML write error:", e));
    return () => {
      cancelled = true;
    };
  }, [uri, topInset]);

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

  // sends the next or previous chapter action to webview. the webview can then rerender the chapter.
  const sendToWebView = (action: "next" | "prev") => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "${action}" }) }));
      true;
    `);
  };

  // sends the search action to the webview to highlight matches in the current chapter.
  const runSearch = (query: string) => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "search", query: ${JSON.stringify(query)} }) }));
      true;
    `);
  };

  // close the search bar and clear any existing highlights.
  const closeSearch = () => {
    runSearch(""); // empty query clears existing highlights
    setSearchOpen(false);
    setSearchQuery("");
  };

  // save the bookmark slot, requesting the WebView's current scrollY via postMessage.
  // the response is handled in onMessage below, keyed on pendingSaveSlotRef.
  const saveBookmark = (slot: number) => {
    pendingSaveSlotRef.current = slot;
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "scrollPos", y: window.scrollY }));
      true;
    `);
  };

  // when the bookmark is pressed, it uses the goto action to scroll to the position its saved as.
  // if empty, saves the current position instead.
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

  // ask the question to ai, and await the response. throw an error and stop loading if response doesnt load
  const askQuestion = async () => {
    if (!input.trim() || !bookReady) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: question },
    ]);
    setLoading(true);

    try {
      const bookId = uri!.split("/").pop() ?? uri!;
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          question,
          currentChapter: chapterInfo.index,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "ai", role: "ai", text: data.answer },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "ai",
          role: "ai",
          text: "Failed to get answer.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // if the uri of a book isn't loaded then show placeholder text
  if (!uri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>
          No book selected. Go to the Books tab to pick one.
        </Text>
      </View>
    );
  }

  // if the html file hasn't finished being written to disk yet, show a loading state
  if (!htmlUri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>Preparing book...</Text>
      </View>
    );
  }

  // fading opacity of the nav when the book is scrolled down
  const navStyle = {
    opacity: navAnim,
  };

  // bookmark bar lifts off the corner and fully rounds when the chapter bar fades.
  const bookmarkBottomOffset = bookmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const bookmarkRightOffset = bookmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });
  const bookmarkRadius = bookmarkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ uri: htmlUri }}
        originWhitelist={["*"]}
        allowFileAccess // lets the WebView read file:// URIs
        allowUniversalAccessFromFileURLs // lets a file:// page fetch() other file:// URIs
        allowFileAccessFromFileURLs
        allowingReadAccessToURL={uri} // iOS only: grants WKWebView read access to the epub
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);

            // update chapter position indicator in the bottom nav
            if (msg.type === "chapterChange") {
              setChapterInfo({ index: msg.index, total: msg.total });
            }

            // show/hide nav chrome based on scroll direction reported by the WebView
            if (msg.type === "nav") {
              setNavVisible(msg.visible);
            }

            // WebView replied with its scrollY — complete the pending bookmark save
            if (
              msg.type === "scrollPos" &&
              pendingSaveSlotRef.current !== null
            ) {
              const slot = pendingSaveSlotRef.current;
              pendingSaveSlotRef.current = null;
              setBookmarks((prev) => {
                const next = [...prev];
                next[slot] = {
                  chapterIndex: chapterInfo.index,
                  scrollY: msg.y,
                };
                return next;
              });
            }

            // WebView has parsed all chapters — send them to the backend for indexing
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

      {/* TOP RIGHT BAR: burger menu when reading, or search bar when search is open */}
      <Animated.View
        style={[styles.topBar, { top: insets.top + 8 }, navStyle]}
        pointerEvents={navVisible ? "auto" : "none"}
      >
        {searchOpen ? (
          // search mode: full-width input with submit and close buttons
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
            <Pressable
              style={styles.searchIconButton}
              onPress={() => runSearch(searchQuery)}
            >
              <IconSymbol size={18} name="magnifyingglass" color="white" />
            </Pressable>
            <Pressable style={styles.searchIconButton} onPress={closeSearch}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          // normal mode: burger button that opens the dropdown menu
          <>
            <Pressable
              style={styles.burgerButton}
              onPress={() => setMenuOpen((v) => !v)}
            >
              <IconSymbol size={22} name="line.horizontal.3" color="white" />
            </Pressable>

            {menuOpen && (
              <View style={styles.dropdown}>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => handleMenuSelect(openTranslate)}
                >
                  <Text style={styles.dropdownText}>MagicTranslate</Text>
                </Pressable>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => handleMenuSelect(() => setSearchOpen(true))}
                >
                  <Text style={styles.dropdownText}>Search Chapter</Text>
                </Pressable>
                <Pressable
                  style={[styles.dropdownItem, styles.dropdownItemLast]}
                  onPress={() => handleMenuSelect(openChat)}
                >
                  <Text style={styles.dropdownText}>Ask AI</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </Animated.View>

      {/* BOTTOM CHAPTER NAV — fades out on scroll down, leaves room for bookmark bar on the right */}
      <Animated.View
        style={[styles.bottomNav, navStyle]}
        pointerEvents={navVisible ? "auto" : "none"}
      >
        <Pressable onPress={() => sendToWebView("prev")}>
          <Text style={styles.arrowText}>← Prev</Text>
        </Pressable>

        <Text style={styles.chapterIndicator}>
          {chapterInfo.total
            ? `${chapterInfo.index + 1} / ${chapterInfo.total}`
            : ""}
        </Text>

        <Pressable onPress={() => sendToWebView("next")}>
          <Text style={styles.arrowText}>Next →</Text>
        </Pressable>
      </Animated.View>

      {/* BOOKMARK BAR — sits flush to the right of the chapter bar; stays visible on
          scroll down, lifting off the corner with full rounding while the chapter
          bar beside it fades away */}
      <Animated.View
        style={[
          styles.bookmarkBar,
          {
            bottom: bookmarkBottomOffset,
            right: bookmarkRightOffset,
            borderRadius: bookmarkRadius,
          },
        ]}
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

      {/* AI CHAT PANEL — transparent + blurred, slides in from the left */}
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
          {/* blur layer with a dark tint on top for text readability */}
          <BlurView
            intensity={45}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
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
                <View
                  style={[
                    styles.bubble,
                    item.role === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text style={styles.bubbleText}>{item.text}</Text>
                </View>
              )}
            />

            {loading && <Text style={styles.loadingText}>Thinking...</Text>}
            {!bookReady && (
              <Text style={styles.loadingText}>Indexing book...</Text>
            )}

            {/* KeyboardAvoidingView pushes the input up when the keyboard appears */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
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

      {/* MAGICTRANSLATE PANEL — solid dark panel listing available languages */}
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
    justifyContent: "flex-end",
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

  // dropdown sits absolutely below the burger button
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
    right: BOOKMARK_BAR_WIDTH, // leaves room for the bookmark bar, squashed together
    bottom: 0,
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#151515",
    paddingHorizontal: 20,
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
    overflow: "hidden", // required for BlurView to clip correctly
  },

  // semi-transparent dark overlay on top of the blur for text contrast
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
    right: 0,
    bottom: 0,
    width: BOOKMARK_BAR_WIDTH,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#111",
    zIndex: 11, // above chapter bar so it's never clipped by it
    elevation: 11,
    overflow: "hidden", // keeps content clipped as borderRadius animates
  },
});
