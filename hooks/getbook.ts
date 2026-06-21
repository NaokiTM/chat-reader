import * as DocumentPicker from "expo-document-picker";

const getbook = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/epub+zip",
  });

  if (result.canceled) return;

  const file = result.assets[0];
  console.log(file);
};
