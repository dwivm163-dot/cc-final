const form = document.getElementById("archive-form");
const statusLog = document.getElementById("statusLog");
const recordOutput = document.getElementById("recordOutput");
const retrieveBtn = document.getElementById("retrieveBtn");

const interpretationMap = [
  {
    keywords: ["writer", "poet", "author", "artist", "composer", "painter"],
    category: "art/literature",
    patterns: [
      "Translated emotion into form.",
      "Returned often to the same unfinished themes.",
      "Was remembered more through fragments than facts."
    ],
    notes: [
      "Left behind traces that outlived the body.",
      "Repeated beauty until it became ritual."
    ]
  },
  {
    keywords: ["politician", "ruler", "king", "queen", "emperor", "president", "minister"],
    category: "power/politics",
    patterns: [
      "Lived close to systems of power.",
      "Learned to move carefully around authority.",
      "Mistook structure for safety."
    ],
    notes: [
      "Witnessed power change hands.",
      "Served structures that did not last."
    ]
  },
  {
    keywords: ["scientist", "mathematician", "inventor", "engineer", "physician", "astronomer"],
    category: "science/discovery",
    patterns: [
      "Observed patterns others overlooked.",
      "Trusted precision more than intuition.",
      "Searched for order inside uncertainty."
    ],
    notes: [
      "Left behind work that was recognized out of time.",
      "Named what others could not yet see."
    ]
  },
  {
    keywords: ["soldier", "general", "commander", "war", "military"],
    category: "conflict",
    patterns: [
      "Moved often and never fully settled.",
      "Stayed alert even in moments of calm.",
      "Followed orders while carrying doubt."
    ],
    notes: [
      "Returned changed beyond recognition.",
      "Left before peace arrived."
    ]
  },
  {
    keywords: ["saint", "monk", "priest", "religious", "philosopher", "spiritual"],
    category: "ritual/belief",
    patterns: [
      "Found meaning through repetition and ritual.",
      "Moved through life according to invisible structures.",
      "Attached significance to small gestures."
    ],
    notes: [
      "Returned daily to the same sacred actions.",
      "Believed devotion could shape reality."
    ]
  }
];

const defaultInterpretation = {
  category: "unclassified",
  patterns: [
    "Carried a pattern that resisted explanation.",
    "Lived between recognition and disappearance.",
    "Left behind a trace without a complete record."
  ],
  notes: [
    "The archive preserves only fragments.",
    "This identity could not be fully reconstructed."
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

  recordOutput.classList.add("hidden");
  recordOutput.innerHTML = "";
  retrieveBtn.disabled = true;

  try {
    await runLoadingSequence();

    const { month, day, year } = getDateParts(birthDate);
    const apiUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/deaths/${month}/${day}`;

    const person = await fetchRandomPerson(apiUrl);
    const personName = person?.text || person?.pages?.[0]?.normalizedtitle || "Unknown record";
    const personDescription =
      person?.pages?.[0]?.description ||
      person?.pages?.[0]?.extract ||
      "No clear occupation or description available.";

    const interpretation = getInterpretation(personDescription);
    const assignedPattern = pickRandom(interpretation.patterns);
    const assignedNote = pickRandom(interpretation.notes);
    const archiveId = buildArchiveId(month, day, userName, year);

    renderRecord({
      archiveId,
      userName,
      sourceName: personName,
      sourceDescription: personDescription,
      assignedName: personName,
      assignedOccupation: personDescription,
      assignedPattern,
      assignedNote
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

async function fetchRandomPerson(apiUrl) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Could not connect to the deaths archive API.");
  }

  const data = await response.json();
  const deaths = Array.isArray(data?.deaths) ? data.deaths : [];

  if (deaths.length === 0) {
    throw new Error("No historical traces found for this date.");
  }

  return pickRandom(deaths);
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

function renderRecord(record) {
  const html = `
    <p class="record-title">RECORD TYPE: PAST LIFE</p>
    <p class="record-title">MATCH STATUS: PARTIAL</p>
    <p class="record-title">SOURCE TRACE: WIKIPEDIA</p>
    <p class="record-title">CONFIDENCE: UNSTABLE</p>
    <br />
    <p><span class="label">ARCHIVE ID:</span> ${escapeHtml(record.archiveId)}</p>
    <p><span class="label">User:</span> ${escapeHtml(record.userName)}</p>
    <br />
    <p><span class="label">Source Trace:</span></p>
    <p>${escapeHtml(record.sourceName)}</p>
    <p>${escapeHtml(record.sourceDescription)}</p>
    <br />
    <p><span class="label">Assigned Past Life:</span></p>
    <p><span class="label">Name:</span> ${escapeHtml(record.assignedName)}</p>
    <p><span class="label">Occupation:</span> ${escapeHtml(record.assignedOccupation)}</p>
    <br />
    <p><span class="label">Behavioral Pattern:</span></p>
    <p>${escapeHtml(record.assignedPattern)}</p>
    <br />
    <p><span class="label">Final Archive Note:</span></p>
    <p>${escapeHtml(record.assignedNote)}</p>
    <p class="warning">This record may not be complete.</p>
  `;

  recordOutput.innerHTML = html;
  recordOutput.classList.remove("hidden");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
