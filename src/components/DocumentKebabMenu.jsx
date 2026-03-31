import { useEffect, useRef, useState } from "react";

const CONFIRM_DEFAULT =
  "Bu belgeyi silmek istediğinize emin misiniz?";

/**
 * Liste satırı ⋯ menüsü: Sil + onay.
 *
 * @param {{
 *   onDelete: () => void,
 *   onRename?: (nextTitle: string) => void,
 *   currentTitle?: string,
 *   confirmMessage?: string,
 *   menuId?: string,
 * }} props
 */
export default function DocumentKebabMenu({
  onDelete,
  onRename,
  currentTitle = "",
  confirmMessage = CONFIRM_DEFAULT,
  menuId,
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setRenaming(false);
      setDraftTitle("");
    }
  }, [open]);

  useEffect(() => {
    if (!renaming) return;
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [renaming]);

  const handleDelete = () => {
    setOpen(false);
    if (window.confirm(confirmMessage)) {
      onDelete();
    }
  };

  const submitRename = () => {
    const next = draftTitle.trim();
    if (!next) return;
    onRename?.(next);
    setRenaming(false);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        id={menuId}
        aria-label="Belge seçenekleri"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-10 items-center justify-center rounded-xl text-xl leading-none text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        ⋯
      </button>
      {open ? (
        <ul
          role="menu"
          aria-labelledby={menuId}
          className="absolute right-0 top-full z-[60] mt-1 min-w-[8.5rem] rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {onRename ? (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraftTitle(currentTitle || "");
                  setRenaming(true);
                }}
              >
                Yeniden Adlandır
              </button>
            </li>
          ) : null}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm font-medium text-red-800 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Sil
            </button>
          </li>
          {renaming ? (
            <li role="none" className="border-t border-stone-200 px-2 py-2">
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setRenaming(false);
                  }
                }}
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
              />
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenaming(false);
                  }}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    submitRename();
                  }}
                >
                  Onayla
                </button>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
