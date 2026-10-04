import BOOKMARK_BAR_WIDTH from "../index";

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
    width: 100,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownToggleText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
  containerDark: { backgroundColor: "#181818" },
  burgerText: { color: "white", fontSize: 16, fontWeight: "600" },

  languageCheck: {
    color: "#d20f39",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default styles;