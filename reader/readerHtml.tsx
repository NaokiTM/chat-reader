import { readerScript } from "./readerScript";
import { readerStyles } from "./readerStyles";

// export async function writeReaderHtmlFile(
//   uri: string,
//   topInset: number,
// ): Promise<string> {
//   const html = buildReaderHtml(uri, topInset);
//   const dir = new Directory(Paths.cache, "reader");
//   if (!dir.exists) dir.create();
//   const file = new File(dir, "reader.html");
//   if (file.exists) file.delete();
//   file.write(html);
//   return file.uri; // file:///.../reader.html
// }

export function buildReaderHtml(uri: string, topInset: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Lusitana:wght@400;700&display=swap" rel="stylesheet">
      <style> ${readerStyles} </style>
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
        ${readerScript}
      </script>
    </body>
    </html>
  `;
}
