export function readerScript(uri: string): string {
    return `

let chapters = [];
let current = 0;
let lastY = 0;
let upAccum = 0;
let navVisible = true;

function setNavVisible(v) {
    if (v !== navVisible) {
        navVisible = v;
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "nav",
            visible: v
        }));
    }
}

window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const delta = y - lastY;

    if (delta > 2) {
        upAccum = 0;

        if (y > 40) {
            setNavVisible(false);
        }
    } else if (delta < -2) {
        upAccum += -delta;

        if (upAccum > 60 || y <= 0) {
            setNavVisible(true);
        }
    }

    lastY = y;
});

function showChapter(index) {
    current = index;

    const text = chapters[index]
        .split(/Chapter\s*\d+/)
        .pop()
        .trim();

    const content = document.getElementById("content");

    content.innerHTML =
        "<div style='text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;'>Chapter " +
        (index + 1) +
        "</div>" +
        "<div>" +
        text.replace(/\n/g, "<br>") +
        "</div>";

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

        parent.replaceChild(
            document.createTextNode(el.textContent),
            el
        );

        parent.normalize();
    }
}

function searchInChapter(query) {
    clearHighlights();

    if (!query) return;

    const lowerQuery = query.toLowerCase();
    const content = document.getElementById("content");

    const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        null
    );

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

        if (lowerText.indexOf(lowerQuery) === -1) {
            continue;
        }

        const frag = document.createDocumentFragment();
        let pos = 0;
        let searchPos;

        while ((searchPos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
            if (searchPos > pos) {
                frag.appendChild(
                    document.createTextNode(
                        text.slice(pos, searchPos)
                    )
                );
            }

            const span = document.createElement("span");

            span.className = "search-hl";
            span.style.backgroundColor = "#d20f39";
            span.style.color = "#fff";
            span.style.borderRadius = "3px";
            span.style.padding = "0 1px";
            span.textContent = text.slice(
                searchPos,
                searchPos + query.length
            );

            frag.appendChild(span);

            if (!firstHighlight) {
                firstHighlight = span;
            }

            pos = searchPos + query.length;
        }

        if (pos < text.length) {
            frag.appendChild(
                document.createTextNode(text.slice(pos))
            );
        }

        textNode.parentNode.replaceChild(frag, textNode);
    }

    if (firstHighlight) {
        const rect = firstHighlight.getBoundingClientRect();

        window.scrollTo({
            top: window.scrollY + rect.top - 120,
            left: 0,
            behavior: "smooth"
        });
    }
}

let activeRange = null;
let activeWord = "";
let activeContext = "";

function getSelectionInfo() {
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        return null;
    }

    const text = sel.toString().trim();

    if (!text) {
        return null;
    }

    const range = sel.getRangeAt(0);
    const content = document.getElementById("content");

    if (!content.contains(range.commonAncestorContainer)) {
        return null;
    }

    return {
        range: range,
        text: text
    };
}

function findContextLine(range) {
    let node = range.commonAncestorContainer;

    if (node.nodeType === 3) {
        node = node.parentElement;
    }

    const content = document.getElementById("content");

    while (
        node &&
        node !== content &&
        node.parentElement !== content
    ) {
        node = node.parentElement;
    }

    const blockText = node
        ? node.innerText
        : range.toString();

    const selectedText = range.toString();

    const sentences = blockText.split(
        /(?<=[.!?])\s+/
    );

    const match = sentences.find(function (s) {
        return s.indexOf(selectedText) !== -1;
    });

    return (match || blockText).trim();
}

function hideToolbar() {
    document
        .getElementById("selection-toolbar")
        .classList.remove("visible");
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

        if (top < 10) {
            top = 10;
        }

        toolbar.style.top = top + "px";
    });
}

document.addEventListener(
    "selectionchange",
    function () {
        const info = getSelectionInfo();

        if (!info) {
            hideToolbar();
            return;
        }

        activeRange = info.range.cloneRange();
        activeWord = info.text;
        activeContext = findContextLine(info.range);

        showToolbar(info.range);
    }
);

const translateBtn = document.getElementById("translate-btn");
const explainBtn = document.getElementById("explain-btn");

translateBtn.addEventListener(
    "mousedown",
    function (e) {
        e.preventDefault();
    }
);

explainBtn.addEventListener(
    "mousedown",
    function (e) {
        e.preventDefault();
    }
);

translateBtn.addEventListener(
    "click",
    function () {
        if (!activeWord) return;

        translateBtn.innerText = "Translating…";

        window.ReactNativeWebView.postMessage(
            JSON.stringify({
                type: "translateRequest",
                word: activeWord,
                context: activeContext
            })
        );
    }
);

explainBtn.addEventListener(
    "click",
    function () {
        if (!activeContext) return;

        explainBtn.innerText = "Explaining…";

        window.ReactNativeWebView.postMessage(
            JSON.stringify({
                type: "explainRequest",
                text: activeContext
            })
        );
    }
);

document
    .getElementById("explain-close")
    .addEventListener("click", closeExplain);

document
    .getElementById("explain-backdrop")
    .addEventListener("click", closeExplain);

function closeExplain() {
    document
        .getElementById("explain-overlay")
        .classList.remove("visible");

    document
        .getElementById("explain-backdrop")
        .classList.remove("visible");
}

window.__applyTranslation = function (translated) {
    translateBtn.innerText = "Translate";
    hideToolbar();

    if (activeRange && translated) {
        try {
            activeRange.deleteContents();

            activeRange.insertNode(
                document.createTextNode(translated)
            );

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

    document
        .getElementById("explain-backdrop")
        .classList.add("visible");
};

window.__explanationFailed = function () {
    explainBtn.innerText = "Explain this line";
};

window.addEventListener(
    "message",
    (e) => {
        const msg = JSON.parse(e.data);

        if (
            msg.action === "next" &&
            current < chapters.length - 1
        ) {
            showChapter(current + 1);
        }

        if (
            msg.action === "prev" &&
            current > 0
        ) {
            showChapter(current - 1);
        }

        if (msg.action === "goto") {
            gotoChapter(msg.index, msg.scrollY);
        }

        if (msg.action === "search") {
            searchInChapter(msg.query);
        }
    }
);

function loadBook() {
    const xhr = new XMLHttpRequest();

    xhr.open(
        "GET",
        ${JSON.stringify(uri)},
        true
    );

    xhr.responseType = "arraybuffer";

    xhr.onload = function () {
        if (
            xhr.status !== 0 &&
            xhr.status !== 200
        ) {
            document.getElementById("content").innerText =
                "Error loading book: HTTP " +
                xhr.status;

            return;
        }

        const buffer = xhr.response;

        if (!buffer) {
            document.getElementById("content").innerText =
                "Error loading book: empty response";

            return;
        }

        JSZip
            .loadAsync(buffer)
            .then(function (zip) {
                const htmlFiles = Object.keys(zip.files)
                    .filter(function (name) {
                        return (
                            (
                                name.endsWith(".html") ||
                                name.endsWith(".xhtml") ||
                                name.endsWith(".htm")
                            ) &&
                            !name.toLowerCase().includes("toc") &&
                            !name.toLowerCase().includes("contents") &&
                            !name.toLowerCase().includes("nav")
                        );
                    })
                    .sort();

                const promises = htmlFiles.map(
                    function (name) {
                        return zip.files[name].async("string");
                    }
                );

                return Promise.all(promises);
            })
            .then(function (contents) {
                const parser = new DOMParser();

                chapters = contents
                    .map(function (html) {
                        const doc =
                            parser.parseFromString(
                                html,
                                "text/html"
                            );

                        return doc.body.innerText.trim();
                    })
                    .filter(function (text) {
                        return text.length > 100;
                    });

                window.ReactNativeWebView.postMessage(
                    JSON.stringify({
                        type: "chapters",
                        chapters: chapters.map(
                            function (text, index) {
                                return {
                                    index: index,
                                    text: text
                                };
                            }
                        )
                    })
                );

                showChapter(0);
            })
            .catch(function (e) {
                document.getElementById("content").innerText =
                    "Error parsing book: " +
                    e.message;
            });
    };

    xhr.onerror = function () {
        document.getElementById("content").innerText =
            "Error loading book: request failed";
    };

    xhr.send();
}

loadBook();
    `;
}