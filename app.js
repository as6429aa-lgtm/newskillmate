import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, arrayUnion, serverTimestamp, query, orderBy, onSnapshot, getDoc, where } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAanV8gZP1Q5QElOJ1QxYZFCPTh-YkR6Is",
  authDomain: "skillmate-demo-2ac2f.firebaseapp.com",
  projectId: "skillmate-demo-2ac2f",
  storageBucket: "skillmate-demo-2ac2f.firebasestorage.app",
  messagingSenderId: "1054887771550",
  appId: "1:1054887771550:web:ef576451eb441eee8f2a8f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentUserDocId = null;
let mainMap = null, mainMarkers = [];
let formMap = null, formMarker = null;
let userLocation = { lat: 26.7855, lng: 80.9139 };
let currentChatCircleId = null, currentChatUnsubscribe = null;

// ============ MAPS ============
function initMaps() {
  mainMap = L.map('map').setView([userLocation.lat, userLocation.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(mainMap);

  const userIcon = L.divIcon({
    className: 'user-marker',
    html: '<div style="background:#2D4A3E;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
  L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
    .addTo(mainMap).bindPopup('<b>You are here</b><br>BBDNITM, Lucknow');

  formMap = L.map('formMap').setView([userLocation.lat, userLocation.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(formMap);

  const circleIcon = L.divIcon({
    className: 'circle-marker',
    html: '<div style="background:#2D4A3E;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:move;"></div>',
    iconSize: [24, 24], iconAnchor: [12, 12]
  });
  formMarker = L.marker([userLocation.lat, userLocation.lng], {
    icon: circleIcon, draggable: true
  }).addTo(formMap);

  formMarker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    document.getElementById("circleLat").value = pos.lat;
    document.getElementById("circleLng").value = pos.lng;
  });

  document.getElementById("circleLat").value = userLocation.lat;
  document.getElementById("circleLng").value = userLocation.lng;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      mainMap.setView([userLocation.lat, userLocation.lng], 12);
      formMap.setView([userLocation.lat, userLocation.lng], 13);
      formMarker.setLatLng([userLocation.lat, userLocation.lng]);
    });
  }

  loadCircles();
  loadMapCircles();
}
window.addEventListener('load', () => setTimeout(initMaps, 300));

// ============ AUTH ============
document.getElementById("loginBtn").onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const q = query(collection(db, "users"), where("email", "==", result.user.email));
    const existing = await getDocs(q);
    if (existing.empty) {
      await addDoc(collection(db, "users"), {
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        photo: result.user.photoURL,
        city: "", bio: "",
        interests: [], skillLevel: "Beginner",
        joinedAt: serverTimestamp()
      });
    }
  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth);
};

document.getElementById("profileBtn").onclick = () => {
  document.getElementById("heroSection").style.display = "none";
  document.getElementById("mapSection").style.display = "none";
  document.getElementById("discover").style.display = "none";
  document.getElementById("hostSection").style.display = "none";
  document.getElementById("profileSection").style.display = "block";
  window.scrollTo(0, 0);
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
    document.getElementById("profileBtn").style.display = "inline-block";
    document.getElementById("hostSection").style.display = "block";
    await loadProfile(user);
  } else {
    currentUserDocId = null;
    document.getElementById("loginBtn").style.display = "inline-block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("profileBtn").style.display = "none";
    document.getElementById("hostSection").style.display = "none";
    document.getElementById("profileSection").style.display = "none";
    document.getElementById("heroSection").style.display = "block";
    document.getElementById("mapSection").style.display = "block";
    document.getElementById("discover").style.display = "block";
  }
  loadCircles();
  loadMapCircles();
});

// ============ PROFILE ============
async function loadProfile(user) {
  const q = query(collection(db, "users"), where("email", "==", user.email));
  const snapshot = await getDocs(q);
  let profile = {
    name: user.displayName || "", email: user.email || "",
    photo: user.photoURL || "", city: "", bio: "",
    interests: [], skillLevel: "Beginner"
  };
  if (!snapshot.empty) {
    currentUserDocId = snapshot.docs[0].id;
    profile = { ...profile, ...snapshot.docs[0].data() };
  }
  document.getElementById("profileName").value = profile.name || "";
  document.getElementById("profileEmail").value = profile.email || "";
  document.getElementById("profileCity").value = profile.city || "";
  document.getElementById("profileBio").value = profile.bio || "";
  document.getElementById("profileInterests").value = (profile.interests || []).join(", ");
  document.getElementById("profileSkillLevel").value = profile.skillLevel || "Beginner";
  document.getElementById("profileAvatar").src = profile.photo || "https://via.placeholder.com/120";
  loadMyCircles(user.uid);
}

document.getElementById("avatarUpload").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUser || !currentUserDocId) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64 = event.target.result;
    document.getElementById("profileAvatar").src = base64;
    await updateDoc(doc(db, "users", currentUserDocId), { photo: base64 });
  };
  reader.readAsDataURL(file);
};

document.getElementById("saveProfileBtn").onclick = async () => {
  if (!currentUser || !currentUserDocId) return;
  const name = document.getElementById("profileName").value.trim();
  const city = document.getElementById("profileCity").value.trim();
  const bio = document.getElementById("profileBio").value.trim();
  const interests = document.getElementById("profileInterests").value.split(",").map(i => i.trim()).filter(Boolean);
  const skillLevel = document.getElementById("profileSkillLevel").value;
  try {
    await updateDoc(doc(db, "users", currentUserDocId), { name, city, bio, interests, skillLevel });
    alert("✅ Profile saved!");
  } catch (e) {
    alert("Save error: " + e.message);
  }
};

async function loadMyCircles(uid) {
  const list = document.getElementById("myCirclesList");
  const snapshot = await getDocs(collection(db, "circles"));
  const myCircles = [];
  snapshot.forEach(d => {
    const data = d.data();
    if (data.members?.includes(uid)) myCircles.push({ id: d.id, ...data });
  });
  if (myCircles.length === 0) {
    list.innerHTML = '<p style="color:var(--ink-muted);grid-column:1/-1;">You haven\'t joined any circle yet.</p>';
    return;
  }
  list.innerHTML = "";
  myCircles.forEach(data => renderCircleCard(data, list, true));
}

// ============ CIRCLES ============
async function loadCircles() {
  const list = document.getElementById("circleList");
  if (!list) return;
  const snapshot = await getDocs(collection(db, "circles"));
  if (snapshot.empty) {
    list.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:48px;">
      <div class="card-emoji">🌱</div><h3>No circles yet</h3>
      <p class="card-meta">Be the first to create one!</p></div>`;
    return;
  }
  list.innerHTML = "";
  snapshot.forEach(d => renderCircleCard({ id: d.id, ...d.data() }, list, false));
}

function renderCircleCard(data, container, showDelete) {
  const emoji = { Cycling:"🚴", Reading:"📚", Gym:"💪", Photography:"📷", Music:"🎵", Running:"🏃" }[data.category] || "✨";
  const isMember = currentUser && data.members?.includes(currentUser.uid);
  const isHost = currentUser && data.hostId === currentUser.uid;
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="card-emoji">${emoji}</div>
    <h3>${data.name}</h3>
    <div class="card-meta">📍 ${data.location}</div>
    ${data.time ? `<div class="card-meta">🕐 ${data.time}</div>` : ""}
    <div class="card-meta">👥 ${data.members?.length || 0} members</div>
    <span class="card-skill">${data.category}</span>
    <div class="card-actions">
      <button class="card-btn join-btn ${isMember ? 'joined' : ''}" data-id="${data.id}">
        ${isMember ? '✓ Joined' : 'Join Circle'}
      </button>
      ${isMember ? `<button class="card-btn chat-btn" data-chat="${data.id}" data-name="${data.name.replace(/"/g, '&quot;')}">💬 Chat</button>` : ''}
    </div>
    ${isHost && showDelete ? `<button class="card-delete-btn" data-delete="${data.id}" title="Delete circle">🗑</button>` : ''}
  `;
  const joinBtn = div.querySelector(".join-btn");
  if (!isMember && joinBtn) joinBtn.onclick = () => joinCircle(data.id, joinBtn);
  const chatBtn = div.querySelector(".chat-btn");
  if (chatBtn) chatBtn.onclick = () => openChat(data.id, data.name);
  const delBtn = div.querySelector(".card-delete-btn");
  if (delBtn) delBtn.onclick = () => deleteCircle(data.id, data.name);
  container.appendChild(div);
}

async function loadMapCircles() {
  if (!mainMap) return;
  mainMarkers.forEach(m => mainMap.removeLayer(m));
  mainMarkers = [];
  const snapshot = await getDocs(collection(db, "circles"));
  snapshot.forEach(d => {
    const data = d.data();
    if (!data.lat || !data.lng) return;
    const pinIcon = L.divIcon({
      className: 'circle-pin',
      html: '<div style="background:#A8B5A0;width:18px;height:18px;border-radius:50%;border:3px solid #2D4A3E;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
    const marker = L.marker([data.lat, data.lng], { icon: pinIcon })
      .addTo(mainMap)
      .bindPopup(`<div style="font-family:Inter,sans-serif;min-width:150px;">
        <h3 style="margin:0 0 6px 0;font-family:'Playfair Display',serif;color:#2D4A3E;font-size:16px;">${data.name}</h3>
        <p style="margin:0 0 4px 0;font-size:13px;color:#6B6B6B;">📍 ${data.location}</p>
        ${data.time ? `<p style="margin:0 0 4px 0;font-size:13px;color:#6B6B6B;">🕐 ${data.time}</p>` : ""}
        <p style="margin:0;font-size:13px;color:#6B6B6B;">👥 ${data.members?.length || 0} members</p>
      </div>`);
    mainMarkers.push(marker);
  });
}

async function joinCircle(circleId, btn) {
  if (!currentUser) { alert("Please login first!"); document.getElementById("loginBtn").click(); return; }
  const originalText = btn.textContent;
  btn.textContent = "⏳ Joining...";
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "circles", circleId), { members: arrayUnion(currentUser.uid) });
    btn.textContent = "✓ Joined";
    btn.classList.add("joined");
    setTimeout(() => { loadCircles(); loadMyCircles(currentUser.uid); }, 500);
  } catch (e) {
    alert("Error: " + e.message);
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function deleteCircle(circleId, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "circles", circleId));
    loadCircles();
    loadMapCircles();
    if (currentUser) loadMyCircles(currentUser.uid);
    alert("✅ Circle deleted.");
  } catch (e) {
    alert("Delete error: " + e.message);
  }
}

document.getElementById("createForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const name = document.getElementById("circleName").value.trim();
  const location = document.getElementById("circleLocationName").value.trim();
  const time = document.getElementById("circleTime").value.trim();
  const category = document.getElementById("circleCategory").value;
  const lat = parseFloat(document.getElementById("circleLat").value);
  const lng = parseFloat(document.getElementById("circleLng").value);
  if (!name || !location) return;
  try {
    await addDoc(collection(db, "circles"), {
      name, location, time, category, lat, lng,
      hostId: currentUser.uid,
      hostName: currentUser.displayName,
      members: [currentUser.uid],
      createdAt: serverTimestamp()
    });
    document.getElementById("circleName").value = "";
    document.getElementById("circleLocationName").value = "";
    document.getElementById("circleTime").value = "";
    loadCircles();
    loadMapCircles();
    if (currentUser) loadMyCircles(currentUser.uid);
    alert("✅ Circle created!");
  } catch (e) {
    alert("Error: " + e.message);
  }
};

// ============ CHAT ============
window.openChat = async function(circleId, circleName) {
  if (!currentUser) return;
  currentChatCircleId = circleId;
  document.getElementById("chatTitle").textContent = circleName;
  document.getElementById("chatModal").classList.add("open");
  const circleDoc = await getDoc(doc(db, "circles", circleId));
  const cd = circleDoc.data();
  document.getElementById("chatSubtitle").textContent = `📍 ${cd.location} · 👥 ${cd.members.length} members`;
  if (currentChatUnsubscribe) currentChatUnsubscribe();
  const messagesRef = collection(db, "circles", circleId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  currentChatUnsubscribe = onSnapshot(q, (snapshot) => {
    const container = document.getElementById("chatMessages");
    if (snapshot.empty) {
      container.innerHTML = `<div class="chat-empty">No messages yet.<br>Say hi to the group! 👋</div>`;
      return;
    }
    container.innerHTML = "";
    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const isOwn = msg.userId === currentUser.uid;
      const time = msg.createdAt?.toDate?.() || new Date();
      const div = document.createElement("div");
      div.className = `msg ${isOwn ? "own" : "other"}`;
      div.innerHTML = `
        ${!isOwn ? `<div class="msg-sender">${escapeHtml(msg.userName || "User")}</div>` : ""}
        <div>${escapeHtml(msg.text)}</div>
        <div class="msg-time">${time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        ${isOwn ? `<button class="msg-delete" data-msg-id="${docSnap.id}" title="Delete">✕</button>` : ""}
      `;
      const delBtn = div.querySelector(".msg-delete");
      if (delBtn) delBtn.onclick = () => deleteMessage(circleId, docSnap.id);
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  });
};

window.closeChat = function() {
  document.getElementById("chatModal").classList.remove("open");
  if (currentChatUnsubscribe) { currentChatUnsubscribe(); currentChatUnsubscribe = null; }
  currentChatCircleId = null;
};

window.sendMessage = async function() {
  if (!currentUser || !currentChatCircleId) return;
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    await addDoc(collection(db, "circles", currentChatCircleId, "messages"), {
      text,
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    alert("Error sending: " + e.message);
  }
};

async function deleteMessage(circleId, messageId) {
  if (!confirm("Delete this message?")) return;
  try {
    await deleteDoc(doc(db, "circles", circleId, "messages", messageId));
  } catch (e) {
    alert("Delete error: " + e.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeChat(); });