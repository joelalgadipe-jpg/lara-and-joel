import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ====== 1. FIREBASE CONFIG ====== */
const firebaseConfig = {
  apiKey: "AIzaSyCa7Aik32zBhWRfMaAvK3X9-P0yEgZE-F8",
  authDomain: "joel-and-lara-26e2a.firebaseapp.com",
  projectId: "joel-and-lara-26e2a",
  storageBucket: "joel-and-lara-26e2a.firebasestorage.app",
  messagingSenderId: "763827321530",
  appId: "1:763827321530:web:57bc5dc4a909fc3f422083",
  measurementId: "G-504MTD2NBS"
};
/* ====== 2. THE ONLY GMAIL ALLOWED ====== */
const ALLOWED_EMAIL = "joelalgadipe@gmail.com";

/* ====== 3. CLOUDINARY ====== */
const CLOUDINARY = { cloudName: "r4agg8qy", uploadPreset: "joel_lara_preset" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
let unsubs = [];

/* ---------- HELPERS ---------- */
// Upload image OR audio to Cloudinary (with progress)
function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY.uploadPreset);
    xhr.send(fd);
  });
}

function burstHearts(n = 20) {
  const emojis = ["💖", "💕", "💗", "❤️", "💘", "💞"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "floaty";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = Math.random() * 100 + "vw";
    s.style.fontSize = 1 + Math.random() * 1.6 + "rem";
    s.style.animationDelay = Math.random() * 0.8 + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 4000);
  }
}

/* ---------- AUTH ---------- */
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (err) {
    $("login-error").textContent = "Wrong email or password 💔";
  }
});

$("logout-btn").onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ALLOWED_EMAIL) {
    $("login-screen").classList.add("hidden");
    $("app").classList.remove("hidden");
    startListeners();
  } else {
    if (user) { signOut(auth); $("login-error").textContent = "This account is not allowed 🚫"; }
    $("app").classList.add("hidden");
    $("login-screen").classList.remove("hidden");
    unsubs.forEach((u) => u()); unsubs = [];
    bgm.pause(); tracks = []; current = -1; autoPending = true;
  }
});

/* ---------- TABS ---------- */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
    $("tab-" + btn.dataset.tab).classList.remove("hidden");
  };
});

/* ---------- MUSIC PLAYER ---------- */
const bgm = $("bgm");
bgm.volume = 0.6;
let tracks = [], current = -1, autoPending = true;

function setTrack(i) {
  if (!tracks.length) return;
  current = (i + tracks.length) % tracks.length;
  bgm.src = tracks[current].url;
}
function playIndex(i) {
  setTrack(i);
  bgm.play().catch(() => {});
}
function startAuto() {
  if (!autoPending || !tracks.length || !bgm.paused) return;
  setTrack(current >= 0 ? current : 0);
  bgm.play().then(() => { autoPending = false; }).catch(() => {});
}
function renderMusic() {
  const playing = !bgm.paused;
  $("now-playing").textContent = current >= 0 && tracks[current]
    ? (playing ? "▶ " : "⏸ ") + tracks[current].title
    : "Nothing playing yet";
  $("music-btn").textContent = playing ? "⏸" : "🎵";
  $("music-list").innerHTML = tracks.map((t, i) => `
    <div class="track ${i === current && playing ? "playing" : ""}">
      <button class="play" data-i="${i}">${i === current && playing ? "⏸" : "▶"}</button>
      <span class="t">${esc(t.title)}</span>
      <button class="trash" data-col="music" data-id="${t.id}">🗑</button>
    </div>`).join("") || `<p class="muted center">No songs yet. Add your first one 🎶</p>`;
}

bgm.addEventListener("play", renderMusic);
bgm.addEventListener("pause", renderMusic);
bgm.addEventListener("ended", () => playIndex(current + 1));

$("music-btn").onclick = () => {
  autoPending = false;
  if (!tracks.length) { document.querySelector('.tab[data-tab="music"]').click(); return; }
  if (bgm.paused) { if (current < 0) playIndex(0); else bgm.play(); }
  else bgm.pause();
};
$("next-btn").onclick = () => { autoPending = false; if (tracks.length) playIndex(current + 1); };
$("volume").oninput = (e) => { bgm.volume = e.target.value; };

// browsers need one tap before audio can play → start on first click inside the app
document.addEventListener("click", (e) => {
  if (!autoPending || $("app").classList.contains("hidden")) return;
  if (e.target.closest("#music-btn, #next-btn, #logout-btn, .play, .trash")) return;
  startAuto();
}, true);

$("music-file").addEventListener("change", (e) => {
  $("music-file-name").textContent = e.target.files[0]?.name || "";
});
$("music-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = $("music-file").files[0];
  if (!f) { $("music-status").textContent = "Pick an audio file first 🎧"; return; }
  try {
    const url = await uploadFile(f, (p) => { $("music-status").textContent = `Uploading… ${Math.round(p * 100)}% 💞`; });
    await addDoc(collection(db, "music"), { title: $("music-title").value.trim(), url, createdAt: serverTimestamp() });
    e.target.reset(); $("music-file-name").textContent = "";
    $("music-status").textContent = "Added! 🎶";
    burstHearts(12);
  } catch { $("music-status").textContent = "Upload failed 😢 (check the file size / Cloudinary preset)"; }
});

/* ---------- ANNIVERSARY COUNTER ---------- */
let sinceDate = null;
function tick() {
  if (!sinceDate) return;
  const diff = Date.now() - sinceDate.getTime();
  $("c-days").textContent = Math.max(0, Math.floor(diff / 864e5));
  $("c-hours").textContent = Math.max(0, Math.floor(diff / 36e5));
  $("c-mins").textContent = Math.max(0, Math.floor(diff / 6e4));
}
setInterval(tick, 30000);

$("since-save").onclick = async () => {
  const v = $("since-input").value;
  if (!v) return;
  await setDoc(doc(db, "settings", "main"), { since: v });
};

/* ---------- STORY ---------- */
$("story-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "stories"), {
    title: $("story-title").value.trim(),
    date: $("story-date").value || "",
    text: $("story-text").value.trim(),
    createdAt: serverTimestamp()
  });
  e.target.reset();
});

/* ---------- GALLERY ---------- */
let allPhotos = [], galleryView = [], galleryFilter = "all";

async function handleFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  const caption = $("photo-caption").value.trim();
  $("progress").classList.remove("hidden");
  $("progress-bar").style.width = "0%";
  for (let i = 0; i < files.length; i++) {
    $("upload-status").textContent = `Uploading ${i + 1} of ${files.length}… 💞`;
    try {
      const url = await uploadFile(files[i], (p) => { $("progress-bar").style.width = ((i + p) / files.length) * 100 + "%"; });
      await addDoc(collection(db, "gallery"), { url, caption, liked: false, createdAt: serverTimestamp() });
    } catch {
      $("upload-status").textContent = "Upload failed 😢 check Cloudinary settings";
      $("progress").classList.add("hidden");
      return;
    }
  }
  $("progress-bar").style.width = "100%";
  $("upload-status").textContent = "Done! 🎉";
  burstHearts(30);
  $("photo-caption").value = "";
  setTimeout(() => { $("progress").classList.add("hidden"); $("progress-bar").style.width = "0%"; $("upload-status").textContent = ""; }, 2200);
}

const dz = $("dropzone");
dz.onclick = () => $("photo-input").click();
$("photo-input").addEventListener("change", (e) => { handleFiles(e.target.files); e.target.value = ""; });
["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
dz.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

document.querySelectorAll(".g-chip").forEach((c) => {
  c.onclick = () => {
    document.querySelectorAll(".g-chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active"); galleryFilter = c.dataset.g; renderGallery();
  };
});

function renderGallery() {
  galleryView = allPhotos.filter((p) => galleryFilter === "all" || p.liked);
  $("g-count").textContent = allPhotos.length ? `(${allPhotos.length})` : "";
  $("gallery-grid").innerHTML = galleryView.map((p, i) => {
    const d = p.createdAt?.toDate?.();
    const date = d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    return `
      <div class="polaroid">
        <button class="del" data-col="gallery" data-id="${p.id}">✕</button>
        <img src="${esc(p.url)}" data-zoom="gallery" data-i="${i}" loading="lazy" alt="">
        ${p.caption ? `<div class="cap">${esc(p.caption)}</div>` : ""}
        <div class="bar">
          <span class="date">${date}</span>
          <button class="heart-btn" data-id="${p.id}" data-liked="${p.liked ? 1 : 0}">${p.liked ? "❤️" : "🤍"}</button>
        </div>
      </div>`;
  }).join("") || `<p class="muted center">${galleryFilter === "liked" ? "No liked photos yet ❤️" : "Upload your first photo 📷"}</p>`;
}

/* ---------- FAVORITES ---------- */
let favFilter = "All", allFavs = [], favView = [];

$("fav-photo").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) {
    $("fav-preview").src = URL.createObjectURL(f);
    $("fav-preview").classList.remove("hidden");
    $("fav-pick-text").textContent = "Tap to change photo";
  }
});
$("fav-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    let photo = "";
    const f = $("fav-photo").files[0];
    if (f) photo = await uploadFile(f);
    await addDoc(collection(db, "favorites"), {
      who: $("fav-who").value, cat: $("fav-cat").value,
      value: $("fav-value").value.trim(), photo, createdAt: serverTimestamp()
    });
    e.target.reset();
    $("fav-preview").classList.add("hidden");
    $("fav-pick-text").textContent = "📷 Add a photo of it (optional)";
    burstHearts(14);
  } catch { alert("Something went wrong 😢"); }
  btn.disabled = false; btn.textContent = "Add favorite 💖";
});
document.querySelectorAll(".fav-chip").forEach((c) => {
  c.onclick = () => {
    document.querySelectorAll(".fav-chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active"); favFilter = c.dataset.who; renderFavs();
  };
});

function renderFavs() {
  favView = allFavs.filter((f) => favFilter === "All" || f.who === favFilter);
  $("fav-grid").innerHTML = favView.map((f) => `
    <div class="fav-card">
      <button class="del" data-col="favorites" data-id="${f.id}">✕</button>
      <div class="pic">
        ${f.photo ? `<img src="${esc(f.photo)}" data-zoom="fav" data-id="${f.id}" loading="lazy" alt="">` : `<span>${esc(f.cat.split(" ")[0])}</span>`}
        <label class="addpic">${f.photo ? "Change" : "＋ Photo"}
          <input type="file" class="fav-addphoto" data-id="${f.id}" accept="image/*" hidden>
        </label>
      </div>
      <div class="info">
        <span class="tag">${esc(f.cat)}</span><span class="who">${esc(f.who)}</span>
        <div class="val">${esc(f.value)}</div>
      </div>
    </div>`).join("") || `<p class="muted center">No favorites yet 💭</p>`;
}

/* ---------- LISTENERS ---------- */
function startListeners() {
  unsubs.forEach((u) => u()); unsubs = [];

  getDoc(doc(db, "settings", "main")).then((s) => {
    if (s.exists() && s.data().since) setSince(s.data().since);
    else $("since-text").textContent = "— set your date below —";
  });
  unsubs.push(onSnapshot(doc(db, "settings", "main"), (s) => { if (s.exists() && s.data().since) setSince(s.data().since); }));

  unsubs.push(onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), (snap) => {
    $("story-list").innerHTML = snap.docs.map((d) => { const s = d.data(); return `
      <div class="story-item">
        <button class="del" data-col="stories" data-id="${d.id}">🗑</button>
        <h3>${esc(s.title)}</h3><small>${esc(s.date)}</small>
        <p>${esc(s.text)}</p>
      </div>`; }).join("") || `<p class="muted center">No stories yet. Write your first one 💌</p>`;
  }));

  unsubs.push(onSnapshot(query(collection(db, "gallery"), orderBy("createdAt", "desc")), (snap) => {
    allPhotos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGallery();
  }));

  unsubs.push(onSnapshot(query(collection(db, "favorites"), orderBy("createdAt", "desc")), (snap) => {
    allFavs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderFavs();
  }));

  unsubs.push(onSnapshot(query(collection(db, "music"), orderBy("createdAt", "asc")), (snap) => {
    const playingId = tracks[current]?.id;
    tracks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (playingId) {
      const idx = tracks.findIndex((t) => t.id === playingId);
      if (idx === -1) { bgm.pause(); current = -1; } else current = idx;
    }
    renderMusic();
    startAuto();
  }));
}

function setSince(v) {
  sinceDate = new Date(v + "T00:00:00");
  $("since-input").value = v;
  $("since-text").textContent = sinceDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  tick();
}

/* ---------- LIGHTBOX ---------- */
let lbList = [], lbIndex = 0;
function showLb() {
  const it = lbList[lbIndex];
  $("lightbox-img").src = it.url;
  $("lightbox-cap").textContent = it.caption || "";
  const multi = lbList.length > 1;
  $("lb-prev").style.display = $("lb-next").style.display = multi ? "" : "none";
}
function openLightbox(list, i) { lbList = list; lbIndex = i; showLb(); $("lightbox").classList.remove("hidden"); }
function lbMove(step) { lbIndex = (lbIndex + step + lbList.length) % lbList.length; showLb(); }
const closeLb = () => $("lightbox").classList.add("hidden");

$("lb-prev").onclick = (e) => { e.stopPropagation(); lbMove(-1); };
$("lb-next").onclick = (e) => { e.stopPropagation(); lbMove(1); };
$("lb-close").onclick = closeLb;
$("lightbox").addEventListener("click", (e) => { if (e.target === $("lightbox")) closeLb(); });
document.addEventListener("keydown", (e) => {
  if ($("lightbox").classList.contains("hidden")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") lbMove(-1);
  if (e.key === "ArrowRight") lbMove(1);
});

/* ---------- GLOBAL CLICKS ---------- */
document.addEventListener("click", async (e) => {
  // delete
  const del = e.target.closest(".del, .trash");
  if (del) {
    if (confirm("Delete this? 🥺")) await deleteDoc(doc(db, del.dataset.col, del.dataset.id));
    return;
  }
  // like heart
  const heart = e.target.closest(".heart-btn");
  if (heart) {
    const liked = heart.dataset.liked === "1";
    if (!liked) burstHearts(8);
    await updateDoc(doc(db, "gallery", heart.dataset.id), { liked: !liked });
    return;
  }
  // play a track
  const play = e.target.closest(".play");
  if (play) {
    autoPending = false;
    const i = Number(play.dataset.i);
    if (i === current) { bgm.paused ? bgm.play() : bgm.pause(); }
    else playIndex(i);
    return;
  }
  // open photos
  if (e.target.dataset.zoom === "gallery") {
    openLightbox(galleryView.map((p) => ({ url: p.url, caption: p.caption })), Number(e.target.dataset.i));
  } else if (e.target.dataset.zoom === "fav") {
    const withPhoto = favView.filter((f) => f.photo);
    const i = withPhoto.findIndex((f) => f.id === e.target.dataset.id);
    openLightbox(withPhoto.map((f) => ({ url: f.photo, caption: f.value })), i);
  }
});

// add / change photo on an existing favorite
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.classList.contains("fav-addphoto") && t.files[0]) {
    try {
      const url = await uploadFile(t.files[0]);
      await updateDoc(doc(db, "favorites", t.dataset.id), { photo: url });
      burstHearts(8);
    } catch { alert("Upload failed 😢"); }
  }
});

/* ================= COUNTDOWN ================= */
let celebratedOn = "";
const fmtLong = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function fillCard(card, date, today, title) {
  const diff = Math.round((date - today) / 864e5);
  card.querySelector("small").textContent = title;
  card.querySelector("b").textContent = diff === 0 ? "Today! 🎉" : diff === 1 ? "Tomorrow 💕" : diff + " days";
  card.querySelector("span").textContent = fmtLong(date);
  card.classList.toggle("today", diff === 0);
  return diff;
}

function updateCountdown() {
  if (!sinceDate || !$("cd-month")) return;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = sinceDate.getDate();

  // next monthsary
  let nm = null;
  for (let i = 0; i < 14 && !nm; i++) {
    const mm = today.getMonth() + i;
    const last = new Date(today.getFullYear(), mm + 1, 0).getDate();
    const d = new Date(today.getFullYear(), mm, Math.min(day, last));
    if (d >= today && d > sinceDate) nm = d;
  }
  // next anniversary
  let na = new Date(today.getFullYear(), sinceDate.getMonth(), sinceDate.getDate());
  if (na < today) na = new Date(today.getFullYear() + 1, sinceDate.getMonth(), sinceDate.getDate());
  if (na.getFullYear() - sinceDate.getFullYear() < 1) na = new Date(sinceDate.getFullYear() + 1, sinceDate.getMonth(), sinceDate.getDate());

  let celebrate = false;
  if (nm) {
    const months = (nm.getFullYear() - sinceDate.getFullYear()) * 12 + nm.getMonth() - sinceDate.getMonth();
    if (fillCard($("cd-month"), nm, today, `Next monthsary · month ${months}`) === 0) celebrate = true;
  }
  const years = na.getFullYear() - sinceDate.getFullYear();
  if (fillCard($("cd-year"), na, today, `Next anniversary · year ${years}`) === 0) celebrate = true;

  if (celebrate && celebratedOn !== today.toDateString() && !$("app").classList.contains("hidden")) {
    celebratedOn = today.toDateString();
    burstHearts(40);
  }
}
setInterval(updateCountdown, 3000);

/* ================= LOVE LETTERS + TIMELINE ================= */
let allLetters = [], allMoments = [], extraUnsubs = [];

onAuthStateChanged(auth, (user) => {
  extraUnsubs.forEach((u) => u()); extraUnsubs = [];
  if (!(user && user.email === ALLOWED_EMAIL)) return;

  extraUnsubs.push(onSnapshot(query(collection(db, "letters"), orderBy("createdAt", "desc")), (snap) => {
    allLetters = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    $("letter-grid").innerHTML = allLetters.map((l) => `
      <div class="envelope" data-letter="${l.id}">
        <button class="del" data-col="letters" data-id="${l.id}">✕</button>
        <div class="env-flap"></div>
        <div class="env-seal">💌</div>
        <div class="env-body">
          <div class="env-title">${esc(l.title)}</div>
          <div class="env-from">From ${esc(l.from)}</div>
        </div>
      </div>`).join("") || `<p class="muted center">No letters yet. Write the first one 💌</p>`;
  }));

  extraUnsubs.push(onSnapshot(query(collection(db, "timeline"), orderBy("date", "asc")), (snap) => {
    allMoments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    $("tl-list").innerHTML = allMoments.map((m, i) => `
      <div class="tl-item ${i % 2 ? "right" : "left"}">
        <div class="tl-dot">💗</div>
        <div class="tl-card">
          <button class="del" data-col="timeline" data-id="${m.id}">✕</button>
          <div class="tl-date">${fmtLong(new Date(m.date + "T00:00:00"))}</div>
          <h3>${esc(m.title)}</h3>
          ${m.photo ? `<img src="${esc(m.photo)}" data-zoom="tl" data-id="${m.id}" loading="lazy" alt="">` : ""}
          ${m.text ? `<p>${esc(m.text)}</p>` : ""}
        </div>
      </div>`).join("") || `<p class="muted center">Add your first milestone 💗</p>`;
  }));
});

// write a letter
$("letter-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "letters"), {
    from: $("letter-from").value,
    title: $("letter-title").value.trim(),
    text: $("letter-text").value.trim(),
    createdAt: serverTimestamp()
  });
  e.target.reset();
  burstHearts(16);
});

// add a milestone
$("tl-photo").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) {
    $("tl-preview").src = URL.createObjectURL(f);
    $("tl-preview").classList.remove("hidden");
    $("tl-pick-text").textContent = "Tap to change photo";
  }
});
$("tl-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    let photo = "";
    const f = $("tl-photo").files[0];
    if (f) photo = await uploadFile(f);
    await addDoc(collection(db, "timeline"), {
      title: $("tl-title").value.trim(),
      date: $("tl-date").value,
      text: $("tl-text").value.trim(),
      photo,
      createdAt: serverTimestamp()
    });
    e.target.reset();
    $("tl-preview").classList.add("hidden");
    $("tl-pick-text").textContent = "📷 Add a photo (optional)";
    burstHearts(16);
  } catch { alert("Something went wrong 😢"); }
  btn.disabled = false; btn.textContent = "Add to our timeline 💗";
});

// open a letter / timeline photo / close letter
document.addEventListener("click", (e) => {
  if (e.target.closest(".del")) return;

  const env = e.target.closest(".envelope");
  if (env) {
    const l = allLetters.find((x) => x.id === env.dataset.letter);
    if (!l) return;
    $("letter-m-title").textContent = l.title;
    $("letter-m-text").textContent = l.text;
    $("letter-m-from").textContent = "— " + l.from + " 💕";
    $("letter-modal").classList.remove("hidden");
    burstHearts(6);
    return;
  }
  if (e.target === $("letter-modal") || e.target.closest("#letter-close")) {
    $("letter-modal").classList.add("hidden");
    return;
  }
  if (e.target.dataset.zoom === "tl") {
    const pics = allMoments.filter((m) => m.photo);
    const i = pics.findIndex((m) => m.id === e.target.dataset.id);
    openLightbox(pics.map((m) => ({ url: m.photo, caption: m.title })), i);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("letter-modal").classList.add("hidden");
});

/* ==========================================================
   MEGA UPDATE: idagdag sa PINAKABABA ng app.js
   ========================================================== */
const pad = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function timeAgo(ts) {
  const d = ts?.toDate?.(); if (!d) return "just now";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

/* ---------- 1. INJECT NEW UI ---------- */
$("tab-home").insertAdjacentHTML("beforeend", `
  <div class="home-extra">
    <div class="card">
      <h3 class="script">Daily note 💬</h3>
      <div id="note-latest" class="stack"></div>
      <form id="note-form">
        <div class="row">
          <select id="note-from"><option>Joel</option><option>Lara</option></select>
          <select id="note-mood">
            <option>😊</option><option>🥰</option><option>😍</option><option>🥳</option><option>😴</option><option>🥺</option><option>😢</option><option>😤</option><option>🤒</option>
          </select>
        </div>
        <input id="note-text" maxlength="140" placeholder="Say something sweet today…" required />
        <button class="btn small" type="submit">Post 💌</button>
      </form>
    </div>
    <div class="card">
      <h3 class="script">Question of the day ❓</h3>
      <p id="qotd-q" class="qotd-q"></p>
      <div id="qotd-answers" class="stack"></div>
      <form id="qotd-form">
        <select id="qotd-from"><option>Joel</option><option>Lara</option></select>
        <textarea id="qotd-text" rows="2" placeholder="Your answer…" required></textarea>
        <button class="btn small" type="submit">Answer 💬</button>
      </form>
    </div>
    <div class="card hidden" id="otd-box">
      <h3 class="script">On this day 📅</h3>
      <div id="otd-list"></div>
    </div>
  </div>`);

document.querySelector(".nav nav").insertAdjacentHTML("beforeend", `<button class="tab" data-tab="us">Us ✨</button>`);

document.querySelector(".footer").insertAdjacentHTML("beforebegin", `
  <main id="tab-us" class="page hidden">
    <h2 class="script">Us ✨</h2>
    <div class="filter">
      <button class="chip us-chip active" data-pane="reasons">💌 Reasons jar</button>
      <button class="chip us-chip" data-pane="bucket">✅ Bucket list</button>
      <button class="chip us-chip" data-pane="roulette">🎲 Date roulette</button>
      <button class="chip us-chip" data-pane="wishlist">🎁 Wishlist</button>
    </div>

    <section id="us-reasons" class="us-pane">
      <form id="reason-form" class="card">
        <div class="row">
          <select id="reason-from"><option>Joel</option><option>Lara</option></select>
          <input id="reason-text" placeholder="One reason why I love you…" required />
        </div>
        <button class="btn" type="submit">Drop it in the jar 💌</button>
      </form>
      <div class="jar-box">
        <div class="jar" id="jar">🫙</div><br>
        <button class="btn" id="pick-reason" type="button">Pick a random reason 💌</button>
        <div id="reason-card" class="reason-card hidden"></div>
      </div>
      <p class="muted center" id="reason-count"></p>
      <div id="reason-list" class="stack"></div>
    </section>

    <section id="us-bucket" class="us-pane hidden">
      <form id="bucket-form" class="card">
        <div class="row">
          <input id="bucket-text" placeholder="Something we want to do together…" required />
          <button class="btn" type="submit">Add ✅</button>
        </div>
      </form>
      <p id="bucket-progress" class="muted center"></p>
      <div class="bk-bar"><div id="bk-fill"></div></div>
      <div id="bucket-list" class="stack"></div>
    </section>

    <section id="us-roulette" class="us-pane hidden">
      <form id="date-form" class="card">
        <div class="row">
          <input id="date-text" placeholder="Date idea (e.g. Picnic, Movie marathon)" required />
          <button class="btn" type="submit">Add idea 🎲</button>
        </div>
      </form>
      <div class="wheel-wrap"><span class="wheel-pointer">▼</span><canvas id="wheel" width="360" height="360"></canvas></div>
      <div class="center"><button class="btn" id="spin-btn" type="button">Spin! 🎡</button></div>
      <h3 id="wheel-result" class="script center"></h3>
      <div id="date-list" class="chips-wrap"></div>
    </section>

    <section id="us-wishlist" class="us-pane hidden">
      <form id="wish-form" class="card">
        <div class="row">
          <select id="wish-for"><option value="Joel">Joel's wishlist</option><option value="Lara">Lara's wishlist</option></select>
          <input id="wish-text" placeholder="Something I'd love (e.g. Perfume, Hoodie, Book)" required />
        </div>
        <input id="wish-link" placeholder="Link (optional)" />
        <button class="btn" type="submit">Add to wishlist 🎁</button>
      </form>
      <div class="wish-cols">
        <div><h3 class="script center">Joel 💙</h3><div id="wish-Joel" class="stack"></div></div>
        <div><h3 class="script center">Lara 💗</h3><div id="wish-Lara" class="stack"></div></div>
      </div>
    </section>
  </main>`);

/* ---------- 2. TABS FOR "US" ---------- */
const usTabBtn = document.querySelector('.tab[data-tab="us"]');
usTabBtn.onclick = () => {
  document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
  usTabBtn.classList.add("active");
  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  $("tab-us").classList.remove("hidden");
};
document.querySelectorAll(".us-chip").forEach((c) => {
  c.onclick = () => {
    document.querySelectorAll(".us-chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    document.querySelectorAll(".us-pane").forEach((p) => p.classList.add("hidden"));
    $("us-" + c.dataset.pane).classList.remove("hidden");
    if (c.dataset.pane === "roulette") drawWheel();
  };
});

/* ---------- 3. LIVE DATA ---------- */
let allReasons = [], allBucket = [], allDates = [], allNotes = [], allAnswers = [], allWish = [], megaUnsubs = [];

onAuthStateChanged(auth, (user) => {
  megaUnsubs.forEach((u) => u()); megaUnsubs = [];
  if (!(user && user.email === ALLOWED_EMAIL)) return;
  const watch = (name, dir, setter, render) =>
    megaUnsubs.push(onSnapshot(query(collection(db, name), orderBy("createdAt", dir)), (snap) => {
      setter(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); render();
    }));
  watch("reasons", "desc", (v) => (allReasons = v), renderReasons);
  watch("bucket", "asc", (v) => (allBucket = v), renderBucket);
  watch("dates", "asc", (v) => (allDates = v), () => { drawWheel(); renderDateList(); });
  watch("notes", "desc", (v) => (allNotes = v), renderNotes);
  watch("answers", "asc", (v) => (allAnswers = v), renderQotd);
  watch("wishlist", "asc", (v) => (allWish = v), renderWish);
});

/* ---------- 4. DAILY NOTE ---------- */
$("note-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "notes"), {
    from: $("note-from").value, mood: $("note-mood").value,
    text: $("note-text").value.trim(), createdAt: serverTimestamp()
  });
  $("note-text").value = ""; burstHearts(8);
});
function renderNotes() {
  $("note-latest").innerHTML = ["Joel", "Lara"].map((p) => {
    const n = allNotes.find((x) => x.from === p);
    return n
      ? `<div class="note-line"><b>${p}</b> ${esc(n.mood)} ${esc(n.text)}<small>${timeAgo(n.createdAt)}</small></div>`
      : `<div class="note-line muted">No note from ${p} yet 💭</div>`;
  }).join("");
}
setInterval(renderNotes, 60000);

/* ---------- 5. QUESTION OF THE DAY ---------- */
const QOTD = [
  "Ano yung favorite memory mo with me?",
  "Ano ang first na napansin mo sa akin?",
  "Anong maliit na bagay na ginagawa ko ang pinakagusto mo?",
  "Saan mo gustong mag-travel tayo someday?",
  "Ano yung pinaka-nakakatawang nangyari sa atin?",
  "Anong kanta ang naiisip mo tuwing naiisip mo ako?",
  "Ano ang gusto mong gawin natin ngayong weekend?",
  "Ano ang pangarap mo para sa ating dalawa after 5 years?",
  "Anong pagkain ang gusto mong lutuin natin together?",
  "Kailan mo na-realize na gusto mo na ako?",
  "Ano ang natutunan mo mula sa akin?",
  "Anong movie ang gusto mong i-rewatch kasama ako?",
  "Ano ang love language mo ngayon?",
  "Anong cute na nickname ang gusto mong itawag ko sa'yo?",
  "Anong lugar ang pinaka-romantic para sa'yo?",
  "Ano ang isang bagay na gusto mong i-improve natin as a couple?",
  "Ano ang pinaka-memorable na date natin?",
  "Ano ang ginagawa mo kapag miss mo ako?",
  "Ano ang goal mo this month na matutulungan kita?",
  "Ano ang pinakagusto mo sa ating dalawa?",
  "Anong tradition ang gusto mong simulan natin?",
  "Ano ang pinaka-nakakakilig na sinabi ko sa'yo?",
  "Anong bagay ang hindi mo pa nasasabi sa akin?",
  "Kung may isang araw tayong libre, ano ang gagawin natin?"
];
function renderQotd() {
  const now = new Date();
  const dayNum = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(2020, 0, 1)) / 864e5);
  $("qotd-q").textContent = QOTD[dayNum % QOTD.length];
  const mine = allAnswers.filter((a) => a.day === todayISO());
  $("qotd-answers").innerHTML = mine.map((a) =>
    `<div class="note-line"><b>${esc(a.from)}:</b> ${esc(a.text)}</div>`).join("");
}
$("qotd-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "answers"), {
    day: todayISO(), from: $("qotd-from").value,
    text: $("qotd-text").value.trim(), createdAt: serverTimestamp()
  });
  $("qotd-text").value = ""; burstHearts(8);
});
renderQotd();
setInterval(renderQotd, 60000);

/* ---------- 6. ON THIS DAY ---------- */
let lastOtd = "";
const agoLabel = (n) => n % 12 === 0
  ? `${n / 12} year${n / 12 > 1 ? "s" : ""} ago ❤️`
  : `${n} month${n > 1 ? "s" : ""} ago`;

function renderOnThisDay() {
  const now = new Date();
  const ym = now.getFullYear() * 12 + now.getMonth();
  const items = [];
  const check = (d, title, photo) => {
    if (!d || d.getDate() !== now.getDate()) return;
    const diff = ym - (d.getFullYear() * 12 + d.getMonth());
    if (diff > 0) items.push({ diff, title, photo });
  };
  allMoments.forEach((m) => { if (m.date) check(new Date(m.date + "T00:00:00"), m.title, m.photo); });
  allPhotos.forEach((p) => check(p.createdAt?.toDate?.(), p.caption || "A photo of us", p.url));
  items.sort((a, b) => a.diff - b.diff);
  const top = items.slice(0, 5);
  const sig = JSON.stringify(top.map((i) => [i.diff, i.title, i.photo || ""]));
  if (sig === lastOtd) return;
  lastOtd = sig;
  $("otd-box").classList.toggle("hidden", !top.length);
  $("otd-list").innerHTML = top.map((i) => `
    <div class="otd-item">
      ${i.photo ? `<img src="${esc(i.photo)}" alt="">` : `<span style="font-size:2rem">💗</span>`}
      <div><b>${esc(i.title)}</b><small>${agoLabel(i.diff)}</small></div>
    </div>`).join("");
}
setInterval(renderOnThisDay, 3000);

/* ---------- 7. REASONS JAR ---------- */
let lastReason = -1;
$("reason-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "reasons"), {
    from: $("reason-from").value, text: $("reason-text").value.trim(), createdAt: serverTimestamp()
  });
  $("reason-text").value = ""; burstHearts(8);
});
function renderReasons() {
  $("reason-count").textContent = allReasons.length
    ? `${allReasons.length} reason${allReasons.length > 1 ? "s" : ""} in the jar 💖`
    : "The jar is empty. Drop the first reason 💌";
  $("reason-list").innerHTML = allReasons.map((r) => `
    <div class="reason-item">
      <span>${esc(r.text)} <small>— ${esc(r.from)}</small></span>
      <button class="trash" data-col="reasons" data-id="${r.id}">🗑</button>
    </div>`).join("");
}
$("pick-reason").onclick = () => {
  const card = $("reason-card");
  if (!allReasons.length) { card.innerHTML = `<p>Add a reason first 💌</p>`; card.classList.remove("hidden"); return; }
  let i;
  do { i = Math.floor(Math.random() * allReasons.length); } while (allReasons.length > 1 && i === lastReason);
  lastReason = i;
  const r = allReasons[i];
  const jar = $("jar");
  jar.classList.remove("shake"); void jar.offsetWidth; jar.classList.add("shake");
  card.classList.add("hidden");
  setTimeout(() => {
    card.innerHTML = `<p>${esc(r.text)}</p><small>— ${esc(r.from)} 💕</small>`;
    card.classList.remove("hidden");
    burstHearts(12);
  }, 600);
};

/* ---------- 8. BUCKET LIST ---------- */
$("bucket-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "bucket"), {
    text: $("bucket-text").value.trim(), done: false, doneDate: "", photo: "", createdAt: serverTimestamp()
  });
  $("bucket-text").value = "";
});
function renderBucket() {
  const total = allBucket.length, done = allBucket.filter((b) => b.done).length;
  $("bucket-progress").textContent = total
    ? `${done} of ${total} done ${done === total ? "🎉" : "💪"}`
    : "Add the first thing on your list ✨";
  $("bk-fill").style.width = total ? (done / total) * 100 + "%" : "0%";
  $("bucket-list").innerHTML = allBucket.map((b) => `
    <div class="bucket-item ${b.done ? "done" : ""}">
      <button class="chk" data-id="${b.id}">${b.done ? "✅" : "⭕"}</button>
      <div class="b-main">
        <div class="b-text">${esc(b.text)}</div>
        ${b.done && b.doneDate ? `<small>Done on ${fmtLong(new Date(b.doneDate + "T00:00:00"))} 💖</small>` : ""}
        ${b.photo ? `<img src="${esc(b.photo)}" data-zoom="bk" data-id="${b.id}" loading="lazy" alt="">` : ""}
      </div>
      ${b.done ? `<label class="pic-inline">${b.photo ? "Change" : "＋ Photo"}<input type="file" class="bucket-photo" data-id="${b.id}" accept="image/*" hidden></label>` : ""}
      <button class="trash" data-col="bucket" data-id="${b.id}">🗑</button>
    </div>`).join("");
}

/* ---------- 9. DATE ROULETTE ---------- */
$("date-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "dates"), { text: $("date-text").value.trim(), createdAt: serverTimestamp() });
  $("date-text").value = "";
});
function renderDateList() {
  $("date-list").innerHTML = allDates.length
    ? allDates.map((d) => `<span class="idea">${esc(d.text)}<button class="trash" data-col="dates" data-id="${d.id}">✕</button></span>`).join("")
    : `<button class="btn small" id="seed-dates" type="button">✨ Add starter ideas</button>`;
}
function drawWheel() {
  const c = $("wheel"), ctx = c.getContext("2d"), n = allDates.length, R = c.width / 2;
  ctx.clearRect(0, 0, c.width, c.height);
  if (!n) {
    ctx.fillStyle = "#ffe3ec"; ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9184a"; ctx.font = "600 22px Poppins, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Add ideas 💕", R, R + 7);
    return;
  }
  const seg = (2 * Math.PI) / n;
  const colors = ["#ff8fb1", "#ffc2d6", "#d8b4fe", "#ffd6a5", "#b5e7f7", "#ffb3c7"];
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * seg;
    ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 4, a0, a0 + seg); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.translate(R, R); ctx.rotate(a0 + seg / 2);
    ctx.fillStyle = "#5a1030"; ctx.font = "600 17px Poppins, sans-serif"; ctx.textAlign = "right";
    const t = allDates[i].text; ctx.fillText(t.length > 16 ? t.slice(0, 15) + "…" : t, R - 24, 6);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(R, R, 22, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.font = "22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("💗", R, R + 8);
}
let wheelRot = 0, spinning = false;
$("spin-btn").onclick = () => {
  if (spinning) return;
  const n = allDates.length;
  if (!n) { $("wheel-result").textContent = "Add some ideas first 💕"; return; }
  spinning = true; $("wheel-result").textContent = "…";
  const seg = 360 / n, i = Math.floor(Math.random() * n), label = allDates[i].text;
  const target = (((-(i + 0.5) * seg) % 360) + 360) % 360;
  const cur = ((wheelRot % 360) + 360) % 360;
  wheelRot += 360 * 5 + ((target - cur + 360) % 360);
  $("wheel").style.transform = `rotate(${wheelRot}deg)`;
  setTimeout(() => { $("wheel-result").textContent = label; burstHearts(22); spinning = false; }, 4200);
};

/* ---------- 10. WISHLIST ---------- */
$("wish-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "wishlist"), {
    for: $("wish-for").value, text: $("wish-text").value.trim(),
    link: $("wish-link").value.trim(), got: false, createdAt: serverTimestamp()
  });
  $("wish-text").value = ""; $("wish-link").value = "";
});
function renderWish() {
  ["Joel", "Lara"].forEach((p) => {
    const list = allWish.filter((w) => w.for === p);
    $("wish-" + p).innerHTML = list.map((w) => `
      <div class="bucket-item ${w.got ? "done" : ""}">
        <button class="wchk" data-id="${w.id}">${w.got ? "🎁" : "⬜"}</button>
        <div class="b-main">
          <div class="b-text">${esc(w.text)}${/^https?:\/\//i.test(w.link || "") ? ` <a href="${esc(w.link)}" target="_blank" rel="noopener">🔗</a>` : ""}</div>
          ${w.got ? "<small>Got it! 💝</small>" : ""}
        </div>
        <button class="trash" data-col="wishlist" data-id="${w.id}">🗑</button>
      </div>`).join("") || `<p class="muted center">Nothing yet 🎁</p>`;
  });
}

/* ---------- CLICK / CHANGE HANDLERS ---------- */
document.addEventListener("click", async (e) => {
  const chk = e.target.closest(".chk");
  if (chk) {
    const b = allBucket.find((x) => x.id === chk.dataset.id); if (!b) return;
    const done = !b.done;
    await updateDoc(doc(db, "bucket", b.id), { done, doneDate: done ? todayISO() : "" });
    if (done) burstHearts(24);
    return;
  }
  const wchk = e.target.closest(".wchk");
  if (wchk) {
    const w = allWish.find((x) => x.id === wchk.dataset.id); if (!w) return;
    await updateDoc(doc(db, "wishlist", w.id), { got: !w.got });
    if (!w.got) burstHearts(16);
    return;
  }
  if (e.target.id === "seed-dates") {
    const starters = ["Picnic 🧺", "Movie night 🎬", "Street food crawl 🍢", "Beach day 🏖️", "Cook together 🍳", "Stargazing 🌌", "Coffee date ☕", "Arcade 🎮"];
    for (const t of starters) await addDoc(collection(db, "dates"), { text: t, createdAt: serverTimestamp() });
    return;
  }
  if (e.target.dataset.zoom === "bk") {
    const pics = allBucket.filter((b) => b.photo);
    const i = pics.findIndex((b) => b.id === e.target.dataset.id);
    openLightbox(pics.map((b) => ({ url: b.photo, caption: b.text })), i);
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.classList.contains("bucket-photo") && t.files[0]) {
    try {
      const url = await uploadFile(t.files[0]);
      await updateDoc(doc(db, "bucket", t.dataset.id), { photo: url });
      burstHearts(8);
    } catch { alert("Upload failed 😢"); }
  }
});

/* ---------- FALLING HEARTS BACKGROUND ---------- */
(function () {
  const wrap = document.createElement("div");
  wrap.className = "bg-hearts";
  const em = ["💗", "💕", "🌸", "💖", "✨"];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.fontSize = 14 + Math.random() * 20 + "px";
    const dur = 14 + Math.random() * 16;
    s.style.animationDuration = dur + "s";
    s.style.animationDelay = -Math.random() * dur + "s";
    wrap.appendChild(s);
  }
  document.body.prepend(wrap);
})();

/* ---------- DARK MODE ---------- */
(function () {
  const btn = document.createElement("button");
  btn.id = "dark-btn"; btn.className = "icon-btn"; btn.title = "Dark mode"; btn.textContent = "🌙";
  document.querySelector(".nav-right").insertBefore(btn, $("logout-btn"));
  const apply = (on) => {
    document.documentElement.classList.toggle("dark", on);
    btn.textContent = on ? "☀️" : "🌙";
    try { localStorage.setItem("jl-dark", on ? "1" : "0"); } catch {}
  };
  let saved = false;
  try { saved = localStorage.getItem("jl-dark") === "1"; } catch {}
  apply(saved);
  btn.onclick = () => apply(!document.documentElement.classList.contains("dark"));
})();

/* ---------- INSTALLABLE APP (PWA) ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});