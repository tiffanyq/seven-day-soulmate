const FILES = {
  beginning: "csv/Seven Day Soulmate Data - Beginning sequence.csv",
  riley: "csv/Seven Day Soulmate Data - Riley.csv",
  robin: "csv/Seven Day Soulmate Data - Robin.csv",
  river: "csv/Seven Day Soulmate Data - River.csv",
  rory: "csv/Seven Day Soulmate Data - Rory.csv",
  ronnie: "csv/Seven Day Soulmate Data - Ronnie.csv",
  events: "csv/Seven Day Soulmate Data - Random Events.csv",
  journals: "csv/Seven Day Soulmate Data - Journal Entries.csv",
  ending: "csv/Seven Day Soulmate Data - Ending sequence.csv",
  endParagraphs: "csv/Seven Day Soulmate Data - End paragraphs.csv",
};

const IMG = {
  riley: "img/riley.png",
  robin: "img/robin.png",
  river: "img/river.png",
  rory: "img/rory.png",
  ronnie: "img/ronnie.png",
  horse: "img/horse.png",
  horse_evening: "img/horse_evening.png",
  riley_evening: "img/riley_evening.png",
  river_evening: "img/river_evening.png",
  day: "img/day.png",
  journal: "img/journal.png"
};

const EMOJI = {
  riley: "🧳",
  robin: "🎨",
  river: "✈️",
  rory: "❤️‍🩹",
  ronnie: "🎾",
};

const DISPLAY_NAME = {
  riley: "Riley",
  robin: "Robin",
  river: "River",
  rory: "Rory",
  ronnie: "Ronnie",
};

const SLOTS = ["morning", "afternoon", "event", "evening", "journal"];
const TIEBREAK = ["riley", "robin", "river", "rory", "ronnie"];

const AUDIO_FILES = {
  click: "music/click.mp3",
  day: "music/day.mp3",
  happy: "music/happy.mp3",
  sad: "music/sad.mp3",
  random_event: "music/random_event.mp3",
  journal: "music/journal.mp3",
  main: "music/main.mp3",
  riley: "music/riley.mp3",
  robin: "music/robin.mp3",
  river: "music/river.mp3",
  rory: "music/rory.mp3",
  ronnie: "music/ronnie.mp3",
  finale: "music/finale.mp3",
  finale_choice_happy: "music/final_choice_happy.mp3",
  finale_choice_wistful: "music/final_choice_wistful.mp3",
};

const audioState = {
  ready: false,
  enabled: false,
  clickEl: null,
  happyEl: null,
  sadEl: null,
  randomEventEl: null,
  journalEl: null,
  dayEl: null,
  finaleEl: null,
  finalChoiceEl: null,
  finalChoiceHappyEl: null,
  finalChoiceWistfulEl: null,
  bgmBaseVolume: 0.22,
  bgmDuckFactor: 0.45,
  choiceSfxVolume: 0.90,
  bgmEls: {},
  currentBgmKey: null,
  currentBgmEl: null,
};

const THEME_CLASSES = ["theme-main", "theme-riley", "theme-robin", "theme-river", "theme-rory", "theme-ronnie"];

function setThemeClass(themeKey) {
  const body = document.body;
  if (!body) return;

  THEME_CLASSES.forEach((c) => body.classList.remove(c));
  body.classList.add(`theme-${themeKey || "main"}`);
}

function themeKeyForScreen() {
  if (state.mode === "ending") return "main";
  if (state.mode === "landing" || state.mode === "transition" || state.mode === "day5info") return "main";
  if (state.mode === "beginning") return "riley";
  if (state.mode === "day") {
    const slot = SLOTS[state.slotIndex];
    if (slot === "event" || slot === "journal") return "main";
    return state.currentPartner || "main";
  }
  if (state.mode === "outcome") return state.soulmatePick || "main";

  return "main";
}

function updateThemeForScreen() {
  setThemeClass(themeKeyForScreen());
}

// -----------------------------
// STATE
// -----------------------------
const state = {
  mode: "landing", // landing | beginning | transition | day | day5info | ending | outcome
  day: 0,          // 0..7
  slotIndex: 0,
  currentPartner: null,

  chosenPartners: {
    5: { morning: null, afternoon: null, evening: null },
    6: { morning: null, afternoon: null, evening: null },
    7: { morning: null, afternoon: null, evening: null },
  },

  scores: { riley: 0, robin: 0, river: 0, rory: 0, ronnie: 0 },
  dialogueIndex: { riley: 0, robin: 0, river: 0, rory: 0, ronnie: 0 },
  beginningIndex: 0,

  endIndex: 0,
  soulmatePick: null,
  endingTone: null, // "happy" | "wistful"
};

const data = {
  beginning: [],
  dialogues: { riley: [], robin: [], river: [], rory: [], ronnie: [] },
  events: [],
  journals: [],
  ending: [],
  endParagraphs: {}, // key -> { happy, middling, wistful }
};

let speakerEl, dialogueEl, subtitleEl, imgEl, choicesEl, nextBtn;

let typeTimer = null;
let currentTypeToken = 0;
let lastDayStartSfxDay = null;
let finaleSfxPlayed = false;
let finalChoiceSfxPlayed = false;

// -----------------------------
// Scheduling (Days 1-4 fixed)
// -----------------------------
function fixedPartnerFor(day, slot) {
  if (slot === "afternoon") return "riley";

  if (slot === "morning") {
    if (day === 1 || day === 3) return "robin";
    if (day === 2 || day === 4) return "rory";
  }

  if (slot === "evening") {
    if (day === 1 || day === 3) return "river";
    if (day === 2 || day === 4) return "ronnie";
  }

  return null;
}

// -----------------------------
// Header text formatting
// -----------------------------
function slotTitle(slot, partner) {
  const niceSlot = capitalize(slot);
  if (slot === "event") return "Random Event!";
  if (slot === "journal") return "Reflection Time!";
  if (partner) return `${niceSlot} with ${DISPLAY_NAME[partner]}`;
  return niceSlot;
}

function headerText(day, title) {
  const base = `Day ${day}/7`;
  if (!title || title.trim() === "") return base;
  return `${base} - ${title}`;
}

// -----------------------------
// CSV parsing
// -----------------------------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }

  row.push(cur);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);

  if (rows.length === 0) return [];

  const header = rows[0].map((h) => String(h).trim());
  const out = [];

  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = String(rows[r][c] ?? "").trim();
    }
    out.push(obj);
  }

  return out;
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

// -----------------------------
// Empty row skipping
// -----------------------------
function isEmptyDialogueRow(row) {
  if (!row) return true;
  const q = (row["Question"] || "").trim();
  const o1 = (row["Option 1"] || "").trim();
  const o2 = (row["Option 2"] || "").trim();
  const r1 = (row["Response 1"] || "").trim();
  const r2 = (row["Response 2"] || "").trim();
  return q === "" && o1 === "" && o2 === "" && r1 === "" && r2 === "";
}

// -----------------------------
// DOM + Boot
// -----------------------------
window.addEventListener("DOMContentLoaded", async () => {
  cacheDom();
  bindSoundToggle();
  updateThemeForScreen();

  try {
    await loadAllData();
    startGame();
  } catch (err) {
    console.error(err);
    speakerEl.textContent = "Error";
    dialogueEl.textContent =
      "Could not load CSV data. Check console + filenames in FILES.";
    showNext(false);
  }
});

function cacheDom() {
  speakerEl = document.getElementById("speaker");
  dialogueEl = document.getElementById("dialogue");
  subtitleEl = document.getElementById("game-subtitle");
  imgEl = document.querySelector(".image-box img");
  choicesEl = document.getElementById("choices");
  nextBtn = document.getElementById("nextBtn");
}

// -----------------------------
// Sound toggle binding (HTML button)
// -----------------------------
function bindSoundToggle() {
  const btn = document.getElementById("soundToggle");
  if (!btn) return;
  btn.textContent = "🔇 Sound: Off";
  btn.setAttribute("aria-pressed", "false");

  btn.addEventListener("click", () => {
    if (!audioState.enabled) {
      audioState.enabled = true;
      btn.textContent = "🔈 Sound: On";
      btn.setAttribute("aria-pressed", "true");
      primeAudioFromGesture();
      playClick();
      updateBgmForScreen();
      return;
    }

    // Turning OFF
    audioState.enabled = false;
    btn.textContent = "🔇 Sound: Off";
    btn.setAttribute("aria-pressed", "false");
    stopBgm();
  });
}

async function loadAllData() {
  data.beginning = await loadCSV(FILES.beginning);
  data.dialogues.riley = await loadCSV(FILES.riley);
  data.dialogues.robin = await loadCSV(FILES.robin);
  data.dialogues.river = await loadCSV(FILES.river);
  data.dialogues.rory = await loadCSV(FILES.rory);
  data.dialogues.ronnie = await loadCSV(FILES.ronnie);
  data.events = await loadCSV(FILES.events);
  data.journals = await loadCSV(FILES.journals);
  data.ending = await loadCSV(FILES.ending);
  const endP = await loadCSV(FILES.endParagraphs);
  data.endParagraphs = {};
  endP.forEach((row) => {
    const key = normalizeKey(row["Character"]);
    data.endParagraphs[key] = {
      happy: row["Happy ending"] || "",
      middling: row["Middling ending"] || "",
      wistful: row["Wistful paragraph"] || "",
    };
  });
}

// -----------------------------
// AUDIO helpers
// -----------------------------
function primeAudioFromGesture() {
  if (!audioState.enabled) return;
  if (audioState.ready) return;

  audioState.ready = true;

  // Click SFX
  audioState.clickEl = new Audio(AUDIO_FILES.click);
  audioState.clickEl.preload = "auto";
  audioState.clickEl.volume = 0.55;

  // Choice SFX (louder than BGM)
  audioState.happyEl = new Audio(AUDIO_FILES.happy);
  audioState.happyEl.preload = "auto";
  audioState.happyEl.volume = audioState.choiceSfxVolume;

  audioState.sadEl = new Audio(AUDIO_FILES.sad);
  audioState.sadEl.preload = "auto";
  audioState.sadEl.volume = audioState.choiceSfxVolume;

  // Random event + journal SFX
  audioState.randomEventEl = new Audio(AUDIO_FILES.random_event);
  audioState.randomEventEl.preload = "auto";
  audioState.randomEventEl.volume = audioState.choiceSfxVolume;

  audioState.journalEl = new Audio(AUDIO_FILES.journal);
  audioState.journalEl.preload = "auto";
  audioState.journalEl.volume = audioState.choiceSfxVolume;

  // Day start SFX
  audioState.dayEl = new Audio(AUDIO_FILES.day);
  audioState.dayEl.preload = "auto";
  audioState.dayEl.volume = 0.55;

  // Ending / finale SFX
  audioState.finaleEl = new Audio(AUDIO_FILES.finale);
  audioState.finaleEl.preload = "auto";
  audioState.finaleEl.volume = 0.60;

  audioState.finalChoiceEl = new Audio(AUDIO_FILES.final_choice);
  audioState.finalChoiceEl.preload = "auto";
  audioState.finalChoiceEl.volume = 0.80;

  // Final choice tone SFX (happy vs wistful)
  audioState.finalChoiceHappyEl = new Audio(AUDIO_FILES.finale_choice_happy);
  audioState.finalChoiceHappyEl.preload = "auto";
  audioState.finalChoiceHappyEl.volume = 0.80;

  audioState.finalChoiceWistfulEl = new Audio(AUDIO_FILES.finale_choice_wistful);
  audioState.finalChoiceWistfulEl.preload = "auto";
  audioState.finalChoiceWistfulEl.volume = 0.80;

  // BGM tracks
  ["main", "riley", "robin", "river", "rory", "ronnie"].forEach((k) => {
    const a = new Audio(AUDIO_FILES[k]);
    a.loop = true;
    a.preload = "auto";
    a.volume = audioState.bgmBaseVolume;
    audioState.bgmEls[k] = a;
  });

  updateBgmForScreen();
}

function playClick() {
  if (!audioState.ready || !audioState.enabled) return;
  const a = audioState.clickEl;
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function duckBgm(duration = 420) {
  const el = audioState.currentBgmEl;
  if (!audioState.ready || !audioState.enabled || !el) return;
  const original = el.volume;
  el.volume = Math.max(original * audioState.bgmDuckFactor, 0.04);
  setTimeout(() => {
    if (audioState.currentBgmEl === el) el.volume = original;
  }, duration);
}

function playChoiceSfx(which) {
  if (!audioState.ready || !audioState.enabled) return;
  let a = null;
  if (which === "happy") a = audioState.happyEl;
  else if (which === "sad") a = audioState.sadEl;
  else if (which === "random_event") a = audioState.randomEventEl;
  else if (which === "journal") a = audioState.journalEl;
  if (!a) return;
  duckBgm(420);
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function playDayStartSfx() {
  if (!audioState.ready || !audioState.enabled) return;
  const a = audioState.dayEl;
  if (!a) return;
  duckBgm(520);
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function playFinaleSfx() {
  if (!audioState.ready || !audioState.enabled) return;
  const a = audioState.finaleEl;
  if (!a) return;
  duckBgm(900);
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function playFinalChoiceSfx() {
  if (!audioState.ready || !audioState.enabled) return;
  const tone = state.endingTone || "wistful";
  const a = (tone === "happy") ? audioState.finalChoiceHappyEl : audioState.finalChoiceWistfulEl;
  if (!a) return;

  duckBgm(1100);
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function stopBgm() {
  if (audioState.currentBgmEl) {
    try { audioState.currentBgmEl.pause(); } catch (_) {}
  }
  audioState.currentBgmKey = null;
  audioState.currentBgmEl = null;
}

function setBgm(key) {
  if (!audioState.ready || !audioState.enabled) return;

  const next = audioState.bgmEls[key] || audioState.bgmEls.main;
  const nextKey = audioState.bgmEls[key] ? key : "main";

  if (audioState.currentBgmKey === nextKey && audioState.currentBgmEl) return;

  // pause old
  if (audioState.currentBgmEl) {
    try { audioState.currentBgmEl.pause(); } catch (_) {}
  }

  audioState.currentBgmKey = nextKey;
  audioState.currentBgmEl = next;

  try {
    next.play();
  } catch (_) {}
}

function bgmKeyForScreen() {
  if (state.mode === "ending") return "main";
  if (state.mode === "landing" || state.mode === "transition" || state.mode === "day5info") {
    return "main";
  }
  if (state.mode === "day") {
    const slot = SLOTS[state.slotIndex];
    if (slot === "event" || slot === "journal") return "main";
    return state.currentPartner || "main";
  }
  if (state.mode === "beginning") return "riley";
  if (state.mode === "outcome") return state.soulmatePick || "main";

  return "main";
}

function updateBgmForScreen() {
  if (!audioState.enabled) return; // keep silent if off
  const k = bgmKeyForScreen();
  setBgm(k);
}

// -----------------------------
// Game control
// -----------------------------
function startGame() {
  resetState();
  renderCurrent();
}

function resetState() {
  state.mode = "landing";
  state.day = 0;
  state.slotIndex = 0;
  state.currentPartner = null;

  state.beginningIndex = 0;
  state.scores = { riley: 0, robin: 0, river: 0, rory: 0, ronnie: 0 };
  state.dialogueIndex = { riley: 0, robin: 0, river: 0, rory: 0, ronnie: 0 };

  for (const d of [5, 6, 7]) {
    state.chosenPartners[d] = { morning: null, afternoon: null, evening: null };
  }

  state.endIndex = 0;
  state.soulmatePick = null;
  state.endingTone = null;

  stopTypewriter();

  lastDayStartSfxDay = null;
  finaleSfxPlayed = false;
  finalChoiceSfxPlayed = false;

  updateThemeForScreen();

  // Do NOT auto-start BGM on reset if sound is off
  updateBgmForScreen();
}

function portraitFor(slot, partner) {
  if (slot === "event") return IMG.horse;
  if (slot === "transition") return IMG.day;
  if (slot === "journal") return IMG.journal;
  if (partner === "riley" && slot === "evening") return IMG.riley_evening;
  if (partner === "river" && slot === "evening") return IMG.river_evening;
  return (partner && IMG[partner]) ? IMG[partner] : IMG.horse;
}
// -----------------------------
// Rendering router
// -----------------------------
function renderCurrent() {
  updateThemeForScreen();

  if (state.mode === "landing") { updateBgmForScreen(); return renderLanding(); }
  if (state.mode === "transition") { updateBgmForScreen(); return renderDayTransition(state.day); }
  if (state.mode === "day5info") { updateBgmForScreen(); return renderDay5Info(); }
  if (state.mode === "ending") { updateBgmForScreen(); return renderEnding(); }
  if (state.mode === "outcome") { updateBgmForScreen(); return renderOutcome(); }

  // Beginning sequence (Day 0)
  if (state.mode === "beginning" && state.day === 0) {
    while (
      state.beginningIndex < data.beginning.length &&
      isEmptyDialogueRow(data.beginning[state.beginningIndex])
    ) {
      state.beginningIndex += 1;
    }

    if (state.beginningIndex >= data.beginning.length) {
      state.day = 1;
      state.slotIndex = 0;
      state.mode = "transition";
      return renderCurrent();
    }

    state.currentPartner = "riley";
    imgEl.src = IMG.riley_evening;

    subtitleEl.textContent = headerText(0, "Evening with Riley");
    updateThemeForScreen();
    updateBgmForScreen();
    return renderDialogueNodeFromRow(
      "beginning",
      data.beginning[state.beginningIndex],
      "riley"
    );
  }

  // Days 1..7
  state.mode = "day";
  const slot = SLOTS[state.slotIndex];

  // Random Event
  if (slot === "event") {
    state.currentPartner = null;
    imgEl.src = IMG.horse;
    subtitleEl.textContent = headerText(state.day, "Random Event!");
    updateThemeForScreen();
    updateBgmForScreen();
    const row = data.events[state.day - 1];
    return renderEventNode(row);
  }

  // Journal
  if (slot === "journal") {
    state.currentPartner = null;
    imgEl.src = portraitFor("journal", null);
    subtitleEl.textContent = headerText(state.day, "Reflection Time!");
    updateThemeForScreen();
    updateBgmForScreen();
    const row = data.journals[state.day - 1];
    return renderJournalNode(row);
  }

  // Dialogue slots: morning/afternoon/evening
  let partner = null;

  if (state.day <= 4) {
    partner = fixedPartnerFor(state.day, slot);
  } else {
    partner = state.chosenPartners[state.day][slot];
    if (!partner) {
      state.currentPartner = null;
      imgEl.src = (slot === "evening" && state.day >= 5) ? IMG.horse_evening : IMG.horse;
      subtitleEl.textContent = headerText(state.day, slotTitle(slot, null));
      updateThemeForScreen();
      updateBgmForScreen();
      return renderPartnerSelect(slot);
    }
  }

  state.currentPartner = partner;
  imgEl.src = portraitFor(SLOTS[state.slotIndex], state.currentPartner);
  subtitleEl.textContent = headerText(state.day, slotTitle(slot, partner));
  updateThemeForScreen();
  updateBgmForScreen();
  return beginPartnerDialogue(partner);
}

// -----------------------------
// Special screens
// -----------------------------
function renderLanding() {
  imgEl.src = IMG.horse;

  setSpeaker("");
  subtitleEl.textContent = "Seven Day Soulmate";
  setDialogue("You have seven days to choose your soulmate. Who will it be?\n\n🔈💓 Best experienced with sound on!");

  clearChoices();
  showNext(true, "Start", () => {
    state.mode = "beginning";
    state.day = 0;
    state.slotIndex = 0;
    state.beginningIndex = 0;
    state.currentPartner = "riley";
    renderCurrent();
  });
}

function renderDayTransition(day) {
  imgEl.src = portraitFor("transition", null);

  setSpeaker("");
  subtitleEl.textContent = headerText(day, "");

  if (day >= 1 && audioState.ready && audioState.enabled && lastDayStartSfxDay !== day) {
    playDayStartSfx();
    lastDayStartSfxDay = day;
  }

  let text;
  switch (day) {
    case 1: text = "Seven more days."; break;
    case 2: text = "Six more days."; break;
    case 3: text = "The days are starting to fly by."; break;
    case 4: text = "You're halfway there..."; break;
    case 5: text = "You're overly aware you have three more days."; break;
    case 6: text = "The end is creeping up on you."; break;
    case 7: text = "One more day!!!"; break;
    default: text = "";
  }
  setDialogue(text);

  clearChoices();
  showNext(true, "Continue", () => {
    state.mode = (day === 5) ? "day5info" : "day";
    renderCurrent();
  });
}

function renderDay5Info() {
  imgEl.src = IMG.riley;

  setSpeaker("Riley");
  subtitleEl.textContent = headerText(5, "A quick note");
  setDialogue(
    "Since it's a long weekend, you get to choose who you see from now on. Use the time the way you want."
  );

  clearChoices();
  showNext(true, "Got it", () => {
    state.mode = "day";
    renderCurrent();
  });
}

// -----------------------------
// Ending sequence
// -----------------------------
function endingPickOrdinal(idx) {
  // Returns 1 for first (you pick), 2 for second, etc.
  let n = 0;
  for (let i = 0; i <= idx && i < data.ending.length; i++) {
    const pr = ((data.ending[i]?.Person) || "").toLowerCase();
    if (pr.includes("(you pick)")) n++;
  }
  return n;
}

function renderEnding() {
  const row = data.ending[state.endIndex];
  if (!row) {
    state.mode = "outcome";
    updateThemeForScreen();
    updateBgmForScreen();
    return renderOutcome();
  }

  const personRaw = (row["Person"] || "").trim();
  const dialogueRaw = (row["Dialogue"] || "").trim();

  if (!finaleSfxPlayed && audioState.ready && audioState.enabled && state.endIndex === 0) {
    playFinaleSfx();
    finaleSfxPlayed = true;
  }

  subtitleEl.textContent = headerText(7, "Finale");
  updateThemeForScreen();
  updateBgmForScreen();
  if (personRaw.toLowerCase().includes("(you pick)")) {
    imgEl.src = IMG.horse;
    setSpeaker("");
    const ordinal = endingPickOrdinal(state.endIndex);
    setDialogue(
      ordinal >= 2
        ? "Choose yourself (and a direction, for now)."
        : "Choose your soulmate."
    );

    clearChoices();
    showNext(false);

    const partners = ["riley", "robin", "river", "rory", "ronnie"];
    partners.forEach((p) => {
      addChoiceButton(`${EMOJI[p]} ${DISPLAY_NAME[p]}`, () => {
        state.soulmatePick = p;
        state.endingTone = isPickedTopOrTied(p) ? "happy" : "wistful";
        if (ordinal >= 2 && !finalChoiceSfxPlayed && audioState.ready && audioState.enabled) {
          playFinalChoiceSfx();
          finalChoiceSfxPlayed = true;
        }
        state.endIndex += 1;
        renderCurrent();
      });
    });
    return;
  }

  const key = normalizeKey(personRaw);
  if (key in IMG) {
    imgEl.src = IMG[key];
    setSpeaker(DISPLAY_NAME[key]);
  } else if (key === "you") {
    imgEl.src = IMG.horse;
    setSpeaker("You");
  } else {
    imgEl.src = IMG.horse;
    setSpeaker(personRaw);
  }

  setDialogue(dialogueRaw);

  clearChoices();
  showNext(true, "Next", () => {
    state.endIndex += 1;
    if (state.endIndex >= data.ending.length) {
      state.mode = "outcome";
      renderCurrent();
    } else {
      renderCurrent();
    }
  });
}

function renderOutcome() {
  const pick = state.soulmatePick || "riley";
  imgEl.src = IMG[pick];

  subtitleEl.textContent = `For now, it's ${DISPLAY_NAME[pick]}.`;
  setSpeaker(DISPLAY_NAME[pick]);

  updateThemeForScreen();
  updateBgmForScreen();

  const top = highestScoreCharacter();
  const pickedIsTopOrTied = isPickedTopOrTied(pick);

  state.endingTone = pickedIsTopOrTied ? "happy" : "wistful";

  const para = data.endParagraphs[pick] || { happy: "", middling: "", wistful: "" };
  const wistful = (data.endParagraphs[top]?.wistful || "").trim();

  let text = "";
  if (pickedIsTopOrTied) {
    text = (para.happy || "").trim();
  } else {
    const mid = (para.middling || "").trim();
    text = mid;
    if (wistful) text = `${text}\n\n${wistful}`;
  }

  setDialogue(text);

  clearChoices();
  showNext(false);

  addActionButton("Play again", () => {
    playClick();
    startGame();
  });
}

function highestScoreCharacter() {
  let max = -Infinity;
  for (const k of TIEBREAK) max = Math.max(max, state.scores[k]);
  for (const k of TIEBREAK) {
    if (state.scores[k] === max) return k;
  }
  return "riley";
}

function isPickedTopOrTied(pick) {
  const max = Math.max(...TIEBREAK.map((k) => state.scores[k]));
  return state.scores[pick] === max;
}

// -----------------------------
// Dialogue flow
// -----------------------------
function beginPartnerDialogue(partner) {
  const list = data.dialogues[partner] || [];
  if (list.length === 0) {
    setSpeaker(DISPLAY_NAME[partner]);
    setDialogue("No dialogue loaded for this character.");
    clearChoices();
    showNext(true, "Next", advance);
    return;
  }

  let idx = state.dialogueIndex[partner] % list.length;
  let guard = 0;
  while (guard < list.length && isEmptyDialogueRow(list[idx])) {
    state.dialogueIndex[partner] += 1;
    idx = state.dialogueIndex[partner] % list.length;
    guard++;
  }

  const row = list[idx];
  return renderDialogueNodeFromRow("dialogue", row, partner);
}

// -----------------------------
// Node renderers
// -----------------------------
function clearChoices() {
  choicesEl.innerHTML = "";
}

function showNext(show, label = "Next", onClick = null) {
  if (show) {
    nextBtn.classList.remove("hidden");
    nextBtn.classList.add("is-hidden");
    nextBtn.classList.remove("is-in");
    nextBtn.textContent = label;
    nextBtn.onclick = () => {
      primeAudioFromGesture();
      playClick();
      onClick?.();
    };
  } else {
    nextBtn.classList.add("hidden");
    nextBtn.classList.remove("is-hidden");
    nextBtn.classList.remove("is-in");
    nextBtn.onclick = null;
  }
}

function addChoiceButton(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "choice-btn is-hidden";
  btn.textContent = text;

  btn.onclick = () => {
    primeAudioFromGesture();
    playClick();
    onClick();
  };

  choicesEl.appendChild(btn);
}

function addActionButton(text, onClick) {
  const btn = document.createElement("button");
  btn.className = "next-btn is-hidden";
  btn.textContent = text;

  btn.onclick = () => {
    primeAudioFromGesture();
    playClick();
    onClick?.();
  };

  choicesEl.appendChild(btn);
}

// -----------
// UI reveal
// -----------
function revealChoicesAndNextAfterType(token, opts = {}) {
  const delayMs = opts.delayMs ?? 180;
  const staggerMs = opts.staggerMs ?? 90;
  const nextExtraMs = opts.nextExtraMs ?? 140;

  if (token !== currentTypeToken) return;
  const buttons = Array.from(choicesEl?.querySelectorAll("button") ?? []);
  buttons.forEach((btn) => {
    btn.classList.add("is-hidden");
    btn.classList.remove("is-in");
  });

  setTimeout(() => {
    if (token !== currentTypeToken) return;

    buttons.forEach((btn, i) => {
      setTimeout(() => {
        if (token !== currentTypeToken) return;
        btn.classList.remove("is-hidden");
        btn.classList.add("is-in");
      }, i * staggerMs);
    });

    const nextDelay = delayMs + (buttons.length ? buttons.length * staggerMs : 0) + nextExtraMs;

    setTimeout(() => {
      if (token !== currentTypeToken) return;
      if (!nextBtn || nextBtn.classList.contains("hidden")) return;
      nextBtn.classList.remove("is-hidden");
      nextBtn.classList.add("is-in");
    }, nextDelay);
  }, delayMs);
}



function shouldPlayDialogueChoiceSfx(kind) {
  if (kind !== "dialogue") return false;
  if (state.mode !== "day") return false;
  if (state.day < 1 || state.day > 7) return false;
  const slot = SLOTS[state.slotIndex];
  return slot === "morning" || slot === "afternoon" || slot === "evening";
}

function renderDialogueNodeFromRow(kind, row, partnerOverride = null) {
  const partner = partnerOverride || "riley";
  setSpeaker(DISPLAY_NAME[partner] ?? capitalize(partner));

  if (!row || isEmptyDialogueRow(row)) {
    if (kind === "beginning") state.beginningIndex += 1;
    if (kind === "dialogue") state.dialogueIndex[partner] += 1;
    advance();
    return;
  }

  const question = row["Question"] || "";
  const opt1 = row["Option 1"] || "";
  const opt2 = row["Option 2"] || "";
  const resp1 = row["Response 1"] || "";
  const resp2 = row["Response 2"] || "";

  setDialogue(question);

  clearChoices();
  showNext(false);

  addChoiceButton(opt1, () => {
    if (kind === "dialogue") state.scores[partner] += 1;
    if (shouldPlayDialogueChoiceSfx(kind)) playChoiceSfx("happy");

    renderResponseScreenLabel(DISPLAY_NAME[partner], resp1, () => {
      if (kind === "beginning") state.beginningIndex += 1;
      if (kind === "dialogue") state.dialogueIndex[partner] += 1;
      advance();
    });
  });

  addChoiceButton(opt2, () => {
    if (kind === "dialogue") state.scores[partner] -= 1;
    if (shouldPlayDialogueChoiceSfx(kind)) playChoiceSfx("sad");

    renderResponseScreenLabel(DISPLAY_NAME[partner], resp2, () => {
      if (kind === "beginning") state.beginningIndex += 1;
      if (kind === "dialogue") state.dialogueIndex[partner] += 1;
      advance();
    });
  });
}

function renderResponseScreenLabel(label, responseText, onNext) {
  setSpeaker(label || "");
  setDialogue(responseText || "");
  clearChoices();
  showNext(true, "Next", onNext);
}

function renderEventNode(row) {
  setSpeaker("What do you do?");
  setDialogue(row?.["Question"] || "");
  clearChoices();
  showNext(false);

  const opt1 = row?.["Option 1"] || "";
  const res1 = row?.["Response 1"] || "";
  const p1 = normalizeKey(row?.["Point for"] || "");

  const opt2 = row?.["Option 2"] || "";
  const res2 = row?.["Response 2"] || "";
  const p2 = normalizeKey(row?.["Point for.1"] || "");

  addChoiceButton(opt1, () => {
    playChoiceSfx("random_event");
    if (p1 && state.scores[p1] !== undefined) state.scores[p1] += 1;
    renderResponseScreenLabel("What do you do?", res1, advance);
  });

  addChoiceButton(opt2, () => {
    playChoiceSfx("random_event");
    if (p2 && state.scores[p2] !== undefined) state.scores[p2] += 1;
    renderResponseScreenLabel("What do you do?", res2, advance);
  });
}

function renderJournalNode(row) {
  setSpeaker("What's on your mind?");
  setDialogue(row?.["Question"] || "");
  clearChoices();
  showNext(false);

  const p1 = row?.["Prompt 1"] || "";
  const r1 = row?.["Response 1"] || "";
  const p2 = row?.["Prompt 2"] || "";
  const r2 = row?.["Response 2"] || "";

  addChoiceButton(p1, () => { playChoiceSfx("journal"); return renderResponseScreenLabel("What\'s on your mind?", r1, advance); });
  addChoiceButton(p2, () => { playChoiceSfx("journal"); return renderResponseScreenLabel("What\'s on your mind?", r2, advance); });
}

function renderPartnerSelect(slot) {
  setSpeaker("");
  setDialogue(`Who do you want to see this ${slot}?`);
  clearChoices();
  showNext(false);

  const partners = ["riley", "robin", "river", "rory", "ronnie"];
  partners.forEach((p) => {
    addChoiceButton(`${EMOJI[p]} ${DISPLAY_NAME[p]}`, () => {
      state.chosenPartners[state.day][slot] = p;
      renderCurrent();
    });
  });
}

// -----------------------------
// Advance
// -----------------------------
function advance() {
  // Beginning flow
  if (state.mode === "beginning" && state.day === 0) {
    while (
      state.beginningIndex < data.beginning.length &&
      isEmptyDialogueRow(data.beginning[state.beginningIndex])
    ) {
      state.beginningIndex += 1;
    }

    if (state.beginningIndex >= data.beginning.length) {
      state.day = 1;
      state.slotIndex = 0;
      state.mode = "transition";
      return renderCurrent();
    }

    return renderCurrent();
  }

  state.slotIndex += 1;

  // End of day -> next day
  if (state.slotIndex >= SLOTS.length) {
    state.slotIndex = 0;
    state.day += 1;

    if (state.day <= 7) {
      state.mode = "transition";
      return renderCurrent();
    }

    // go to ending sequence
    state.mode = "ending";
    state.endIndex = 0;
    state.soulmatePick = null;
    return renderCurrent();
  }

  state.mode = "day";
  renderCurrent();
}

// ------------
// Typewriter
// ------------
function stopTypewriter() {
  if (typeTimer) clearTimeout(typeTimer);
  typeTimer = null;
  currentTypeToken += 1;
  dialogueEl.classList.remove("typewriting");
}

function setSpeaker(text) {
  const raw = (text || "").trim();
  if (!raw) {
    speakerEl.textContent = "";
    return;
  }

  // Add character emoji to speaker title for main cast
  for (const key of Object.keys(EMOJI)) {
    const display = DISPLAY_NAME[key];
    const emoji = EMOJI[key];
    if (raw === display || normalizeKey(raw) === key) {
      speakerEl.textContent = `${emoji} ${display}`;
      return;
    }
    if (raw.startsWith(emoji)) {
      speakerEl.textContent = raw;
      return;
    }
  }
  speakerEl.textContent = raw;
}

function setDialogue(text) {
  stopTypewriter();

  const h = measureFinalDialogueHeight(text || "");
  dialogueEl.style.minHeight = `${h}px`;

  const token = currentTypeToken;
  dialogueEl.classList.add("typewriting");
  dialogueEl.textContent = "";

  const full = String(text || "");
  let i = 0;
  const speed = 14;

  function step() {
    if (token !== currentTypeToken) return;
    if (i >= full.length) {
      dialogueEl.textContent = full;
      dialogueEl.classList.remove("typewriting");
      revealChoicesAndNextAfterType(token, { delayMs: 220, staggerMs: 90, nextExtraMs: 140 });
      return;
    }
    dialogueEl.textContent += full[i];
    i += 1;
    typeTimer = setTimeout(step, speed);
  }
  step();
}

function measureFinalDialogueHeight(text) {
  const clone = dialogueEl.cloneNode(true);
  clone.classList.remove("typewriting");
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";
  clone.style.whiteSpace = "pre-line";
  clone.textContent = text || "";

  dialogueEl.parentElement.appendChild(clone);
  const h = Math.ceil(clone.getBoundingClientRect().height);
  clone.remove();

  const min = 32;
  const buffer = 6;
  return Math.max(h + buffer, min);
}

let resizeT;
window.addEventListener("resize", () => {
  document.body.classList.add("is-resizing");
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    document.body.classList.remove("is-resizing");
  }, 200);
});

// -----------------------------
// Helpers
// -----------------------------
function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeKey(s) {
  return String(s || "").trim().toLowerCase();
}

window.addEventListener("keydown", (e) => {
  // Shift + E
  if (e.shiftKey && e.key.toLowerCase() === "e") {
    state.mode = "ending";
    state.day = 7;
    renderEnding();
    console.log("Skipped to end sequence");
  }
});

window.addEventListener("keydown", (e) => { 
  // Shift + 5
  // (if you are peeking around here to see if you can skip to the open choice part of the game, here you go!)
  if (e.shiftKey && e.code === "Digit5") {
    state.day = 5;
    state.mode = "transition";
    state.slot = null;
    state.currentPartner = null;
    renderCurrent();
    console.log("Skipped to Day 5");
  }
});