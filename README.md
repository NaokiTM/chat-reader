# AI Chat Reader

A mobile ebook reader with built-in AI. Read an EPUB, then ask questions about the book, translate a word / explain a group of words in context, or get a recap of where you left off. Built with Expo and React Native.

<!-- Add screenshots here: reader, Ask AI panel, Settings -->

## Features

**Reading**
- Import EPUB files from your device into a library (Books tab)
- Chapter-by-chapter reader with Prev / Next navigation
- Search within the current chapter, with highlighted matches
- Three colour-coded bookmarks: tap to save, tap to jump back, double-tap to clear
- Resumes at your last chapter and scroll position
- Navigation bars fade out as you scroll down and return as you scroll up

**AI**
- **Ask AI:** chat about the book, using the current chapter as context
- **MagicTranslate:** select a word or phrase and translate it in context into one of 14 languages
- **Explain this line:** select text to get a plain-language explanation
- **Welcome back recap:** a short summary of your last chapter when you reopen a book

**Customisation**
- Light and dark theme, shared across the whole app
- Font choice (system, serif, sans, mono) and adjustable font size
- Import your own fonts (`.ttf`, `.otf`, `.woff`, `.woff2`)

## Tech stack

- [Expo](https://expo.dev) / React Native with [Expo Router](https://docs.expo.dev/router/introduction/)
- `react-native-webview` renders the book; React Native handles the menus and panels
- [JSZip](https://stuk.github.io/jszip/) unpacks the EPUB inside the WebView
- `expo-file-system`, `expo-document-picker` and AsyncStorage for the library, imported fonts and settings
- A separate backend handles indexing and the AI features (see below)

## Project structure

```
app/(tabs)/        Tab screens: Read (index), Books, Settings
components/ui/     Shared UI (Bookmark, IconSymbol, ...)
context/           ThemeContext: theme, font and font size, shared app-wide
reader/            readerHtml, readerScript and readerStyles: the page that runs in the WebView
tabstyles/         StyleSheets for each tab
constants/         API_URL and shared constants
```

## Getting started

### Prerequisites
- Node.js 18+
- The backend running and reachable from your device or emulator

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend

Set `API_URL` in `constants/api.ts` to your backend's address. When testing on a physical device, use your computer's LAN IP, not `localhost`.

### 3. Start the app

```bash
npx expo start
```

Then open it in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), the [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), the [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/), or [Expo Go](https://expo.dev/go).

If you change native config or something looks stale, restart with a cleared cache:

```bash
npx expo start -c
```

## How it works

1. You pick a book in the **Books** tab. The EPUB is copied into the app's documents folder.
2. The **Read** tab writes a small HTML page to disk and loads it in a WebView. The page fetches the EPUB, unzips it, and splits it into chapters.
3. The chapters are sent to the backend (`POST /upload`) for indexing. Chat is enabled once indexing finishes.
4. React Native and the WebView talk through messages. The app sends navigation, theme, font and search commands in. The WebView sends scroll position, chapter changes and translate/explain requests back.
5. Your reading position, bookmarks-in-session, theme, font settings and imported fonts are stored locally.

## Backend API

The app expects these endpoints (all `POST`, JSON):

| Endpoint | Body | Returns |
|---|---|---|
| `/upload` | `bookId`, `chapters` | indexing confirmation |
| `/chat` | `bookId`, `question`, `currentChapter` | `answer` |
| `/translate` | `bookId`, `word`, `context`, `targetLanguage`, `currentChapter` | `translation` |
| `/explain` | `bookId`, `text`, `currentChapter` | `explanation` |

## Roadmap

- [x] Light and dark mode
- [x] Previous chapter summary on app open
- [x] Highlight a passage to translate or explain
- [ ] PDF and DOCX support (they can be imported, but only EPUB renders)
- [ ] Persist bookmarks between sessions
- [ ] Delete imported fonts

## Known limitations

- Only EPUB files can be read at the moment.
- Changing font or size reflows the page, so a saved bookmark position may land slightly off.

<!-- ## Licence -->

<!-- Add a licence, e.g. MIT -->