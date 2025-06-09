"use strict";

// Retrieve stored data from sessionStorage.
const testData = JSON.parse(sessionStorage.getItem("questions") || "{}");
const userAnswers = JSON.parse(sessionStorage.getItem("userAnswers") || "{}");
const testSettings = JSON.parse(sessionStorage.getItem("testSettings") || '{}');

// --- MARKING LOGIC ---
//
// For single correct & integer:
//   - Correct answer → +4 marks
//   - Wrong answer → -1 mark
//   - Unattempted → 0 marks
//
// For multiple correct (unchanged):
//   - If the candidate’s selection exactly matches the correct set → +4 marks.
//   - Otherwise, if options are chosen, then calculate:
//          partial = (# correct options chosen) – (min(# wrong options chosen, 2))
//     (If the computed partial score is negative, use 0.)
//
// Note: All questions carry a maximum of 4 marks.
  
function computeSingleOrIntegerScore(q, userAns) {
  const total = 4;
  // If unattempted, nothing is added.
  if (userAns === null || userAns === "") return { score: 0, total };
  
  if (q.dataType === "single") {
    return (parseInt(userAns) === parseInt(q.correctIndex))
      ? { score: total, total }
      : { score: -1, total };
  } else { // For integer type.
    return (parseFloat(userAns) === parseFloat(q.integerAnswer))
      ? { score: total, total }
      : { score: -1, total };
  }
}

function computeMultiScore(q, userAns) {
  const total = 4;
  // If unattempted, score remains 0.
  if (!userAns || !Array.isArray(userAns) || userAns.length === 0) 
    return { score: 0, total };

  // If the selection exactly matches the correct set, award full marks.
  let sortedUser = [...userAns].sort().join(",");
  let sortedCorrect = [...q.correctIndices].sort().join(",");
  if (sortedUser === sortedCorrect) return { score: total, total };

  // Otherwise, compute partial marks.
  let correctCount = 0, wrongCount = 0;
  userAns.forEach(option => {
    if (q.correctIndices.includes(option)) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });
  let deduction = Math.min(wrongCount, 2); 
  let partialScore = correctCount - deduction;
  if (partialScore < 0) partialScore = 0;
  // Cap the partialScore to 4 (if necessary)
  if (partialScore > total) partialScore = total;
  return { score: partialScore, total };
}

function computeQuestionScore(q, userAns) {
  if (!q) return { score: 0, total: 0 };
  if (q.dataType === "single" || q.dataType === "integer") {
    return computeSingleOrIntegerScore(q, userAns);
  } else if (q.dataType === "multi") {
    return computeMultiScore(q, userAns);
  }
  return { score: 0, total: 0 };
}

// Compute overall and per‑subject results.
const subjectResults = {};
let overallObtained = 0, overallTotal = 0;

Object.keys(testData).forEach(subject => {
  const qList = testData[subject];
  if (!qList || qList.length === 0) return;
  
  let subjObtained = 0, subjTotal = 0;
  qList.forEach((q, idx) => {
    const userAns = (userAnswers[subject] || [])[idx];
    const { score, total } = computeQuestionScore(q, userAns);
    subjObtained += score;
    subjTotal += total;
  });
  overallObtained += subjObtained;
  overallTotal += subjTotal;
  subjectResults[subject] = { obtained: subjObtained, total: subjTotal };
});

// Update overall results in the DOM.
document.getElementById("overallResults").innerHTML = 
  `Marks Obtained: <span class="text-blue-400">${overallObtained}</span> out of <span class="text-blue-400">${overallTotal}</span>`;

// Define subject icons.
const subjectIcons = {
  maths: "📐",
  physics: "⚛️",
  chemistry: "🧪",
  biology: "🌿"
};

// Create subject blocks with bar graphs.
const subjectResultsContainer = document.getElementById("subjectResults");
subjectResultsContainer.innerHTML = "";
Object.keys(subjectResults).forEach(subject => {
  if (!(testData[subject] && testData[subject].length > 0)) return;
  
  const { obtained, total } = subjectResults[subject];
  const block = document.createElement("div");
  block.className = "subject-block animate-fade";
  
  const heading = document.createElement("h2");
  heading.innerHTML = `${subjectIcons[subject] || ""} ${subject.toUpperCase()}`;
  block.appendChild(heading);
  
  const resultText = document.createElement("p");
  resultText.textContent = `Marks: ${obtained} / ${total}`;
  block.appendChild(resultText);
  
  const canvas = document.createElement("canvas");
  canvas.id = `chart-${subject}`;
  block.appendChild(canvas);
  
  subjectResultsContainer.appendChild(block);
  
  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Obtained", "Remaining"],
      datasets: [{
        label: subject.toUpperCase(),
        data: [obtained, total - obtained],
        backgroundColor: ["rgba(22, 163, 74, 0.8)", "rgba(209, 213, 219, 0.8)"]
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
});

// Create detailed question results per subject.
const detailedResultsContainer = document.getElementById("detailedResults");
detailedResultsContainer.innerHTML = "";
Object.keys(testData).forEach(subject => {
  const qList = testData[subject];
  if (!qList || qList.length === 0) return;
  
  const sectionDiv = document.createElement("div");
  sectionDiv.className = "detailed-section animate-fade";
  
  const secHeading = document.createElement("h3");
  secHeading.innerHTML = `${subjectIcons[subject] || ""} ${subject.toUpperCase()} - Detailed Results`;
  sectionDiv.appendChild(secHeading);
  
  qList.forEach((q, idx) => {
    const userAns = (userAnswers[subject] || [])[idx];
    const { score, total } = computeQuestionScore(q, userAns);
    
    const card = document.createElement("div");
    card.className = "question-card text-center";
    
    // Display question number with marks obtained.
    const qNum = document.createElement("div");
    qNum.textContent = `Q${idx + 1} (Marks: ${score} / ${total})`;
    qNum.className = "font-bold";
    card.appendChild(qNum);
    
    // Display a large, centered image.
    if (q.imageData) {
      const img = document.createElement("img");
      img.src = q.imageData;
      img.alt = `Question ${idx + 1}`;
      img.style.width = "700px"; // Increase image size
      img.style.display = "block";
      img.style.margin = "20px auto";
      card.appendChild(img);
    }
    
    // Prepare texts for correct answer and candidate's answer.
    let correctText = "", userText = "", isCorrect = false;
    if (q.dataType === "single") {
      correctText = String.fromCharCode(65 + parseInt(q.correctIndex));
      if (userAns !== null && userAns !== "") {
        userText = String.fromCharCode(65 + parseInt(userAns));
        isCorrect = (parseInt(userAns) === parseInt(q.correctIndex));
      } else {
        userText = "Not Attempted";
      }
    } else if (q.dataType === "integer") {
      correctText = q.integerAnswer;
      if (userAns !== null && userAns !== "") {
        userText = userAns;
        isCorrect = (parseFloat(userAns) === parseFloat(q.integerAnswer));
      } else {
        userText = "Not Attempted";
      }
    } else if (q.dataType === "multi") {
      correctText = q.correctIndices.map(i => String.fromCharCode(65 + parseInt(i))).join(", ");
      if (userAns && Array.isArray(userAns) && userAns.length > 0) {
        userText = userAns.map(i => String.fromCharCode(65 + parseInt(i))).join(", ");
        let sortedUser = [...userAns].sort().join(",");
        let sortedCorrect = [...q.correctIndices].sort().join(",");
        isCorrect = (sortedUser === sortedCorrect);
      } else {
        userText = "Not Attempted";
      }
    }
    
    const correctDiv = document.createElement("div");
    correctDiv.innerHTML = `<strong>Correct Answer:</strong> ${correctText}`;
    
    const userDiv = document.createElement("div");
    userDiv.innerHTML = `<strong>Your Answer:</strong> ${userText}`;
    userDiv.className = isCorrect ? "result-correct" : "result-wrong";
    
    const iconSpan = document.createElement("span");
    iconSpan.textContent = isCorrect ? "✅" : "❌";
    
    card.appendChild(correctDiv);
    card.appendChild(userDiv);
    card.appendChild(iconSpan);
    
    sectionDiv.appendChild(card);
  });
  
  detailedResultsContainer.appendChild(sectionDiv);
});
