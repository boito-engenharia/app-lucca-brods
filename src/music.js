// ===== BRODS — música procedural (WebAudio, sem arquivos) =====
'use strict';

const MUSIC = (() => {
  let ctx = null, master = null, out = null, started = false, mood = 'menu', timer = null, nextT = 0, step = 0;
  let wind = null, windGain = null, windFilter = null, owlT = 0, enabled = true, vol = .5;
  const A = 55; // lá 1
  const n = (semi) => A * Math.pow(2, semi / 12);
  // escalas (semitons a partir de lá)
  const MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
  const MOODS = {
    menu:     { bpm: 60,  arp: [12, 15, 19, 24, 19, 15], octave: 1, drone: [0, 7], chord: [0, 3, 7], tick: false, drum: false, density: .5, dark: false },
    calm:     { bpm: 76,  arp: [12, 15, 19, 24, 27, 24, 19, 15], octave: 1, drone: [0, 7], chord: [0, 3, 7], tick: false, drum: false, density: .75, dark: false },
    villain:  { bpm: 84,  arp: [0, 3, 6, 7, 6, 3], octave: 1, drone: [-12, 0], chord: [0, 3, 6], tick: false, drum: false, density: .8, dark: true },
    tense:    { bpm: 150, arp: [12, 13, 15, 18, 15, 13], octave: 1, drone: [0, 6], chord: [0, 3, 6], tick: true, drum: true, density: 1, dark: true },
    meeting:  { bpm: 96,  arp: [12, 15, 19, 24], octave: 1, drone: [0], chord: [0, 3, 7], tick: true, drum: false, density: .45, dark: false },
    vote:     { bpm: 120, arp: [], octave: 1, drone: [0], chord: [], tick: true, drum: true, density: .3, dark: true },
    dark:     { bpm: 66,  arp: [0, 6, 0, 7], octave: 0, drone: [-12], chord: [0, 6], tick: false, drum: false, density: .4, dark: true },
  };
  function ensure() {
    if (ctx) return true;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = enabled ? vol : 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    out = ctx.createGain(); out.gain.value = .9; out.connect(master);
    // vento: ruído filtrado com LFO
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 400; windFilter.Q.value = .8;
    windGain = ctx.createGain(); windGain.gain.value = .05;
    wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(out); wind.start();
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .08; lfoG.gain.value = 250; lfo.connect(lfoG); lfoG.connect(windFilter.frequency); lfo.start();
    const lfo2 = ctx.createOscillator(), lfo2G = ctx.createGain(); lfo2.frequency.value = .13; lfo2G.gain.value = .03; lfo2.connect(lfo2G); lfo2G.connect(windGain.gain); lfo2.start();
    return true;
  }
  function env(g, t, a, d, s, r, peak) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.linearRampToValueAtTime(peak * s, t + a + d); g.gain.setValueAtTime(peak * s, t + a + d); g.gain.linearRampToValueAtTime(0, t + a + d + r); }
  function note(freq, t, dur, type, peak, filt) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    let last = o; if (filt) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); last = f; }
    last.connect(g); g.connect(out); env(g, t, .02, dur * .3, .6, dur * .7, peak); o.start(t); o.stop(t + dur + .1);
  }
  function organ(semis, t, dur, peak) {
    for (const s of semis) for (const det of [-4, 4]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = n(s + 12); o.detune.value = det; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; o.connect(f); f.connect(g); g.connect(out); env(g, t, .6, dur * .2, .7, dur * .6, peak / 2); o.start(t); o.stop(t + dur + 1); }
  }
  function drone(semis, t, dur) { for (const s of semis) note(n(s), t, dur, 'triangle', .05, 300); }
  function tick(t) { note(1600, t, .05, 'square', .025); }
  function drum(t, strong) { const b = ctx.createBuffer(1, ctx.sampleRate * .15, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = strong ? .18 : .09; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; s.connect(f); f.connect(g); g.connect(out); s.start(t); const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + .2); og.gain.setValueAtTime(strong ? .3 : .15, t); og.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(og); og.connect(out); o.start(t); o.stop(t + .3); }
  function owl(t) { for (const [f, dt, dur] of [[420, 0, .35], [380, .45, .5]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(out); env(g, t + dt, .08, .1, .8, dur, .07); o.start(t + dt); o.stop(t + dt + dur + .3); } }
  function schedule() {
    if (!started || !ctx) return;
    const m = MOODS[mood] || MOODS.calm; const beat = 60 / m.bpm;
    while (nextT < ctx.currentTime + .35) {
      const t = nextT;
      if (step % 16 === 0) { drone(m.drone, t, beat * 16); if (m.chord.length && Math.random() < .8) organ(m.chord, t, beat * 8, m.dark ? .06 : .045); }
      if (m.arp.length && Math.random() < m.density) { const s = m.arp[step % m.arp.length] + 12 * m.octave; note(n(s), t, beat * .9, m.dark ? 'sawtooth' : 'triangle', m.dark ? .045 : .06, m.dark ? 900 : 2500); }
      if (m.tick && step % 2 === 0) tick(t);
      if (m.drum) { if (step % 4 === 0) drum(t, true); else if (step % 2 === 0 && m.bpm > 110) drum(t, false); }
      if (Math.random() < .02 && !m.drum) { const s = m.arp.length ? m.arp[Math.floor(Math.random() * m.arp.length)] : 12; note(n(s + 24), t, beat * 2, 'sine', .03); }
      nextT += beat; step++;
    }
    if (ctx.currentTime > owlT) { if (Math.random() < .5 && !m.drum) owl(ctx.currentTime + .1); owlT = ctx.currentTime + 14 + Math.random() * 20; }
  }
  function start() {
    if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume();
    if (started) return; started = true; nextT = ctx.currentTime + .1; step = 0; owlT = ctx.currentTime + 8;
    timer = setInterval(schedule, 100);
  }
  function stop() { started = false; clearInterval(timer); timer = null; }
  function setMood(m) { if (MOODS[m] && m !== mood) { mood = m; step = 0; if (windGain) windGain.gain.setTargetAtTime(m === 'tense' || m === 'dark' ? .12 : .05, ctx.currentTime, 1); } if (!started) start(); }
  function setEnabled(on) { enabled = on; if (master) master.gain.setTargetAtTime(on ? vol : 0, ctx.currentTime, .05); }
  return { start, stop, setMood, setEnabled, get mood() { return mood; } };
})();
