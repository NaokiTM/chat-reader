import { Directory, File, Paths } from "expo-file-system";

export async function writeReaderHtmlFile(uri: string, topInset: number): Promise<string> {
  const html = buildReaderHtml(uri, topInset);
  const dir = new Directory(Paths.cache, "reader");
  if (!dir.exists) dir.create();
  const file = new File(dir, "reader.html");
  if (file.exists) file.delete();
  file.write(html);
  return file.uri; // file:///.../reader.html
}

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
      <style>
        body {
          margin: 0;
          padding: 24px;
          padding-top: ${topInset}px;
          background: #fef0d8;
          font-size: 22px;
          line-height: 1.4;
          color: #000;
          font-weight: 500;
        }
        #content { font-family: 'Lusitana', serif; }
      </style>
    </head>
    <body>
      <div id="content">Loading...</div>
      <script>
        let chapters = [];
        let current = 0;

        let lastY = 0;
        let upAccum = 0;
        let navVisible = true;
        function setNavVisible(v) {
          if (v !== navVisible) {
            navVisible = v;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "nav", visible: v }));
          }
        }
        window.addEventListener("scroll", () => {
          const y = window.scrollY;
          const delta = y - lastY;
          if (delta > 2) {
            upAccum = 0;
            if (y > 40) setNavVisible(false);
          } else if (delta < -2) {
            upAccum += -delta;
            if (upAccum > 60 || y <= 0) setNavVisible(true);
          }
          lastY = y;
        });

        function showChapter(index) {
          current = index;
          const text = chapters[index].split(/Chapter\\s*\\d+/).pop().trim();
          const content = document.getElementById("content");
          content.innerHTML = "<div style='text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;'>Chapter " + (index + 1) + "</div>" + "<div>" + text.replace(/\\n/g, "<br>") + "</div>";
          window.scrollTo(0, 0);
          setNavVisible(true);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "chapterChange",
            index: current,
            total: chapters.length
          }));
        }

        function gotoChapter(index, scrollY) {
          if (index !== current) {
            showChapter(index);
          }
          setTimeout(function () {
            window.scrollTo(0, scrollY);
            lastY = scrollY;
            upAccum = 0;
          }, 80);
        }

        function clearHighlights() {
          const content = document.getElementById("content");
          const marks = content.querySelectorAll(".search-hl");
          for (let i = 0; i < marks.length; i++) {
            const el = marks[i];
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
          }
        }

        function searchInChapter(query) {
          clearHighlights();
          if (!query) return;
          const lowerQuery = query.toLowerCase();
          const content = document.getElementById("content");
          const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
          const textNodes = [];
          let node;
          while ((node = walker.nextNode())) {
            textNodes.push(node);
          }
          let firstHighlight = null;
          for (let n = 0; n < textNodes.length; n++) {
            const textNode = textNodes[n];
            const text = textNode.nodeValue;
            const lowerText = text.toLowerCase();
            if (lowerText.indexOf(lowerQuery) === -1) continue;

            const frag = document.createDocumentFragment();
            let pos = 0;
            let searchPos;
            while ((searchPos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
              if (searchPos > pos) {
                frag.appendChild(document.createTextNode(text.slice(pos, searchPos)));
              }
              const span = document.createElement("span");
              span.className = "search-hl";
              span.style.backgroundColor = "#d20f39";
              span.style.color = "#fff";
              span.style.borderRadius = "3px";
              span.style.padding = "0 1px";
              span.textContent = text.slice(searchPos, searchPos + query.length);
              frag.appendChild(span);
              if (!firstHighlight) firstHighlight = span;
              pos = searchPos + query.length;
            }
            if (pos < text.length) {
              frag.appendChild(document.createTextNode(text.slice(pos)));
            }
            textNode.parentNode.replaceChild(frag, textNode);
          }
          if (firstHighlight) {
            const rect = firstHighlight.getBoundingClientRect();
            window.scrollTo({ top: window.scrollY + rect.top - 120, left: 0, behavior: "smooth" });
          }
        }

        window.addEventListener("message", (e) => {
          const msg = JSON.parse(e.data);
          if (msg.action === "next" && current < chapters.length - 1) showChapter(current + 1);
          if (msg.action === "prev" && current > 0) showChapter(current - 1);
          if (msg.action === "goto") gotoChapter(msg.index, msg.scrollY);
          if (msg.action === "search") searchInChapter(msg.query);
        });

        // Read the epub as an ArrayBuffer directly from the local file URI using
        // XMLHttpRequest instead of fetch(). Android WebView's fetch() implementation
        // frequently refuses file:// URLs outright (generic "Failed to fetch"), even
        // with every allowFileAccess flag set — XHR is the reliable path for local
        // file reads in WebView and avoids the base64-bridge memory blowup entirely.
        function loadBook() {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", ${JSON.stringify(uri)}, true);
          xhr.responseType = "arraybuffer";

          xhr.onload = function() {
            if (xhr.status !== 0 && xhr.status !== 200) {
              document.getElementById("content").innerText = "Error loading book: HTTP " + xhr.status;
              return;
            }
            // status 0 is normal for file:// requests in WebView
            const buffer = xhr.response;
            if (!buffer) {
              document.getElementById("content").innerText = "Error loading book: empty response";
              return;
            }

            JSZip.loadAsync(buffer).then(function(zip) {
              const htmlFiles = Object.keys(zip.files).filter(function(name) {
                return (name.endsWith(".html") || name.endsWith(".xhtml") || name.endsWith(".htm")) &&
                  !name.toLowerCase().includes("toc") &&
                  !name.toLowerCase().includes("contents") &&
                  !name.toLowerCase().includes("nav");
              }).sort();

              const promises = htmlFiles.map(function(name) {
                return zip.files[name].async("string");
              });

              return Promise.all(promises);
            }).then(function(contents) {
              const parser = new DOMParser();
              chapters = contents.map(function(html) {
                const doc = parser.parseFromString(html, "text/html");
                return doc.body.innerText.trim();
              }).filter(function(text) { return text.length > 100; });

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "chapters",
                chapters: chapters.map(function(text, index) { return { index: index, text: text }; })
              }));

              showChapter(0);
            }).catch(function(e) {
              document.getElementById("content").innerText = "Error parsing book: " + e.message;
            });
          };

          xhr.onerror = function() {
            document.getElementById("content").innerText = "Error loading book: request failed";
          };

          xhr.send();
        }

        loadBook();
      </script>
    </body>
    </html>
  `;
}