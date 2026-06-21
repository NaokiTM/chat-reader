import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { EncodingType } from 'expo-file-system';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showBar, setShowBar] = useState(false);
  const [base64, setBase64] = useState<string | null>(null);

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
        try {
          const base64 = "${base64}";
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          JSZip.loadAsync(bytes).then(zip => {
            // find all html/xhtml files in the epub
            const htmlFiles = Object.keys(zip.files).filter(name =>
              name.endsWith(".html") || name.endsWith(".xhtml") || name.endsWith(".htm")
            );

            // sort them so chapters are in order
            htmlFiles.sort();

            // extract text from each
            const promises = htmlFiles.map(name =>
              zip.files[name].async("string")
            );

            Promise.all(promises).then(contents => {
              const parser = new DOMParser();
              let fullText = "";
              contents.forEach(html => {
                const doc = parser.parseFromString(html, "text/html");
                fullText += doc.body.innerText + "\\n\\n";
              });
              document.getElementById("content").innerText = fullText;
            });
          });
        } catch(e) {
          document.getElementById("content").innerText = "Error: " + e.message;
          window.ReactNativeWebView.postMessage("Error: " + e.message);
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
        source={{ html }}
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        mixedContentMode="always"
        onScroll={(e) => setShowBar(e.nativeEvent.contentOffset.y < 50)}
        onMessage={(e) => console.log("WebView:", e.nativeEvent.data)}
      />
      {showBar && (
        <View style={styles.popup}>
          <Pressable style={styles.arrow}>
            <Text style={styles.arrowText}>← Prev</Text>
          </Pressable>
          <Pressable style={styles.arrow}>
            <Text style={styles.arrowText}>Next →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#cbfeff" },
  placeholder: { fontSize: 18, color: "#333", padding: 20 },
  popup: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  arrow: { padding: 10 },
  arrowText: { color: "white", fontSize: 20 },
});
