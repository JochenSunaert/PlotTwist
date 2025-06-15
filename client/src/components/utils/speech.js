// This file exports a `speak` function designed to provide Text-to-Speech (TTS) functionality.
// It allows the application to audibly narrate text, which is particularly useful in a game
// context for reading out prompts, stories, or game events to players.
// The function prioritizes using an English voice if available and provides a callback for
// when the speech finishes.

export const speak = (text, onEnd = null) => {
  const trySpeak = () => {
    const voices = speechSynthesis.getVoices();

    // Prefer English voices (en-*), fallback to default if needed
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (!text || !englishVoice) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = englishVoice;
    utterance.rate = 0.95; // Slightly slower speech rate
    utterance.pitch = 1.05; // Slightly higher pitch

    if (onEnd) utterance.onend = onEnd; // Set a callback for when speech ends

    speechSynthesis.cancel(); // Stop anything already speaking to prevent overlap
    speechSynthesis.speak(utterance); // Start speaking the new text
  };

  // Check if voices are already loaded. If not, wait for them to load.
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = trySpeak; // Trigger trySpeak once voices are available
  } else {
    trySpeak(); // Voices are already loaded, speak immediately
  }
};