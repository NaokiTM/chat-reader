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

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
};

type BookmarkSlot = { chapterIndex: number; scrollY: number } | null;

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

  // Visibility of the top button row + bottom chapter bar, driven by scroll
  // direction messages coming from inside the WebView.
  const [navVisible, setNavVisible] = useState(true);
  const navAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(navAnim, {
      toValue: navVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [navVisible]);

  // Don't leave the dropdown/search bar open behind invisible
  // (pointerEvents: "none") chrome.
  useEffect(() => {
    if (!navVisible) {
      setMenuOpen(false);
      setSearchOpen(false);
    }
  }, [navVisible]);

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

  const closeChat = () => {
    Animated.timing(slideAnim, {
      toValue: -PANEL_WIDTH,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setChatOpen(false));
  };

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

  const closeTranslate = () => {
    Animated.timing(translateSlideAnim, {
      toValue: -PANEL_WIDTH,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setTranslateOpen(false));
  };

  const handleMenuSelect = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const { uri } = useLocalSearchParams<{ uri: string; title: string; type: string }>();

  // load base64
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

  const sendToWebView = (action: "next" | "prev") => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "${action}" }) }));
      true;
    `);
  };

  // --- Search ---
  const runSearch = (query: string) => {
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ action: "search", query: ${JSON.stringify(query)} }) }));
      true;
    `);
  };

  const closeSearch = () => {
    runSearch(""); // empty query clears existing highlights
    setSearchOpen(false);
    setSearchQuery("");
  };

  // --- Bookmarks ---
  const saveBookmark = (slot: number) => {
    pendingSaveSlotRef.current = slot;
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "scrollPos", y: window.scrollY }));
      true;
    `);
  };

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

  const handleBookmarkLongPress = (slot: number) => {
    setBookmarks((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  };

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

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Lusitana:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 24px;
          padding-top: ${topInset}px;
          background: #fef0d8;
          font-size: 22px;
          line-height: 1.4;
          color: #000;
          font-weight: 500;
        }
        #content { font-family: 'Lusitana', serif; }
      </style>
    </head>
    <body>
      <div id="content">Loading...</div>
      <script>
        let chapters = [];
        let current = 0;

        // --- scroll direction tracking, used to show/hide the RN nav chrome ---
        let lastY = 0;
        let upAccum = 0;
        let navVisible = true;
        function setNavVisible(v) {
          if (v !== navVisible) {
            navVisible = v;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "nav", visible: v }));
          }
        }
        window.addEventListener("scroll", () => {
          const y = window.scrollY;
          const delta = y - lastY;
          if (delta > 2) {
            upAccum = 0;
            if (y > 40) setNavVisible(false);
          } else if (delta < -2) {
            upAccum += -delta;
            if (upAccum > 60 || y <= 0) setNavVisible(true);
          }
          lastY = y;
        });

        function showChapter(index) {
          current = index;
          const text = chapters[index].split(/Chapter\\s*\\d+/).pop().trim();
          const content = document.getElementById("content");
          content.innerHTML = "<div style='text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;'>Chapter " + (index + 1) + "</div>" + "<div>" + text.replace(/\\n/g, "<br>") + "</div>";
          window.scrollTo(0, 0);
          setNavVisible(true);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "chapterChange",
            index: current,
            total: chapters.length
          }));
        }

        function gotoChapter(index, scrollY) {
          if (index !== current) {
            showChapter(index);
          }
          setTimeout(function () {
            window.scrollTo(0, scrollY);
            lastY = scrollY;
            upAccum = 0;
          }, 80);
        }

        // --- plain substring search, no regex (keeps escaping simple/safe) ---
        function clearHighlights() {
          const content = document.getElementById("content");
          const marks = content.querySelectorAll(".search-hl");
          for (let i = 0; i < marks.length; i++) {
            const el = marks[i];
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          }
        }

        function searchInChapter(query) {
          clearHighlights();
          if (!query) return;
          const lowerQuery = query.toLowerCase();
          const content = document.getElementById("content");
          const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
          const textNodes = [];
          let node;
          while ((node = walker.nextNode())) {
            textNodes.push(node);
          }
          let firstHighlight = null;
          for (let n = 0; n < textNodes.length; n++) {
            const textNode = textNodes[n];
            const text = textNode.nodeValue;
            const lowerText = text.toLowerCase();
            if (lowerText.indexOf(lowerQuery) === -1) continue;

            const frag = document.createDocumentFragment();
            let pos = 0;
            let searchPos;
            while ((searchPos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
              if (searchPos > pos) {
                frag.appendChild(document.createTextNode(text.slice(pos, searchPos)));
              }
              const span = document.createElement("span");
              span.className = "search-hl";
              span.style.backgroundColor = "#d20f39";
              span.style.color = "#fff";
              span.style.borderRadius = "3px";
              span.style.padding = "0 1px";
              span.textContent = text.slice(searchPos, searchPos + query.length);
              frag.appendChild(span);
              if (!firstHighlight) firstHighlight = span;
              pos = searchPos + query.length;
            }
            if (pos < text.length) {
              frag.appendChild(document.createTextNode(text.slice(pos)));
            }
            textNode.parentNode.replaceChild(frag, textNode);
          }
          if (firstHighlight) {
            const rect = firstHighlight.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 120, left: 0, behavior: "smooth" });
          }
        }

        window.addEventListener("message", (e) => {
          const msg = JSON.parse(e.data);
          if (msg.action === "next" && current < chapters.length - 1) showChapter(current + 1);
          if (msg.action === "prev" && current > 0) showChapter(current - 1);
          if (msg.action === "goto") gotoChapter(msg.index, msg.scrollY);
          if (msg.action === "search") searchInChapter(msg.query);
        });

        try {
          const base64 = "${base64}";
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          JSZip.loadAsync(bytes).then(zip => {
            const htmlFiles = Object.keys(zip.files).filter(name =>
              (name.endsWith(".html") || name.endsWith(".xhtml") || name.endsWith(".htm")) &&
              !name.toLowerCase().includes("toc") &&
              !name.toLowerCase().includes("contents") &&
              !name.toLowerCase().includes("nav")
            ).sort();

            const promises = htmlFiles.map(name => zip.files[name].async("string"));

            Promise.all(promises).then(contents => {
              const parser = new DOMParser();
              chapters = contents.map(html => {
                const doc = parser.parseFromString(html, "text/html");
                return doc.body.innerText.trim();
              }).filter(text => text.length > 100);

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "chapters",
                chapters: chapters.map((text, index) => ({ index, text }))
              }));

              showChapter(0);
            });
          });
        } catch(e) {
          document.getElementById("content").innerText = "Error: " + e.message;
        }
      </script>
    </body>
    </html>
  `;

  if (!uri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>No book selected. Go to the Books tab to pick one.</Text>
      </View>
    );
  }

  if (!base64) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.placeholder}>Loading book...</Text>
      </View>
    );
  }

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
            <View style={{ flexDirection: "row", gap: 8, paddingLeft: 8 }}>
              <Bookmark
                size={32}
                activeColor="#d20f39"
                inactiveColor="#d20f39"
                active={!!bookmarks[0]}
                onPress={() => handleBookmarkPress(0)}
                onLongPress={() => handleBookmarkLongPress(0)}
              />
              <Bookmark
                size={32}
                activeColor="#df8e1d"
                inactiveColor="#df8e1d"
                active={!!bookmarks[1]}
                onPress={() => handleBookmarkPress(1)}
                onLongPress={() => handleBookmarkLongPress(1)}
              />
              <Bookmark
                size={32}
                activeColor="#7287fd"
                inactiveColor="#7287fd"
                active={!!bookmarks[2]}
                onPress={() => handleBookmarkPress(2)}
                onLongPress={() => handleBookmarkLongPress(2)}
              />
            </View>

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
    justifyContent: "space-between",
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
    backgroundColor: "#111",
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
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
});