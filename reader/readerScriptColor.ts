// This function is just to be able to have syntax highlighting / visible commenting, since it doesn't apply to the working file which is a template literal

let chapters = [];
let current = 0;
let lastY = 0;
let upAccum = 0;
let navVisible = true;

// Sets the visibility of the navigation bar
function setNavVisible(v) {
    if (v !== navVisible) {
        navVisible = v;
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "nav",
            visible: v
        }));
    }
}


// Handles scroll events to determine whether to show or hide the navigation bar
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


// Displays the specified formatted chapter in the reader
function showChapter(index) {
    current = index;

    // isolates the chapter contents from the chapter header
    const text = chapters[index]
        .split(/Chapter\s*\d+/)
        .pop()
        .trim();
        
    const content = document.getElementById("content");

    // display the styled chapter header and its contents. 
    content.innerHTML =
        "<div style='text-align:center; font-weight:bold; font-size:22px; margin-bottom:16px;'>Chapter " +
        (index + 1) +
        "</div>" +
        "<div>" +

        // replace newline characters with breaks to prevent paragraphs merging
        text.replace(/\n/g, "<br>") +
        "</div>";

    // set the reader to start at the top of the chapter
    window.scrollTo(0, 0);

    // show the full navbar since we have not started reading / scrolling
    setNavVisible(true);

    // we send the chapter change to the webview in index.tsx, forwarded to backend to update AI response context. 
    window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "chapterChange",
        index: current,
        total: chapters.length
    }));
}

// Navigates to the specified chapter and scroll position
function gotoChapter(index, scrollY) {
    // switch to index (the chapter we want) if not already on the correct chapter
    if (index !== current) {
        showChapter(index);
    }

    // allow time for chapter to load before scrolling to the y pos indicated by a bookmark
    setTimeout(function () {
        window.scrollTo(0, scrollY);
        lastY = scrollY;
        upAccum = 0;
    }, 80);
}

// Clears all search highlights from the content
function clearHighlights() {
    const content = document.getElementById("content");
    const marks = content.querySelectorAll(".search-hl");

    // for each highlighted element, replace with new text node containing the same text (this removes the search-hl class)
    // we can replace the entire element instead of just the highlighted text, because we're clearing all highlights anyway. 
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

// Searches for the specified query in the current chapter and highlights matches
function searchInChapter(query) {
    clearHighlights();

    // if user sends an empty search query then ignore
    if (!query) return;

    const lowerQuery = query.toLowerCase();

    const content = document.getElementById("content");

    // create a treewalker to walk through the chapter, and only select text nodes. 
    const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        null
    );

    // store all the text nodes from the treewalker
    const textNodes = [];


    // collect all text nodes in the DOM and push to the array 
    let node;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    // the first matched span is stored here, to which the reader scrolls to first when results are shown
    let firstHighlight = null;

    // for every text node 
    for (let n = 0; n < textNodes.length; n++) {
        const textNode = textNodes[n];
        const text = textNode.nodeValue;
        const lowerText = text.toLowerCase();

        //if this specific node doesn't contain the word we are looking for, move to next text node
        if (lowerText.indexOf(lowerQuery) === -1) {
            continue;
        }

        // allows for holding multiple DOM elements together (through appending as below)
        const frag = document.createDocumentFragment();
        
        // now we start looking for the query text. start at position 0 of the node. 
        let pos = 0;
        let searchPos;

        //keep searching for matches from current text node. allows for multiple matches in a text node. 
        while ((searchPos = lowerText.indexOf(lowerQuery, pos)) !== -1) {

            //if theres text between where we are and where the next match is, add it all to fragment.
            //this does NOT add the actual query word. thats next. 
            if (searchPos > pos) {
                frag.appendChild(
                    document.createTextNode(
                        text.slice(pos, searchPos)
                    )
                );
            }
            
            //below, we are creating a styled span to highlight the queried word.

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

            //we then append the queried word in the span to the frag. 
            frag.appendChild(span);

            //if first highlight doesn't exist, firsthighlight = current span. if it already exists don't replace. 
            if (!firstHighlight) {
                firstHighlight = span;
            }

            // updates once per match - searchpos is the start of the match, so we just shuffle it by that length. 
            pos = searchPos + query.length;
        }

        // after all matches have been found, simply append the rest of the text node to the end of the frag. 
        if (pos < text.length) {
            frag.appendChild(
                document.createTextNode(text.slice(pos))
            );
        }

        // find parent for the current textnode, and replace the current textnode with the newly highlighted textnode (frag)
        textNode.parentNode.replaceChild(frag, textNode);
    }

    // scroll to first highlight by default 
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

// Retrieves information about the current text selection, including the range and selected text
function getSelectionInfo() {

    // the current text selection
    const sel = window.getSelection();

    //if there is no selection, then return null (no selection info to return)
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        return null;
    }

    // format selected text
    const text = sel.toString().trim();

    // this will return null if the text is only whitespace
    if (!text) {
        return null;
    }

    // get the exact location of the selected text in the DOM
    const range = sel.getRangeAt(0);
    const content = document.getElementById("content");

    // If the selection is not in the content element, return null
    // commonAncestorContainer is the smallest DOM element that contains the entire text selection
    // (a selection can span multiple elements)
    if (!content.contains(range.commonAncestorContainer)) {
        return null;
    }

    // return the entire range of the selection, and its text contents
    return {
        range: range,
        text: text
    };
}

// Finds the line of text that provides context for the selected range
function findContextLine(range) {
    // Start with the common ancestor container of the range
    let node = range.commonAncestorContainer;

    //if the node is a text node / container, then set node from the text itself to the element containing the text. 
    if (node.nodeType === 3) {
        node = node.parentElement;
    }

    // select the content element (essentially contains the chapter being shown at the top level)
    const content = document.getElementById("content");

    //move up until we reach the highest level element that isn't content and set node to be this element. 
    while ( node && node !== content && node.parentElement !== content ) {
        node = node.parentElement;
    }

    // if node exists, get all text inside node
    const blockText = node? node.innerText : range.toString();

    // what the user highlighted
    const selectedText = range.toString();

    //split the block text into sentences
    const sentences = blockText.split(/(?<=[.!?])\s+/);

    // find the sentence that contains the selected text, or fallback to the entire block text if no match is found
    const match = sentences.find(function (s) {
        return s.indexOf(selectedText) !== -1;
    });

    // return the matched sentence or the entire block text, trimmed of whitespace
    return (match || blockText).trim();
}

// Hides the selection toolbar
function hideToolbar() {
    document.getElementById("selection-toolbar").classList.remove("visible");
}

// Shows the selection toolbar near the selected text range
function showToolbar(range) {
    const toolbar = document.getElementById("selection-toolbar");

    toolbar.classList.add("visible");

    // bounding rectangle of selected text
    const rect = range.getBoundingClientRect();

    // setting the position of the toolbar
    requestAnimationFrame(function () {
        const h = toolbar.offsetHeight;
        let top = rect.bottom + 12;

        // if toolbar goes below the screen, place it above the selection
        if (top + h > window.innerHeight - 10) {
            top = rect.top - h - 12;
        }

        // if above screen, then position it to be at least 10px from the top of the screen
        if (top < 10) {
            top = 10;
        }

        // set the top position of the toolbar to the calculated value
        toolbar.style.top = top + "px";
    });
}

// Handles selection change events to show or hide the toolbar based on the current selection
document.addEventListener("selectionchange",
    function () {

        // returns range and text of selection
        const info = getSelectionInfo();

        // if no selection then hide toolbar
        if (!info) {
            hideToolbar();
            return;
        }

        // sets these 3 variables (for use in the translate and explain buttons)
        activeRange = info.range.cloneRange();
        activeWord = info.text;
        activeContext = findContextLine(info.range);

        // show toolbar if there is a selection
        showToolbar(info.range);
    }
);


const translateBtn = document.getElementById("translate-btn");
const explainBtn = document.getElementById("explain-btn");

// Prevents the default behavior of the buttons on mousedown to avoid losing the selection
translateBtn.addEventListener("mousedown",
    function (e) {
        e.preventDefault();
    }
);

// Prevents the default behavior of the buttons on mousedown to avoid losing the selection
explainBtn.addEventListener("mousedown",
    function (e) {
        e.preventDefault();
    }
);

// Handles the click event for the translate button to request translation of the selected word
translateBtn.addEventListener("click",
    function () {
        // if there is no active word selected, do nothing
        if (!activeWord) return;

        translateBtn.innerText = "Translating…";

        // post a translation message to go react native webview (index.tsx). this is then forwarded to backend. 
        window.ReactNativeWebView.postMessage(
            JSON.stringify({
                type: "translateRequest",
                word: activeWord,
                context: activeContext
            })
        );
    }
);

// Handles the click event for the explain button to request an explanation of the selected line
explainBtn.addEventListener( "click",
    function () {
        // if no words selected for explanation, return
        if (!activeContext) return;

        explainBtn.innerText = "Explaining…";

        // send explain request to react native webview (index.tsx), and then to the backend. 
        window.ReactNativeWebView.postMessage(
            JSON.stringify({
                type: "explainRequest",
                text: activeContext
            })
        );
    }
);

// Closes the explanation overlay when the close button or backdrop is clicked
document
    .getElementById("explain-close")
    .addEventListener("click", closeExplain);

// Closes the explanation overlay when the backdrop is clicked
document
    .getElementById("explain-backdrop")
    .addEventListener("click", closeExplain);

// Closes the explanation overlay and hides the backdrop
function closeExplain() {
    document
        .getElementById("explain-overlay")
        .classList.remove("visible");

    document
        .getElementById("explain-backdrop")
        .classList.remove("visible");
}

// Receives the translated text from the native side and replaces the selected text with it
window.__applyTranslation = function (translated) {
    translateBtn.innerText = "Translate";
    hideToolbar();

    // If there is an active selection range and a translated text, replace the selected text with the translated text
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

// Receives the explanation from the native side and displays it in the overlay
window.__translationFailed = function () {
    translateBtn.innerText = "Translate";
};

// Receives the explanation from the native side and displays it in the overlay
window.__showExplanation = function (explanation) {
    explainBtn.innerText = "Explain this line";
    hideToolbar();

    // add the text to the p element inside overlay and make it visible
    const overlay = document.getElementById("explain-overlay");
    overlay.querySelector("p").innerText = explanation;
    overlay.classList.add("visible");

    // also make the backdrop visible
    document
        .getElementById("explain-backdrop")
        .classList.add("visible");
};

// Receives a failure notification from the native side and resets the explain button text
window.__explanationFailed = function () {
    explainBtn.innerText = "Explain this line";
};

// Listens for messages from the native side to handle navigation and search actions
window.addEventListener(
    "message",
    (e) => {
        const msg = JSON.parse(e.data);

        //update to next chapter
        if (
            msg.action === "next" &&
            current < chapters.length - 1
        ) {
            showChapter(current + 1);
        }

        //update to previous chapter
        if (
            msg.action === "prev" &&
            current > 0
        ) {
            showChapter(current - 1);
        }

        // navigate to a specific chapter and scroll position (for bookmarks)
        if (msg.action === "goto") {
            gotoChapter(msg.index, msg.scrollY);
        }

        // call query search function in the current chapter and highlight matches
        if (msg.action === "search") {
            searchInChapter(msg.query);
        }
    }
);

// Loads the book from the specified URI, extracts chapters, and displays the first chapter
function loadBook() {
    const xhr = new XMLHttpRequest();

    // Open a GET request to the specified URI to load the book
    xhr.open(
        "GET",
        ${JSON.stringify(uri)},
        true
    );

    // the response will be an ArrayBuffer, which is suitable for binary data like ZIP files
    xhr.responseType = "arraybuffer";

    xhr.onload = function () {

        //if response is returned (onload), BUT the response is an error code, return error. 
        if (
            xhr.status !== 0 &&
            xhr.status !== 200
        ) {
            document.getElementById("content").innerText =
                "Error loading book: HTTP " +
                xhr.status;

            return;
        }

        //reference to the arraybuffer response
        const buffer = xhr.response;
        // buffer is empty meaning no response
        if (!buffer) {
            document.getElementById("content").innerText =
                "Error loading book: empty response";

            return;
        }

        //if no errors, load the ZIP file asynchronously
        JSZip
            .loadAsync(buffer)
            .then(function (zip) {

                // filter the files in the ZIP to find HTML files, excluding TOC and navigation files
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

                // read the contents of the HTML files as strings
                const promises = htmlFiles.map(
                    function (name) {
                        return zip.files[name].async("string");
                    }
                );

                // wait for all the HTML files to be read and return their contents
                return Promise.all(promises);
            })

            // Once all HTML files are read, parse their contents and extract the text for each chapter
            .then(function (contents) {
                const parser = new DOMParser();

                chapters = contents
                    // Parse each HTML content string into a document and extract the inner text of the body
                    .map(function (html) {
                        const doc =
                            parser.parseFromString(
                                html,
                                "text/html"
                            );

                        return doc.body.innerText.trim();
                    })

                    // Filter out chapters that are too short (less than 100 characters) to avoid including non-content pages
                    .filter(function (text) {
                        return text.length > 100;
                    });

                // Send the list of chapters to the native side for navigation purposes
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

                // Display the first chapter in the reader
                showChapter(0);
            })

            // Handle any errors that occur during the loading and parsing of the book, displaying an error message in the content area
            .catch(function (e) {
                document.getElementById("content").innerText =
                    "Error parsing book: " +
                    e.message;
            });
    };

    //handle request errors
    xhr.onerror = function () {
        document.getElementById("content").innerText =
            "Error loading book: request failed";
    };

    // send the request to load the book
    xhr.send();
}

// Immediately load the book when the script is executed
loadBook();