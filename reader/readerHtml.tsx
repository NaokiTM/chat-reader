import { Directory, File, Paths } from "expo-file-system";
import { readerScript } from "./readerScript";
import { readerStyles } from "./readerStyles";

//Wouldn't move this to readerScript, since readerScript runs inside webview whilst this function doesn't.
export async function writeReaderHtmlFile(
  uri: string,  //receive the books uri
  topInset: number, //amount of space at the top of the reader

  // the saved position in the book being loaded from uri
  startChapter = 0,
  startY = 0
): Promise<string> {
  const html = buildReaderHtml(uri, topInset, startChapter, startY);

  const dir = new Directory(Paths.cache, "reader");
  if (!dir.exists) dir.create();
  dir.list().forEach((f) => { if (f instanceof File) f.delete(); });

  const file = new File(dir, `reader-${Date.now()}.html`);
  file.write(html);
  return file.uri;
}

export function buildReaderHtml(uri: string, topInset: number, startChapter: number, startY: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Lusitana:wght@400;700&display=swap" rel="stylesheet">
      <style> 
        :root { --top-inset: ${topInset}px; }
        ${readerStyles} 
      </style>
    </head>
    <body>
      <div id="content">Loading...</div>

      <div id="selection-toolbar">
        <button id="translate-btn" class="toolbar-btn">Translate</button>
        <button id="explain-btn" class="toolbar-btn">Explain this line</button>
      </div>

      <div id="explain-backdrop"></div>
      <div id="explain-overlay">
        <p></p>
        <button id="explain-close">Close</button>
      </div>

      <script>
        ${readerScript(uri, startChapter, startY)}
      </script>
    </body>
    </html>
  `;
}
