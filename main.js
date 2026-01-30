const midiInput = document.getElementById("midiInput");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const followPlay = document.getElementById("followPlay");

const keyboardCanvas = document.getElementById("keyboardCanvas");
const rollCanvas = document.getElementById("rollCanvas");
const rollScroll = document.getElementById("rollScroll");
const noteInfo = document.getElementById("noteInfo");
const trackList = document.getElementById("trackList");

const kCtx = keyboardCanvas.getContext("2d");
const rCtx = rollCanvas.getContext("2d");

let midi;
let selectedTracks = [];
let pixelsPerBeat = 60;
let keyHeight = 16;

let synths = [];
let startTime = 0;
let isPlaying = false;

midiInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  midi = new Midi(buffer);

  buildTrackList();
  drawAll();
});

function buildTrackList() {
  trackList.innerHTML = "";
  selectedTracks = [];

  midi.tracks.forEach((track, i) => {
    if (track.notes.length === 0) return;

    const div = document.createElement("div");
    div.className = "track";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.onchange = () => {
      if (cb.checked) selectedTracks.push(i);
      else selectedTracks = selectedTracks.filter(t => t !== i);
      drawAll();
    };

    selectedTracks.push(i);

    div.append(cb, ` Track ${i + 1}`);
    trackList.appendChild(div);
  });
}

function drawAll() {
  if (!midi) return;

  const totalBeats = midi.durationTicks / midi.header.ppq;
  rollCanvas.width = totalBeats * pixelsPerBeat;
  rollCanvas.height = 128 * keyHeight;
  keyboardCanvas.height = rollCanvas.height;

  drawKeyboard();
  drawGrid();
  drawNotes();
}

function drawKeyboard() {
  keyboardCanvas.width = 60;

  for (let n = 0; n < 128; n++) {
    const y = rollCanvas.height - (n + 1) * keyHeight;
    const isBlack = [1,3,6,8,10].includes(n % 12);

    kCtx.fillStyle = isBlack ? "#333" : "#666";
    kCtx.fillRect(0, y, keyboardCanvas.width, keyHeight);

    if (n % 12 === 0) {
      kCtx.fillStyle = "#fff";
      kCtx.fillText(noteName(n), 4, y + 12);
    }
  }
}

function drawGrid() {
  const beats = rollCanvas.width / pixelsPerBeat;

  rCtx.strokeStyle = "#333";
  for (let b = 0; b <= beats; b++) {
    const x = b * pixelsPerBeat;
    rCtx.beginPath();
    rCtx.moveTo(x, 0);
    rCtx.lineTo(x, rollCanvas.height);
    rCtx.stroke();
  }
}

function drawNotes() {
  selectedTracks.forEach((ti, idx) => {
    const track = midi.tracks[ti];
    rCtx.fillStyle = `hsl(${idx * 60}, 70%, 60%)`;

    track.notes.forEach(note => {
      const x = note.ticks / midi.header.ppq * pixelsPerBeat;
      const w = note.durationTicks / midi.header.ppq * pixelsPerBeat;
      const y = rollCanvas.height - (note.midi + 1) * keyHeight;

      rCtx.fillRect(x, y, w, keyHeight - 1);
    });
  });
}

rollCanvas.addEventListener("click", e => {
  const rect = rollCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left + rollScroll.scrollLeft;
  const y = e.clientY - rect.top;

  const midiNote = Math.floor((rollCanvas.height - y) / keyHeight);
  noteInfo.textContent = `音名: ${noteName(midiNote)}`;
});

function noteName(n) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[n % 12] + Math.floor(n / 12 - 1);
}

playBtn.onclick = async () => {
  if (!midi) return;
  await Tone.start();

  Tone.Transport.cancel();
  synths.forEach(s => s.dispose());
  synths = [];

  selectedTracks.forEach(ti => {
    const synth = new Tone.PolySynth().toDestination();
    synths.push(synth);

    midi.tracks[ti].notes.forEach(note => {
      Tone.Transport.schedule(time => {
        synth.triggerAttackRelease(
          Tone.Frequency(note.midi, "midi"),
          note.duration,
          time,
          note.velocity
        );
      }, note.time);
    });
  });

  Tone.Transport.start();
  isPlaying = true;
  startFollow();
};

stopBtn.onclick = () => {
  Tone.Transport.stop();
  isPlaying = false;
};

function startFollow() {
  function loop() {
    if (!isPlaying || !followPlay.checked) return;

    const t = Tone.Transport.seconds;
    rollScroll.scrollLeft = t * pixelsPerBeat * (midi.header.tempos[0]?.bpm || 120) / 60;
    requestAnimationFrame(loop);
  }
  loop();
}
