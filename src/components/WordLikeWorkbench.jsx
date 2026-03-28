import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FONT_OPTIONS } from "../lib/upp.js";
import {
  isProbablyHtml,
  plainTextToColorizedHtml,
  stripHtmlToPlainText,
} from "../lib/readingText.js";
import {
  updateReadingHistoryEntry,
} from "../utils/readingHistory.js";

const FONT_SIZES = [12, 14, 16, 18, 20];
const WRITING_STORAGE_KEY = "lexilens_writing_document";

/** ~A4 iç yüksekliği (px, 96dpi) — sayfa sayımı için */
const PAGE_SLICE_PX = 1008;

const A4_MM_W = 210;
const A4_MM_H = 297;

function mm(n) {
  return `${n}mm`;
}

/**
 * @param {import('react').MouseEvent} e
 */
function keepEditorSelection(e) {
  e.preventDefault();
}

/** DOM: el.contains(el) false döner; seçim kökü editörün kendisi olabiliyor. */
function rangeAnchorsInsideEditor(editor, range) {
  if (!editor || !range) return false;
  const n = range.commonAncestorContainer;
  return n === editor || editor.contains(n);
}

/**
 * Seçili metne veya imlece inline stil uygular (execCommand yerine).
 * @param {HTMLElement | null} editor
 * @param {Record<string, string>} style
 */
function applyInlineStyleInEditor(editor, style) {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!rangeAnchorsInsideEditor(editor, range)) return;

  if (range.collapsed) {
    const span = document.createElement("span");
    Object.assign(span.style, style);
    const z = document.createTextNode("\u200b");
    span.appendChild(z);
    range.insertNode(span);
    const nr = document.createRange();
    nr.setStart(z, 1);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
    return;
  }

  const span = document.createElement("span");
  Object.assign(span.style, style);
  try {
    range.surroundContents(span);
  } catch {
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } catch {
      return;
    }
  }
  sel.removeAllRanges();
  const nr = document.createRange();
  nr.selectNodeContents(span);
  nr.collapse(false);
  sel.addRange(nr);
}

/**
 * @param {{
 *   upp: object,
 *   mode: 'reading' | 'writing',
 *   initialTitle: string,
 *   initialBody: string,
 *   colorizePlainOnLoad: boolean,
 *   documentId?: string | null,
 *   onReadingSaved?: () => void,
 * }} props
 */
export default function WordLikeWorkbench({
  upp,
  mode,
  initialTitle,
  initialBody,
  colorizePlainOnLoad,
  documentId = null,
  onReadingSaved,
}) {
  const editorRef = useRef(null);
  const scrollAreaRef = useRef(null);
  /** Araç çubuğuna tıklanınca kaybolan seçimi geri yüklemek için */
  const savedRangeRef = useRef(null);
  const [title, setTitle] = useState(initialTitle);
  const [fontSizePx, setFontSizePx] = useState(16);
  const [fontId, setFontId] = useState(
    () => upp?.fontPreference ?? "opendyslexic"
  );
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [saveFlash, setSaveFlash] = useState(false);
  const [fmtBold, setFmtBold] = useState(false);
  const [fmtItalic, setFmtItalic] = useState(false);
  const [fmtUnderline, setFmtUnderline] = useState(false);

  const applyUppTypography = useCallback(() => {
    const el = editorRef.current;
    if (!el || !upp) return;
    const typo = upp.typography ?? {};
    const pref = upp.fontPreference ?? "opendyslexic";
    const opt = FONT_OPTIONS.find((f) => f.id === pref) ?? FONT_OPTIONS[0];
    el.style.fontFamily = opt.fontFamily;
    el.style.letterSpacing = `${typeof typo.letterSpacingEm === "number" ? typo.letterSpacingEm : 0.06}em`;
    el.style.lineHeight = String(
      typeof typo.lineHeight === "number" ? typo.lineHeight : 1.65
    );
    setFontId(pref);
  }, [upp]);

  const syncStats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const plain = stripHtmlToPlainText(el.innerHTML);
    const words = plain.trim()
      ? plain.trim().split(/\s+/).filter(Boolean).length
      : 0;
    setWordCount(words);
    setCharCount(plain.length);
    const contentH = el.scrollHeight;
    const rawPages = Math.ceil((Number.isFinite(contentH) ? contentH : 0) / PAGE_SLICE_PX);
    const pages = Math.min(500, Math.max(1, rawPages));
    setPageCount(pages);
  }, []);

  const refreshFormatState = useCallback(() => {
    const ed = editorRef.current;
    if (typeof document === "undefined" || !document.queryCommandState || !ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    try {
      const r = sel.getRangeAt(0);
      if (!rangeAnchorsInsideEditor(ed, r)) return;
      setFmtBold(document.queryCommandState("bold"));
      setFmtItalic(document.queryCommandState("italic"));
      setFmtUnderline(document.queryCommandState("underline"));
    } catch {
      /* ignore */
    }
  }, []);

  const rememberSelectionInEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    try {
      const r = sel.getRangeAt(0);
      if (rangeAnchorsInsideEditor(ed, r)) {
        savedRangeRef.current = r.cloneRange();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (document.activeElement instanceof HTMLSelectElement) {
      document.activeElement.blur();
    }
    ed.focus({ preventScroll: true });
    const saved = savedRangeRef.current;
    if (saved) {
      try {
        const clone = saved.cloneRange();
        if (
          rangeAnchorsInsideEditor(ed, clone) &&
          document.contains(clone.startContainer) &&
          document.contains(clone.endContainer)
        ) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(clone);
          return;
        }
      } catch {
        /* yedek */
      }
    }
    try {
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(ed);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (colorizePlainOnLoad && mode === "reading") {
      el.innerHTML = plainTextToColorizedHtml(initialBody || "");
    } else if (isProbablyHtml(initialBody)) {
      el.innerHTML = initialBody || "<p><br></p>";
    } else if (initialBody?.trim()) {
      el.innerHTML = plainTextToColorizedHtml(initialBody);
    } else {
      el.innerHTML = "<p><br></p>";
    }
    applyUppTypography();
    syncStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca belge gövdesi
  }, [initialBody, colorizePlainOnLoad, mode]);

  useEffect(() => {
    const onSel = () => {
      rememberSelectionInEditor();
      refreshFormatState();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [rememberSelectionInEditor, refreshFormatState]);

  const exec = useCallback((cmd, val = false) => {
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch {
      /* ignore */
    }
    refreshFormatState();
    syncStats();
  }, [refreshFormatState, syncStats]);

  const applyFontFamily = useCallback(
    (id) => {
      const opt = FONT_OPTIONS.find((f) => f.id === id);
      if (!opt) return;
      setFontId(id);
      window.setTimeout(() => {
        restoreEditorSelection();
        window.requestAnimationFrame(() => {
          applyInlineStyleInEditor(editorRef.current, {
            fontFamily: opt.fontFamily,
          });
          rememberSelectionInEditor();
          syncStats();
        });
      }, 0);
    },
    [restoreEditorSelection, rememberSelectionInEditor, syncStats]
  );

  const applyFontSize = useCallback(
    (px) => {
      setFontSizePx(px);
      window.setTimeout(() => {
        restoreEditorSelection();
        window.requestAnimationFrame(() => {
          applyInlineStyleInEditor(editorRef.current, {
            fontSize: `${px}px`,
          });
          rememberSelectionInEditor();
          syncStats();
        });
      }, 0);
    },
    [restoreEditorSelection, rememberSelectionInEditor, syncStats]
  );

  const applyUppColorize = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const plain = el.innerText || "";
    el.innerHTML = plainTextToColorizedHtml(plain);
    applyUppTypography();
    syncStats();
  }, [applyUppTypography, syncStats]);

  const handleSave = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    if (!stripHtmlToPlainText(html).trim()) return;

    if (mode === "reading" && documentId) {
      const ok = updateReadingHistoryEntry(documentId, {
        title: title.trim() || "Adsız belge",
        content: html,
      });
      if (ok) {
        onReadingSaved?.();
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1200);
      }
    } else if (mode === "writing") {
      try {
        localStorage.setItem(
          WRITING_STORAGE_KEY,
          JSON.stringify({
            title: title.trim() || "Adsız belge",
            html,
            savedAt: new Date().toISOString(),
          })
        );
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1200);
      } catch {
        /* quota */
      }
    }
  }, [mode, documentId, title, onReadingSaved]);

  const updateCurrentPageFromScroll = useCallback(() => {
    const sc = scrollAreaRef.current;
    if (!sc) return;
    const st = sc.scrollTop;
    const cp = Math.min(
      pageCount,
      Math.max(1, Math.floor(st / PAGE_SLICE_PX) + 1)
    );
    setCurrentPage(cp);
  }, [pageCount]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      syncStats();
      updateCurrentPageFromScroll();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [syncStats, updateCurrentPageFromScroll]);

  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-stone-400">
      <header
        className="fixed left-0 right-0 top-14 z-40 flex h-12 items-center gap-2 overflow-x-auto overflow-y-hidden border-b border-stone-400 bg-stone-300 px-2 shadow-sm sm:gap-3 sm:px-3"
        onPointerDownCapture={rememberSelectionInEditor}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <button
            type="button"
            title="Kaydet"
            aria-label="Kaydet"
            onMouseDown={keepEditorSelection}
            onClick={handleSave}
            className="rounded-lg border border-stone-400 bg-white px-2 py-1.5 text-sm hover:bg-stone-50"
          >
            💾
          </button>
          <button
            type="button"
            title="Kalın"
            aria-label="Kalın"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("bold")}
            className={`rounded-lg border px-2 py-1.5 text-sm font-bold ${
              fmtBold
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            B
          </button>
          <button
            type="button"
            title="İtalik"
            aria-label="İtalik"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("italic")}
            className={`rounded-lg border px-2 py-1.5 text-sm italic ${
              fmtItalic
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            I
          </button>
          <button
            type="button"
            title="Altı çizili"
            aria-label="Altı çizili"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("underline")}
            className={`rounded-lg border px-2 py-1.5 text-sm underline ${
              fmtUnderline
                ? "border-emerald-600 bg-emerald-100"
                : "border-stone-400 bg-white"
            }`}
          >
            U
          </button>
        </div>

        <select
          aria-label="Yazı boyutu"
          value={fontSizePx}
          onChange={(e) => applyFontSize(Number(e.target.value))}
          className="max-w-[4.5rem] rounded-lg border border-stone-400 bg-white px-1 py-1.5 text-sm"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <select
          aria-label="Yazı tipi"
          value={fontId}
          onChange={(e) => applyFontFamily(e.target.value)}
          className="max-w-[9rem] rounded-lg border border-stone-400 bg-white px-1 py-1.5 text-sm sm:max-w-[11rem]"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-stone-400 bg-white p-0.5">
          <button
            type="button"
            title="Sola hizala"
            aria-label="Sola hizala"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("justifyLeft")}
            className="rounded px-2 py-1 text-xs hover:bg-stone-100"
          >
            Sol
          </button>
          <button
            type="button"
            title="Ortala"
            aria-label="Ortala"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("justifyCenter")}
            className="rounded px-2 py-1 text-xs hover:bg-stone-100"
          >
            Orta
          </button>
          <button
            type="button"
            title="Sağa hizala"
            aria-label="Sağa hizala"
            onMouseDown={keepEditorSelection}
            onClick={() => exec("justifyRight")}
            className="rounded px-2 py-1 text-xs hover:bg-stone-100"
          >
            Sağ
          </button>
        </div>

        <button
          type="button"
          title="UPP yazı tipi, aralık ve harf renklerini uygula"
          aria-label="UPP ayarlarını uygula"
          onMouseDown={keepEditorSelection}
          onClick={applyUppColorize}
          className="shrink-0 rounded-lg border border-stone-400 bg-white px-2 py-1.5 text-sm hover:bg-stone-50"
        >
          🎨
        </button>

        <div className="min-w-[6rem] max-w-[14rem] flex-1 px-1 text-center sm:max-w-md">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-stone-400 bg-white px-2 py-1 text-center text-sm font-medium text-stone-900"
            placeholder="Belge adı"
            aria-label="Belge adı"
          />
        </div>

        <Link
          to="/profil"
          className="shrink-0 text-xs font-medium text-emerald-900 underline decoration-1 underline-offset-2 sm:text-sm"
        >
          Profil
        </Link>

        {saveFlash ? (
          <span className="shrink-0 text-xs font-medium text-emerald-800">
            Kaydedildi
          </span>
        ) : null}
      </header>

      <div
        ref={scrollAreaRef}
        className="flex flex-1 overflow-y-auto pt-12 pb-10"
        onScroll={updateCurrentPageFromScroll}
      >
        <div className="mx-auto flex min-h-full w-full max-w-[calc(210mm+4rem)] justify-center gap-1 px-2 py-6 sm:gap-3 sm:px-6">
          <aside
            className="flex w-7 shrink-0 flex-col items-end pt-2 text-xs font-medium text-stone-700 sm:w-9"
            aria-label="Sayfa numaraları"
          >
            {pageNumbers.map((n) => (
              <div
                key={n}
                className="flex w-full items-start justify-end border-r border-transparent pr-1"
                style={{ minHeight: PAGE_SLICE_PX, paddingTop: 6 }}
              >
                <span className="tabular-nums">{n}</span>
              </div>
            ))}
          </aside>

          <div
            className="relative shrink-0 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]"
            style={{
              width: mm(A4_MM_W),
              minHeight: mm(A4_MM_H),
              maxWidth: "100%",
              boxSizing: "border-box",
              padding: `${mm(25)} ${mm(25)} ${mm(20)} ${mm(30)}`,
            }}
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline
              aria-label="Belge metni"
              onInput={() => {
                syncStats();
                refreshFormatState();
              }}
              className="word-editor-surface min-h-[calc(297mm-45mm)] w-full max-w-full text-stone-900 outline-none"
              style={{ color: "#1c1917" }}
            />
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-9 items-center justify-between gap-3 border-t border-stone-500 bg-stone-700 px-3 text-xs text-stone-100 sm:text-sm">
        <span className="tabular-nums">
          Kelime: {wordCount} · Karakter: {charCount}
        </span>
        <span className="tabular-nums">
          Sayfa {currentPage} / {pageCount}
        </span>
        <Link
          to="/"
          className="shrink-0 text-stone-200 underline decoration-1 underline-offset-2 hover:text-white"
        >
          Ana sayfa
        </Link>
      </footer>
    </div>
  );
}

export function loadWritingDocumentFromStorage() {
  try {
    const raw = localStorage.getItem(WRITING_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.html !== "string") return null;
    return {
      title: typeof o.title === "string" ? o.title : "Adsız belge",
      html: o.html,
    };
  } catch {
    return null;
  }
}
