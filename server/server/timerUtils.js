function startTimer(duration, intervalCallback, endCallback) {
  let timeLeft = duration;

  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    intervalCallback(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endCallback();
    }
  }, 1000);

  return timerInterval; // Return the interval reference for cleanup
}

module.exports = { startTimer };