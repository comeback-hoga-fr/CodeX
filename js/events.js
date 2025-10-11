// events.js - controls participant-side behavior
// This file expects firebase.js to be loaded as a module before it runs.
const timerEl = document.getElementById("timer");
const eventNameEl = document.getElementById("eventName");
const questionEl = document.getElementById("question");
const submitBtn = document.getElementById("submitBtn");
const leaderboard = document.getElementById("leaderboard");
const leaderboardList = document.getElementById("leaderboardList");

let countdownInterval;
let localTimeLeft = 0;
let activeEventId = null;

// Wait until firebase module has initialized
async function init() {
  // get active event from Firebase
  const ev = await window.codexApi.getActiveEvent();
  if (!ev) {
    eventNameEl.textContent = "Current Event: No active event right now.";
    questionEl.textContent = "Please check upcoming events.";
    timerEl.textContent = "--:--";
    submitBtn.disabled = true;
    return;
  }

  activeEventId = ev.id;
  eventNameEl.textContent = `Current Event: ${ev.name}`;
  questionEl.textContent = `Question: ${ev.question}`;
  localTimeLeft = ev.timeout || 600;

  startLocalTimer(localTimeLeft);

  // show leaderboard initially
  refreshLeaderboard();
  // set up real-time-ish refresh every 5s
  setInterval(refreshLeaderboard, 5000);
}

function startLocalTimer(seconds) {
  clearInterval(countdownInterval);
  let t = seconds;
  updateTimerDisplay(t);
  countdownInterval = setInterval(() => {
    t--;
    if (t < 0) {
      clearInterval(countdownInterval);
      timerEl.textContent = "00:00";
      submitBtn.disabled = true;
    } else {
      updateTimerDisplay(t);
    }
  }, 1000);
}

function updateTimerDisplay(t) {
  const m = Math.floor(t/60);
  const s = t%60;
  timerEl.textContent = `${m}:${s<10? "0"+s : s}`;
}

submitBtn.addEventListener("click", async () => {
  const code = prompt("Paste your solution code here:");
  if (!code || !code.trim()) return alert("Submission cancelled.");
  const name = prompt("Enter your name (how you'd like to appear on leaderboard):");
  if (!name || !name.trim()) return alert("Submission cancelled.");

  try {
    await window.codexApi.addSubmission(activeEventId, { name, code, submittedAt: new Date().toISOString(), qualified: true });
    alert("Code submitted! Good luck ✨");
    // animate timer: shrink text (simple effect)
    timerEl.style.transform = "translateY(-6px) scale(0.9)";
    setTimeout(()=> timerEl.style.transform = "", 800);
    refreshLeaderboard();
    leaderboard.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Submission failed. Open console for details.");
  }
});

async function refreshLeaderboard(){
  if (!activeEventId) return;
  const subs = await window.codexApi.getSubmissions(activeEventId);
  // sort by submittedAt ascending (first two winners)
  subs.sort((a,b)=> new Date(a.submittedAt) - new Date(b.submittedAt));
  leaderboardList.innerHTML = "";
  subs.forEach((s, idx)=>{
    const li = document.createElement("li");
    li.textContent = `${idx+1}. ${s.name} ${s.qualified===false? "(disqualified)": ""}`;
    leaderboardList.appendChild(li);
  });
}

// initialize after small delay to allow firebase module to export
setTimeout(init, 300);
