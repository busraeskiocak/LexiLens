import { useEffect, useMemo, useState } from "react";
import { getStorageJSON, setStorageJSON, getUpp, setUpp } from "../utils/storage.js";

const STORE_KEY = "lexilens_kelime_tarayici_docs";
const WORD_SPLIT_RE = /[A-Za-zÇĞİIÖŞÜçğıöşü0-9]+/g;

export default function KelimeTarayici() {
  const [readingDocs, setReadingDocs] = useState(/** @type {any[]} */ ([]));
  const [docKind, setDocKind] = useState(/** @type {"pdf" | "docx" | null} */ (null));
  const [docName, setDocName] = useState("");
  const [docxHtml, setDocxHtml] = useState("");
  const [wordRows, setWordRows] = useState(
    /** @type {{ word: string, readAs: string, count: number, addedAt: string }[]} */ ([])
  );

  const [candidateWords, setCandidateWords] = useState(/** @type {string[]} */ ([]));
  const [pickedWord, setPickedWord] = useState("");
  const [readAs, setReadAs] = useState("");

  useEffect(() => {
    const s = getStorageJSON(STORE_KEY, null);
    if (!s || typeof s !== "object") return;
    setDocKind(s?.docKind === "pdf" || s?.docKind === "docx" ? s.docKind : null);
    setDocName(typeof s?.docName === "string" ? s.docName : "");
    setDocxHtml(typeof s?.docxHtml === "string" ? s.docxHtml : "");
    if (Array.isArray(s?.wordRows)) {
      setWordRows(
        s.wordRows
          .filter((r) => r && typeof r.word === "string")
          .map((r) => ({
            word: r.word,
            readAs: typeof r.readAs === "string" ? r.readAs : "",
            count:
              typeof r.count === "number" && Number.isFinite(r.count) && r.count > 0
                ? Math.floor(r.count)
                : 1,
            addedAt:
              typeof r.addedAt === "string" && r.addedAt
                ? r.addedAt
                : typeof r.eklendiğiTarih === "string" && r.eklendiğiTarih
                ? r.eklendiğiTarih
                : typeof r.eklendigiTarih === "string" && r.eklendigiTarih
                ? r.eklendigiTarih
                : new Date().toISOString(),
          }))
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStorageJSON(STORE_KEY, { docKind, docName, docxHtml, wordRows });
  }, [docKind, docName, docxHtml, wordRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("lexilens_reading_history");
    if (!raw) {
      setReadingDocs([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setReadingDocs(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReadingDocs([]);
    }
  }, []);

  const compareLeftMarkup = useMemo(
    () => (docxHtml?.trim() ? docxHtml : "<p><br></p>"),
    [docxHtml]
  );
  const docxReadingDocs = useMemo(
    () => readingDocs.filter((doc) => doc?.kind === "docx"),
    [readingDocs]
  );

  function selectReadingDoc(doc) {
    if (!doc || typeof doc !== "object") return;
    setDocName(typeof doc.title === "string" ? doc.title : "Adsız belge");

    if (doc.kind === "pdf") {
      setDocKind("pdf");
      setDocxHtml("");
      return;
    }

    if (doc.kind === "docx") {
      setDocKind("docx");
      const html =
        typeof doc.originalContent === "string"
          ? doc.originalContent
          : typeof doc.content === "string"
          ? doc.content
          : "";
      setDocxHtml(html);
      return;
    }

    setDocKind(null);
    setDocxHtml("");
  }

  function onDocumentMouseUp() {
    if (typeof window === "undefined") return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected) return;
    const words = Array.from(new Set((selected.match(WORD_SPLIT_RE) ?? []).map((w) => w.trim()))).filter(
      Boolean
    );
    if (!words.length) return;
    setCandidateWords(words);
    setPickedWord(words[0]);
    setReadAs("");
    window.getSelection()?.removeAllRanges();
  }

  function addWord() {
    if (!pickedWord) return;
    setWordRows((prev) => {
      const i = prev.findIndex(
        (r) => r.word.toLocaleLowerCase("tr-TR") === pickedWord.toLocaleLowerCase("tr-TR")
      );
      if (i < 0) {
        return [
          ...prev,
          {
            word: pickedWord,
            readAs,
            count: 1,
            addedAt: new Date().toISOString(),
          },
        ];
      }
      return prev.map((row, idx) =>
        idx === i
          ? {
              ...row,
              count: (row.count || 1) + 1,
              readAs: readAs || row.readAs,
            }
          : row
      );
    });
    setCandidateWords([]);
    setPickedWord("");
    setReadAs("");
  }

  function closePopup() {
    setCandidateWords([]);
    setPickedWord("");
    setReadAs("");
  }

  function saveProfile() {
    const upp = getUpp();
    if (!upp || typeof upp !== "object") return;
    const existing = Array.isArray(upp.wordDictionary) ? upp.wordDictionary : [];
    const mergedMap = new Map();
    for (const row of existing) {
      if (!row || typeof row !== "object" || typeof row.kelime !== "string") continue;
      const key = row.kelime.toLocaleLowerCase("tr-TR");
      mergedMap.set(key, {
        kelime: row.kelime,
        nasılOkudum: typeof row.nasılOkudum === "string" ? row.nasılOkudum : "",
        sayi:
          typeof row.sayi === "number" && Number.isFinite(row.sayi) && row.sayi > 0
            ? Math.floor(row.sayi)
            : 1,
      });
    }
    for (const row of wordRows) {
      const key = row.word.toLocaleLowerCase("tr-TR");
      const prev = mergedMap.get(key);
      if (!prev) {
        mergedMap.set(key, {
          kelime: row.word,
          nasılOkudum: row.readAs || "",
          sayi: row.count || 1,
          eklendigiTarih: row.addedAt || new Date().toISOString(),
        });
      } else {
        mergedMap.set(key, {
          kelime: prev.kelime,
          nasılOkudum: row.readAs || prev.nasılOkudum || "",
          sayi: (prev.sayi || 1) + (row.count || 1),
          eklendigiTarih:
            (typeof prev.eklendigiTarih === "string" && prev.eklendigiTarih) ||
            (typeof prev.addedAt === "string" && prev.addedAt) ||
            row.addedAt ||
            new Date().toISOString(),
        });
      }
    }
    setUpp({ ...upp, wordDictionary: Array.from(mergedMap.values()) });
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 pt-4 sm:px-6">
      <div className="mb-3">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Kelime Tarayıcı</h1>
          <p className="text-sm text-stone-600">{docName || "Belge seçilmedi."}</p>
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold text-stone-800">Okuma Geçmişi</h2>
        {docxReadingDocs.length === 0 ? (
          <p className="text-sm text-stone-500">Kayıtlı belge yok.</p>
        ) : (
          <div className="max-h-44 space-y-2 overflow-auto">
            {docxReadingDocs.map((doc) => (
              <button
                key={doc?.id ?? `${doc?.title ?? "doc"}-${doc?.createdAt ?? ""}`}
                type="button"
                onClick={() => selectReadingDoc(doc)}
                className="block w-full rounded-lg border border-stone-200 px-3 py-2 text-left hover:bg-stone-50"
              >
                <div className="text-sm font-medium text-stone-900">{doc?.title || "Adsız belge"}</div>
                <div className="text-xs text-stone-500">
                  {doc?.createdAt ? new Date(doc.createdAt).toLocaleString("tr-TR") : "Tarih yok"}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid min-h-[72vh] grid-cols-10 gap-4">
        <section
          className="col-span-7 min-h-0 overflow-auto rounded-2xl border border-stone-200 bg-white p-4"
          onMouseUp={onDocumentMouseUp}
        >
          {docKind == null ? (
            <p className="text-sm text-stone-500">Üstteki listeden bir belge seçin.</p>
          ) : docKind === "docx" ? (
            <div
              className="min-h-0 min-w-0 flex-1 overflow-x-auto bg-white"
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div className="flex w-full shrink-0 flex-col items-center px-1 py-2 sm:px-2">
                <div className="compare-original-pane w-full max-w-full">
                  <div className="relative mx-auto w-full max-w-[920px] rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="relative z-[5] p-4 sm:p-6">
                      <div
                        className="word-editor-surface word-editor-surface--rich relative z-[6] w-full max-w-full bg-transparent select-text text-stone-900 outline-none"
                        style={{
                          fontFamily: "Times New Roman, serif",
                          letterSpacing: "normal",
                          lineHeight: "normal",
                          backgroundColor: "white",
                          color: "black",
                        }}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: compareLeftMarkup }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : docKind === "pdf" ? (
            <p className="text-sm text-stone-500">PDF önizleme desteklenmiyor</p>
          ) : (
            <p className="text-sm text-stone-500">Bu belge türü desteklenmiyor.</p>
          )}
        </section>

        <aside className="col-span-3 flex min-h-0 flex-col rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-stone-900">Kelime Listesi</h2>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200">
            <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <span>Kelime</span>
              <span>Nasıl Okudum</span>
            </div>
            {wordRows.length === 0 ? (
              <p className="px-3 py-3 text-sm text-stone-500">Henüz kelime eklenmedi.</p>
            ) : (
              wordRows.map((row, idx) => (
                <div
                  key={`word-row-${idx}`}
                  className="grid w-full grid-cols-2 gap-2 border-b border-stone-100 px-3 py-2 text-left text-sm"
                >
                  <span className="font-medium text-stone-900">
                    {row.word} ({row.count || 1}x)
                  </span>
                  <span className="text-stone-700">{row.readAs || "—"}</span>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={saveProfile}
            className="mt-3 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Profile Kaydet
          </button>
        </aside>
      </div>

      {candidateWords.length > 0 ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Seçilen Kelimeler</h3>
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-stone-200 p-2">
              <div className="flex flex-wrap gap-2">
                {candidateWords.map((w) => (
                  <button
                    key={`candidate-${w}`}
                    type="button"
                    onClick={() => setPickedWord(w)}
                    className={`rounded-lg px-2.5 py-1 text-sm ${
                      pickedWord === w
                        ? "bg-emerald-700 text-white"
                        : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-stone-700">
              Seçilen: <span className="font-semibold text-stone-900">{pickedWord || "—"}</span>
            </p>
            <label className="mt-3 block text-sm font-medium text-stone-800">
              Nasıl okudum?
              <input
                value={readAs}
                onChange={(e) => setReadAs(e.target.value)}
                placeholder="Boş bırakabilirsiniz"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePopup}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={addWord}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Listeye Ekle
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
