const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  card: {
    marginTop: 14,
    marginHorizontal: 12,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  squareButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
  badge: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bottomRow: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  squareButtonActive: {
    backgroundColor: "#ff4444",
  },
  deleteX: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  deleteXText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
});

export default styles;