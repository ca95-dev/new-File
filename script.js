// Grab page elements by ID
const heroModel = document.getElementById("heroModel");
const fileUser = document.getElementById("fileUser");
const fileCloth = document.getElementById("fileCloth");
const thumbUser = document.getElementById("thumbUser");
const thumbCloth = document.getElementById("thumbCloth");
const msgUser = document.getElementById("msgUser");
const msgCloth = document.getElementById("msgCloth");
const statusText = document.getElementById("statusText");
const outCanvas = document.getElementById("outCanvas");
const emptyText = document.getElementById("emptyText");
const tuneBox = document.getElementById("tuneBox");
const sizeRange = document.getElementById("sizeRange");
const xRange = document.getElementById("xRange");
const yRange = document.getElementById("yRange");
const rmBgCheck = document.getElementById("rmBgCheck");

const btnPickUser = document.getElementById("btnPickUser");
const btnSampleUser = document.getElementById("btnSampleUser");
const btnPickCloth = document.getElementById("btnPickCloth");
const btnSampleCloth = document.getElementById("btnSampleCloth");
const btnGen = document.getElementById("btnGen");
const btnReset = document.getElementById("btnReset");
const btnSave = document.getElementById("btnSave");
const btnSwap = document.getElementById("btnSwap");

const ctx = outCanvas.getContext("2d");
let userPhoto = null;
let clothPhoto = null;

// Hide hero image cleanly if model.jpg is not added yet
heroModel.addEventListener("error", () => {
  heroModel.style.display = "none";
});

function updateStatus() {
  btnGen.disabled = !(userPhoto && clothPhoto);
  if (userPhoto && clothPhoto) {
    statusText.textContent = "Ready. Press Generate try on.";
  } else if (userPhoto) {
    statusText.textContent = "Add the clothing photo to continue.";
  } else if (clothPhoto) {
    statusText.textContent = "Add your photo to continue.";
  } else {
    statusText.textContent = "Add both photos to continue.";
  }
}

function resetResult() {
  outCanvas.style.display = "none";
  emptyText.style.display = "block";
  tuneBox.hidden = true;
  btnSave.disabled = true;
  btnSwap.disabled = true;
}

function shrinkImage(img, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function handleUpload(type, file) {
  if (!file) return;
  const msgEl = type === "user" ? msgUser : msgCloth;

  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    msgEl.textContent = "Use JPG, PNG, or WebP.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    msgEl.textContent = "File must be under 10 MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = shrinkImage(img, type === "user" ? 900 : 700);
      const thumbHtml = `<img src="${canvas.toDataURL("image/jpeg", 0.8)}" alt="Preview" />`;
      if (type === "user") {
        userPhoto = canvas;
        thumbUser.innerHTML = thumbHtml;
      } else {
        clothPhoto = canvas;
        thumbCloth.innerHTML = thumbHtml;
      }
      msgEl.textContent = file.name;
      resetResult();
      updateStatus();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadSampleUser() {
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 840;
  const x = canvas.getContext("2d");

  x.fillStyle = "#B1C7D4";
  x.fillRect(0, 0, 560, 840);
  x.fillStyle = "#849AAD";
  x.beginPath();
  x.roundRect(80, 52, 400, 788, [200, 200, 16, 16]);
  x.fill();

  if (heroModel.complete && heroModel.naturalWidth > 0) {
    x.drawImage(heroModel, 14, 16, 532, 790);
  }

  userPhoto = canvas;
  thumbUser.innerHTML = `<img src="${canvas.toDataURL("image/jpeg", 0.8)}" alt="Sample user" />`;
  msgUser.textContent = "Sample photo loaded.";
  resetResult();
  updateStatus();
}

function loadSampleCloth() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const x = canvas.getContext("2d");

  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, 400, 400);
  x.fillStyle = "#5E1C23";
  x.fill(
    new Path2D(
      "M110 70L160 50Q200 80 240 50L290 70L350 140L305 170L280 140L280 340L120 340L120 140L95 170L50 140Z"
    )
  );

  clothPhoto = canvas;
  thumbCloth.innerHTML = `<img src="${canvas.toDataURL("image/jpeg", 0.8)}" alt="Sample clothing" />`;
  msgCloth.textContent = "Sample clothing loaded.";
  resetResult();
  updateStatus();
}

function removeBackground(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const clean = document.createElement("canvas");
  clean.width = w;
  clean.height = h;
  const x = clean.getContext("2d");
  x.drawImage(sourceCanvas, 0, 0);

  const imageData = x.getImageData(0, 0, w, h);
  const p = imageData.data;
  const seen = new Uint8Array(w * h);
  const bg = [p[0], p[1], p[2]];
  const stack = [];

  for (let i = 0; i < w; i++) stack.push(i, (h - 1) * w + i);
  for (let i = 0; i < h; i++) stack.push(i * w, i * w + w - 1);

  while (stack.length > 0) {
    const idx = stack.pop();
    const o = idx * 4;
    const isBg =
      Math.abs(p[o] - bg[0]) <= 34 &&
      Math.abs(p[o + 1] - bg[1]) <= 34 &&
      Math.abs(p[o + 2] - bg[2]) <= 34;

    if (seen[idx] || !isBg) continue;
    seen[idx] = 1;
    p[o + 3] = 0;

    const cx = idx % w;
    const cy = Math.floor(idx / w);
    if (cx > 0) stack.push(idx - 1);
    if (cx < w - 1) stack.push(idx + 1);
    if (cy > 0) stack.push(idx - w);
    if (cy < h - 1) stack.push(idx + w);
  }

  x.putImageData(imageData, 0, 0);
  return clean;
}

function drawPreview() {
  if (!userPhoto || !clothPhoto) return;

  const W = userPhoto.width;
  const H = userPhoto.height;
  outCanvas.width = W;
  outCanvas.height = H;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(userPhoto, 0, 0);

  const cloth = rmBgCheck.checked ? removeBackground(clothPhoto) : clothPhoto;
  const box =
    H / W > 1.3
      ? { x: 0.25 * W, y: 0.14 * H, w: 0.5 * W, h: 0.3 * H }
      : { x: 0.2 * W, y: 0.3 * H, w: 0.6 * W, h: 0.5 * H };

  const scale = Math.min(box.w / cloth.width, box.h / cloth.height) * (sizeRange.value / 100);
  const dw = cloth.width * scale;
  const dh = cloth.height * scale;
  const dx = box.x + (box.w - dw) / 2 + (xRange.value / 100) * W;
  const dy = box.y + (box.h - dh) / 3 + (yRange.value / 100) * H;

  ctx.drawImage(cloth, dx, dy, dw, dh);

  outCanvas.style.display = "block";
  emptyText.style.display = "none";
  tuneBox.hidden = false;
  btnSave.disabled = false;
  btnSwap.disabled = false;
}

function swapClothing() {
  clothPhoto = null;
  thumbCloth.innerHTML = "<span>No photo</span>";
  msgCloth.textContent = "";
  resetResult();
  updateStatus();
}

function startOver() {
  userPhoto = null;
  thumbUser.innerHTML = "<span>No photo</span>";
  msgUser.textContent = "";
  sizeRange.value = 100;
  xRange.value = 0;
  yRange.value = 0;
  swapClothing();
}

// Connect button and input events
btnPickUser.addEventListener("click", () => fileUser.click());
btnPickCloth.addEventListener("click", () => fileCloth.click());
btnSampleUser.addEventListener("click", loadSampleUser);
btnSampleCloth.addEventListener("click", loadSampleCloth);
fileUser.addEventListener("change", () => {
  handleUpload("user", fileUser.files[0]);
  fileUser.value = "";
});
fileCloth.addEventListener("change", () => {
  handleUpload("cloth", fileCloth.files[0]);
  fileCloth.value = "";
});

btnGen.addEventListener("click", () => {
  drawPreview();
  statusText.textContent = "Done. Download the image or try different clothing.";
});
btnReset.addEventListener("click", startOver);
btnSwap.addEventListener("click", swapClothing);
btnSave.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = outCanvas.toDataURL("image/png");
  link.download = "projectrial-try-on.png";
  link.click();
});

sizeRange.addEventListener("input", drawPreview);
xRange.addEventListener("input", drawPreview);
yRange.addEventListener("input", drawPreview);
rmBgCheck.addEventListener("change", drawPreview);
