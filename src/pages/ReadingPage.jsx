import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FixedBackButton from "../components/FixedBackButton.jsx";
import WordLikeWorkbench from "../components/WordLikeWorkbench.jsx";
import { canBrowserGoBack } from "../utils/historyNav.js";
import { pdfjs } from "react-pdf";
import mammoth from "mammoth";
import { isProbablyHtml } from "../lib/readingText.js";
import { getUpp } from "../utils/storage.js";
import {
  appendReadingHistoryEntry,
  getReadingHistory,
  previewFromContent,
  titleFromTextSnippet,
} from "../utils/readingHistory.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function extractPdfPlainText(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const chunks = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const strings = tc.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    chunks.push(strings.join(" "));
  }
  return chunks.join("\n\n").trim();
}

async function extractDocxPlainText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

function formatDocDate(iso) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function kindBadgeLabel(kind) {
  if (kind === "pdf") return "PDF";
  if (kind === "docx") return "DOCX";
  return "Metin";
}

export default function ReadingPage() {
  const navigate = useNavigate();
  const upp = getUpp();

  const goBackOrHome = useCallback(() => {
    if (canBrowserGoBack()) navigate(-1);
    else navigate("/");
  }, [navigate]);
  const fileInputRef = useRef(null);

  const [screen, setScreen] = useState(/** @type {'list' | 'reading'} */ ("list"));
  const [documents, setDocuments] = useState(() => getReadingHistory());
  const [activeDocId, setActiveDocId] = useState(null);
  const [sourceText, setSourceText] = useState("");

  const [fabOpen, setFabOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDraft, setSheetDraft] = useState("");
  const [sheetEntered, setSheetEntered] = useState(false);

  const [loadKind, setLoadKind] = useState("");
  const [loadError, setLoadError] = useState(null);

  const refreshDocuments = useCallback(() => {
    setDocuments(getReadingHistory());
  }, []);

  const handleReadingSaved = useCallback(() => {
    refreshDocuments();
    const cur = getReadingHistory().find((x) => x.id === activeDocId);
    if (cur) setSourceText(cur.content);
  }, [activeDocId, refreshDocuments]);

  useEffect(() => {
    if (!sheetOpen) {
      setSheetEntered(false);
      return;
    }
    setSheetEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [sheetOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFabOpen(false);
        setSheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (screen === "list") refreshDocuments();
  }, [screen, refreshDocuments]);

  const openReading = useCallback((item) => {
    setSourceText(item.content);
    setActiveDocId(item.id);
    setScreen("reading");
    setLoadError(null);
  }, []);

  const runLoadFile = useCallback(
    async (kind, file) => {
      setLoadError(null);
      setLoadKind(kind);
      try {
        const text =
          kind === "pdf" ? await extractPdfPlainText(file) : await extractDocxPlainText(file);
        if (!text.trim()) {
          setLoadError("Dosyadan metin çıkarılamadı.");
          return;
        }
        const newId = appendReadingHistoryEntry({
          kind: kind === "pdf" ? "pdf" : "docx",
          title: file.name,
          content: text,
        });
        refreshDocuments();
        if (newId) {
          setSourceText(text);
          setActiveDocId(newId);
          setScreen("reading");
        }
      } catch (e) {
        console.error(e);
        setLoadError(
          kind === "pdf"
            ? "PDF okunamadı. Dosya bozuk veya şifreli olabilir."
            : "DOCX okunamadı. Dosyayı kontrol edin."
        );
      } finally {
        setLoadKind("");
      }
    },
    [refreshDocuments]
  );

  const onPickDocument = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) {
        runLoadFile("pdf", file);
      } else if (lower.endsWith(".docx")) {
        runLoadFile("docx", file);
      } else {
        setLoadError("Lütfen PDF veya DOCX dosyası seçin.");
      }
    },
    [runLoadFile]
  );

  const saveSheetAndRead = useCallback(() => {
    const text = sheetDraft.trim();
    if (!text) {
      setLoadError("Metin alanı boş olamaz.");
      return;
    }
    setLoadError(null);
    const newId = appendReadingHistoryEntry({
      kind: "text",
      title: titleFromTextSnippet(text),
      content: text,
    });
    refreshDocuments();
    if (newId) {
      setSourceText(text);
      setActiveDocId(newId);
      setSheetOpen(false);
      setSheetDraft("");
      setScreen("reading");
    }
  }, [sheetDraft, refreshDocuments]);

  const busy = loadKind !== "";

  const activeTitle = useMemo(() => {
    if (!activeDocId) return "Okuma";
    const d = documents.find((x) => x.id === activeDocId);
    return d?.title ?? "Okuma";
  }, [activeDocId, documents]);

  if (!upp || typeof upp !== "object") {
    return (
      <>
        <FixedBackButton onClick={goBackOrHome} aria-label="Geri" />
        <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Okuma modu</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Okuma ayarları için önce profil oluşturmanız gerekir.
        </p>
        <Link
          to="/kalibrasyon"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white"
        >
          Kalibrasyona git
        </Link>
        <Link
          to="/"
          className="mt-4 block text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfa
        </Link>
        </main>
      </>
    );
  }

  if (screen === "reading" && activeDocId) {
    return (
      <>
        <FixedBackButton
          onClick={() => setScreen("list")}
          aria-label="Belgeler listesine dön"
        />
        <WordLikeWorkbench
          key={activeDocId}
          upp={upp}
          mode="reading"
          initialTitle={activeTitle}
          initialBody={sourceText}
          colorizePlainOnLoad={!isProbablyHtml(sourceText)}
          documentId={activeDocId}
          onReadingSaved={handleReadingSaved}
        />
      </>
    );
  }

  return (
    <>
      <FixedBackButton onClick={goBackOrHome} aria-label="Geri" />
      <main className="relative mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6">
      <header className="mb-2">
        <p className="text-sm font-medium text-stone-600">Okuma modu</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Geçmiş Belgeler</h1>
      </header>

      {loadError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {loadError}
        </p>
      ) : null}

      {busy ? (
        <p className="mb-4 text-sm font-medium text-emerald-800">Belge işleniyor…</p>
      ) : null}

      {documents.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50/90 px-6 py-12 text-center">
          <p className="text-base font-medium text-stone-700">Henüz belge yok</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Sağ alttaki + ile belge yükleyin veya metin yapıştırın.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => openReading(doc)}
                className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold text-stone-900">
                    {doc.title}
                  </h2>
                  <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                    {kindBadgeLabel(doc.kind)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs tabular-nums text-stone-500">
                  {formatDocDate(doc.createdAt)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">
                  {previewFromContent(doc.content, 120) || "—"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onPickDocument}
      />

      {fabOpen ? (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="fixed inset-0 z-40 cursor-default bg-stone-900/20"
            onClick={() => setFabOpen(false)}
          />
          <div
            className="fixed right-5 z-50 flex flex-col items-end gap-2"
            style={{ bottom: "5.5rem" }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFabOpen(false);
                fileInputRef.current?.click();
              }}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-semibold text-stone-900 shadow-lg transition hover:bg-stone-50 disabled:opacity-50"
            >
              Belge Yükle
            </button>
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                setLoadError(null);
                setSheetDraft("");
                setSheetOpen(true);
              }}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-semibold text-stone-900 shadow-lg transition hover:bg-stone-50"
            >
              Metin Yapıştır
            </button>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setFabOpen((o) => !o)}
        aria-expanded={fabOpen}
        aria-label={fabOpen ? "Menüyü kapat" : "Yeni belge ekle"}
        className="fixed bottom-6 right-5 z-30 flex size-14 items-center justify-center rounded-full bg-emerald-700 text-3xl font-light leading-none text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
      >
        {fabOpen ? "×" : "+"}
      </button>

      {sheetOpen ? (
        <>
          <button
            type="button"
            aria-label="Paneli kapat"
            className="fixed inset-0 z-40 bg-stone-900/40 transition-opacity"
            onClick={() => {
              setSheetOpen(false);
              setSheetDraft("");
              setLoadError(null);
            }}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[min(55vh,28rem)] min-h-[42vh] flex-col rounded-t-3xl border-t border-stone-200 bg-white px-4 pb-6 pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${
              sheetEntered ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-stone-300" aria-hidden />
            <h2 className="text-lg font-semibold text-stone-900">Metin yapıştır</h2>
            <p className="mt-1 text-sm text-stone-600">
              Metninizi girin; kaydettiğinizde liste ve okuma görünümüne eklenir.
            </p>
            {loadError && sheetOpen ? (
              <p className="mt-2 text-sm text-red-700">{loadError}</p>
            ) : null}
            <textarea
              value={sheetDraft}
              onChange={(e) => {
                setSheetDraft(e.target.value);
                if (loadError) setLoadError(null);
              }}
              rows={10}
              className="mt-3 min-h-[10rem] w-full resize-y rounded-xl border border-stone-300 bg-stone-50 px-3 py-3 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
              placeholder="Metni buraya yapıştırın veya yazın…"
              aria-label="Yapıştırılacak metin"
            />
            <button
              type="button"
              onClick={saveSheetAndRead}
              className="mt-4 w-full shrink-0 rounded-2xl bg-emerald-700 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800"
            >
              Kaydet ve Oku
            </button>
          </div>
        </>
      ) : null}

      <Link
        to="/"
        className="mt-8 inline-block text-sm text-emerald-900 underline decoration-2 underline-offset-4"
      >
        Ana sayfa
      </Link>
    </main>
    </>
  );
}
