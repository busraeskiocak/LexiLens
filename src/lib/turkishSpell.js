import nspell from "nspell";

const SPELL_MARK = "data-lexi-spell";

let spellInstance = null;
let spellLoadPromise = null;

/**
 * Hunspell-TR bazı geçerli ek zincirlerini tanımıyor; kök doğrulanınca kelimeyi kabul et.
 * Uzun ekler önce (greedy). Kısa ekler yanlış pozitif üretmesin diye min. kök uzunluğu var.
 */
const TR_PEEL_SUFFIXES = [
  "ebilsiniz",
  "abilsiniz",
  "ebilelim",
  "abilelim",
  "ebileyim",
  "abileyim",
  "ebilsin",
  "abilsin",
  "ebilirsiniz",
  "abilirsiniz",
  "ebilirsin",
  "abilirsin",
  "melisiniz",
  "malısınız",
  "melisin",
  "malısın",
  "meliyim",
  "malıyım",
  "eceğiz",
  "acağız",
  "eceğim",
  "acağım",
  "ıyorsunuz",
  "iyorsunuz",
  "uyorsunuz",
  "üyorsunuz",
  "yorsunuz",
  "ebilecek",
  "abilecek",
  "ebilirdi",
  "abilirdi",
  "mıştır",
  "miştir",
  "muştur",
  "müştür",
  "dığında",
  "diğinde",
  "duğunda",
  "düğünde",
  "tığında",
  "tiğinde",
  "tuğunda",
  "tüğünde",
  "mışız",
  "mişiz",
  "muşuz",
  "müşüz",
  "yorduk",
  "yordun",
  "yordu",
  "yorum",
  "yorsun",
  "yoruz",
  "yorlar",
  "abilir",
  "ebilir",
  "mışım",
  "mişim",
  "muşum",
  "müşüm",
  "mışsın",
  "mişsin",
  "muşsun",
  "müşsün",
  "mış",
  "miş",
  "muş",
  "müş",
  "dık",
  "dik",
  "duk",
  "dük",
  "tık",
  "tik",
  "tuk",
  "tük",
  "ları",
  "leri",
  "larım",
  "lerim",
  "larını",
  "lerini",
  "ında",
  "inde",
  "unda",
  "ünde",
  "ından",
  "inden",
  "undan",
  "ünden",
  "ına",
  "ine",
  "una",
  "üne",
  "unu",
  "ünü",
  "sunu",
  "sünü",
  "ımız",
  "imiz",
  "umuz",
  "ümüz",
  "ınız",
  "iniz",
  "unuz",
  "ünüz",
  "dır",
  "dir",
  "dur",
  "dür",
  "tır",
  "tir",
  "tur",
  "tür",
  "dan",
  "den",
  "tan",
  "ten",
  "mak",
  "mek",
  "mam",
  "mem",
  "lar",
  "ler",
  "ma",
  "me",
  "ım",
  "im",
  "um",
  "üm",
  "ın",
  "in",
  "un",
  "ün",
  "sı",
  "si",
  "su",
  "sü",
  "da",
  "de",
  "ta",
  "te",
].sort((a, b) => b.length - a.length);

/** Sözlükte sık eksik kalan yazılım / dil içi kökler (küçük harf, tr-TR) */
const SUPPLEMENTAL_STEMS = [
  "mod",
  "mode",
  "site",
  "panel",
  "scroll",
  "login",
  "logout",
  "online",
  "offline",
  "dosya",
  "klasör",
  "ayar",
  "profil",
  "hesap",
];

function minStemLengthForSuffix(suffixLen) {
  if (suffixLen <= 2) return 4;
  if (suffixLen === 3) return 3;
  return 2;
}

/**
 * @param {import('nspell')} spell
 * @param {string} word küçük harf
 * @param {number} depth
 * @param {number} maxDepth
 */
function isCorrectAfterPeeling(spell, word, depth, maxDepth) {
  if (depth > maxDepth || word.length < 2) return false;
  if (spell.correct(word)) return true;
  for (const suf of TR_PEEL_SUFFIXES) {
    const sl = suf.length;
    if (sl >= word.length) continue;
    if (!word.endsWith(suf)) continue;
    const stem = word.slice(0, -sl);
    if (stem.length < minStemLengthForSuffix(sl)) continue;
    if (spell.correct(stem)) return true;
    if (isCorrectAfterPeeling(spell, stem, depth + 1, maxDepth)) return true;
  }
  return false;
}

function dictUrls() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return {
    aff: `${base}dicts/tr/index.aff`,
    dic: `${base}dicts/tr/index.dic`,
  };
}

/** Hunspell Türkçe (dictionary-tr / OpenOffice); yaygın yazım denetimi sözlüğü. */
export function loadTurkishSpell() {
  if (spellInstance) return Promise.resolve(spellInstance);
  if (!spellLoadPromise) {
    spellLoadPromise = (async () => {
      const { aff, dic } = dictUrls();
      const [affText, dicText] = await Promise.all([
        fetch(aff).then((r) => {
          if (!r.ok) throw new Error(`Türkçe sözlük yüklenemedi: ${aff}`);
          return r.text();
        }),
        fetch(dic).then((r) => {
          if (!r.ok) throw new Error(`Türkçe sözlük yüklenemedi: ${dic}`);
          return r.text();
        }),
      ]);
      spellInstance = nspell(affText, dicText);
      for (const w of SUPPLEMENTAL_STEMS) {
        try {
          spellInstance.add(w);
        } catch {
          /* yok say */
        }
      }
      return spellInstance;
    })();
  }
  return spellLoadPromise;
}

/**
 * @param {import('nspell')} spell
 * @param {string} raw
 */
export function isTurkishWordCorrect(spell, raw) {
  if (!raw || raw.length < 2) return true;
  if (/[0-9]/.test(raw)) return true;
  if (/[@#%]/.test(raw)) return true;

  const lower = raw.toLocaleLowerCase("tr-TR");
  if (spell.correct(lower)) return true;
  if (isCorrectAfterPeeling(spell, lower, 0, 14)) return true;

  if (raw.includes("-") || raw.includes("'")) {
    const parts = raw.split(/[-']/u).filter((p) => p.length > 0);
    if (parts.length > 1) return parts.every((p) => isTurkishWordCorrect(spell, p));
  }

  return false;
}

export function unwrapTurkishSpellMarks(root) {
  root.querySelectorAll(`span[${SPELL_MARK}="unknown"]`).forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
}

/**
 * Paragraf içi tüm metni (b/d/p/q renk span’ları arasında bölünmüş olsa bile) sırayla birleştirir.
 * @returns {{ flat: string, map: { node: Text, o: number }[] }}
 */
function collectFlatCharMap(blockRoot) {
  /** @type {{ node: Text, o: number }[]} */
  const map = [];
  let flat = "";
  const walker = document.createTreeWalker(blockRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el) return NodeFilter.FILTER_REJECT;
      if (el.closest(`span[${SPELL_MARK}]`)) return NodeFilter.FILTER_REJECT;
      if (el.closest("script,style")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) {
    const s = n.textContent;
    for (let i = 0; i < s.length; i++) {
      map.push({ node: n, o: i });
      flat += s[i];
    }
  }
  return { flat, map };
}

/**
 * Paragraf/cümle başı değilse ve sözcük büyük harfle başlıyorsa özel ad / ürün adı varsayımı — yazım denetimi yok.
 * @param {string} flat
 * @param {number} wordStart
 * @param {string} word
 */
function shouldSkipSpellForMidSentenceCapitalized(flat, wordStart, word) {
  if (word.length < 2) return false;
  if (!/^\p{Lu}/u.test(word)) return false;

  let i = wordStart - 1;
  while (i >= 0 && /\s/u.test(flat[i])) i--;
  if (i < 0) return false;

  const prev = flat[i];
  // Cümle veya paragraf sınırı: büyük harf beklenir, denetim yapılır
  if (/[.!?…\n\r]/u.test(prev)) return false;

  // Cümle ortası sinyalleri: küçük harf, rakam veya ara noktalama sonrası
  if (/\p{Ll}/u.test(prev)) return true;
  if (/\p{Nd}/u.test(prev)) return true;
  if (/[,;:\u2014\u2013)\]\}»""''\(\[{«]/u.test(prev)) return true;

  return false;
}

/**
 * @param {string} flat
 * @param {import('nspell')} spell
 * @returns {{ start: number, end: number }[]} [start, end) düz metin ofsetleri
 */
function findWrongWordIntervals(flat, spell) {
  const wordRe = /\p{L}+/gu;
  /** @type {{ start: number, end: number }[]} */
  const wrong = [];
  let m;
  while ((m = wordRe.exec(flat)) !== null) {
    const word = m[0];
    if (shouldSkipSpellForMidSentenceCapitalized(flat, m.index, word)) continue;
    if (!isTurkishWordCorrect(spell, word)) {
      wrong.push({ start: m.index, end: m.index + word.length });
    }
  }
  return wrong;
}

/** @param {HTMLElement} editor */
function getSpellSections(editor) {
  const ps = editor.querySelectorAll(":scope > p");
  if (ps.length) return Array.from(ps);
  return [editor];
}

/**
 * @param {{ node: Text, o: number }[]} map
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
function wrapRangeWithSpellUnknown(map, start, end) {
  if (end <= start || !map.length || end > map.length) return false;
  const span = document.createElement("span");
  span.setAttribute(SPELL_MARK, "unknown");
  span.className = "lexi-spell-unknown";
  try {
    const r = document.createRange();
    r.setStart(map[start].node, map[start].o);
    r.setEnd(map[end - 1].node, map[end - 1].o + 1);
    try {
      r.surroundContents(span);
    } catch {
      span.appendChild(r.extractContents());
      r.insertNode(span);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLElement} editor
 * @param {import('nspell')} spell
 */
export function applyTurkishSpellMarks(editor, spell) {
  unwrapTurkishSpellMarks(editor);

  for (const section of getSpellSections(editor)) {
    while (true) {
      const { flat, map } = collectFlatCharMap(section);
      if (!flat.length) break;
      const wrong = findWrongWordIntervals(flat, spell);
      if (!wrong.length) break;
      wrong.sort((a, b) => b.start - a.start);
      const w = wrong[0];
      if (!wrapRangeWithSpellUnknown(map, w.start, w.end)) break;
    }
  }
}

/**
 * @param {HTMLElement} el
 * @returns {number | null}
 */
export function getCaretTextOffset(el) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  if (!el.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

/**
 * @param {HTMLElement} el
 * @param {number} offset
 */
export function setCaretTextOffset(el, offset) {
  const sel = window.getSelection();
  const range = document.createRange();
  let charCount = 0;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  let placed = false;
  while ((node = walk.nextNode())) {
    const len = node.textContent.length;
    if (offset <= charCount + len) {
      range.setStart(node, Math.max(0, offset - charCount));
      range.collapse(true);
      placed = true;
      break;
    }
    charCount += len;
  }
  if (placed) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
