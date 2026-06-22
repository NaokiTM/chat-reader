import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [base64, setBase64] = useState<string | null>(null);
  const [chapterInfo, setChapterInfo] = useState({ index: 0, total: 0 });
  const webViewRef = useRef<WebView>(null);

  const { uri, title, type } = useLocalSearchParams<{
    uri: string;
    title: string;
    type: string;
  }>();

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
      window.dispatchEvent(new MessageEvent("message", { 
        data: JSON.stringify({ action: "${action}" }) 
      }));
      true;
    `);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <style>
        body { 
          margin: 0; 
          padding: 16px; 
          background: #cbfeff; 
          font-size: 20px; 
          line-height: 1.6; 
          color: #000; 
        }
      </style>
    </head>
    <body>
      <div id="content">Loading...</div>

      <script>
        let chapters = [];
        let current = 0;

        function cleanChapterText(text) {
          if (!text) return "";
          return text.replace(/Chapter\\s*\\d+/, "").trim();
        }

        function showChapter(index) {
          current = index;
          const text = cleanChapterText(chapters[index] || "");
          const content = document.getElementById("content");
          content.innerHTML = 
            '<div style="text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;">' +
            'Chapter ' + (index + 1) +
            '</div><div>' + 
            text.replace(/\\n/g, "<br>") + 
            '</div>';
          window.scrollTo(0, 0);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "chapterChange",
            index: current,
            total: chapters.length
          }));
        }

        window.addEventListener("message", (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.action === "next" && current < chapters.length - 1) showChapter(current + 1);
            if (msg.action === "prev" && current > 0) showChapter(current - 1);
          } catch(err) {}
        });

        try {
          const base64 = "${base64 || ""}";
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

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
              }).filter(text => text.length > 80);

              if (chapters.length === 0) {
                document.getElementById("content").innerText = "No readable chapters found.";
                return;
              }

              showChapter(0);
            });
          }).catch(err => {
            document.getElementById("content").innerText = "Error loading EPUB: " + err.message;
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
        <Text style={styles.placeholder}>
          No book selected. Go to the Books tab to pick one.
        </Text>
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
          } catch (err) {}
        }}
      />

      <View style={styles.popup}>
        <Pressable style={styles.arrow} onPress={() => sendToWebView("prev")}>
          <Text style={styles.arrowText}>← Prev</Text>
        </Pressable>
        <Text style={styles.chapterIndicator}>
          {chapterInfo.total > 0
            ? `${chapterInfo.index + 1} / ${chapterInfo.total}`
            : ""}
        </Text>
        <Pressable style={styles.arrow} onPress={() => sendToWebView("next")}>
          <Text style={styles.arrowText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#cbfeff",
  },
  placeholder: {
    fontSize: 18,
    color: "#333",
    padding: 20,
  },
  popup: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  arrow: {
    padding: 10,
  },
  arrowText: {
    color: "white",
    fontSize: 20,
  },
  chapterIndicator: {
    color: "white",
    fontSize: 14,
    alignSelf: "center",
  },
});
