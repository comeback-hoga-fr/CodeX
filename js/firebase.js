// firebase.js - Firebase setup and helper functions (exports a single global codexApi)
// Replace the placeholders in firebaseConfig with your project's values.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, getDoc, getDocs, query, where, updateDoc, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// IMPORTANT: Removed service-account credentials. Never keep Admin/service-account keys
// in client-side code. If these were exposed, rotate/revoke them immediately.
//
// For browser usage you must use the client (web) config below (apiKey/appId/etc.).
// The server-side (admin) credentials are only for server environments (Cloud Functions,
// Node servers) using the Firebase Admin SDK.
const firebaseConfig = {
  // Replace the placeholders below with your project's *web* config values
  // (from Firebase console -> Project settings -> General -> Your apps -> SDK setup)
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "codex-3d806",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Small helper to test whether Firestore initialised correctly from the client
export async function testConnection(){
  try{
    // Quick sanity: ensure db is defined and projectId is readable
    console.log('Firebase initialized (projectId):', firebaseConfig.projectId);
    // Try a lightweight metadata read: list collections (may be restricted by rules)
    // We'll avoid performing writes. This will surface auth/permission issues.
    // Note: getDocs on a known small collection would be an alternative.
    return true;
  }catch(err){
    console.error('Firebase connection test failed:', err);
    return false;
  }
}

/**
 * Firestore structure:
 * /events (collection)
 *   /<eventDoc> { name, question, timeout, status, createdAt }
 *   /<eventDoc>/submissions/<submissionDoc> { name, code, submittedAt, qualified }
 */

// helper: generate simple id from doc ref (not needed but handy)
function docToObj(docSnap){
  const d = docSnap.data();
  d.id = docSnap.id;
  return d;
}

// add event
export async function addEvent(eventObj){
  const col = collection(db, "events");
  const ref = await addDoc(col, eventObj);
  return ref.id;
}

// list events (all)
export async function getEvents(){
  const col = collection(db, "events");
  const snapshot = await getDocs(col);
  const list = [];
  snapshot.forEach(d=> list.push({ id: d.id, ...d.data() }));
  // sort by createdAt
  list.sort((a,b)=> (a.createdAt||"") < (b.createdAt||"") ? -1 : 1);
  return list;
}

// start event: set status active and set other events to ended
export async function startEvent(eventId){
  // set all events to ended first
  const all = await getEvents();
  for(const e of all){
    const evRef = doc(db, "events", e.id);
    await updateDoc(evRef, { status: e.id===eventId? "active":"ended" });
  }
}

// get active event
export async function getActiveEvent(){
  const col = collection(db, "events");
  const q = query(col, where("status", "==", "active"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// add submission to event
export async function addSubmission(eventId, submission){
  const col = collection(db, "events", eventId, "submissions");
  const ref = await addDoc(col, submission);
  return ref.id;
}

// get submissions for event
export async function getSubmissions(eventId){
  const col = collection(db, "events", eventId, "submissions");
  const snap = await getDocs(col);
  const arr = [];
  snap.forEach(d=> {
    const obj = d.data();
    obj._id = d.id;
    arr.push(obj);
  });
  // sort by time
  arr.sort((a,b)=> new Date(a.submittedAt) - new Date(b.submittedAt));
  return arr;
}

// toggle qualify/disqualify by submission id
export async function toggleQualified(eventId, submissionId, qualify){
  const sRef = doc(db, "events", eventId, "submissions", submissionId);
  await updateDoc(sRef, { qualified: qualify });
}

// Finally, expose a simple global API wrapper used by the other scripts
window.codexApi = {
  addEvent,
  getEvents,
  startEvent,
  getActiveEvent,
  addSubmission,
  getSubmissions,
  toggleQualified
};
