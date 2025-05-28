// utils/speech.js
export const speak = (text, voiceName = "Google US English", onEnd = null) => {
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.name === voiceName) || voices[0];

  if (!text || !voice) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  if (onEnd) utterance.onend = onEnd;

  speechSynthesis.cancel(); // Stop previous TTS
  speechSynthesis.speak(utterance);
};
