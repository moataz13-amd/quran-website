const state = {
    surahs: [],
    currentSurahIndex: 0,
    currentAyahIndex: 0,
};

const els = {};

function qs(id) {
    return document.getElementById(id);
}

function initRefs() {
    els.surahSelect = qs("surah-select");
    els.ayahSelect = qs("ayah-select");
    els.goToAyah = qs("go-to-ayah");

    els.quranText = qs("quran-text");
    els.scrollContainer = qs("quran-scroll-container");

    els.themeToggle = qs("toggle-theme");
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error: ${res.status}`);
    return res.json();
}

function stripBasmalaPrefix(text) {
    if (!text) return text;

    const basmalaPrefixRe =
        /^\s*ب[\u064B-\u065F\u0670\u0640]*س[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ه[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*ن[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*ي[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s*/u;

    const stripped = String(text).replace(basmalaPrefixRe, "");
    return stripped === text ? text : stripped.trim();
}

function getInitialSurahIndexFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search || "");
        const raw = params.get("surah");
        if (raw === null || raw === "") return 0;
        const idx = parseInt(raw, 10);
        if (!isFinite(idx)) return 0;
        return Math.max(0, idx);
    } catch (e) {
        return 0;
    }
}

function highlightAyah(idx) {
    state.currentAyahIndex = idx;

    document.querySelectorAll(".ayah").forEach((el) => el.classList.remove("ayah-active"));

    const target = document.querySelector(`.ayah[data-ayah-index=\"${idx}\"]`);
    if (!target) return;
    target.classList.add("ayah-active");

    target.scrollIntoView({ behavior: "auto", block: "center" });
}

async function loadSurahs() {
    const data = await fetchJSON("https://api.alquran.cloud/v1/surah");
    state.surahs = data.data;
}

function renderSurahDropdown() {
    if (!els.surahSelect) return;
    els.surahSelect.innerHTML = "";

    state.surahs.forEach((s, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        const en = `\u2066${s.englishName}\u2069`;
        opt.textContent = `${s.number}. ${s.name} - ${en}`;
        els.surahSelect.appendChild(opt);
    });
}

async function loadSurahText(index) {
    const surah = state.surahs[index];
    if (!surah) return;

    state.currentSurahIndex = index;
    if (els.quranText) els.quranText.innerHTML = "";

    let arabicRes;
    try {
        arabicRes = await fetchJSON(`https://api.alquran.cloud/v1/surah/${surah.number}/quran-uthmani`);
    } catch (e) {
        arabicRes = await fetchJSON(`https://api.alquran.cloud/v1/surah/${surah.number}/ar.alafasy`);
    }
    const arabicAyahs = arabicRes.data.ayahs;

    els.ayahSelect.innerHTML = "";

    const showStandaloneBasmala = surah.number !== 9 && surah.number !== 1;
    const sep = "\u202F";
    const nodes = [];

    if (showStandaloneBasmala) {
        const basmala = document.createElement("div");
        basmala.className = "basmala";
        basmala.textContent = "بِسْمِ ٱللَّٰهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
        nodes.push(basmala);
        nodes.push(document.createTextNode(sep));
    }

    let startAyahIndex = 0;
    if (showStandaloneBasmala && arabicAyahs[0] && arabicAyahs[0].text) {
        const firstStripped = stripBasmalaPrefix(arabicAyahs[0].text);
        if (firstStripped !== arabicAyahs[0].text && !firstStripped) {
            startAyahIndex = 1;
        }
    }

    for (let i = startAyahIndex; i < arabicAyahs.length; i++) {
        const displayIndex = i - startAyahIndex;
        const displayNumber = displayIndex + 1;
        const ayah = arabicAyahs[i];

        const cont = document.createElement("span");
        cont.className = "ayah";
        cont.dataset.ayahIndex = String(displayIndex);

        const numberSpan = `<span class=\"ayah-number\">﴿${displayNumber}﴾</span>`;
        const ayahText = displayIndex === 0 && showStandaloneBasmala ? stripBasmalaPrefix(ayah.text) : ayah.text;
        cont.innerHTML = `${ayahText} ${numberSpan}`;

        nodes.push(cont);
        nodes.push(document.createTextNode(sep));

        const o = document.createElement("option");
        o.value = displayIndex;
        o.textContent = `آية ${displayNumber}`;
        els.ayahSelect.appendChild(o);
    }

    els.surahSelect.value = String(index);

    if (els.quranText) {
        nodes.forEach((n) => els.quranText.appendChild(n));
    }
    highlightAyah(0);
}

function setupThemeToggle() {
    if (!els.themeToggle) return;
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const saved = localStorage.getItem("quran-theme");
    if (saved === "light" || (!saved && prefersLight)) {
        document.body.classList.add("light-theme");
        els.themeToggle.textContent = "☀️";
    }

    els.themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");
        const isLight = document.body.classList.contains("light-theme");
        els.themeToggle.textContent = isLight ? "☀️" : "🌙";
        localStorage.setItem("quran-theme", isLight ? "light" : "dark");
    });
}

function setupInteractions() {
    if (els.quranText) {
        els.quranText.addEventListener("click", (e) => {
            const el = e.target && e.target.closest && e.target.closest(".ayah");
            if (!el) return;
            const idx = parseInt(el.dataset.ayahIndex, 10);
            if (!isFinite(idx)) return;
            highlightAyah(idx);
        });
    }

    if (els.goToAyah) {
        els.goToAyah.addEventListener("click", () => {
            const idx = parseInt(els.ayahSelect.value, 10) || 0;
            highlightAyah(idx);
        });
    }

    if (els.surahSelect) {
        els.surahSelect.addEventListener("change", () => {
            const idx = parseInt(els.surahSelect.value, 10) || 0;
            loadSurahText(idx).catch(console.error);
        });
    }

    let t = null;
    window.addEventListener("resize", () => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => {
            loadSurahText(state.currentSurahIndex).catch(console.error);
        }, 150);
    });
}

async function bootstrap() {
    initRefs();
    setupThemeToggle();

    try {
        await loadSurahs();

        renderSurahDropdown();
        setupInteractions();

        const initial = getInitialSurahIndexFromUrl();
        await loadSurahText(initial);
    } catch (e) {
        console.error(e);
        if (els.quranText) {
            els.quranText.innerHTML = '<div style="text-align:center; opacity:.85;">تعذر تحميل بيانات المصحف</div>';
        }
    }
}

window.addEventListener("DOMContentLoaded", bootstrap);