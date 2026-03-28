import { useMemo } from "react";
import { Link } from "react-router-dom";
import WordLikeWorkbench, {
  loadWritingDocumentFromStorage,
} from "../components/WordLikeWorkbench.jsx";
import { getUpp } from "../utils/storage.js";

const primaryBtn =
  "rounded-2xl bg-emerald-700 px-5 py-4 text-center text-lg font-semibold text-white shadow-md shadow-emerald-900/15 outline-none ring-emerald-800 ring-offset-2 ring-offset-stone-100 transition hover:bg-emerald-800 focus-visible:ring-2 active:scale-[0.99]";

export default function WritingPage() {
  const upp = getUpp();
  const restored = useMemo(() => loadWritingDocumentFromStorage(), []);

  if (!upp || typeof upp !== "object") {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-2xl font-semibold text-stone-900">Yazma modu</h1>
        <p className="mt-3 leading-relaxed text-stone-700">
          Yazma alanını profil ayarlarınızla göstermek için önce kalibrasyonu
          tamamlayın.
        </p>
        <Link to="/kalibrasyon" className={`mt-6 inline-flex ${primaryBtn}`}>
          Kalibrasyona git
        </Link>
        <Link
          to="/"
          className="mt-4 block text-emerald-900 underline decoration-2 underline-offset-4"
        >
          Ana sayfa
        </Link>
      </main>
    );
  }

  return (
    <WordLikeWorkbench
      key="yazma"
      upp={upp}
      mode="writing"
      initialTitle={restored?.title ?? "Adsız belge"}
      initialBody={restored?.html ?? ""}
      colorizePlainOnLoad={false}
    />
  );
}
