// Basic Quran and audio app using public APIs
// Text: api.alquran.cloud or api.quran.com alternative
// Audio/reciters: mp3quran.net JSON

const state = {
    surahs: [],
    currentSurahIndex: 0,
    currentAyahIndex: 0,
    showTranslation: false,
    reciters: [],
    currentReciter: null,
    audio: new Audio(),
    audioReady: false,
    recitersMobileExpanded: false,
    recitersMobileExpandedBySearch: false,
    repeatSurah: false,
    autoNextSurah: false,
};

const els = {};

function isReaderFullscreen() {
    return document.body.classList.contains("reader-fullscreen");
}

function enterReaderFullscreen({ pushHistory = true } = {}) {
    if (isReaderFullscreen()) return;
    document.body.classList.add("reader-fullscreen");
    if (pushHistory) {
        window.history.pushState({ readerFullscreen: true }, "", window.location.href);
    }
}

function exitReaderFullscreen() {
    if (!isReaderFullscreen()) return;
    document.body.classList.remove("reader-fullscreen");
}

function qs(id) {
    return document.getElementById(id);
}

function initRefs() {
    els.surahList = qs("surah-list");
    els.surahSearch = qs("surah-search");
    els.surahSelect = qs("surah-select");
    els.ayahSelect = qs("ayah-select");

    els.quranText = qs("quran-text");
    els.quranScroll = qs("quran-scroll-container");
    els.toggleTranslation = qs("toggle-translation");
    els.goToAyah = qs("go-to-ayah");
    els.themeToggle = qs("toggle-theme");

    els.reciterSelect = qs("reciter-select");
    els.audioSurahSelect = qs("audio-surah-select");
    els.playAudioBtn = qs("play-audio");
    els.downloadAudio = qs("download-audio");
    els.audioPlayPause = qs("audio-play-pause");
    els.audioProgress = qs("audio-progress");
    els.audioTime = qs("audio-time");
    els.playbackRate = qs("playback-rate");
    els.repeatSurah = qs("repeat-surah");
    els.autoNextSurah = qs("auto-next-surah");
    els.repeatSurahModal = qs("repeat-surah-modal");
    els.autoNextSurahModal = qs("auto-next-surah-modal");

    els.reciterSearch = qs("reciter-search");
    els.recitersGrid = qs("reciters-grid");
    els.recitersToggle = qs("reciters-toggle");

    els.reciterModal = qs("reciter-modal");
    els.reciterModalName = qs("reciter-modal-name");
    els.reciterModalMeta = qs("reciter-modal-meta");
    els.reciterModalClose = qs("reciter-modal-close");
    els.reciterModalSurahSearch = qs("reciter-modal-surah-search");
    els.reciterModalSurahs = qs("reciter-modal-surahs");

    els.reciterModalPlayer = qs("reciter-modal-player");
    els.reciterModalNowPlaying = qs("reciter-modal-now-playing");
    els.reciterModalPlayPause = qs("reciter-modal-play-pause");
    els.reciterModalProgress = qs("reciter-modal-progress");
    els.reciterModalTime = qs("reciter-modal-time");
    els.reciterModalRate = qs("reciter-modal-rate");

    els.imageModal = qs("image-modal");
    els.imageModalClose = qs("image-modal-close");
    els.imageModalImg = qs("image-modal-img");
    els.readerExitFullscreen = qs("reader-exit-fullscreen");
}

function loadAudioPlaybackOptions() {
    state.repeatSurah = localStorage.getItem("quran-repeat-surah") === "1";
    state.autoNextSurah = localStorage.getItem("quran-auto-next-surah") === "1";

    if (state.repeatSurah && state.autoNextSurah) {
        state.autoNextSurah = false;
        localStorage.setItem("quran-auto-next-surah", "0");
    }

    syncAudioPlaybackOptionsUI();
}

function saveAudioPlaybackOptions() {
    localStorage.setItem("quran-repeat-surah", state.repeatSurah ? "1" : "0");
    localStorage.setItem("quran-auto-next-surah", state.autoNextSurah ? "1" : "0");
}

function syncAudioPlaybackOptionsUI() {
    if (els.repeatSurah) els.repeatSurah.checked = !!state.repeatSurah;
    if (els.autoNextSurah) els.autoNextSurah.checked = !!state.autoNextSurah;
    if (els.repeatSurahModal) els.repeatSurahModal.checked = !!state.repeatSurah;
    if (els.autoNextSurahModal) els.autoNextSurahModal.checked = !!state.autoNextSurah;
}

function setPlaybackOptions({ repeatSurah, autoNextSurah }) {
    state.repeatSurah = !!repeatSurah;
    state.autoNextSurah = !!autoNextSurah;

    if (state.repeatSurah && state.autoNextSurah) {
        state.autoNextSurah = false;
    }

    syncAudioPlaybackOptionsUI();
    saveAudioPlaybackOptions();
}

const featuredReciterIds = [54, 102, 4, 123, 51, 5, 106, 112, 62, 35, 92, 93];

function isMobileRecitersLayout() {
    return !!(window.matchMedia && window.matchMedia("(max-width: 720px)").matches);
}

function getRecitersForDisplay() {
    const isMobile = isMobileRecitersLayout();
    if (!isMobile) return state.reciters;

    const expanded = !!(state.recitersMobileExpanded || state.recitersMobileExpandedBySearch);
    if (expanded) return state.reciters;

    const idToReciter = new Map();
    state.reciters.forEach((r) => idToReciter.set(r.id, r));

    const featured = featuredReciterIds
        .map((id) => idToReciter.get(id))
        .filter(Boolean);

    if (featured.length) return featured;
    return state.reciters.slice(0, 12);
}

function updateRecitersToggleUI() {
    if (!els.recitersToggle) return;

    const isMobile = isMobileRecitersLayout();
    if (!isMobile) {
        els.recitersToggle.style.display = "none";
        return;
    }

    const expanded = !!(state.recitersMobileExpanded || state.recitersMobileExpandedBySearch);
    const shown = getRecitersForDisplay().length;
    const hasMore = state.reciters.length > shown;

    els.recitersToggle.style.display = hasMore || expanded ? "inline-flex" : "none";
    els.recitersToggle.textContent = expanded ? "عرض أقل" : "رؤية المزيد";
}

function applyReciterSearchFilter() {
    if (!els.reciterSearch || !els.recitersGrid) return;
    const q = els.reciterSearch.value.trim().toLowerCase();
    Array.from(els.recitersGrid.children).forEach((card) => {
        const name = card.querySelector(".reciter-name").textContent.toLowerCase();
        const bio = card.querySelector(".reciter-bio").textContent.toLowerCase();
        card.style.display = name.includes(q) || bio.includes(q) ? "flex" : "none";
    });
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return res.json();
}

function stripBasmalaPrefix(text) {
    if (!text) return text;

    const basmalaPrefixRe =
        /^\s*ب[\u064B-\u065F\u0670\u0640]*س[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ه[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*ن[\u064B-\u065F\u0670\u0640]*\s+[اٱ]ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*ي[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s*/u;

    const stripped = String(text).replace(basmalaPrefixRe, "");
    return stripped === text ? text : stripped.trim();
}

async function loadSurahs() {
    // Al Quran Cloud: list of surahs
    const data = await fetchJSON("https://api.alquran.cloud/v1/surah");
    state.surahs = data.data;
}

function renderSurahList() {
    els.surahList.innerHTML = "";
    state.surahs.forEach((s, idx) => {
        const li = document.createElement("li");
        li.className = "surah-item";

        li.tabIndex = 0;
        li.dataset.index = idx;

        li.innerHTML = `
      <div class="surah-item-number">${s.number}</div>
      <div class="surah-item-meta">
        <div class="surah-item-name">${s.name}</div>
        <div class="surah-item-info"><span class="surah-item-en" dir="ltr">${s.englishName}</span> • ${s.ayahs || s.numberOfAyahs} آية</div>
      </div>
    `;

        li.addEventListener("click", () => selectSurah(idx, { openFullscreen: true }));
        li.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectSurah(idx, { openFullscreen: true });
            }
        });

        els.surahList.appendChild(li);
    });
}

function renderSurahDropdowns() {
    els.surahSelect.innerHTML = "";
    els.audioSurahSelect.innerHTML = "";

    state.surahs.forEach((s, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        const en = `\u2066${s.englishName}\u2069`;
        opt.textContent = `${s.number}. ${s.name} - ${en}`;
        els.surahSelect.appendChild(opt);

        const opt2 = opt.cloneNode(true);
        els.audioSurahSelect.appendChild(opt2);
    });
}

async function loadSurahText(index) {
    const surah = state.surahs[index];
    if (!surah) return;

    state.currentSurahIndex = index;

    const [arabicRes, transRes] = await Promise.all([
        fetchJSON(`https://api.alquran.cloud/v1/surah/${surah.number}/ar.alafasy`),
        fetchJSON(`https://api.alquran.cloud/v1/surah/${surah.number}/en.asad`),
    ]);

    const arabicAyahs = arabicRes.data.ayahs;
    const transAyahs = transRes.data.ayahs;

    els.quranText.innerHTML = "";
    els.ayahSelect.innerHTML = "";

    if (surah.number !== 9) {
        const basmala = document.createElement("div");
        basmala.className = "basmala";
        basmala.textContent = "بِسْمِ ٱللَّٰهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
        els.quranText.appendChild(basmala);
    }

    let startAyahIndex = 0;
    if (surah.number !== 9 && arabicAyahs[0] && arabicAyahs[0].text) {
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
        cont.id = `ayah-${displayNumber}`;

        const numberSpan = `<span class="ayah-number">﴿${displayNumber}﴾</span>`;
        const transText = (transAyahs[i] && transAyahs[i].text) || "";

        const ayahText = displayIndex === 0 ? stripBasmalaPrefix(ayah.text) : ayah.text;
        cont.innerHTML = `${ayahText} ${numberSpan}`;

        if (state.showTranslation) {
            const t = document.createElement("span");
            t.className = "translation";
            t.textContent = transText;
            cont.appendChild(t);
        }

        cont.addEventListener("click", () => highlightAyah(displayIndex, false));

        els.quranText.appendChild(cont);
        els.quranText.appendChild(document.createTextNode(" "));

        const o = document.createElement("option");
        o.value = displayIndex;
        o.textContent = `آية ${displayNumber}`;
        els.ayahSelect.appendChild(o);
    }

    if (els.surahSelect) {
        els.surahSelect.value = index;
    }

    els.audioSurahSelect.value = index;
    highlightAyah(0, false);
}

function highlightAyah(idx, scroll = false) {
    state.currentAyahIndex = idx;
    document.querySelectorAll(".ayah").forEach((el) => el.classList.remove("ayah-active"));
    const target = els.quranText.querySelectorAll(".ayah")[idx];
    if (!target) return;
    target.classList.add("ayah-active");
    if (scroll) {
        target.scrollIntoView({ behavior: "auto", block: "center" });
    }
}

function selectSurah(idx, { openFullscreen = false } = {}) {
    document.body.classList.remove("mobile-index-open");
    loadSurahText(idx).catch(console.error);
    if (openFullscreen) {
        enterReaderFullscreen();
        const el = document.getElementById("quran-reader-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function setupQuranInteractions() {
    els.surahSearch.addEventListener("input", () => {
        const q = els.surahSearch.value.trim().toLowerCase();
        Array.from(els.surahList.children).forEach((li) => {
            const name = li.querySelector(".surah-item-name").textContent.toLowerCase();
            const en = li.querySelector(".surah-item-info").textContent.toLowerCase();
            li.style.display = name.includes(q) || en.includes(q) ? "flex" : "none";
        });
    });

    els.toggleTranslation.addEventListener("change", () => {
        state.showTranslation = els.toggleTranslation.checked;
        loadSurahText(state.currentSurahIndex).catch(console.error);
    });

    els.goToAyah.addEventListener("click", () => {
        const idx = parseInt(els.ayahSelect.value, 10) || 0;
        highlightAyah(idx, true);
    });

    els.surahSelect.addEventListener("change", () => {
        const idx = parseInt(els.surahSelect.value, 10) || 0;
        selectSurah(idx, { openFullscreen: false });
    });
}

async function loadReciters() {
    // mp3quran main reciters list
    const data = await fetchJSON("https://www.mp3quran.net/api/v3/reciters?language=ar");
    state.reciters = data.reciters || data; // fallback if structure differs
    sortReciters();
}

function getArabicSortKey(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function sortReciters() {
    if (!Array.isArray(state.reciters)) return;
    state.reciters.sort((a, b) => {
        const aKey = getArabicSortKey(a && a.name);
        const bKey = getArabicSortKey(b && b.name);
        return aKey.localeCompare(bKey, "ar", { sensitivity: "base" });
    });
}

function renderReciterSelect() {
    els.reciterSelect.innerHTML = "";
    state.reciters.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.name;
        els.reciterSelect.appendChild(opt);
    });

    if (state.currentReciter) {
        const stillExists = state.reciters.find((r) => r.id === state.currentReciter.id);
        if (stillExists) {
            els.reciterSelect.value = stillExists.id;
            state.currentReciter = stillExists;
            return;
        }
    }

    if (state.reciters[0]) {
        state.currentReciter = state.reciters[0];
        els.reciterSelect.value = state.currentReciter.id;
    }
}

function renderRecitersGrid() {
    els.recitersGrid.innerHTML = "";
    const reciters = getRecitersForDisplay();
    reciters.forEach((r) => {
        const card = document.createElement("article");
        card.className = "reciter-card";
        card.tabIndex = 0;

        const avatarChars = r.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join("");

        card.innerHTML = `
      <div class="reciter-header">
        <div class="reciter-avatar" aria-hidden="true">${avatarChars}</div>
        <div>
          <div class="reciter-name">${r.name}</div>
          <div class="reciter-bio">${r.rewaya || "قارئ من القراء المعتمدين في موقع MP3 Quran"}</div>
        </div>
      </div>
      <p class="reciter-bio">${(r.moshaf && r.moshaf[0] && r.moshaf[0].name) || "تسجيلات كاملة للقرآن الكريم بعدة روايات"}</p>
    `;

        card.addEventListener("click", () => openReciterModal(r));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openReciterModal(r);
            }
        });

        els.recitersGrid.appendChild(card);
    });

    updateRecitersToggleUI();
    applyReciterSearchFilter();
}

function setupRecitersInteractions() {
    els.reciterSearch.addEventListener("input", () => {
        const q = els.reciterSearch.value.trim().toLowerCase();
        const isMobile = isMobileRecitersLayout();
        state.recitersMobileExpandedBySearch = isMobile && !!q;
        if (!q) state.recitersMobileExpandedBySearch = false;
        renderRecitersGrid();
    });

    els.reciterSearch.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const q = els.reciterSearch.value.trim().toLowerCase();
        if (!q) return;

        const match = state.reciters.find((r) => r.name.toLowerCase().includes(q));
        if (match) openReciterModal(match);
    });

    if (els.recitersToggle) {
        els.recitersToggle.addEventListener("click", () => {
            const expanded = !!(state.recitersMobileExpanded || state.recitersMobileExpandedBySearch);
            if (expanded) {
                state.recitersMobileExpanded = false;
                state.recitersMobileExpandedBySearch = false;
                if (els.reciterSearch) els.reciterSearch.value = "";
            } else {
                state.recitersMobileExpanded = true;
            }
            renderRecitersGrid();
        });
    }

    if (window.matchMedia) {
        const mq = window.matchMedia("(max-width: 720px)");
        if (mq && typeof mq.addEventListener === "function") {
            mq.addEventListener("change", () => {
                state.recitersMobileExpandedBySearch = false;
                renderRecitersGrid();
            });
        }
    }

    els.reciterSelect.addEventListener("change", () => {
        const id = parseInt(els.reciterSelect.value, 10);
        state.currentReciter = state.reciters.find((r) => r.id === id) || state.reciters[0];
    });
}

function getAudioUrlForReciterSurah(reciter, surahNumber) {
    const moshaf = reciter && reciter.moshaf && reciter.moshaf[0];
    if (!moshaf || !moshaf.server) return null;
    const padded = surahNumber.toString().padStart(3, "0");
    return `${moshaf.server}${padded}.mp3`;
}

async function playSurahForReciter(reciter, surahIndex) {
    if (!reciter) return;
    const surah = state.surahs[surahIndex];
    if (!surah) return;

    state.currentReciter = reciter;
    if (els.reciterSelect) els.reciterSelect.value = reciter.id;
    if (els.audioSurahSelect) els.audioSurahSelect.value = surahIndex;

    const url = getAudioUrlForReciterSurah(reciter, surah.number);
    if (!url) return;

    try {
        state.audio.pause();
    } catch (e) {}
    state.audio.currentTime = 0;
    state.audio.src = "";
    try {
        state.audio.load();
    } catch (e) {}
    state.audio.src = url;
    try {
        state.audio.load();
    } catch (e) {}
    state.audioReady = true;
    const rate = (els.reciterModalRate && parseFloat(els.reciterModalRate.value)) || parseFloat(els.playbackRate.value) || 1;
    state.audio.playbackRate = rate;
    await state.audio.play().catch((e) => {});
    syncAllPlayerUIs();

    els.downloadAudio.href = url;
    els.downloadAudio.download = `surah-${surah.number}-${reciter.name}.mp3`;

    if (els.reciterModalNowPlaying) {
        els.reciterModalNowPlaying.textContent = `${reciter.name} • ${surah.number}. ${surah.name} • ${surah.englishName}`;
    }
}

function renderReciterModalSurahs(reciter) {
    if (!els.reciterModalSurahs) return;
    els.reciterModalSurahs.innerHTML = "";
    if (!Array.isArray(state.surahs) || !state.surahs.length) return;

    state.surahs.forEach((s, idx) => {
        const row = document.createElement("div");
        row.className = "modal-surah-row";
        row.dataset.query = `${s.name} ${s.englishName}`.toLowerCase();

        const title = document.createElement("div");
        title.className = "modal-surah-title";
        title.innerHTML = `
      <div class="modal-surah-name">${s.number}. ${s.name}</div>
      <div class="modal-surah-sub"><span class="modal-surah-en" dir="ltr">${s.englishName}</span> • ${s.numberOfAyahs} آية</div>
    `;

        const actions = document.createElement("div");
        actions.className = "modal-surah-actions";

        const playBtn = document.createElement("button");
        playBtn.className = "primary-button";
        playBtn.textContent = "تشغيل";
        playBtn.addEventListener("click", () => {
            playSurahForReciter(reciter, idx).catch((e) => console.error(e));
        });

        const downloadLink = document.createElement("a");
        downloadLink.className = "secondary-button";
        downloadLink.textContent = "تحميل";
        const url = getAudioUrlForReciterSurah(reciter, s.number);
        downloadLink.href = url || "#";
        downloadLink.download = `surah-${s.number}-${reciter && reciter.name ? reciter.name : "reciter"}.mp3`;
        downloadLink.setAttribute("role", "button");

        actions.appendChild(playBtn);
        actions.appendChild(downloadLink);

        row.appendChild(title);
        row.appendChild(actions);

        els.reciterModalSurahs.appendChild(row);
    });
}

function openReciterModal(reciter) {
    if (!els.reciterModal) return;
    if (!reciter) return;

    if (els.reciterModalName) {
        els.reciterModalName.textContent = reciter.name || "";
    }

    const moshafName = (reciter.moshaf && reciter.moshaf[0] && reciter.moshaf[0].name) || "";
    const rewaya = reciter.rewaya || "";
    if (els.reciterModalMeta) {
        els.reciterModalMeta.textContent = `${rewaya}${rewaya && moshafName ? " • " : ""}${moshafName}`.trim();
    }

    if (els.reciterModalSurahSearch) {
        els.reciterModalSurahSearch.value = "";
    }

    renderReciterModalSurahs(reciter);

    if (els.reciterModalNowPlaying) {
        els.reciterModalNowPlaying.textContent = reciter.name || "";
    }

    if (typeof els.reciterModal.showModal === "function") {
        els.reciterModal.showModal();
    } else {
        els.reciterModal.setAttribute("open", "");
    }

    if (els.reciterModalSurahSearch) {
        els.reciterModalSurahSearch.focus();
    }
    syncAllPlayerUIs();
}

function closeReciterModal() {
    if (!els.reciterModal) return;
    if (typeof els.reciterModal.close === "function") {
        els.reciterModal.close();
    } else {
        els.reciterModal.removeAttribute("open");
    }
}

function setupReciterModal() {
    if (!els.reciterModal) return;

    if (els.reciterModalClose) {
        els.reciterModalClose.addEventListener("click", closeReciterModal);
    }

    els.reciterModal.addEventListener("click", (e) => {
        if (e.target === els.reciterModal) closeReciterModal();
    });

    if (els.reciterModalSurahSearch && els.reciterModalSurahs) {
        els.reciterModalSurahSearch.addEventListener("input", () => {
            const q = els.reciterModalSurahSearch.value.trim().toLowerCase();
            Array.from(els.reciterModalSurahs.children).forEach((row) => {
                const match = (row.dataset.query || "").includes(q);
                row.style.display = match ? "flex" : "none";
            });
        });
    }

    if (els.reciterModalPlayPause) {
        els.reciterModalPlayPause.addEventListener("click", () => {
            if (!state.audioReady) return;
            if (state.audio.paused) {
                state.audio.play();
            } else {
                state.audio.pause();
            }
            syncAllPlayerUIs();
        });
    }

    if (els.reciterModalProgress) {
        els.reciterModalProgress.addEventListener("input", () => {
            if (!state.audio.duration) return;
            const pct = parseFloat(els.reciterModalProgress.value) || 0;
            state.audio.currentTime = (pct / 100) * state.audio.duration;
            syncAllPlayerUIs();
        });
    }

    if (els.reciterModalRate) {
        els.reciterModalRate.addEventListener("change", () => {
            const rate = parseFloat(els.reciterModalRate.value) || 1;
            state.audio.playbackRate = rate;
            if (els.playbackRate) els.playbackRate.value = String(rate);
        });
    }
}

function setupAudioPlayer() {
    const audio = state.audio;

    audio.addEventListener("timeupdate", () => {
        syncAllPlayerUIs();
    });

    audio.addEventListener("loadedmetadata", () => {
        syncAllPlayerUIs();
    });

    audio.addEventListener("play", () => {
        syncAllPlayerUIs();
    });

    audio.addEventListener("pause", () => {
        syncAllPlayerUIs();
    });

    audio.addEventListener("ended", () => {
        const repeat = !!state.repeatSurah;
        const autoNext = !!state.autoNextSurah;

        if (repeat) {
            audio.currentTime = 0;
            audio.play().catch((e) => {});
            syncAllPlayerUIs();
            return;
        }

        if (autoNext && els.audioSurahSelect && Array.isArray(state.surahs) && state.surahs.length) {
            const currentIndex = parseInt(els.audioSurahSelect.value, 10) || 0;
            const nextIndex = (currentIndex + 1) % state.surahs.length;
            els.audioSurahSelect.value = String(nextIndex);
            prepareAndPlaySelectedAudio().catch((e) => console.error(e));
            return;
        }

        syncAllPlayerUIs();
    });

    els.audioPlayPause.addEventListener("click", () => {
        if (!state.audioReady) {
            prepareAndPlaySelectedAudio().catch((e) => console.error(e));
            return;
        }
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
        syncAllPlayerUIs();
    });
}

function syncAllPlayerUIs() {
    const audio = state.audio;
    const duration = audio.duration;
    const currentTime = audio.currentTime;
    const isReady = !!state.audioReady;

    if (els.audioTime) {
        els.audioTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
    if (els.reciterModalTime) {
        els.reciterModalTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    if (duration && isFinite(duration)) {
        const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        if (els.audioProgress) els.audioProgress.value = pct || 0;
        if (els.reciterModalProgress) els.reciterModalProgress.value = pct || 0;
    } else {
        if (els.audioProgress) els.audioProgress.value = 0;
        if (els.reciterModalProgress) els.reciterModalProgress.value = 0;
    }

    const playing = isReady && !audio.paused;
    if (els.audioPlayPause) els.audioPlayPause.textContent = playing ? "❚❚" : "▶";
    if (els.reciterModalPlayPause) els.reciterModalPlayPause.textContent = playing ? "❚❚" : "▶";
}

function formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
        .toString()
        .padStart(2, "0");
    return `${m}:${s}`;
}

async function prepareAndPlaySelectedAudio() {
    const reciter = state.currentReciter;
    if (!reciter) return;

    const surahIndex = parseInt(els.audioSurahSelect.value, 10) || 0;
    const surahNumber = state.surahs[surahIndex].number;

    const url = getAudioUrlForReciterSurah(reciter, surahNumber);
    if (!url) return;

    try {
        state.audio.pause();
    } catch (e) {}
    state.audio.currentTime = 0;
    state.audio.src = url;
    try {
        state.audio.load();
    } catch (e) {}
    state.audioReady = true;
    state.audio.playbackRate = parseFloat(els.playbackRate.value) || 1;
    await state.audio.play().catch((e) => {});
    syncAllPlayerUIs();

    els.downloadAudio.href = url;
    els.downloadAudio.download = `surah-${surahNumber}-${reciter.name}.mp3`;
}

function setupAudioInteractions() {
    setupAudioPlayer();

    loadAudioPlaybackOptions();
    syncAudioPlaybackOptionsUI();

    if (els.repeatSurah) {
        els.repeatSurah.addEventListener("change", () => {
            setPlaybackOptions({ repeatSurah: !!els.repeatSurah.checked, autoNextSurah: false });
        });
    }

    if (els.autoNextSurah) {
        els.autoNextSurah.addEventListener("change", () => {
            setPlaybackOptions({ repeatSurah: false, autoNextSurah: !!els.autoNextSurah.checked });
        });
    }

    if (els.repeatSurahModal) {
        els.repeatSurahModal.addEventListener("change", () => {
            setPlaybackOptions({ repeatSurah: !!els.repeatSurahModal.checked, autoNextSurah: false });
        });
    }

    if (els.autoNextSurahModal) {
        els.autoNextSurahModal.addEventListener("change", () => {
            setPlaybackOptions({ repeatSurah: false, autoNextSurah: !!els.autoNextSurahModal.checked });
        });
    }

    els.playAudioBtn.addEventListener("click", () => {
        prepareAndPlaySelectedAudio().catch((e) => console.error(e));
    });

    els.playbackRate.addEventListener("change", () => {
        state.audio.playbackRate = parseFloat(els.playbackRate.value) || 1;
        if (els.reciterModalRate) els.reciterModalRate.value = els.playbackRate.value;
    });

    els.audioProgress.addEventListener("input", () => {
        if (!state.audio.duration) return;
        const pct = parseFloat(els.audioProgress.value) || 0;
        state.audio.currentTime = (pct / 100) * state.audio.duration;
        if (els.reciterModalProgress) els.reciterModalProgress.value = pct;
        syncAllPlayerUIs();
    });
}

function setupThemeToggle() {
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

function setupNav() {
    const isMobile = () => !!(window.matchMedia && window.matchMedia("(max-width: 960px)").matches);

    document.querySelectorAll(".nav-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (targetId === "surah-index-section" && isMobile()) {
                document.body.classList.toggle("mobile-index-open");
                const open = document.body.classList.contains("mobile-index-open");
                btn.setAttribute("aria-expanded", open ? "true" : "false");
                if (open) {
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }

            if (isMobile()) {
                document.body.classList.remove("mobile-index-open");
                const indexBtn = document.querySelector('.nav-link[data-target="surah-index-section"]');
                if (indexBtn) indexBtn.setAttribute("aria-expanded", "false");
            }

            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
}

function setupReaderFullscreen() {
    if (els.readerExitFullscreen) {
        els.readerExitFullscreen.addEventListener("click", () => {
            if (window.history.length > 1 && window.history.state && window.history.state.readerFullscreen) {
                window.history.back();
            } else {
                exitReaderFullscreen();
            }
        });
    }

    window.addEventListener("popstate", () => {
        if (window.history.state && window.history.state.readerFullscreen) {
            enterReaderFullscreen({ pushHistory: false });
        } else {
            exitReaderFullscreen();
        }
    });
}

function parseImageHash() {
    const h = window.location.hash || "";
    if (!h.startsWith("#image=")) return null;
    const encoded = h.slice("#image=".length);
    if (!encoded) return null;
    try {
        return decodeURIComponent(encoded);
    } catch (e) {
        return null;
    }
}

function openImageModal(src, { updateHash = true } = {}) {
    if (!els.imageModal || !els.imageModalImg) return;
    if (!src) return;

    els.imageModalImg.src = src;

    if (typeof els.imageModal.showModal === "function") {
        if (!els.imageModal.open) els.imageModal.showModal();
    } else {
        els.imageModal.setAttribute("open", "");
    }

    if (updateHash) {
        const encoded = encodeURIComponent(src);
        window.location.hash = `image=${encoded}`;
    }
}

function closeImageModal({ updateHash = true } = {}) {
    if (!els.imageModal || !els.imageModalImg) return;

    if (typeof els.imageModal.close === "function") {
        if (els.imageModal.open) els.imageModal.close();
    } else {
        els.imageModal.removeAttribute("open");
    }

    els.imageModalImg.removeAttribute("src");

    if (updateHash && (window.location.hash || "").startsWith("#image=")) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = "";
        }
    }
}

function setupImageViewer() {
    if (!els.imageModal) return;

    if (els.imageModalClose) {
        els.imageModalClose.addEventListener("click", () => closeImageModal());
    }

    els.imageModal.addEventListener("click", (e) => {
        if (e.target === els.imageModal) closeImageModal();
    });

    els.imageModal.addEventListener("close", () => {
        closeImageModal({ updateHash: false });
    });

    window.addEventListener("hashchange", () => {
        const src = parseImageHash();
        if (src) {
            openImageModal(src, { updateHash: false });
        } else {
            closeImageModal({ updateHash: false });
        }
    });

    const initial = parseImageHash();
    if (initial) openImageModal(initial, { updateHash: false });

    document.addEventListener("click", (e) => {
        const el = e.target && e.target.closest && e.target.closest("[data-fullscreen-src],[data-mushaf-image]");
        if (!el) return;

        const src = el.dataset.fullscreenSrc || el.dataset.mushafImage || (el.tagName === "IMG" ? el.getAttribute("src") : null);
        if (!src) return;

        e.preventDefault();
        openImageModal(src);
    });
}

async function bootstrap() {
    initRefs();
    setupNav();
    setupThemeToggle();
    setupReciterModal();
    setupImageViewer();
    setupReaderFullscreen();

    try {
        await loadSurahs();
        renderSurahList();

        renderSurahDropdowns();
        setupQuranInteractions();
        await loadSurahText(0);
    } catch (e) {
        console.error("Failed to load surahs", e);
        if (els.surahList) {
            els.surahList.innerHTML = '<li class="surah-item" style="justify-content:center; opacity:.85;">تعذر تحميل الفهرس</li>';
        }
        if (els.quranText) {
            els.quranText.innerHTML = '<div style="text-align:center; opacity:.85;">تعذر تحميل بيانات المصحف</div>';
        }
    }

    try {
        await loadReciters();
        renderReciterSelect();
        renderRecitersGrid();
        setupRecitersInteractions();
    } catch (e) {
        console.error("Failed to load reciters", e);
        if (els.recitersGrid) {
            els.recitersGrid.innerHTML = '<div style="grid-column:1 / -1; text-align:center; opacity:.85;">تعذر تحميل القراء</div>';
        }
    }

    setupAudioInteractions();
}

window.addEventListener("DOMContentLoaded", bootstrap);