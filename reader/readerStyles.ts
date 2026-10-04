// used formatter to format, hence different formatting style
export const readerStyles = ` body {
     margin: 0;
     padding: 24px;
     padding-top: var(--top-inset);
     background: #fef0d8;
     font-size: 22px;
     line-height: 1.4;
     color: #000;
     font-weight: 500;
}
 #content {
     font-family: 'Lusitana', serif;
}
 ::selection {
     background: #d20f39;
     color: #fff;
}
 ::-moz-selection {
     background: #d20f39;
     color: #fff;
}
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
 #selection-toolbar.visible {
     display: flex;
}
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
 .toolbar-btn:active {
     opacity: 0.5;
}
 .toolbar-btn + .toolbar-btn {
     border-top: 1px solid #262626;
}
 #explain-backdrop {
     position: fixed;
     inset: 0;
     background: rgba(0, 0, 0, 0.55);
     z-index: 998;
     display: none;
}
 #explain-backdrop.visible {
     display: block;
}
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
 #explain-overlay.visible {
     display: block;
}
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
 `;
 