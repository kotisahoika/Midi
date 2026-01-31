const fileInput = document.getElementById("file");
const keyboard = document.getElementById("keyboard");
const roll = document.getElementById("roll");

const KEY_HEIGHT = 20;
const PIXELS_PER_BEAT = 80;

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const buf = await file.arrayBuffer();
  const midi = new Midi(buf);

  keyboard.innerHTML = "";
  roll.innerHTML = "";

  drawKeyboard();
  drawNotes(midi);
};

function drawKeyboard() {
  for (let n = 127; n >= 0; n--) {
    const div = document.createElement("div");
    div.className = "key";

    if ([1,3,6,8,10].includes(n % 12)) {
      div.classList.add("black");
    }

    if (n % 12 === 0) {
      div.textContent = noteName(n);
    }

    keyboard.appendChild(div);
  }
}

function drawNotes(midi) {
  const beats = midi.durationTicks / midi.header.ppq;
  roll.style.width = beats * PIXELS_PER_BEAT + "px";
  roll.style.height = 128 * KEY_HEIGHT + "px";

  midi.tracks.forEach((track, ti) => {
    track.notes.forEach(note => {
      const noteDiv = document.createElement("div");
      noteDiv.className = "note";

      const x = (note.ticks / midi.header.ppq) * PIXELS_PER_BEAT;
      const w = (note.durationTicks / midi.header.ppq) * PIXELS_PER_BEAT;
      const y = (127 - note.midi) * KEY_HEIGHT;

      noteDiv.style.left = x + "px";
      noteDiv.style.top = y + "px";
      noteDiv.style.width = Math.max(w, 4) + "px";
      noteDiv.style.background =
        `hsl(${ti * 60}, 70%, 60%)`;

      noteDiv.onclick = () => {
        alert(noteName(note.midi));
      };

      roll.appendChild(noteDiv);
    });
  });
}

function noteName(n) {
  const t = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return t[n % 12] + (Math.floor(n / 12) - 1);
}
