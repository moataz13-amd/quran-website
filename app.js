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
};

const els = {};

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

    els.reciterSearch = qs("reciter-search");
    els.recitersGrid = qs("reciters-grid");

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
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return res.json();
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
        <div class="surah-item-info">${s.englishName} • ${s.ayahs || s.numberOfAyahs} آية</div>
      </div>
    `;

        li.addEventListener("click", () => selectSurah(idx));
        li.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectSurah(idx);
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
        opt.textContent = `${s.number}. ${s.englishName}`;
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

    arabicAyahs.forEach((ayah, i) => {
        const cont = document.createElement("span");
        cont.className = "ayah";
        cont.id = `ayah-${ayah.numberInSurah}`;

        const numberSpan = `<span class="ayah-number">﴿${ayah.numberInSurah}﴾</span>`;
        const transText = (transAyahs[i] && transAyahs[i].text) || "";

        cont.innerHTML = `${ayah.text} ${numberSpan}`;

        if (state.showTranslation) {
            const t = document.createElement("span");
            t.className = "translation";
            t.textContent = transText;
            cont.appendChild(t);
        }

        cont.addEventListener("click", () => highlightAyah(i));

        els.quranText.appendChild(cont);
        els.quranText.appendChild(document.createTextNode(" "));

        const o = document.createElement("option");
        o.value = i;
        o.textContent = `آية ${i + 1}`;
        els.ayahSelect.appendChild(o);
    });

    els.surahSelect.value = index;
    els.audioSurahSelect.value = index;
    highlightAyah(0, false);
}

function highlightAyah(idx, smooth = true) {
    state.currentAyahIndex = idx;
    document.querySelectorAll(".ayah").forEach((el) => el.classList.remove("ayah-active"));
    const target = els.quranText.querySelectorAll(".ayah")[idx];
    if (!target) return;
    target.classList.add("ayah-active");
    if (smooth) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function selectSurah(idx) {
    loadSurahText(idx).catch(console.error);
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
        highlightAyah(idx);
    });

    els.surahSelect.addEventListener("change", () => {
        const idx = parseInt(els.surahSelect.value, 10) || 0;
        selectSurah(idx);
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
    state.reciters.forEach((r) => {
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
      <p class="reciter-bio">${r.moshaf?.[0]?.name || "تسجيلات كاملة للقرآن الكريم بعدة روايات"}</p>
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
}

function setupRecitersInteractions() {
    els.reciterSearch.addEventListener("input", () => {
        const q = els.reciterSearch.value.trim().toLowerCase();
        Array.from(els.recitersGrid.children).forEach((card) => {
            const name = card.querySelector(".reciter-name").textContent.toLowerCase();
            const bio = card.querySelector(".reciter-bio").textContent.toLowerCase();
            card.style.display = name.includes(q) || bio.includes(q) ? "flex" : "none";
        });
    });

    els.reciterSearch.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const q = els.reciterSearch.value.trim().toLowerCase();
        if (!q) return;

        const match = state.reciters.find((r) => r.name.toLowerCase().includes(q));
        if (match) openReciterModal(match);
    });

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
    const surah = state.surahs[surahIndex];
    if (!surah) return;

    state.currentReciter = reciter;
    if (els.reciterSelect) els.reciterSelect.value = reciter.id;
    if (els.audioSurahSelect) els.audioSurahSelect.value = surahIndex;

    const url = getAudioUrlForReciterSurah(reciter, surah.number);
    if (!url) return;

    state.audio.src = url;
    state.audioReady = true;
    const rate = (els.reciterModalRate && parseFloat(els.reciterModalRate.value)) || parseFloat(els.playbackRate.value) || 1;
    state.audio.playbackRate = rate;
    await state.audio.play().catch(() => {});
    syncAllPlayerUIs();

    els.downloadAudio.href = url;
    els.downloadAudio.download = `surah-${surah.number}-${reciter.name}.mp3`;

    if (els.reciterModalNowPlaying) {
        els.reciterModalNowPlaying.textContent = `${reciter.name} • ${surah.number}. ${surah.name}`;
    }
}

function renderReciterModalSurahs(reciter) {
    els.reciterModalSurahs.innerHTML = "";
    state.surahs.forEach((s, idx) => {
        const row = document.createElement("div");
        row.className = "modal-surah-row";
        row.dataset.query = `${s.name} ${s.englishName}`.toLowerCase();

        const title = document.createElement("div");
        title.className = "modal-surah-title";
        title.innerHTML = `
      <div class="modal-surah-name">${s.number}. ${s.name}</div>
      <div class="modal-surah-sub">${s.englishName} • ${s.numberOfAyahs} آية</div>
    `;

        const actions = document.createElement("div");
        actions.className = "modal-surah-actions";

        const playBtn = document.createElement("button");
        playBtn.className = "primary-button";
        playBtn.textContent = "تشغيل";
        playBtn.addEventListener("click", () => {
            playSurahForReciter(reciter, idx).catch(console.error);
        });

        const downloadLink = document.createElement("a");
        downloadLink.className = "secondary-button";
        downloadLink.textContent = "تحميل";
        const url = getAudioUrlForReciterSurah(reciter, s.number);
        downloadLink.href = url || "#";
        downloadLink.download = `surah-${s.number}-${reciter.name}.mp3`;
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

    els.reciterModalName.textContent = reciter.name;
    const moshafName = (reciter.moshaf && reciter.moshaf[0] && reciter.moshaf[0].name) || "";
    els.reciterModalMeta.textContent = `${reciter.rewaya || ""}${reciter.rewaya && moshafName ? " • " : ""}${moshafName}`.trim();

    renderReciterModalSurahs(reciter);
    els.reciterModalSurahSearch.value = "";

    if (els.reciterModalNowPlaying) {
        els.reciterModalNowPlaying.textContent = reciter.name;
    }

    if (typeof els.reciterModal.showModal === "function") {
        els.reciterModal.showModal();
    } else {
        els.reciterModal.setAttribute("open", "");
    }

    els.reciterModalSurahSearch.focus();
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

    els.reciterModalClose.addEventListener("click", closeReciterModal);

    els.reciterModal.addEventListener("click", (e) => {
        if (e.target === els.reciterModal) closeReciterModal();
    });

    els.reciterModalSurahSearch.addEventListener("input", () => {
        const q = els.reciterModalSurahSearch.value.trim().toLowerCase();
        Array.from(els.reciterModalSurahs.children).forEach((row) => {
            const match = (row.dataset.query || "").includes(q);
            row.style.display = match ? "flex" : "none";
        });
    });

    els.reciterModalPlayPause.addEventListener("click", () => {
        if (!state.audioReady) return;
        if (state.audio.paused) {
            state.audio.play();
        } else {
            state.audio.pause();
        }
        syncAllPlayerUIs();
    });

    els.reciterModalProgress.addEventListener("input", () => {
        if (!state.audio.duration) return;
        const pct = parseFloat(els.reciterModalProgress.value) || 0;
        state.audio.currentTime = (pct / 100) * state.audio.duration;
        syncAllPlayerUIs();
    });

    els.reciterModalRate.addEventListener("change", () => {
        const rate = parseFloat(els.reciterModalRate.value) || 1;
        state.audio.playbackRate = rate;
        if (els.playbackRate) els.playbackRate.value = String(rate);
    });
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
        syncAllPlayerUIs();
    });

    els.audioPlayPause.addEventListener("click", () => {
        if (!state.audioReady) return;
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
        const pct = (currentTime / duration) * 100;
        if (els.audioProgress) els.audioProgress.value = pct || 0;
        if (els.reciterModalProgress) els.reciterModalProgress.value = pct || 0;
    } else {
        if (els.audioProgress) els.audioProgress.value = 0;
        if (els.reciterModalProgress) els.reciterModalProgress.value = 0;
    }

    const playing = isReady && !audio.paused;
    if (els.audioPlayPause) els.audioPlayPause.textContent = playing ? "⏸" : "⏵";
    if (els.reciterModalPlayPause) els.reciterModalPlayPause.textContent = playing ? "⏸" : "⏵";
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

    state.audio.src = url;
    state.audioReady = true;
    state.audio.playbackRate = parseFloat(els.playbackRate.value) || 1;
    await state.audio.play().catch(() => {});
    syncAllPlayerUIs();

    els.downloadAudio.href = url;
    els.downloadAudio.download = `surah-${surahNumber}-${reciter.name}.mp3`;
}

function setupAudioInteractions() {
    setupAudioPlayer();

    els.playAudioBtn.addEventListener("click", () => {
        prepareAndPlaySelectedAudio().catch(console.error);
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
    document.querySelectorAll(".nav-link").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
}

async function bootstrap() {
    initRefs();
    setupNav();
    setupThemeToggle();
    setupReciterModal();

    try {
        await loadSurahs();
        renderSurahList();
        renderSurahDropdowns();
        setupQuranInteractions();
        await loadSurahText(0);
    } catch (e) {
        console.error("Failed to load surahs", e);
    }

    try {
        await loadReciters();
        renderReciterSelect();
        renderRecitersGrid();
        setupRecitersInteractions();
    } catch (e) {
        console.error("Failed to load reciters", e);
    }

    setupAudioInteractions();
}

window.addEventListener("DOMContentLoaded", bootstrap);