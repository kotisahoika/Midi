let midiData;
let parts = [];
let selectedTrack = null;
let isPlaying = false;

const fileInput = document.getElementById("midiFile");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const trackList = document.getElementById("trackList");

const rollCanvas = document.getElementById("pianoRoll");
const keyCanvas = document.getElementById("keyboard");
const rollCtx = rollCanvas.getContext("2d");
const keyCtx = keyCanvas.getContext("2d");

const noteInfo = document.getElementById("noteInfo");

const PPS = 100;
const NOTE_H = 14;

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

function draw() {
  if (selectedTrack === null) return;
  const notes = midiData.tracks[selectedTrack].notes;

  const min = Math.min(...notes.map(n => n.midi));
  const max = Math.max(...notes.map(n => n.midi));
  const dur = Math.max(...notes.map(n => n.time + n.duration));

  rollCanvas.width = dur * PPS;
  rollCanvas.height = (max - min + 1) * NOTE_H;
  keyCanvas.height = rollCanvas.height;

  drawKeyboard(min, max);

  const now = Tone.Transport.seconds;

  notes.forEach(n => {
    const x = n.time * PPS;
    const y = (max - n.midi) * NOTE_H;
    const w = n.duration * PPS;

    const active = now >= n.time && now <= n.time + n.duration;
    rollCtx.fillStyle = active ? "#ff7043" : "#4caf50";
    rollCtx.fillRect(x, y, w, NOTE_H - 2);
  });

  // 再生ヘッド
  rollCtx.strokeStyle = "red";
  rollCtx.beginPath();
  rollCtx.moveTo(now * PPS, 0);
  rollCtx.lineTo(now * PPS, rollCanvas.height);
  rollCtx.stroke();
}

function drawKeyboard(min, max) {
  keyCtx.clearRect(0, 0, keyCanvas.width, keyCanvas.height);

  for (let m = min; m <= max; m++) {
    const y = (max - m) * NOTE_H;
    const isBlack = [1, 3, 6, 8, 10].includes(m % 12);

    keyCtx.fillStyle = isBlack ? "#333" : "#eee";
    keyCtx.fillRect(0, y, keyCanvas.width, NOTE_H - 1);

    if (!isBlack) {
      keyCtx.fillStyle = "#000";
      keyCtx.fillText(midiToNote(m), 4, y + 11);
    }
  }
}

function midiToNote(m) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[m % 12] + (Math.floor(m / 12) - 1);
}

function onRollClick(e) {
  if (selectedTrack === null) return;
  const rect = rollCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const notes = midiData.tracks[selectedTrack].notes;
  const min = Math.min(...notes.map(n => n.midi));
  const max = Math.max(...notes.map(n => n.midi));

  for (const n of notes) {
    const nx = n.time * PPS;
    const ny = (max - n.midi) * NOTE_H;
    const nw = n.duration * PPS;

    if (x >= nx && x <= nx + nw && y >= ny && y <= ny + NOTE_H) {
      noteInfo.textContent =
        `音: ${n.name} / 開始: ${n.time.toFixed(2)}s / 長さ: ${n.duration.toFixed(2)}s`;
      return;
    }
  }
}

function animate() {
  if (!isPlaying) return;
  draw();
  requestAnimationFrame(animate);
}
