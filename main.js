let midiData;
let parts = [];
let selectedTrack = null;
let isPlaying = false;

const PPS = 100;
const WHITE_H = 16;
const BLACK_H = 10;

const fileInput = document.getElementById("midiFile");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const trackList = document.getElementById("trackList");

const rollCanvas = document.getElementById("pianoRoll");
const keyCanvas = document.getElementById("keyboard");
const rollCtx = rollCanvas.getContext("2d");
const keyCtx = keyCanvas.getContext("2d");

const noteInfo = document.getElementById("noteInfo");

fileInput.addEventListener("change", loadMidi);
playBtn.addEventListener("click", play);
stopBtn.addEventListener("click", stop);
rollCanvas.addEventListener("click", onRollClick);

async function loadMidi(e) {
  const file = e.target.files[0];
  if (!file) return;

  const buf = await file.arrayBuffer();
  midiData = new Midi(buf);

  setupTracks();
  playBtn.disabled = false;
  stopBtn.disabled = false;
}

function setupTracks() {
  trackList.innerHTML = "";
  parts.forEach(p => p.dispose());
  parts = [];

  midiData.tracks.forEach((track, i) => {
    const li = document.createElement("li");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = true;

    const label = document.createElement("span");
    label.textContent = track.name || `Track ${i + 1}`;
    label.addEventListener("click", () => selectTrack(i));

    check.addEventListener("change", () => {
      parts[i].mute = !check.checked;
    });

    li.appendChild(check);
    li.appendChild(label);
    trackList.appendChild(li);

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();

    const part = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
    }, track.notes).start(0);

    parts.push(part);
  });
}

function selectTrack(i) {
  selectedTrack = i;
  [...trackList.querySelectorAll("span")].forEach((s, idx) =>
    s.classList.toggle("selected", idx === i)
  );
  draw();
}

async function play() {
  if (isPlaying) return;
  await Tone.start();
  Tone.Transport.start();
  isPlaying = true;
  animate();
}

function stop() {
  Tone.Transport.stop();
  Tone.Transport.seconds = 0;
  isPlaying = false;
  draw();
}

function isBlackKey(midi) {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function midiToNote(m) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[m % 12] + (Math.floor(m / 12) - 1);
}

function draw() {
  if (selectedTrack === null) return;

  const notes = midiData.tracks[selectedTrack].notes;
  const min = Math.min(...notes.map(n => n.midi));
  const max = Math.max(...notes.map(n => n.midi));
  const dur = Math.max(...notes.map(n => n.time + n.duration));

  rollCanvas.width = dur * PPS;
  rollCanvas.height = (max - min + 1) * WHITE_H;
  keyCanvas.height = rollCanvas.height;

  drawKeyboardAndGrid(min, max);
  drawNotes(notes, min, max);
}

function drawKeyboardAndGrid(min, max) {
  keyCtx.clearRect(0, 0, keyCanvas.width, keyCanvas.height);
  rollCtx.clearRect(0, 0, rollCanvas.width, rollCanvas.height);

  for (let m = min; m <= max; m++) {
    const row = max - m;
    const black = isBlackKey(m);
    const h = black ? BLACK_H : WHITE_H;
    const y = row * WHITE_H + (black ? (WHITE_H - BLACK_H) / 2 : 0);

    rollCtx.fillStyle = black ? "#1e1e1e" : "#262626";
    rollCtx.fillRect(0, y, rollCanvas.width, h);

    rollCtx.strokeStyle = m % 12 === 0 ? "#444" : "#333";
    rollCtx.lineWidth = m % 12 === 0 ? 2 : 1;
    rollCtx.beginPath();
    rollCtx.moveTo(0, y);
    rollCtx.lineTo(rollCanvas.width, y);
    rollCtx.stroke();

    keyCtx.fillStyle = black ? "#333" : "#eee";
    keyCtx.fillRect(0, y, keyCanvas.width, h);
    keyCtx.strokeStyle = "#000";
    keyCtx.strokeRect(0, y, keyCanvas.width, h);

    if (!black) {
      keyCtx.fillStyle = "#000";
      keyCtx.font = "10px system-ui";
      keyCtx.fillText(midiToNote(m), 4, y + h - 4);
    }
  }
}

function drawNotes(notes, min, max) {
  const now = Tone.Transport.seconds;

  notes.forEach(n => {
    const black = isBlackKey(n.midi);
    const h = black ? BLACK_H : WHITE_H;
    const yBase = (max - n.midi) * WHITE_H;
    const y = yBase + (black ? (WHITE_H - BLACK_H) / 2 : 0);

    const x = n.time * PPS;
    const w = n.duration * PPS;

    const active = now >= n.time && now <= n.time + n.duration;
    rollCtx.fillStyle = active ? "#ff7043" : "#4caf50";
    rollCtx.fillRect(x, y, w, h - 1);
  });

  rollCtx.strokeStyle = "red";
  rollCtx.beginPath();
  rollCtx.moveTo(now * PPS, 0);
  rollCtx.lineTo(now * PPS, rollCanvas.height);
  rollCtx.stroke();
}

function onRollClick(e) {
  if (selectedTrack === null) return;

  const rect = rollCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const notes = midiData.tracks[selectedTrack].notes;
  const max = Math.max(...notes.map(n => n.midi));

  for (const n of notes) {
    const black = isBlackKey(n.midi);
    const h = black ? BLACK_H : WHITE_H;
    const yBase = (max - n.midi) * WHITE_H;
    const ny = yBase + (black ? (WHITE_H - BLACK_H) / 2 : 0);
    const nx = n.time * PPS;
    const nw = n.duration * PPS;

    if (x >= nx && x <= nx + nw && y >= ny && y <= ny + h) {
      noteInfo.textContent = `音: ${n.name} / 開始 ${n.time.toFixed(2)}s / 長さ ${n.duration.toFixed(2)}s`;
      return;
    }
  }
}

function animate() {
  if (!isPlaying) return;
  draw();
  requestAnimationFrame(animate);
}
