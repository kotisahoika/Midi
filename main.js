let midiData = null;
let players = [];
let isPlaying = false;

const fileInput = document.getElementById("midiFile");
const trackList = document.getElementById("trackList");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");

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
    // 表示
    const li = document.createElement("li");
    li.textContent = `Track ${index + 1}: ${track.name || "(no name)"}`;
    trackList.appendChild(li);

    // 音源
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

async function playMidi() {
  if (isPlaying) return;

  await Tone.start(); // スマホ対策（ユーザー操作必須）
  Tone.Transport.start();
  isPlaying = true;
}

function stopMidi() {
  Tone.Transport.stop();
  Tone.Transport.seconds = 0;
  isPlaying = false;
}
