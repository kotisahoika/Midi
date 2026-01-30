let midiData = null;
let players = [];
let trackStates = [];
let isPlaying = false;
let selectedTrackIndex = null;

const fileInput = document.getElementById("midiFile");
const trackList = document.getElementById("trackList");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");

const canvas = document.getElementById("pianoRoll");
const ctx = canvas.getContext("2d");

let animationId = null;

fileInput.addEventListener("change", handleFile);
playBtn.addEventListener("click", playMidi);
stopBtn.addEventListener("click", stopMidi);

async function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  midiData = new Midi(arrayBuffer);

  setupTracks();
  playBtn.disabled = false;
  stopBtn.disabled = false;
}

function setupTracks() {
  trackList.innerHTML = "";
  players.forEach(p => p.dispose());
  players = [];
  trackStates = [];

  midiData.tracks.forEach((track, index) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "track-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;

    checkbox.addEventListener("change", () => {
      players[index].volume.value = checkbox.checked ? 0 : -Infinity;
      trackStates[index].enabled = checkbox.checked;
    });

    const label = document.createElement("span");
    label.textContent = `Track ${index + 1}: ${track.name || "(no name)"}`;
    label.addEventListener("click", () => selectTrack(index));

    row.appendChild(checkbox);
    row.appendChild(label);
    li.appendChild(row);
    trackList.appendChild(li);

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    track.notes.forEach(note => {
      synth.triggerAttackRelease(
        note.name,
        note.duration,
        note.time,
        note.velocity
      );
    });

    players.push(synth);
    trackStates.push({ enabled: true });
  });
}

function selectTrack(index) {
  selectedTrackIndex = index;

  [...trackList.children].forEach((li, i) => {
    li.classList.toggle("selected", i === index);
  });

  drawPianoRoll();
}

function drawPianoRoll() {
  if (selectedTrackIndex === null) return;

  const track = midiData.tracks[selectedTrackIndex];
  const notes = track.notes;
  if (notes.length === 0) return;

  const pixelsPerSecond = 100;
  const noteHeight = 6;

  const minMidi = Math.min(...notes.map(n => n.midi));
  const maxMidi = Math.max(...notes.map(n => n.midi));
  const pitchRange = maxMidi - minMidi + 1;

  const duration = Math.max(...notes.map(n => n.time + n.duration));

  canvas.width = duration * pixelsPerSecond;
  canvas.height = pitchRange * noteHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const currentTime = Tone.Transport.seconds;

  notes.forEach(note => {
    const x = note.time * pixelsPerSecond;
    const y = (maxMidi - note.midi) * noteHeight;
    const w = note.duration * pixelsPerSecond;
    const h = noteHeight - 1;

    const isActive =
      currentTime >= note.time &&
      currentTime <= note.time + note.duration;

    ctx.fillStyle = isActive ? "#ff7043" : "#4caf50";
    ctx.fillRect(x, y, w, h);
  });

  // 再生ヘッド
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(currentTime * pixelsPerSecond, 0);
  ctx.lineTo(currentTime * pixelsPerSecond, canvas.height);
  ctx.stroke();
}

async function playMidi() {
  if (isPlaying) return;

  await Tone.start();
  Tone.Transport.start();
  isPlaying = true;
  animationLoop();
}

function stopMidi() {
  Tone.Transport.stop();
  Tone.Transport.seconds = 0;
  isPlaying = false;
  cancelAnimationFrame(animationId);
  drawPianoRoll();
}

function animationLoop() {
  drawPianoRoll();
  animationId = requestAnimationFrame(animationLoop);
}
