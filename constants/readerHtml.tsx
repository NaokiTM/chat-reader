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

        ::selection { background: #d20f39; color: #fff; }
        ::-moz-selection { background: #d20f39; color: #fff; }

        #selection-toolbar {
          position: fixed;
          left: 0;
          right: 0;
          background: #111;
          border-top: 2px solid #d20f39;
          border-bottom: 2px solid #d20f39;
          z-index: 999;
          display: none;
          flex-direction: column;
          box-sizing: border-box;
        }
        #selection-toolbar.visible { display: flex; }

        .toolbar-btn {
          color: #fff;
          font-family: -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          padding: 14px 20px;
          background: none;
          border: none;
          width: 100%;
        }
        .toolbar-btn:active { opacity: 0.5; }
        .toolbar-btn + .toolbar-btn { border-top: 1px solid #262626; }

        #explain-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 998;
          display: none;
        }
        #explain-backdrop.visible { display: block; }

        #explain-overlay {
          position: fixed;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          max-height: 78vh;
          overflow-y: auto;
          background: #111;
          border-top: 3px solid #d20f39;
          border-bottom: 3px solid #d20f39;
          padding: 22px 24px;
          z-index: 999;
          display: none;
          box-sizing: border-box;
        }
        #explain-overlay.visible { display: block; }
        #explain-overlay p {
          color: #fff;
          font-family: 'Lusitana', serif;
          font-size: 18px;
          line-height: 1.5;
          margin: 0;
          white-space: pre-wrap;
        }
        #explain-close {
          display: block;
          margin: 18px auto 0;
          color: #d20f39;
          font-weight: 700;
          font-size: 15px;
          background: none;
          border: none;
          padding: 6px 16px;
        }
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

        // ---------- selection -> translate / explain ----------

        let activeRange = null;
        let activeWord = "";
        let activeContext = "";

        function getSelectionInfo() {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
          const text = sel.toString().trim();
          if (!text) return null;
          const range = sel.getRangeAt(0);
          const content = document.getElementById("content");
          if (!content.contains(range.commonAncestorContainer)) return null;
          return { range: range, text: text };
        }

        function findContextLine(range) {
          let node = range.commonAncestorContainer;
          if (node.nodeType === 3) node = node.parentElement;
          const content = document.getElementById("content");
          while (node && node !== content && node.parentElement !== content) {
            node = node.parentElement;
          }
          const blockText = node ? node.innerText : range.toString();
          const selectedText = range.toString();
          const sentences = blockText.split(/(?<=[.!?])\\s+/);
          const match = sentences.find(function (s) { return s.indexOf(selectedText) !== -1; });
          return (match || blockText).trim();
        }

        function hideToolbar() {
          document.getElementById("selection-toolbar").classList.remove("visible");
        }

        function showToolbar(range) {
          const toolbar = document.getElementById("selection-toolbar");
          toolbar.classList.add("visible");
          const rect = range.getBoundingClientRect();
          requestAnimationFrame(function () {
            const h = toolbar.offsetHeight;
            let top = rect.bottom + 12;
            if (top + h > window.innerHeight - 10) {
              top = rect.top - h - 12;
            }
            if (top < 10) top = 10;
            toolbar.style.top = top + "px";
          });
        }

        document.addEventListener("selectionchange", function () {
          const info = getSelectionInfo();
          if (!info) {
            hideToolbar();
            return;
          }
          activeRange = info.range.cloneRange();
          activeWord = info.text;
          activeContext = findContextLine(info.range);
          showToolbar(info.range);
        });

        const translateBtn = document.getElementById("translate-btn");
        const explainBtn = document.getElementById("explain-btn");

        // preventDefault on mousedown keeps the text selection from
        // collapsing before the click handler gets a chance to run.
        translateBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
        explainBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });

        translateBtn.addEventListener("click", function () {
          if (!activeWord) return;
          translateBtn.innerText = "Translating…";
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "translateRequest",
            word: activeWord,
            context: activeContext
          }));
        });

        explainBtn.addEventListener("click", function () {
          if (!activeContext) return;
          explainBtn.innerText = "Explaining…";
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "explainRequest",
            text: activeContext
          }));
        });

        document.getElementById("explain-close").addEventListener("click", closeExplain);
        document.getElementById("explain-backdrop").addEventListener("click", closeExplain);

        function closeExplain() {
          document.getElementById("explain-overlay").classList.remove("visible");
          document.getElementById("explain-backdrop").classList.remove("visible");
        }

        // called from RN via injectJavaScript once the backend responds
        window.__applyTranslation = function (translated) {
          translateBtn.innerText = "Translate";
          hideToolbar();
          if (activeRange && translated) {
            try {
              activeRange.deleteContents();
              activeRange.insertNode(document.createTextNode(translated));
              window.getSelection().removeAllRanges();
            } catch (e) {}
          }
          activeRange = null;
        };

        window.__translationFailed = function () {
          translateBtn.innerText = "Translate";
        };

        window.__showExplanation = function (explanation) {
          explainBtn.innerText = "Explain this line";
          hideToolbar();
          const overlay = document.getElementById("explain-overlay");
          overlay.querySelector("p").innerText = explanation;
          overlay.classList.add("visible");
          document.getElementById("explain-backdrop").classList.add("visible");
        };

        window.__explanationFailed = function () {
          explainBtn.innerText = "Explain this line";
        };

        // ---------- RN -> webview messages ----------

        window.addEventListener("message", (e) => {
          const msg = JSON.parse(e.data);
          if (msg.action === "next" && current < chapters.length - 1) showChapter(current + 1);
          if (msg.action === "prev" && current > 0) showChapter(current - 1);
          if (msg.action === "goto") gotoChapter(msg.index, msg.scrollY);
          if (msg.action === "search") searchInChapter(msg.query);
        });

        function loadBook() {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", ${JSON.stringify(uri)}, true);
          xhr.responseType = "arraybuffer";

          xhr.onload = function() {
            if (xhr.status !== 0 && xhr.status !== 200) {
              document.getElementById("content").innerText = "Error loading book: HTTP " + xhr.status;
              return;
            }
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