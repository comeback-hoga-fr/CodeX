// admin.js - simple admin UI (no auth)
const evForm = document.getElementById("eventForm");
const scheduledList = document.getElementById("scheduledList");
const activeEventArea = document.getElementById("activeEventArea");
const submissionsArea = document.getElementById("submissionsArea");
const subsTableBody = document.querySelector("#subsTable tbody");

async function loadScheduled(){
  const events = await window.codexApi.getEvents();
  scheduledList.innerHTML = "";
  events.forEach(ev=>{
    const li = document.createElement("li");
    li.className = "eventItem";
    li.innerHTML = `<div>
      <strong>${ev.name}</strong><div class="small">${ev.question}</div>
    </div>
    <div>
      <button class="btn startBtn" data-id="${ev.id}">Start</button>
      <button class="btn btn-outline editBtn" data-id="${ev.id}">Edit</button>
    </div>`;
    scheduledList.appendChild(li);
  });

  // wire up start buttons
  document.querySelectorAll(".startBtn").forEach(b=>{
    b.onclick = async (e)=>{
      const id = b.dataset.id;
      await window.codexApi.startEvent(id);
      await renderActive();
    };
  });
}

evForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = document.getElementById("evName").value.trim();
  const timeout = parseInt(document.getElementById("evTimeout").value,10);
  const question = document.getElementById("evQuestion").value.trim();
  await window.codexApi.addEvent({ name, timeout, question, status: "scheduled", createdAt: new Date().toISOString() });
  evForm.reset();
  alert("Event scheduled.");
  loadScheduled();
});

async function renderActive(){
  const active = await window.codexApi.getActiveEvent();
  if (!active) {
    activeEventArea.innerHTML = "<div class='small'>No active event</div>";
    submissionsArea.classList.add("hidden");
    return;
  }
  activeEventArea.innerHTML = `<strong>${active.name}</strong><div class="small">${active.question}</div><div class="small">Timeout: ${active.timeout}s</div>`;
  submissionsArea.classList.remove("hidden");
  const subs = await window.codexApi.getSubmissions(active.id);
  subsTableBody.innerHTML = "";
  subs.forEach(s=>{
    const tr = document.createElement("tr");
    const actions = document.createElement("td");
    const qualifyBtn = document.createElement("button");
    qualifyBtn.textContent = s.qualified===false? "Qualify": "Disqualify";
    qualifyBtn.className = "btn";
    qualifyBtn.onclick = async ()=>{
      await window.codexApi.toggleQualified(active.id, s._id, !(s.qualified===false));
      renderActive();
    };
    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View";
    viewBtn.className = "btn btn-outline";
    viewBtn.onclick = () => {
      const w = window.open("", "_blank", "width=700,height=500");
      w.document.body.style.background = "#0f0f10";
      w.document.body.style.color = "#fff";
      w.document.title = "Submission by " + s.name;
      const pre = w.document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.padding = "16px";
      pre.style.fontFamily = "monospace";
      pre.textContent = s.code;
      w.document.body.appendChild(pre);
    };

    actions.appendChild(qualifyBtn);
    actions.appendChild(viewBtn);

    tr.innerHTML = `<td>${s.name}</td><td class="small">${s.submittedAt}</td><td class="small">${s.qualified===false? "No":"Yes"}</td>`;
    tr.appendChild(actions);
    subsTableBody.appendChild(tr);
  });
}

async function initAdmin(){
  await loadScheduled();
  await renderActive();
  setInterval(renderActive, 4000);
}

setTimeout(initAdmin, 300);
