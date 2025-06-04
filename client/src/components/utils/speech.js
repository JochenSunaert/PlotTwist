export const speak = (text, onEnd = null) => {
  const trySpeak = () => {
    const voices = speechSynthesis.getVoices();

    // Prefer English voices (en-*), fallback to default if needed
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (!text || !englishVoice) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = englishVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    if (onEnd) utterance.onend = onEnd;

    speechSynthesis.cancel(); // Stop anything already speaking
    speechSynthesis.speak(utterance);
  };

  // Wait for voices to load
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = trySpeak;
  } else {
    trySpeak();
  }
};
