export function triggerAtmosphereSwell() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 1.2);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 5.0);
    masterGain.connect(audioCtx.destination);
    
    const subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
    subOsc.connect(masterGain);
    subOsc.start();
    subOsc.stop(audioCtx.currentTime + 5.2);
  } catch (err) {
    // Graceful fallback if audio permissions are denied
  }
}
