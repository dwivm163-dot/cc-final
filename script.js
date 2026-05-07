const form = document.getElementById("archive-form");
const statusLog = document.getElementById("statusLog");
const recordOutput = document.getElementById("recordOutput");
const retrieveBtn = document.getElementById("retrieveBtn");
let pendingFallbackContext = null;

const interpretationMap = [
  {
    keywords: ["writer", "poet", "author", "artist", "composer", "painter"],
    category: "art/literature",
    patterns: [
      "You tended to process emotion by turning it into language, image, or sound.",
      "You revised the same ideas repeatedly until they felt exact.",
      "You were remembered through your work more than through personal details."
    ],
    notes: [
      "Your record suggests a life organized around expression and craft.",
      "The archive marks a pattern of creating meaning from instability."
    ]
  },
  {
    keywords: ["politician", "ruler", "king", "queen", "emperor", "president", "minister"],
    category: "power/politics",
    patterns: [
      "You operated inside institutions where every choice had public consequences.",
      "You learned to read hierarchy quickly and respond with caution.",
      "You prioritized order, even when the system itself was unstable."
    ],
    notes: [
      "Your trace points to a life shaped by responsibility, negotiation, and control.",
      "The archive indicates repeated exposure to changing power structures."
    ]
  },
  {
    keywords: ["scientist", "mathematician", "inventor", "engineer", "physician", "astronomer"],
    category: "science/discovery",
    patterns: [
      "You trusted observation and evidence before personal certainty.",
      "You returned to difficult problems until a pattern became visible.",
      "You preferred precision, method, and repeatable results."
    ],
    notes: [
      "Your record suggests a life spent naming and testing the unknown.",
      "The archive shows a consistent drive to impose structure on uncertainty."
    ]
  },
  {
    keywords: ["soldier", "general", "commander", "war", "military"],
    category: "conflict",
    patterns: [
      "You adapted quickly to risk and changing conditions.",
      "Even in calm periods, you remained alert and task-focused.",
      "You carried duty and uncertainty at the same time."
    ],
    notes: [
      "Your trace indicates a life marked by pressure, movement, and survival.",
      "The archive reflects decisions made under conflict rather than comfort."
    ]
  },
  {
    keywords: ["saint", "monk", "priest", "religious", "philosopher", "spiritual"],
    category: "ritual/belief",
    patterns: [
      "You relied on routine, contemplation, or ritual to stabilize daily life.",
      "You searched for meaning through disciplined inner practice.",
      "You treated small actions as morally or spiritually significant."
    ],
    notes: [
      "Your record suggests identity was built through repetition and belief.",
      "The archive points to a life structured by devotion, ethics, or reflection."
    ]
  }
];

const defaultInterpretation = {
  category: "unclassified",
  patterns: [
    "You adapted to changing roles without leaving a single clear identity.",
    "You moved between visibility and anonymity across different contexts.",
    "Your record is coherent in fragments, but incomplete as a whole."
  ],
  notes: [
    "The archive preserves evidence, but not the full continuity of the life.",
    "This reconstruction remains partial due to limited historical detail."
  ]
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const userName = String(formData.get("userName") || "").trim();
  const birthDate = String(formData.get("birthDate") || "").trim();

  if (!userName || !birthDate) {
    setStatus("Name and birth date are required.");
    return;
  }

  pendingFallbackContext = null;
  recordOutput.classList.add("hidden");
  recordOutput.innerHTML = "";
  retrieveBtn.disabled = true;

  try {
    await runLoadingSequence();

    const { month, day, year } = getDateParts(birthDate);
    const apiUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/deaths/${month}/${day}`;

    const deaths = await fetchDeaths(apiUrl);
    const archiveId = buildArchiveId(month, day, userName, year);
    const exactYearMatches = deaths.filter((person) => String(person?.year) === String(year));

    if (exactYearMatches.length === 0) {
      pendingFallbackContext = {
        archiveId,
        userName,
        deaths
      };
      renderNewSoulPrompt();
      return;
    }

    const person = pickRandom(exactYearMatches);
    renderPastLifeRecord({
      person,
      archiveId,
      userName,
      matchStatus: "PARTIAL",
      retrievalNote: "Exact date-year trace confirmed."
    });
  } catch (error) {
    setStatus(`Record retrieval failed: ${error.message}`);
  } finally {
    retrieveBtn.disabled = false;
  }
});

function getDateParts(dateString) {
  const [year, monthRaw, dayRaw] = dateString.split("-");
  return {
    year,
    month: monthRaw.padStart(2, "0"),
    day: dayRaw.padStart(2, "0")
  };
}

async function fetchDeaths(apiUrl) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Could not connect to the deaths archive API.");
  }

  const data = await response.json();
  const deaths = Array.isArray(data?.deaths) ? data.deaths : [];

  if (deaths.length === 0) {
    throw new Error("No historical traces found for this date.");
  }

  return deaths;
}

function getInterpretation(text) {
  const lowerText = text.toLowerCase();

  for (const entry of interpretationMap) {
    const hasMatch = entry.keywords.some((keyword) => lowerText.includes(keyword));
    if (hasMatch) {
      return entry;
    }
  }

  return defaultInterpretation;
}

function buildArchiveId(month, day, userName, year) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("")
    .slice(0, 2) || "XX";

  return `${month}.${day}-${initials}-${year}`;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickBySeed(items, seedText) {
  const seedNumber = stringToSeed(seedText);
  return items[seedNumber % items.length];
}

function stringToSeed(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function setStatus(message) {
  statusLog.textContent = message;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoadingSequence() {
  const steps = [
    "Searching historical records...",
    "Cross-referencing deaths archive...",
    "Partial match found..."
  ];

  statusLog.textContent = "";
  for (const step of steps) {
    statusLog.textContent += `${step}\n`;
    await wait(900);
  }
}

function renderPastLifeRecord({ person, archiveId, userName, matchStatus, retrievalNote }) {
  const personName = person?.text || person?.pages?.[0]?.normalizedtitle || "Unknown record";
  const personDescription =
    person?.pages?.[0]?.description ||
    person?.pages?.[0]?.extract ||
    "No clear occupation or description available.";

  const interpretation = getInterpretation(personDescription);
  const seed = `${personName}-${personDescription}`;
  const assignedPattern = pickBySeed(interpretation.patterns, seed);
  const assignedNote = pickBySeed(interpretation.notes, `${seed}-note`);

  renderRecord({
    archiveId,
    userName,
    matchStatus,
    retrievalNote,
    sourceName: personName,
    sourceDescription: personDescription,
    assignedName: personName,
    assignedOccupation: personDescription,
    assignedPattern,
    assignedNote
  });
}

function renderNewSoulPrompt() {
  recordOutput.innerHTML = `
    <p class="record-title">RECORD TYPE: PAST LIFE</p>
    <p class="record-title">MATCH STATUS: NO EXACT YEAR TRACE</p>
    <br />
    <p class="warning">No prior archive identity detected.</p>
    <p class="warning">You are a new soul. This appears to be your first recorded life.</p>
    <br />
    <button type="button" id="fallbackRetrieveBtn">Retrieve Nearest Trace (Same Month/Day)</button>
  `;
  recordOutput.classList.remove("hidden");

  const fallbackBtn = document.getElementById("fallbackRetrieveBtn");
  fallbackBtn.addEventListener("click", handleFallbackRetrieve, { once: true });
}

function handleFallbackRetrieve() {
  if (!pendingFallbackContext) {
    setStatus("Fallback retrieval context was lost. Please run retrieval again.");
    return;
  }

  const fallbackPerson = pickRandom(pendingFallbackContext.deaths);
  renderPastLifeRecord({
    person: fallbackPerson,
    archiveId: pendingFallbackContext.archiveId,
    userName: pendingFallbackContext.userName,
    matchStatus: "PARTIAL - FALLBACK TRACE",
    retrievalNote:
      "No exact year match found. Nearest trace retrieved from the same month/day archive."
  });
  pendingFallbackContext = null;
}

async function renderRecord(record) {
  const lines = [
    { className: "record-title", html: "RECORD TYPE: PAST LIFE" },
    { className: "record-title", html: `MATCH STATUS: ${escapeHtml(record.matchStatus)}` },
    { spacer: true },
    { html: `<span class="label">ARCHIVE ID:</span> ${escapeHtml(record.archiveId)}` },
    { html: `<span class="label">User:</span> ${escapeHtml(record.userName)}` },
    { html: `<span class="label">Retrieval Note:</span> ${escapeHtml(record.retrievalNote)}` },
    { spacer: true },
    { html: "<span class=\"label\">Source Trace:</span>" },
    { html: escapeHtml(record.sourceName) },
    { html: escapeHtml(record.sourceDescription) },
    { spacer: true },
    { html: "<span class=\"label\">Assigned Past Life:</span>" },
    { html: `<span class="label">Name:</span> ${escapeHtml(record.assignedName)}` },
    { html: `<span class="label">Occupation:</span> ${escapeHtml(record.assignedOccupation)}` },
    { spacer: true },
    { html: "<span class=\"label\">Behavioral Pattern:</span>" },
    { html: escapeHtml(record.assignedPattern) },
    { spacer: true },
    { html: "<span class=\"label\">Final Archive Note:</span>" },
    { html: escapeHtml(record.assignedNote) },
    { className: "warning", html: "This record may not be complete." }
  ];

  recordOutput.innerHTML = "";
  recordOutput.classList.remove("hidden");
  await writeRecordLines(lines);
}

async function writeRecordLines(lines) {
  for (const line of lines) {
    if (line.spacer) {
      const spacer = document.createElement("p");
      spacer.innerHTML = "&nbsp;";
      recordOutput.append(spacer);
      await wait(60);
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.className = `writing-line ${line.className || ""}`.trim();
    paragraph.innerHTML = line.html;
    recordOutput.append(paragraph);
    await wait(130);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
