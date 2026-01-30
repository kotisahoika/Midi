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

let midi = null;
let selectedTracks = [];

const keyHeight = 16;
const keyboardWidth = 60;
const pixelsPerBeat = 80;

let isPlaying = false;

/* ===============================
   MIDI 読み込み
================================ */
midiInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  midi = new Midi(buffer);

  buildTrackList();
  redraw();
});

/* ===============================
   トラック一覧
================================ */
function buildTrackList() {
  trackList.innerHTML = "";
  selectedTracks = [];

  midi.tracks.forEach((track, index) => {
    if (track.notes.length === 0) return;

    selectedTracks.push(index);

    const label = document.createElement("label");
    label.className = "track";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.onchange = () => {
      if (cb.checked) {
        if (!selectedTracks.includes(index)) {
          selectedTracks.push(index);
        }
      } else {
        selectedTracks = selectedTracks.filter(i => i !== index);
      }
      redraw();
    };

    label.appendChild(cb);
    label.append(` Track ${index + 1}`);
    trackList.appendChild(label);
  });
}

/* ===============================
   再描画
================================ */
function redraw() {
  if (!midi) return;

  const totalBeats = midi.durationTicks / midi.header.ppq;

  rollCanvas.width = totalBeats * pixelsPerBeat;
  rollCanvas.height = 128 * keyHeight;

  keyboardCanvas.width = keyboardWidth;
  keyboardCanvas.height = rollCanvas.height;

  rCtx.clearRect(0, 0, rollCanvas.width, rollCanvas.height);
  kCtx.clearRect(0, 0, keyboardCanvas.width, keyboardCanvas.height);

  drawKeyboard();
  drawGrid();
  drawNotes();
}

/* ===============================
   鍵盤描画
================================ */
function drawKeyboard() {
  for (let midiNote = 0; midiNote < 128; midiNote++) {
    const y = rollCanvas.height - (midiNote + 1) * keyHeight;
    const isBlack = [1, 3, 6, 8, 10].includes(midiNote % 12);

    kCtx.fillStyle = isBlack ? "#333" : "#666";
    kCtx.fillRect(0, y, keyboardWidth, keyHeight);

    if (midiNote % 12 === 0) {
      kCtx.fillStyle = "#fff";
      kCtx.font = "10px sans-serif";
      kCtx.fillText(noteName(midiNote), 4, y + 12);
    }
  }
}

/* ===============================
   小節・拍グリッド
================================ */
function drawGrid() {
  const beats = rollCanvas.width / pixelsPerBeat;

  for (let b = 0; b <= beats; b++) {
    rCtx.strokeStyle = b % 4 === 0 ? "#444" : "#2a2a2a";
    rCtx.beginPath();
    rCtx.moveTo(b * pixelsPerBeat, 0);
    rCtx.lineTo(b * pixelsPerBeat, rollCanvas.height);
    rCtx.stroke();
  }
}

/* ===============================
   ノーツ描画（★ここが一番重要）
================================ */
function drawNotes() {
  selectedTracks.forEach((trackIndex, colorIndex) => {
    const track = midi.tracks[trackIndex];
    const color = `hsl(${colorIndex * 60}, 70%, 60%)`;

    rCtx.fillStyle = color;

    track.notes.forEach(note => {
      const x =
        (note.ticks / midi.header.ppq) * pixelsPerBeat;
      const width =
        (note.durationTicks / midi.header.ppq) * pixelsPerBeat;
      const y =
        rollCanvas.height - (note.midi + 1) * keyHeight;

      rCtx.fillRect(x, y, width, keyHeight - 1);
    });
  });
}

/* ===============================
   ノーツタップ判定
================================ */
rollCanvas.addEventListener("click", e => {
  const rect = rollCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left + rollScroll.scrollLeft;
  const y = e.clientY - rect.top;

  const midiNote = Math.floor(
    (rollCanvas.height - y) / keyHeight
  );

  noteInfo.textContent = `音名: ${noteName(midiNote)}`;
});

/* ===============================
   再生処理（最小・安定版）
================================ */
playBtn.onclick = async () => {
  if (!midi) return;

  await Tone.start();
  Tone.Transport.stop();
  Tone.Transport.cancel();

  selectedTracks.forEach(trackIndex => {
    const synth = new Tone.PolySynth().toDestination();
    const track = midi.tracks[trackIndex];

    track.notes.forEach(note => {
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
};

/* ===============================
   停止
================================ */
stopBtn.onclick = () => {
  Tone.Transport.stop();
  isPlaying = false;
};

/* ===============================
   音名変換
================================ */
function noteName(n) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[n % 12] + (Math.floor(n / 12) - 1);
}
