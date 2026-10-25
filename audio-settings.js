/* Shared volume settings for decoded effects and HTML audio, including iOS. */
(() => {
  const levels = {se:100, music:100}, gains = new Map(), elements = new Map();
  let context;
  const clamp = value => Math.max(0, Math.min(100, value));
  for (const kind of Object.keys(levels)) {
    try {
      const stored = localStorage.getItem('psy-volume-' + kind);
      if (stored !== null && Number.isFinite(Number(stored))) levels[kind] = clamp(Number(stored));
    } catch {}
  }
  const scale = (kind, base) => base * levels[kind] / 100;
  function applyElement(el, record) {
    const volume = scale(record.kind, record.base);
    el.muted = volume === 0;
    if (!record.gain) {
      el.volume = volume;
      // Route all media through Web Audio once unlocked. Some mobile browsers
      // report assigned HTML volume values while ignoring the actual change.
      if (context?.state === 'running') {
        try {
          const gain = context.createGain();
          gain.gain.value = volume;
          const source = context.createMediaElementSource(el);
          source.connect(gain);
          gain.connect(context.destination);
          record.source = source;
          record.gain = gain;
        } catch {}
      }
    }
    if (record.gain) {
      el.volume = 1;
      record.gain.gain.value = volume;
    }
  }
  function applyAudio() {
    for (const [gain, base] of gains) gain.gain.value = scale('se', base);
    for (const [el, record] of elements) applyElement(el, record);
  }
  window.GameAudio = {
    scale,
    track(gain, base) { gains.set(gain, base); gain.gain.value = scale('se', base); },
    untrack(gain) { gains.delete(gain); },
    element(el, base, kind = 'se') {
      const record = elements.get(el) || {};
      Object.assign(record, {base, kind});
      elements.set(el, record);
      applyElement(el, record);
    },
    useContext(value) {
      if (context !== value) {
        context = value;
        context.addEventListener('statechange', applyAudio);
      }
      applyAudio();
    }
  };
  for (const [kind, id] of [['se','seVolume'], ['music','musicVolume']]) {
    const input = document.getElementById(id), output = document.getElementById(id + 'Value');
    input.value = levels[kind];
    output.textContent = levels[kind] + '%';
    const change = () => {
      levels[kind] = clamp(Number(input.value));
      output.textContent = levels[kind] + '%';
      try { localStorage.setItem('psy-volume-' + kind, String(levels[kind])); } catch {}
      applyAudio();
    };
    input.addEventListener('input', change);
    input.addEventListener('change', change);
  }
})();
