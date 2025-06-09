// Set up PDF.js worker using the CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

// Global variables
let pdfDoc = null;
let questions = {
  maths: [],
  physics: [],
  chemistry: [],
  biology: []
};

// DOM elements
const pdfUpload = document.getElementById("pdf-upload");
const pdfViewer = document.getElementById("pdf-viewer");
const sectionSelect = document.getElementById("section-select");
const pdfLoader = document.getElementById("pdf-loader");

// --- PDF Upload & Initialization ---
pdfUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file && file.type === "application/pdf") {
 
    const url = URL.createObjectURL(file);
    initPDF(url);
  } else {
    alert("Please upload a valid PDF file.");
  }
});

function initPDF(url) {
  // Clear previous content & show loader
  pdfViewer.innerHTML = "";


  if (!document.querySelector(".selection-box")) {
    selectionBox = document.createElement("div");
    selectionBox.className = "selection-box";
    document.body.appendChild(selectionBox); 
  }

  pdfViewer.appendChild(pdfLoader);
  pdfLoader.style.display = "flex";

  pdfjsLib.getDocument(url).promise.then((pdf) => {
    pdfDoc = pdf;

    // Create a placeholder for each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pageContainer = document.createElement("div");
      pageContainer.className = "pdf-page";
      pageContainer.dataset.page = pageNum;
      pageContainer.dataset.rendered = "false";
      pdfViewer.appendChild(pageContainer);
    }
    setupLazyLoading();
  }).catch((err) => {
    pdfLoader.innerText = "Failed to load PDF.";
    console.error(err);
  });
}

// --- Lazy Loading with Intersection Observer ---
function setupLazyLoading() {
  const options = { root: pdfViewer, threshold: 0.1 };
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target.dataset.rendered === "false") {
        const pageNum = parseInt(entry.target.dataset.page);
       
        renderPage(pageNum, entry.target);
        entry.target.dataset.rendered = "true";
        obs.unobserve(entry.target);
      }
    });
  }, options);

  document.querySelectorAll(".pdf-page").forEach((page) => {
    observer.observe(page);
  });
}

// Render PDF page scaled to fit the viewer.
function renderPage(pageNum, container) {
  pdfDoc.getPage(pageNum).then((page) => {
    const style = getComputedStyle(pdfViewer);
    const paddingX = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
    const desiredWidth = pdfViewer.clientWidth - paddingX;
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = desiredWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: scale });

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page-canvas shadow-lg mx-auto block";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
      container.appendChild(canvas);
      if (pageNum === 1) {
        pdfLoader.style.display = "none";
      }
    
    });
  });
}

function updateNextButtonState() {
  const nextBtn = document.getElementById("next-settings-btn");
  // Retrieve questions from sessionStorage (or use the global questions variable)
  const qs = JSON.parse(sessionStorage.getItem("questions") || "{}");
  let count = 0;
  for (let section in qs) {
    if (qs[section] && qs[section].length > 0) {
      count += qs[section].length;
    }
  }
  nextBtn.disabled = count === 0;
}

/* --- Screenshot Selection with Visual Feedback --- */
let isDragging = false;
let currentCanvas = null;
let startX_global = 0, startY_global = 0;
let startX_canvas = 0, startY_canvas = 0;
let containerRect = null;
let selectionBox = document.createElement("div");
selectionBox.className = "selection-box";
pdfViewer.appendChild(selectionBox);


// Begin selection on mousedown over a canvas
pdfViewer.addEventListener("mousedown", (e) => {
  if (e.target.tagName.toLowerCase() !== "canvas") return;

  currentCanvas = e.target;
  containerRect = pdfViewer.getBoundingClientRect();
  const canvasRect = currentCanvas.getBoundingClientRect();
  
  // Fix mouse position offset by using canvas-relative positioning
  startX_global = e.clientX - containerRect.left;
  startY_global = e.clientY - containerRect.top ;
  
  startX_canvas = e.clientX - canvasRect.left;
  startY_canvas = e.clientY - canvasRect.top ;
  
  isDragging = true;
  selectionBox.style.display = "block";
  selectionBox.style.opacity = 1
});

// Update selection box during mousemove
pdfViewer.addEventListener("mousemove", (e) => {
  if (!isDragging || !currentCanvas) return;
  const canvasRect = currentCanvas.getBoundingClientRect();
  
  // Correct box placement using canvas-relative coordinates
  const currentX_canvas = e.clientX - canvasRect.left;
  const currentY_canvas = e.clientY - canvasRect.top;
  
  const rectX = Math.min(startX_canvas, currentX_canvas);
  const rectY = Math.min(startY_canvas, currentY_canvas);
  
  const rectWidth = Math.abs(currentX_canvas - startX_canvas);
  const rectHeight = Math.abs(currentY_canvas - startY_canvas);

  selectionBox.style.left = `${rectX + canvasRect.left - containerRect.left}px`;
  selectionBox.style.top = `${(rectY + canvasRect.top - containerRect.top) + 87}px`;
  selectionBox.style.width = `${rectWidth}px`;
  selectionBox.style.height = `${rectHeight}px`;
});

// On mouseup, capture the selected area & hide selection box
pdfViewer.addEventListener("mouseup", (e) => {
  if (!isDragging || !currentCanvas) return;
  isDragging = false;
  selectionBox.style.display = "none";

  const canvasRect = currentCanvas.getBoundingClientRect();
  const canvas_startX = startX_canvas;
  const canvas_startY = startY_canvas;
  const canvas_endX = e.clientX - canvasRect.left;
  const canvas_endY = e.clientY - canvasRect.top;
  const sel_x = Math.min(canvas_startX, canvas_endX);
  const sel_y = Math.min(canvas_startY, canvas_endY);
  const sel_width = Math.abs(canvas_endX - canvas_startX);
  const sel_height = Math.abs(canvas_endY - canvas_startY);
  if (sel_width > 20 && sel_height > 20) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sel_width;
    tempCanvas.height = sel_height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(
      currentCanvas,
      sel_x,
      sel_y,
      sel_width,
      sel_height,
      0,
      0,
      sel_width,
      sel_height
    );
    const imageData = tempCanvas.toDataURL("image/png");
    addQuestion(imageData);

    updateNextButtonState(); 
  }
});

window.addEventListener("load", () => {
  updateNextButtonState();
});

document.getElementById("next-settings-btn").addEventListener("click", () => {
  // Validate again (optional)
  if (!validateQuestionsExist()) {
    // This function is optional; updateNextButtonState already ensures the button is disabled if not.
    alert("Please capture at least one screenshot before continuing.");
    return;
  }
  // Navigate to test settings page:
  window.location.href = "test_settings.html";
});

// Optional helper to validate that questions exist.
function validateQuestionsExist() {
  const qs = JSON.parse(sessionStorage.getItem("questions") || "{}");
  for (let section in qs) {
    if (qs[section] && qs[section].length > 0) {
      return true;
    }
  }
  return false;
}

/* --- Question Management & Sidebar Interactivity --- */
function addQuestion(imageData) {
  const section = sectionSelect.value;
  const questionNumber = questions[section].length + 1;
  let page = currentCanvas && currentCanvas.parentElement
    ? currentCanvas.parentElement.dataset.page
    : null;
  const newQuestion = {
    id: Date.now(),
    label: "Q" + questionNumber,
    imageData,
    section,
    page
  };
  questions[section].push(newQuestion);
  saveQuestions();
  renderQuestions();
}

function renderQuestions() {
  const sections = ["maths", "physics", "chemistry", "biology"];
  sections.forEach((section) => {
    const container = document.getElementById("questions-" + section);
    container.innerHTML = "";
    questions[section].forEach((question, index) => {
      question.label = "Q" + (index + 1);
      const questionDiv = document.createElement("div");
      questionDiv.className =
        "question-item bg-gray-700 p-4 rounded relative cursor-pointer";
      questionDiv.dataset.page = question.page;
      questionDiv.innerHTML = `
        <h3 class="text-lg font-semibold">${question.label}</h3>
        <img src="${question.imageData}" alt="${question.label}" class="mt-2 border border-gray-600">
        <button class="remove-btn absolute top-2 right-2 text-xl" data-id="${question.id}">&times;</button>
      `;
      questionDiv.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-btn")) return;
        if (question.page) scrollToPage(question.page);
      });
      gsap.from(questionDiv, { duration: 0.5, opacity: 0, y: 20 });
      container.appendChild(questionDiv);
    });
  });
}

function scrollToPage(page) {
  const targetElem = document.querySelector(`.pdf-page[data-page="${page}"]`);
  if (targetElem) {
    targetElem.scrollIntoView({ behavior: "smooth", block: "center" });
    gsap.fromTo(
      targetElem,
      { backgroundColor: "#2c2c2c" },
      { backgroundColor: "#444", duration: 0.5, yoyo: true, repeat: 1 }
    );
  }
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const id = parseInt(e.target.getAttribute("data-id"));
    removeQuestion(id);
  }
});

function removeQuestion(id) {
  for (let section in questions) {
    questions[section] = questions[section].filter((q) => q.id !== id);
  }
  saveQuestions();
  renderQuestions();
}

function saveQuestions() {
  sessionStorage.setItem("questions", JSON.stringify(questions));
}

function loadQuestions() {
  const stored = sessionStorage.getItem("questions");
  if (stored) {
    questions = JSON.parse(stored);
    renderQuestions();
  }
}

window.addEventListener("load", loadQuestions);
