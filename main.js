const midiInput = document.getElementById("midiInput");
const keyboard = document.getElementById("keyboard");
const roll = document.getElementById("roll");
const scroll = document.getElementById("scroll");
const tracksDiv = document.getElementById("tracks");

const playBtn = document.getElementById("play");
const stopBtn = document.getElementById("stop");
const followChk = document.getElementById("follow");
const info = document.getElementById("info");

const kCtx = keyboard.getContext("2d");
const rCtx = roll.getContext("2d");

const KEY_HEIGHT = 18;
const KEYBOARD_WIDTH = 70;
const PIXELS_PER_BEAT = 80;

let midi = null;
let selectedTracks = [];
let isPlaying = false;

/* ========= MIDI LOAD ========= */
midiInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const buf = await file.arrayBuffer();
  midi = new Midi(buf);

  buildTrackList();
  setupCanvas();
  drawAll();
};

/* ========= TRACK LIST ========= */
function buildTrackList() {
  tracksDiv.innerHTML = "";
  selectedTracks = [];

  midi.tracks.forEach((t, i) => {
    if (t.notes.length === 0) return;

    selectedTracks.push(i);

    const label = document.createElement("label");
    label.style.marginRight = "8px";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.onchange = () => {
      if (cb.checked) selectedTracks.push(i);
      else selectedTracks = selectedTracks.filter(v => v !== i);
      drawAll();
    };

    label.append(cb, ` Track ${i + 1}`);
    tracksDiv.append(label);
  });
}

/* ========= CANVAS SETUP ========= */
function setupCanvas() {
  const beats = midi.durationTicks / midi.header.ppq;

  roll.width = beats * PIXELS_PER_BEAT;
  roll.height = 128 * KEY_HEIGHT;

  keyboard.width = KEYBOARD_WIDTH;
  keyboard.height = roll.height;
}

/* ========= DRAW ========= */
function drawAll() {
  drawKeyboard();
  drawGrid();
  drawNotes();
}

function drawKeyboard() {
  for (let n = 0; n < 128; n++) {
    const y = roll.height - (n + 1) * KEY_HEIGHT;
    const black = [1,3,6,8,10].includes(n % 12);

    kCtx.fillStyle = black ? "#333" : "#666";
    const w = black ? KEYBOARD_WIDTH * 0.6 : KEYBOARD_WIDTH;
    kCtx.fillRect(0, y, w, KEY_HEIGHT);

    if (n % 12 === 0) {
      kCtx.fillStyle = "#fff";
      kCtx.font = "10px sans-serif";
      kCtx.fillText(noteName(n), 4, y + 12);
    }
  }
}

function drawGrid() {
  rCtx.clearRect(0, 0, roll.width, roll.height);

  const beats = roll.width / PIXELS_PER_BEAT;
  for (let b = 0; b <= beats; b++) {
    rCtx.strokeStyle = b % 4 === 0 ? "#444" : "#2a2a2a";
    rCtx.beginPath();
    rCtx.moveTo(b * PIXELS_PER_BEAT, 0);
    rCtx.lineTo(b * PIXELS_PER_BEAT, roll.height);
    rCtx.stroke();
  }
}

function drawNotes() {
  selectedTracks.forEach((ti, ci) => {
    const color = `hsl(${ci * 60},70%,60%)`;
    rCtx.fillStyle = color;

    midi.tracks[ti].notes.forEach(n => {
      const x = (n.ticks / midi.header.ppq) * PIXELS_PER_BEAT;
      const w = (n.durationTicks / midi.header.ppq) * PIXELS_PER_BEAT;
      const y = roll.height - (n.midi + 1) * KEY_HEIGHT;
      rCtx.fillRect(x, y, w, KEY_HEIGHT - 2);
    });
  });
}

/* ========= NOTE TAP ========= */
roll.onclick = e => {
  const r = roll.getBoundingClientRect();
  const x = e.clientX - r.left + scroll.scrollLeft;
  const y = e.clientY - r.top;

  const note = Math.floor((roll.height - y) / KEY_HEIGHT);
  info.textContent = `音名: ${noteName(note)}`;
};

/* ========= PLAY ========= */
playBtn.onclick = async () => {
  if (!midi) return;
  await Tone.start();

  Tone.Transport.stop();
  Tone.Transport.cancel();

  selectedTracks.forEach(i => {
    const synth = new Tone.PolySynth().toDestination();
    midi.tracks[i].notes.forEach(n => {
      Tone.Transport.schedule(time => {
        synth.triggerAttackRelease(
          Tone.Frequency(n.midi, "midi"),
          n.duration,
          time,
          n.velocity
        );
      }, n.time);
    });
  });

  Tone.Transport.start();
  isPlaying = true;
  followLoop();
};

stopBtn.onclick = () => {
  Tone.Transport.stop();
  isPlaying = false;
};

/* ========= FOLLOW ========= */
function followLoop() {
  if (!isPlaying || !followChk.checked) return;

  scroll.scrollLeft = Tone.Transport.seconds * PIXELS_PER_BEAT * 2;
  requestAnimationFrame(followLoop);
}

/* ========= UTIL ========= */
function noteName(n) {
  const t = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return t[n % 12] + (Math.floor(n / 12) - 1);
}
