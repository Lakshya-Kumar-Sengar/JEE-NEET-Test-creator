"use strict";

// Retrieve test questions and settings from sessionStorage.
let testData = JSON.parse(sessionStorage.getItem("questions") || "{}");
let testSettings = JSON.parse(sessionStorage.getItem("testSettings") || '{"testTime":180}');
let totalTestTime = (testSettings.testTime || 180) * 60; // in seconds

// Global storage for user answers (structure: { section: [answers...] }).
let userAnswers = JSON.parse(sessionStorage.getItem("userAnswers") || "{}");

// Global storage for visited flags (structure: { section: [true/false, ...] }).
let visited = JSON.parse(sessionStorage.getItem("visited") || "{}");

// Global variables for current section and question index.
let currentSection = null;
let currentQuestionIndex = 0;

// Timer variables.
let timerInterval = null;
// Use sessionStorage to persist the test end time.
let testEndTime = sessionStorage.getItem("testEndTime");
if (!testEndTime) {
  testEndTime = Date.now() + totalTestTime * 1000; // end time timestamp (ms)
  sessionStorage.setItem("testEndTime", testEndTime);
} else {
  testEndTime = parseInt(testEndTime);
}

// When DOM loads:
document.addEventListener("DOMContentLoaded", () => {
  // Request full screen.
  requestFullScreen();
  // Listen for fullscreen change events to update the toggle button.
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  
  setupSectionButtons();
  let defaultSection = getDefaultSection();
  selectSection(defaultSection);
  startTimer();
  
  // Bind button events.
  document.getElementById("fullscreenToggle").addEventListener("click", toggleFullScreen);
  document.getElementById("saveNextBtn").addEventListener("click", saveAndNext);
  document.getElementById("submitTestBtn").addEventListener("click", submitTest);
});

// Fullscreen functions.
function requestFullScreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
}
function exitFullScreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}
function toggleFullScreen() {
  if (document.fullscreenElement) {
    exitFullScreen();
  } else {
    requestFullScreen();
  }
}
function updateFullscreenButton() {
  const btn = document.getElementById("fullscreenToggle");
  btn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Enter Fullscreen";
}

// Timer: uses persisted testEndTime so that refresh does not reset the timer.
function startTimer() {
  const timerEl = document.getElementById("timer");
  function updateDisplay() {
    let timeLeft = Math.floor((testEndTime - Date.now()) / 1000);
    if (timeLeft < 0) { timeLeft = 0; }
    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;
    timerEl.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    // Turn the timer red when 15 minutes or less remain; add pulse effect when < 10 minutes.
    if (timeLeft <= 15 * 60) {
      timerEl.classList.add("text-red-500");
      if (timeLeft <= 10 * 60) {
        timerEl.classList.add("animate-pulse");
      } else {
        timerEl.classList.remove("animate-pulse");
      }
    } else {
      timerEl.classList.remove("text-red-500");
      timerEl.classList.remove("animate-pulse");
    }
  }
  updateDisplay();
  timerInterval = setInterval(() => {
    updateDisplay();
    if ((testEndTime - Date.now()) <= 0) {
      clearInterval(timerInterval);
      alert("Time is up!");
      submitTest();
    }
  }, 1000);
}

// Default section: choose the one with the most questions, or physics if tied.
function getDefaultSection() {
  let candidate = "";
  let maxCount = 0;
  Object.keys(testData).forEach(section => {
    let count = testData[section].length || 0;
    if (count > maxCount) {
      maxCount = count;
      candidate = section;
    } else if (count === maxCount && section.toLowerCase() === "physics") {
      candidate = section;
    }
  });
  return candidate || Object.keys(testData)[0] || "unknown";
}

// Setup section buttons (always show all sections).
function setupSectionButtons() {
  const container = document.getElementById("sectionButtons");
  container.innerHTML = "";
  Object.keys(testData).forEach(section => {
    const btn = document.createElement("button");
    btn.textContent = section.toUpperCase();
    btn.dataset.section = section;
    btn.className = "transition-colors";
    btn.addEventListener("click", () => selectSection(section));
    container.appendChild(btn);
  });
  updateActiveSectionButton();
}

// Update active section’s button style.
function updateActiveSectionButton() {
  const buttons = document.querySelectorAll("#sectionButtons button");
  buttons.forEach(btn => {
    if (btn.dataset.section === currentSection) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// When a section is selected, update globals and load its first question.
function selectSection(section) {
  currentSection = section;
  currentQuestionIndex = 0;
  if (!visited[currentSection]) {
    visited[currentSection] = new Array((testData[currentSection] || []).length).fill(false);
  }
  if (!userAnswers[currentSection]) {
    userAnswers[currentSection] = new Array((testData[currentSection] || []).length).fill(null);
  }
  updateActiveSectionButton();
  animateContent(() => {
    loadQuestion();
    updateSidebar();
    persistState();
  });
}

// Save state (visited and userAnswers) to sessionStorage.
function persistState() {
  sessionStorage.setItem("visited", JSON.stringify(visited));
  sessionStorage.setItem("userAnswers", JSON.stringify(userAnswers));
}

// Animate content transitions.
function animateContent(callback) {
  const displayArea = document.getElementById("questionDisplay");
  displayArea.classList.remove("animate-fadeIn");
  void displayArea.offsetWidth; // force reflow
  displayArea.classList.add("animate-fadeIn");
  callback();
}

// Load the current question.
function loadQuestion() {
  const question = testData[currentSection][currentQuestionIndex];
  const qTitle = document.getElementById("questionTitle");
  qTitle.textContent = `Question ${currentQuestionIndex + 1} of ${testData[currentSection].length} (${currentSection.toUpperCase()})`;
  
  visited[currentSection][currentQuestionIndex] = true;
  persistState();
  
  const imageContainer = document.getElementById("questionImageContainer");
  imageContainer.innerHTML = "";
  if (question && question.imageData) {
    const img = document.createElement("img");
    img.src = question.imageData;
    img.alt = `Question ${currentQuestionIndex + 1}`;
    imageContainer.appendChild(img);
  } else {
    imageContainer.textContent = "No questions available in this section.";
  }
  
  const optionsContainer = document.getElementById("questionOptions");
  optionsContainer.innerHTML = "";
  if (!question) {
    optionsContainer.textContent = "No questions available.";
    return;
  }
  if (question.dataType === "single") {
    const form = document.createElement("form");
    form.id = "answerForm";
    for (let i = 0; i < 4; i++) {
      const div = document.createElement("div");
      div.className = "flex items-center space-x-4 mb-3";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "singleOption";
      radio.value = i;
      radio.className = "w-8 h-8";
      if (userAnswers[currentSection][currentQuestionIndex] === i) {
        radio.checked = true;
      }
      const label = document.createElement("label");
      label.textContent = String.fromCharCode(65 + i);
      label.className = "text-2xl";
      div.appendChild(radio);
      div.appendChild(label);
      form.appendChild(div);
    }
    optionsContainer.appendChild(form);
  } else if (question.dataType === "multi") {
    const form = document.createElement("form");
    form.id = "answerForm";
    for (let i = 0; i < 4; i++) {
      const div = document.createElement("div");
      div.className = "flex items-center space-x-4 mb-3";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = i;
      checkbox.className = "w-8 h-8";
      const saved = userAnswers[currentSection][currentQuestionIndex];
      if (saved && Array.isArray(saved) && saved.includes(i)) {
        checkbox.checked = true;
      }
      const label = document.createElement("label");
      label.textContent = String.fromCharCode(65 + i);
      label.className = "text-2xl";
      div.appendChild(checkbox);
      div.appendChild(label);
      form.appendChild(div);
    }
    optionsContainer.appendChild(form);
  } else if (question.dataType === "integer") {
    const input = document.createElement("input");
    input.type = "number";
    input.id = "integerInput";
    input.className = "px-4 py-3 rounded text-gray-900 text-2xl w-full";
    input.placeholder = "Enter your answer";
    if (userAnswers[currentSection][currentQuestionIndex] !== null) {
      input.value = userAnswers[currentSection][currentQuestionIndex];
    }
    optionsContainer.appendChild(input);
  }
}

// Save answer and move to the next question.
function saveAndNext() {
  const question = testData[currentSection][currentQuestionIndex];
  if (!question) return;
  let answer = null;
  if (question.dataType === "single") {
    const form = document.getElementById("answerForm");
    if (!form) return alert("Answer form not found.");
    const radios = form.elements["singleOption"];
    for (let radio of radios) {
      if (radio.checked) {
        answer = parseInt(radio.value);
        break;
      }
    }
  } else if (question.dataType === "multi") {
    const form = document.getElementById("answerForm");
    if (!form) return alert("Answer form not found.");
    answer = [];
    const checkboxes = form.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(chk => {
      if (chk.checked) {
        answer.push(parseInt(chk.value));
      }
    });
  } else if (question.dataType === "integer") {
    const input = document.getElementById("integerInput");
    if (!input) return alert("Answer input not found.");
    answer = input.value;
  }
  userAnswers[currentSection][currentQuestionIndex] = answer;
  persistState();
  updateSidebar();
  // Advance to next question if available.
  if (currentQuestionIndex < testData[currentSection].length - 1) {
    currentQuestionIndex++;
    animateContent(() => {
      loadQuestion();
      updateSidebar();
    });
  } else {
    alert("You have reached the end of this section!");
  }
}

// Update sidebar with question buttons.
function updateSidebar() {
  const questionListDiv = document.getElementById("questionList");
  questionListDiv.innerHTML = "";
  const questionsArr = testData[currentSection] || [];
  questionsArr.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.textContent = idx + 1;
    btn.className = "question-btn";
    const ans = userAnswers[currentSection][idx];
    if (visited[currentSection] && visited[currentSection][idx]) {
      if (ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
        btn.classList.add("visited-not-marked");
      } else {
        btn.classList.add("attempted");
      }
    } else {
      btn.classList.add("unvisited");
    }
    if (idx === currentQuestionIndex) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      currentQuestionIndex = idx;
      animateContent(loadQuestion);
      updateSidebar();
      persistState();
    });
    questionListDiv.appendChild(btn);
  });
}

// Submit test handler.

// Bind the submit button to this function (if not already bound)
document.getElementById("submitTestBtn").addEventListener("click", submitTest);

function submitTest() {
  if (!confirm("Are you sure you want to submit your test?")) return;
  
  // Optional: persist any remaining user answers.
  sessionStorage.setItem("userAnswers", JSON.stringify(userAnswers));
  
  // Redirect to the results page
  window.location.href = "results.html";
}
