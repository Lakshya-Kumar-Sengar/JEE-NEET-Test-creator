// Retrieve previously stored questions (from page 1) from sessionStorage.
let questions = JSON.parse(sessionStorage.getItem("questions") || "{}");

function enableLazyLoading() {
    const lazyImages = document.querySelectorAll(".lazy-image");
  
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src.trim();
          img.onload = () => {
            img.classList.add("fade-in"); // Fade in image
            img.previousElementSibling.style.display = "none"; // Hide loader
          };
          observer.unobserve(img);
        }
      });
    }, { rootMargin: "100px", threshold: 0.1 });
  
    lazyImages.forEach((img) => {
      imageObserver.observe(img);
    });
  }
// Initialize test settings.
let testSettings = {
  testTime: 180,
  markingScheme: {
    single: { correct: 4, wrong: -1 },
    multi: { correct: 4, wrong: -1 },
    integer: { correct: 4, wrong: -1 }
  }
};

// Render questions in main content.
function renderQuestions() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = ""; // clear previous content
  
  const sections = ["maths", "physics", "chemistry", "biology"];
  
  sections.forEach(section => {
    if (questions[section] && questions[section].length > 0) {
      // Create a section container with a bigger heading.
      const sectionContainer = document.createElement("div");
      sectionContainer.className = "mb-8";
      sectionContainer.innerHTML = `<h2 class="text-5xl font-bold mb-8 mt-10 capitalize">${section}</h2>`;
      
      questions[section].forEach((q, idx) => {
        const qDiv = document.createElement("div");
        qDiv.className = "question-item mb-6 p-4 bg-gray-700 rounded";
        qDiv.dataset.id = q.id;
        
        // If datatype is not set, default to "single".
        if (!q.dataType) { q.dataType = "single"; }
        // For single and integer, we use property 'correctIndex'; for multi, use 'correctIndices' array.
        if(q.dataType === "single" || q.dataType === "integer") {
          if (q.correctIndex === undefined) q.correctIndex = null;
        } else if(q.dataType === "multi") {
          if (!q.correctIndices) q.correctIndices = [];
        }
        
        qDiv.innerHTML = `
          <h3 class="font-semibold mb-2">Q${idx + 1} (${section})</h3>
          
          <div class="image-container relative w-full h-[200px] mb-6 overflow-hidden"> <!-- Set fixed height -->
          <div class="image-loader absolute inset-0 flex justify-center items-center bg-gray-800">
            <div class="loader"></div> 
          </div>
          <img class="lazy-image opacity-0 w-full h-full object-cover" data-src="${q.imageData}" alt="Q${idx + 1}">
        </div>
          <div class="mb-2">
            <label class="block font-semibold">Data Type: 
              <select class="data-type-select bg-gray-600 text-gray-200 px-2 py-1 rounded">
                <option value="single" ${q.dataType === "single" ? "selected" : ""}>Single Correct</option>
                <option value="multi" ${q.dataType === "multi" ? "selected" : ""}>Multi Correct</option>
                <option value="integer" ${q.dataType === "integer" ? "selected" : ""}>Integer</option>
              </select>
            </label>
          </div>
          <div class="options-container mt-2"></div>
        `;
        sectionContainer.appendChild(qDiv);
        
        // Render the answer options for the question.
        renderOptionsForQuestion(qDiv, q.dataType, q);
        
        // Listen for changes in data type.
        qDiv.querySelector(".data-type-select").addEventListener("change", (e) => {
          q.dataType = e.target.value;
          // Reset the answer data.
          if(q.dataType === "single" || q.dataType === "integer"){
            q.correctIndex = null;
          } else if(q.dataType === "multi"){
            q.correctIndices = [];
          }
          renderOptionsForQuestion(qDiv, q.dataType, q);
          updateStartButtonState();
          updateQuestionsStore();
          calculateTotalMarks();
        });
      });
      mainContent.appendChild(sectionContainer);
    }
  });

  enableLazyLoading()
  
  calculateTotalMarks();
}

// Render answer options for a given question div.
function renderOptionsForQuestion(qDiv, dataType, questionObj) {
  const optionsContainer = qDiv.querySelector(".options-container");
  optionsContainer.innerHTML = ""; // clear previous inputs
  
  if (dataType === "single") {
    // Show 4 fixed options A, B, C, D with radio buttons.
    for (let i = 0; i < 4; i++) {
      const row = document.createElement("div");
      row.className = "flex items-center gap-2 mb-1";
      
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `single-${questionObj.id}`;
      radio.value = i;
      if (questionObj.correctIndex === i) {
        radio.checked = true;
      }
      radio.addEventListener("change", () => {
        questionObj.correctIndex = i;
        updateStartButtonState();
        updateQuestionsStore();
      });
      
      const label = document.createElement("span");
      label.textContent = String.fromCharCode(65 + i); // A, B, C, D
      
      row.appendChild(radio);
      row.appendChild(label);
      optionsContainer.appendChild(row);
    }
  } else if (dataType === "multi") {
    // Show 4 fixed options with checkboxes.
    for (let i = 0; i < 4; i++) {
      const row = document.createElement("div");
      row.className = "flex items-center gap-2 mb-1";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = i;
      if (questionObj.correctIndices && questionObj.correctIndices.includes(i)) {
        checkbox.checked = true;
      }
      checkbox.addEventListener("change", (e) => {
        if (!questionObj.correctIndices) questionObj.correctIndices = [];
        if (e.target.checked) {
          if (!questionObj.correctIndices.includes(i)) {
            questionObj.correctIndices.push(i);
          }
        } else {
          questionObj.correctIndices = questionObj.correctIndices.filter(index => index !== i);
        }
        updateStartButtonState();
        updateQuestionsStore();
      });
      
      const label = document.createElement("span");
      label.textContent = String.fromCharCode(65 + i);
      
      row.appendChild(checkbox);
      row.appendChild(label);
      optionsContainer.appendChild(row);
    }
  } else if (dataType === "integer") {
    // For integer type, show a single number input.
    const row = document.createElement("div");
    row.className = "flex items-center gap-2 mb-1";
    
    const label = document.createElement("label");
    label.textContent = "Answer:";
    
    const numInput = document.createElement("input");
    numInput.type = "number";
    numInput.placeholder = "Enter integer";
    numInput.className = "px-2 py-1 w-full text-gray-900 rounded";
    numInput.value = questionObj.integerAnswer || "";
    numInput.addEventListener("input", (e) => {
      questionObj.integerAnswer = e.target.value;
      updateStartButtonState();
      updateQuestionsStore();
    });
    
    row.appendChild(label);
    row.appendChild(numInput);
    optionsContainer.appendChild(row);
  }
}

// Save questions to sessionStorage.
function updateQuestionsStore() {
  sessionStorage.setItem("questions", JSON.stringify(questions));
}

// Validate that every question has a correct answer marked.
function validateAllQuestions() {
  let valid = true;
  const sections = ["maths", "physics", "chemistry", "biology"];
  sections.forEach(section => {
    if (questions[section]) {
      questions[section].forEach(q => {
        if (q.dataType === "single" || q.dataType === "integer") {
          if (q.correctIndex === null || q.correctIndex === undefined) {
            valid = false;
          }
        } else if (q.dataType === "multi") {
          if (!q.correctIndices || q.correctIndices.length === 0) {
            valid = false;
          }
        }
      });
    }
  });
  return valid;
}

// Update the state of the "Start Test" button.
function updateStartButtonState() {
  const startBtn = document.getElementById("start-test-btn");
  startBtn.disabled = !validateAllQuestions();
}

// Calculate the total maximum marks. For each question, add the "correct" mark
// based on its datatype. (Single and integer use their corresponding scheme; multi uses its own.)
function calculateTotalMarks() {
  let total = 0;
  const sections = ["maths", "physics", "chemistry", "biology"];
  sections.forEach(section => {
    if (questions[section]) {
      questions[section].forEach(q => {
        if (q.dataType === "single") {
          total += parseFloat(testSettings.markingScheme.single.correct) || 0;
        } else if (q.dataType === "multi") {
          total += parseFloat(testSettings.markingScheme.multi.correct) || 0;
        } else if (q.dataType === "integer") {
          total += parseFloat(testSettings.markingScheme.integer.correct) || 0;
        }
      });
    }
  });
  document.getElementById("total-marks-display").textContent = total;
}

// Setup test parameter event listeners.
function setupTestParameters() {
  document.getElementById("test-time").addEventListener("input", (e) => {
    testSettings.testTime = parseInt(e.target.value, 10) || 180;
  });
  
  document.getElementById("single-correct-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.single.correct = parseFloat(e.target.value) || 0;
    calculateTotalMarks();
  });
  document.getElementById("single-wrong-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.single.wrong = parseFloat(e.target.value) || 0;
  });
  
  document.getElementById("multi-correct-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.multi.correct = parseFloat(e.target.value) || 0;
    calculateTotalMarks();
  });
  document.getElementById("multi-wrong-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.multi.wrong = parseFloat(e.target.value) || 0;
  });
  
  document.getElementById("integer-correct-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.integer.correct = parseFloat(e.target.value) || 0;
    calculateTotalMarks();
  });
  document.getElementById("integer-wrong-mark").addEventListener("input", (e) => {
    testSettings.markingScheme.integer.wrong = parseFloat(e.target.value) || 0;
  });
}

// Handle the Start Test button click.
document.getElementById("start-test-btn").addEventListener("click", () => {
  if (!validateAllQuestions()) {
    alert("Please mark correct answers for all questions.");
    return;
  }
  // Save test settings.
  sessionStorage.setItem("testSettings", JSON.stringify(testSettings));
  alert("Test Started!\nAll settings saved.");
  // Navigate to test page (if applicable)...
  // window.location.href = "test.html";
});

// Handle Back button click.
document.getElementById("back-button").addEventListener("click", () => {
  window.history.back();
});

// On page load, render questions and set up parameters.
window.addEventListener("load", () => {
  if (!questions || Object.keys(questions).length === 0) {
    alert("No questions found. Please create your test questions first.");
    window.location.href = "index.html";
    return;
  }
  renderQuestions();
  setupTestParameters();
  updateStartButtonState();
  calculateTotalMarks();
});

// Validate that every question in each section has an answer mapped.
function validateAllQuestions() {
    let valid = true;
    // List all the sections that are in your test-settings.
    const sections = ["maths", "physics", "chemistry", "biology"]; // add more if needed
    sections.forEach((section) => {
      if (questions[section]) {
        questions[section].forEach((q) => {
          if (q.dataType === "single") {
            // For single correct and integer, correctIndex (or integerAnswer) should be defined.
            if (q.correctIndex === null) {
              valid = false;
            }
          } else if (q.dataType === "multi") {
            // For multi, there must be at least one selected index.
            if (!q.correctIndices || q.correctIndices.length === 0) {
              valid = false;
            }
          }
          else if (q.dataType == "integer"){
            if(q.currentIndex=== null ) {}
          }
        });
      } else {
        // If a section is missing, you could consider that as not valid.
        valid = false;
      }
    });
    return valid;
  }
  
  // Update the Start Test button's disabled status and visual appearance.
  function updateStartButtonState() {
    const startBtn = document.getElementById("start-test-btn");
    if (validateAllQuestions()) {
      startBtn.disabled = false;
      startBtn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      startBtn.disabled = true;
      startBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }
  
  // Bind the Start Test button click event.
  document.getElementById("start-test-btn").addEventListener("click", () => {
    if (!validateAllQuestions()) {
      alert("Please map all correct answers for every question before starting the test.");
      return;
    }
    // Save your test settings (if any additional settings are present)
    sessionStorage.setItem("testSettings", JSON.stringify(testSettings));
    // Proceed to test page.
    window.location.href = "test.html";
  });
  
  // On page load or whenever fields change, update the button state.
  window.addEventListener("load", updateStartButtonState);