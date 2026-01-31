const fileInput = document.getElementById("midiFile");
const notesLayer = document.getElementById("notes");
const gridCanvas = document.getElementById("grid");
const roll = document.getElementById("roll-wrapper");
const playhead = document.getElementById("playhead");

const PX_PER_BEAT = 80;
const NOTE_HEIGHT = 16;

let midi;
let synth;
let isPlaying = false;
let startTime = 0;

/* ===== MIDI読み込み ===== */
fileInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  midi = new Midi(arrayBuffer);

  renderGrid();
  renderNotes();
  autoScroll();
});

/* ===== グリッド描画（拍） ===== */
function renderGrid() {
  const beats = Math.ceil(midi.duration / midi.header.secondsPerBeat);
  gridCanvas.width = beats * PX_PER_BEAT;
  gridCanvas.height = 128 * NOTE_HEIGHT;

  const ctx = gridCanvas.getContext("2d");
  ctx.strokeStyle = "#333";

  for (let i = 0; i < beats; i++) {
    ctx.beginPath();
    ctx.moveTo(i * PX_PER_BEAT, 0);
    ctx.lineTo(i * PX_PER_BEAT, gridCanvas.height);
    ctx.stroke();
  }
}

/* ===== ノーツ描画（全トラック） ===== */
function renderNotes() {
  notesLayer.innerHTML = "";

  midi.tracks.forEach((track, tIndex) => {
    const color = `hsl(${tIndex * 60},70%,60%)`;

    track.notes.forEach(note => {
      const div = document.createElement("div");
      div.className = "note";
      div.style.background = color;

      const x = note.time / midi.header.secondsPerBeat * PX_PER_BEAT;
      const y = (127 - note.midi) * NOTE_HEIGHT;

      div.style.left = x + "px";
      div.style.top = y + "px";
      div.style.width = note.duration / midi.header.secondsPerBeat * PX_PER_BEAT + "px";

      div.title = note.name;
      notesLayer.appendChild(div);
    });
  });
}

/* ===== 自動スクロール ===== */
function autoScroll() {
  const first = document.querySelector(".note");
  if (!first) return;
  roll.scrollTop = Math.max(0, first.offsetTop - 200);
}

/* ===== 再生 ===== */
document.getElementById("play").onclick = async () => {
  if (!midi || isPlaying) return;

  await Tone.start();
  synth = new Tone.PolySynth().toDestination();

  startTime = Tone.now();
  isPlaying = true;

  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      synth.triggerAttackRelease(
        note.name,
        note.duration,
        startTime + note.time
      );
    });
  });

  requestAnimationFrame(updatePlayhead);
};

document.getElementById("stop").onclick = () => {
  Tone.Transport.stop();
  isPlaying = false;
};

/* ===== 再生位置表示 ===== */
function updatePlayhead() {
  if (!isPlaying) return;

  const elapsed = Tone.now() - startTime;
  const x = elapsed / midi.header.secondsPerBeat * PX_PER_BEAT;
  playhead.style.left = x + "px";

  roll.scrollLeft = Math.max(0, x - roll.clientWidth * 0.3);

  requestAnimationFrame(updatePlayhead);
}
