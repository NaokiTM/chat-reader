import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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

  rowText: {
    fontSize: 16,
    color: "#111",
  },
});

export default styles;