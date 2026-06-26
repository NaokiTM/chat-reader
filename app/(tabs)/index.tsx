import { Pressable, StyleSheet, Text, View, TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions, Animated, PanResponder, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '@/constants/api';

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
};

export default function HomeScreen() {
  const SCREEN_WIDTH = Dimensions.get("window").width;
  const PANEL_WIDTH = SCREEN_WIDTH;

  const HANDLE_SIZE = 44;
  const SWIPE_PADDING = 16;

  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  const [chatOpen, setChatOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const [base64, setBase64] = useState<string | null>(null);
  const [chapterInfo, setChapterInfo] = useState({ index: 0, total: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookReady, setBookReady] = useState(false);

  const webViewRef = useRef<WebView>(null);

  // Keep a ref in sync with chatOpen so PanResponder's closures (created once
  // via useRef) always see the *current* value instead of the one captured
  // at first render.
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Where the gesture started (0 = fully open, -PANEL_WIDTH = fully closed).
  // Captured fresh at the start of every touch so dragging always continues
  // smoothly from wherever the panel currently is.
  const startValueRef = useRef(-PANEL_WIDTH);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  // Minimum speed (px/ms) used when release velocity is ~0 (e.g. a slow drag
  // that just barely lets go), so the panel doesn't take forever to finish.
  const MIN_SPEED = 0.6;

  // Animate the remaining distance at (approximately) the same speed the
  // finger was just moving at, using linear easing so it reads as a
  // continuation of the drag rather than a separate "snap" with its own
  // acceleration/deceleration curve.
  const animatePanelLinear = (toValue: number, fromValue: number, velocity: number, onDone?: () => void) => {
    const distance = Math.abs(toValue - fromValue);
    const speed = Math.max(Math.abs(velocity), MIN_SPEED);
    const duration = distance / speed;

    Animated.timing(slideAnim, {
      toValue,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(onDone);
  };

  const openChat = (fromValue = -PANEL_WIDTH, velocity = 0) => {
    setChatOpen(true);
    animatePanelLinear(0, fromValue, velocity);
  };

  const closeChat = (fromValue = 0, velocity = 0) => {
    animatePanelLinear(-PANEL_WIDTH, fromValue, velocity, () => setChatOpen(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,

      onPanResponderGrant: () => {
        // Wherever the panel is right now becomes the baseline for this
        // gesture — works whether it's at rest fully open/closed, or
        // mid-animation from a previous quick release.
        startValueRef.current = chatOpenRef.current ? 0 : -PANEL_WIDTH;
        slideAnim.stopAnimation((value) => {
          startValueRef.current = value;
        });
      },

      onPanResponderMove: (_, g) => {
        const next = clamp(startValueRef.current + g.dx, -PANEL_WIDTH, 0);
        slideAnim.setValue(next);
      },

      onPanResponderRelease: (_, g) => {
        const currentValue = clamp(startValueRef.current + g.dx, -PANEL_WIDTH, 0);
        const fractionOpen = (currentValue + PANEL_WIDTH) / PANEL_WIDTH; // 0 = closed, 1 = open

        const flickedOpen = g.vx > 0.5;
        const flickedClosed = g.vx < -0.5;

        // A decisive flick wins outright; otherwise go with whichever side
        // of halfway the panel is currently resting on.
        const shouldOpen = flickedOpen ? true : flickedClosed ? false : fractionOpen > 0.5;

        if (shouldOpen) openChat(currentValue, g.vx);
        else closeChat(currentValue, g.vx);
      },
    })
  ).current;

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

  // correct handle travel range (from v1 styling)
  const MAX_DRAG = PANEL_WIDTH - HANDLE_SIZE - SWIPE_PADDING * 2;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <style>
        body { margin: 0; padding: 16px; background: #cbfeff; font-size: 20px; line-height: 1.6; color: #000; }
      </style>
    </head>
    <body>
      <div id="content">Loading...</div>
      <script>
        let chapters = [];
        let current = 0;

        function showChapter(index) {
          current = index;
          const text = chapters[index].split(/Chapter\\s*\\d+/).pop().trim();
          const content = document.getElementById("content");
          content.innerHTML = "<div style='text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;'>Chapter " + (index + 1) + "</div>" + "<div>" + text.replace(/\\n/g, "<br>") + "</div>";
          window.scrollTo(0, 0);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "chapterChange",
            index: current,
            total: chapters.length
          }));
        }

        window.addEventListener("message", (e) => {
          const msg = JSON.parse(e.data);
          if (msg.action === "next" && current < chapters.length - 1) showChapter(current + 1);
          if (msg.action === "prev" && current > 0) showChapter(current - 1);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <WebView
        ref={webViewRef}
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

      <View style={styles.bottomNav}>
        <Pressable onPress={() => sendToWebView("prev")}>
          <Text style={styles.arrowText}>← Prev</Text>
        </Pressable>

        <Text style={styles.chapterIndicator}>
          {chapterInfo.total ? `${chapterInfo.index + 1} / ${chapterInfo.total}` : ""}
        </Text>

        <Pressable onPress={() => sendToWebView("next")}>
          <Text style={styles.arrowText}>Next →</Text>
        </Pressable>
      </View>

      {/* SWIPE BAR */}
      <View style={styles.swipeBar} {...panResponder.panHandlers}>
        <View style={styles.swipeBackground}>
          <Animated.View
            style={[
              styles.swipeHandle,
              {
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [-PANEL_WIDTH, 0],
                    outputRange: [0, MAX_DRAG],
                    extrapolate: "clamp",
                  })
                }]
              }
            ]}
          />
          <Text style={styles.swipeLabel}>
            {chatOpen ? "← close" : "ask AI →"}
          </Text>
        </View>
      </View>

      {/* CHAT PANEL */}
      <Animated.View
        style={[
          styles.chatPanel,
          {
            width: PANEL_WIDTH,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <Text style={styles.chatTitle}>Ask about the book</Text>

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
            <Pressable onPress={askQuestion}>
              <Text style={styles.sendText}>→</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#cbfeff" },
  placeholder: { fontSize: 18, color: "#333", padding: 20 },

  swipeBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 58,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  swipeBackground: {
    width: "90%",
    height: 44,
    backgroundColor: "#333",
    borderRadius: 22,
    justifyContent: "center",
  },

  swipeHandle: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#555",
    left: 0,
    top: 0,
  },

  swipeLabel: {
    color: "#aaa",
    textAlign: "center",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 55,
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 20,
  },

  arrowText: { color: "white", fontSize: 20 },
  chapterIndicator: { color: "white" },

  chatPanel: {
    position: "absolute",
    top: 0,
    bottom: 58,
    left: 0,
    backgroundColor: "#1a1a1a",
  },

  chatTitle: {
    color: "white",
    fontSize: 18,
    padding: 16,
    marginTop: 30,
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
    padding: 12,
  },

  input: {
    flex: 1,
    backgroundColor: "#333",
    color: "white",
    padding: 10,
    borderRadius: 8,
  },

  sendText: { color: "white", fontSize: 20 },
});