import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  profileRow: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    marginBottom: 20,
  },

  textContainer: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    marginBottom: 10,
  },

  item: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    marginBottom: 10,
  },

  toggleItem: {
    padding: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  toggleStatus: {
    fontSize: 13,
    color: "#666",
  },

  rowText: {
    fontSize: 16,
    color: "#111",
  },

  fontCard: {
    width: 110,
    padding: 12,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
  },

  selectedFontCard: {
    borderColor: "#555",
    backgroundColor: "#e5e5e5",
  },

  fontPreview: {
    fontSize: 26,
    color: "#111",
    marginBottom: 10,
  },

  fontName: {
    fontSize: 13,
    color: "#666",
  },
  
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  fontSizeLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
});

export default styles;