/* ---- SUPABASE ---- */
let db = null;
try {
  const { createClient } = supabase;
  db = createClient(
    "https://jhldmqdfdmuttyjsfkrj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobGRtcWRmZG11dHR5anNma3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjkwNDEsImV4cCI6MjA5MTc0NTA0MX0.ElIti6eL75OQaJzshXusQemATbT8osysWREKGrv-Rs0"
  );
} catch(e) { console.error("Supabase init error:", e); }

document.getElementById("year").textContent = new Date().getFullYear();

window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 30);
});

function scrollToId(id) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function outsideClose(e, id) { if (e.target.id === id) document.getElementById(id).classList.remove("active"); }
function toggleMobileMenu() { document.getElementById("mobileMenu").classList.toggle("open"); }

/* ---- AUTH ---- */
let currentUser = null;
if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    try {
      currentUser = session ? session.user : null;
      const btnLogout = document.getElementById("btnLogout");
      if (btnLogout) btnLogout.style.display = currentUser ? "inline-flex" : "none";
      const guideOverlay = document.getElementById("guideImgChange");
      if (guideOverlay) guideOverlay.style.display = currentUser ? "flex" : "none";
      document.body.classList.toggle("is-admin", !!currentUser);
    } catch(e) { console.warn(e); }
  });
}

/* ---- IMAGE URLS HELPER (back-compat: image_url stores JSON array OR single URL) ---- */
function getImageUrls(post) {
  if (!post || !post.image_url) return [];
  const raw = post.image_url;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[")) {
      try { const arr = JSON.parse(t); return Array.isArray(arr) ? arr.filter(Boolean) : []; }
      catch { return [t]; }
    }
    return t ? [t] : [];
  }
  return [];
}

/* ---- UPLOAD ---- */
async function uploadImage(file, folder) {
  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { data, error } = await db.storage.from("images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = db.storage.from("images").getPublicUrl(data.path);
  return urlData.publicUrl;
}

/* ---- MULTI-IMAGE STATE FOR ADMIN MODAL ---- */
let postImageUrls = []; // urls already uploaded for current draft

function renderMultiPreview() {
  const wrap = document.getElementById("multiPreview");
  if (!postImageUrls.length) { wrap.style.display = "none"; wrap.innerHTML = ""; return; }
  wrap.style.display = "grid";
  wrap.innerHTML = postImageUrls.map((url, i) => `
    <div class="multi-preview-item">
      <img src="${url}" alt="">
      <button type="button" class="multi-preview-remove" onclick="removePostImage(${i})" title="Rimuovi">✕</button>
    </div>
  `).join("");
}
function removePostImage(i) {
  postImageUrls.splice(i, 1);
  renderMultiPreview();
}

async function handlePostFiles(files) {
  if (!files || !files.length) return;
  const status = document.getElementById("postUploadStatus");
  const btn    = document.getElementById("submitBtn");
  const dzText = document.querySelector("#postDropZone .drop-zone-text");
  const remaining = 10 - postImageUrls.length;
  if (remaining <= 0) { alert("Massimo 10 immagini per post."); return; }
  const list = Array.from(files).slice(0, remaining);
  status.style.display = "block";
  btn.disabled = true;
  let uploaded = 0;
  for (const file of list) {
    try {
      const url = await uploadImage(file, "posts");
      postImageUrls.push(url);
      uploaded++;
      renderMultiPreview();
    } catch (e) {
      console.error(e);
      alert("Errore caricamento " + file.name + ": " + e.message);
    }
  }
  status.style.display = "none";
  btn.disabled = false;
  if (uploaded > 0) {
    dzText.innerHTML = `✅ <strong>${postImageUrls.length} immagine/i caricate</strong><br><small>clicca o trascina per aggiungerne altre</small>`;
  }
}

/* Drag & drop + click for post images */
(function setupPostDropZone(){
  const dz    = document.getElementById("postDropZone");
  const input = document.getElementById("postFileInput");
  if (!dz || !input) return;
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => { handlePostFiles(e.target.files); input.value = ""; });
  ["dragenter","dragover"].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("dragover"); }));
  ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("dragover"); }));
  dz.addEventListener("drop", (e) => { handlePostFiles(e.dataTransfer.files); });
})();

/* ---- GUIDE PHOTO ---- */
async function handleGuidePhoto(file) {
  if (!file) return;
  const overlay = document.getElementById("guideImgChange");
  const label = overlay.querySelectorAll("span")[1];
  label.textContent = "Caricamento...";
  try {
    const url = await uploadImage(file, "guide");
    document.getElementById("guidePhoto").src = url;
    localStorage.setItem("guidePhotoUrl", url);
    label.textContent = "Cambia foto";
  } catch (e) {
    label.textContent = "Cambia foto";
    alert("Errore nel caricamento: " + e.message);
  }
}
try {
  const savedGuidePhoto = localStorage.getItem("guidePhotoUrl");
  const guidePhotoEl = document.getElementById("guidePhoto");
  if (savedGuidePhoto && guidePhotoEl) guidePhotoEl.src = savedGuidePhoto;
} catch(e) {}

/* ---- ADMIN OPEN/LOGIN ---- */
function openAdmin() {
  if (currentUser) {
    resetAdminForm();
    document.getElementById("adminModal").classList.add("active");
  } else {
    document.getElementById("loginError").style.display = "none";
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginModal").classList.add("active");
  }
}
function closeLogin() { document.getElementById("loginModal").classList.remove("active"); }
async function doLogin() {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl    = document.getElementById("loginError");
  const btn      = document.getElementById("loginBtn");
  errEl.style.display = "none";
  if (!email || !password) { errEl.textContent = "Inserisci email e password."; errEl.style.display = "block"; return; }
  btn.disabled = true; btn.textContent = "Accesso...";
  const { error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = "Accedi";
  if (error) { errEl.textContent = error.message; errEl.style.display = "block"; return; }
  closeLogin();
  resetAdminForm();
  document.getElementById("adminModal").classList.add("active");
}
async function doLogout() { await db.auth.signOut(); }

function closeAdmin() { document.getElementById("adminModal").classList.remove("active"); }
let currentType = "escursione";
function setType(type) {
  currentType = type;
  document.getElementById("postType").value = type;
  document.getElementById("btnEscursione").classList.toggle("active", type === "escursione");
  document.getElementById("btnBlog").classList.toggle("active", type === "blog");
}
function resetAdminForm() {
  document.getElementById("postTitle").value = "";
  document.getElementById("postContent").value = "";
  postImageUrls = [];
  renderMultiPreview();
  document.querySelector("#postDropZone .drop-zone-text").innerHTML =
    "Trascina una o più immagini qui<br><small>oppure clicca per sceglierle dal computer</small>";
  document.getElementById("adminError").style.display = "none";
  setType("escursione");
}

async function addPost() {
  const title   = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const type    = document.getElementById("postType").value;
  const errEl   = document.getElementById("adminError");
  const btn     = document.getElementById("submitBtn");

  errEl.style.display = "none";
  if (!title || !content) {
    errEl.textContent = "Titolo e descrizione sono obbligatori.";
    errEl.style.display = "block";
    return;
  }

  // Store as JSON array string when multiple, single URL when one, null when none
  let imageField = null;
  if (postImageUrls.length === 1) imageField = postImageUrls[0];
  else if (postImageUrls.length > 1) imageField = JSON.stringify(postImageUrls);

  btn.disabled = true; btn.textContent = "Pubblicazione...";
  const { error } = await db.from("posts").insert([
    { title, content, image_url: imageField, type }
  ]);
  btn.disabled = false; btn.textContent = "Pubblica";

  if (error) {
    errEl.textContent = "Errore: " + error.message;
    errEl.style.display = "block";
    return;
  }

  resetAdminForm();
  closeAdmin();
  loadPosts();
}

/* ---- DELETE POST ---- */
let pendingDeleteId = null;

function askDeletePost(id, ev) {
  if (ev) { ev.stopPropagation(); }
  if (!currentUser) { alert("Devi essere loggato come admin."); return; }
  pendingDeleteId = id;
  document.getElementById("confirmModal").classList.add("active");
}
function closeConfirm() {
  document.getElementById("confirmModal").classList.remove("active");
  pendingDeleteId = null;
}
document.getElementById("btnConfirmDelete").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById("btnConfirmDelete");
  btn.disabled = true; btn.textContent = "Eliminazione...";
  const { error } = await db.from("posts").delete().eq("id", pendingDeleteId);
  btn.disabled = false; btn.textContent = "Elimina";
  if (error) { alert("Errore: " + error.message); return; }
  closeConfirm();
  closePost();
  loadPosts();
});

/* ---- CAROUSEL (Instagram-style) ---- */
function buildCarouselHTML(urls, uid, viewable) {
  const slides = urls.map((u, i) =>
  `<div class="carousel-slide">
     <img src="${u}" alt="" loading="lazy"${viewable ? ` onclick="event.stopPropagation();openImageViewerAt(${i})"` : ''}></div>`).join("");
  const dots = urls.length > 1
    ? `<div class="carousel-dots">${urls.map((_,i) => `<div class="carousel-dot ${i===0?'active':''}"></div>`).join("")}</div>`
    : "";
  const counter = urls.length > 1
    ? `<div class="carousel-counter">1/${urls.length}</div>`
    : "";
  const arrows = urls.length > 1
    ? `<button class="carousel-arrow prev" onclick="carouselGo('${uid}',-1,event)" disabled>‹</button>
       <button class="carousel-arrow next" onclick="carouselGo('${uid}',1,event)">›</button>`
    : "";
  return `
    <div class="carousel-track" data-cid="${uid}" data-index="0" data-len="${urls.length}">${slides}</div>
    ${arrows}${dots}${counter}
  `;
}
function carouselGo(uid, dir, ev) {
  if (ev) ev.stopPropagation();
  const track = document.querySelector(`.carousel-track[data-cid="${uid}"]`);
  if (!track) return;
  const len = parseInt(track.dataset.len, 10);
  let idx = parseInt(track.dataset.index, 10) + dir;
  idx = Math.max(0, Math.min(len - 1, idx));
  track.dataset.index = idx;
  track.style.transform = `translateX(-${idx * 100}%)`;
  // dots
  const carousel = track.parentElement;
  carousel.querySelectorAll(".carousel-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
  const counter = carousel.querySelector(".carousel-counter");
  if (counter) counter.textContent = `${idx+1}/${len}`;
  const prev = carousel.querySelector(".carousel-arrow.prev");
  const next = carousel.querySelector(".carousel-arrow.next");
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === len - 1;
}

/* Touch swipe */
function attachSwipe(carouselEl, uid) {
  let startX = 0, deltaX = 0, active = false;
  carouselEl.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX; deltaX = 0; active = true;
  }, { passive: true });
  carouselEl.addEventListener("touchmove", (e) => {
    if (!active) return;
    deltaX = e.touches[0].clientX - startX;
  }, { passive: true });
  carouselEl.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    if (Math.abs(deltaX) > 40) carouselGo(uid, deltaX < 0 ? 1 : -1);
  });
}

/* ---- POST MODAL ---- */
let allPosts = [];
let currentPostIndex = -1;

function openPost(index) {
  const post = allPosts[index];
  if (!post) return;
  currentPostIndex = index;

  document.getElementById("postModalTitle").textContent = post.title;
  document.getElementById("postModalText").textContent  = post.content;

  const dateEl = document.getElementById("postModalDate");
  if (post.created_at) {
    const d = new Date(post.created_at).toLocaleDateString("it-IT", {
      weekday:"long", day:"numeric", month:"long", year:"numeric"
    });
    dateEl.innerHTML = "📅 " + d;
    dateEl.style.display = "flex";
  } else {
    dateEl.style.display = "none";
  }

  const badgeColor = post.type === "escursione"
    ? "background:var(--green-mid);color:white"
    : "background:var(--dark);color:white";

  const imgWrap   = document.getElementById("postModalImgWrap");
  const headPlain = document.getElementById("postModalHeadPlain");
  const carousel  = document.getElementById("postModalCarousel");

  const urls = getImageUrls(post);
  currentModalImages = urls;
  if (urls.length) {
    const uid = "modal_" + Date.now();
    carousel.innerHTML = buildCarouselHTML(urls, uid, true);
    attachSwipe(carousel, uid);
    imgWrap.style.display = "block";
    headPlain.style.display = "none";
    const badge = document.getElementById("postModalBadge");
    badge.textContent = post.type;
    badge.setAttribute("style", badgeColor);
  } else {
    carousel.innerHTML = "";
    imgWrap.style.display = "none";
    headPlain.style.display = "flex";
    document.getElementById("postModalTypePlain").textContent = post.type;
  }

  // Scroll al top del contenuto
  const content = document.querySelector(".post-modal-content");
  if (content) content.scrollTop = 0;

  // Wire delete button to current post
  const delBtn = document.getElementById("btnDeleteFromModal");
  delBtn.onclick = (e) => askDeletePost(post.id, e);

  document.getElementById("postModal").classList.add("active");
}
function closePost() { document.getElementById("postModal").classList.remove("active"); }
function navigatePost(dir) {
  const next = currentPostIndex + dir;
  if (next >= 0 && next < allPosts.length) openPost(next);
}

/* ---- CARDS ---- */
function buildCard(post, index) {
  const type    = post.type;
  const excerpt = post.content.length > 100 ? post.content.substring(0, 100) + "…" : post.content;
  const dateStr = post.created_at
    ? new Date(post.created_at).toLocaleDateString("it-IT", { day:"numeric", month:"long", year:"numeric" })
    : "";

  const urls = getImageUrls(post);
  const uid  = "c_" + post.id + "_" + index;

  const mediaHtml = urls.length
    ? `<div class="card-carousel" onclick="openPost(${index})">
         ${buildCarouselHTML(urls, uid, false)}
         <span class="card-badge ${type}">${type}</span>
       </div>`
    : `<div class="card-placeholder ${type}" onclick="openPost(${index})">${type === "escursione" ? "⛰" : "✍"}</div>`;

  return `
    <article class="card" data-post-id="${post.id}">
      ${mediaHtml}
      <button class="card-delete" title="Elimina post" onclick="askDeletePost(${post.id}, event)">🗑</button>
      <div class="card-body" onclick="openPost(${index})">
        <h3 class="card-title">${post.title}</h3>
        <p class="card-excerpt">${excerpt}</p>
        <div class="card-footer">
          ${dateStr ? `<span class="card-date">📅 ${dateStr}</span>` : "<span></span>"}
          <span class="card-read">Leggi →</span>
        </div>
      </div>
    </article>`;
}

/* ---- LOAD POSTS ---- */
async function loadPosts() {
  const escWrap  = document.getElementById("escursioniContainer");
  const blogWrap = document.getElementById("blogContainer");

  const { data, error } = await db.from("posts").select("*").order("id", { ascending: false });
  if (error || !data) {
    escWrap.innerHTML  = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento dei dati</p></div>`;
    blogWrap.innerHTML = escWrap.innerHTML;
    return;
  }

  allPosts = data;
  const escursioni = data.filter(p => p.type === "escursione");
  const blog       = data.filter(p => p.type === "blog");

  escWrap.innerHTML = escursioni.length
    ? escursioni.map(p => buildCard(p, data.indexOf(p))).join("")
    : `<div class="empty-state"><div class="empty-icon">⛰</div><p>Nessuna escursione disponibile al momento</p></div>`;

  blogWrap.innerHTML = blog.length
    ? blog.map(p => buildCard(p, data.indexOf(p))).join("")
    : `<div class="empty-state"><div class="empty-icon">✍</div><p>Nessun articolo disponibile al momento</p></div>`;

  // Attach swipe handlers to all card carousels
  document.querySelectorAll(".card-carousel").forEach(c => {
    const track = c.querySelector(".carousel-track");
    if (track) attachSwipe(c, track.dataset.cid);
  });
}

if (db) loadPosts();

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    openAdmin();
  }
});

let tapCount = 0;
let tapTimer = null;
const hero = document.getElementById('home');
if (hero) {
  hero.addEventListener('touchend', function(e) {
    if (e.target.closest('a, button')) return;
    tapCount++;
    clearTimeout(tapTimer);
    if (tapCount >= 5) {
      tapCount = 0;
      openAdmin();
    } else {
      tapTimer = setTimeout(function() { tapCount = 0; }, 2000);
    }
  });
}








  

let currentModalImages = [];
let currentViewerIndex = 0;

function openImageViewerAt(index) {
  if (!currentModalImages.length) return;
  currentViewerIndex = index;
  document.getElementById("viewerImg").src = currentModalImages[currentViewerIndex];
  updateViewerNav();
  document.getElementById("imageViewer").style.display = "flex";
}
function imageViewerNav(dir) {
  const next = currentViewerIndex + dir;
  if (next < 0 || next >= currentModalImages.length) return;
  currentViewerIndex = next;
  document.getElementById("viewerImg").src = currentModalImages[currentViewerIndex];
  updateViewerNav();
}
function updateViewerNav() {
  const prev = document.getElementById("viewerPrev");
  const next = document.getElementById("viewerNext");
  if (prev) prev.style.display = currentViewerIndex > 0 ? "flex" : "none";
  if (next) next.style.display = currentViewerIndex < currentModalImages.length - 1 ? "flex" : "none";
}
function closeImageViewer() {
  document.getElementById("imageViewer").style.display = "none";
}
document.getElementById("imageViewer").addEventListener("click", closeImageViewer);




