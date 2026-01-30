let midiData = null;
let players = [];
let isPlaying = false;
let selectedTrackIndex = null;

const fileInput = document.getElementById("midiFile");
const trackList = document.getElementById("trackList");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");

const canvas = document.getElementById("pianoRoll");
const ctx = canvas.getContext("2d");

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

  midiData.tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.textContent = `Track ${index + 1}: ${track.name || "(no name)"}`;
    li.addEventListener("click", () => selectTrack(index));
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
  });
}

function selectTrack(index) {
  selectedTrackIndex = index;

  [...trackList.children].forEach((li, i) => {
    li.classList.toggle("selected", i === index);
  });

  drawPianoRoll(midiData.tracks[index]);
}

function drawPianoRoll(track) {
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

  ctx.fillStyle = "#4caf50";

  notes.forEach(note => {
    const x = note.time * pixelsPerSecond;
    const y = (maxMidi - note.midi) * noteHeight;
    const w = note.duration * pixelsPerSecond;
    const h = noteHeight - 1;

    ctx.fillRect(x, y, w, h);
  });
}

async function playMidi() {
  if (isPlaying) return;
  await Tone.start();
  Tone.Transport.start();
  isPlaying = true;
}

function stopMidi() {
  Tone.Transport.stop();
  Tone.Transport.seconds = 0;
  isPlaying = false;
}
