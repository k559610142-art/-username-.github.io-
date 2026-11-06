const MonsterActions = (() => {
  const directions = {NW: 0, N: 1, NE: 2, E: 3, SE: 4, S: 5, SW: 6, W: 7};
  const loaded = new Map();
  const walkVectors = {NW: [-24,-12], N: [0,-24], NE: [24,-12], E: [48,0], SE: [24,12], S: [0,24], SW: [-24,12], W: [-48,0]};
  const walkCorrections = new WeakMap();
  function walkOffset(frames, heading, index, legacy = false) {
    if (frames.length < 3) return [0, 0];
    let headings = walkCorrections.get(frames);
    if (!headings) { headings = new Map(); walkCorrections.set(frames, headings); }
    if (!headings.has(heading)) {
      const [vx, vy] = walkVectors[heading] || [0, 0];
      const length = vx * vx + vy * vy;
      let weighted = 0, sumSquares = 0;
      // Fit the baked-in forward translation across the whole clip. Subtract only
      // that component, preserving the original stride and vertical animation.
      for (const [i, frame] of frames.entries()) {
        const [, , w, h, x, y] = legacy ? frame : [null, null, frame[3], frame[4], frame[1], frame[2]];
        const t = (i - (frames.length - 1) / 2) / frames.length;
        weighted += t * ((x + w / 2) * vx + (y + h) * vy);
        sumSquares += t * t;
      }
      const fit = length && weighted / (sumSquares * length);
      headings.set(heading, fit >= .3 ? [vx * Math.min(1.35, fit), vy * Math.min(1.35, fit)] : [0, 0]);
    }
    const [x, y] = headings.get(heading);
    return [x * index / frames.length, y * index / frames.length];
  }
  const asset = file => 'assets/monster-actions/' + file;
  const get = (gfx, heading, clip, weapon) => {
    const key = 'd' + (directions[heading] ?? 5) + '/' + clip;
    const variant = weaponMorphModes[gfx]?.[weapon];
    return weaponMorphFrames[variant]?.[key] || monsterActionIndex[gfx]?.[key];
  };
  const weaponBases = {sword:4, blunt:11, tohandblunt:11, bow:20, singlebow:20, spear:24, singlespear:24, chainsword:24, staff:40, tohandstaff:40, dagger:46, tohandsword:50, edoryu:54, claw:58, kiringku:58, gauntlet:62};
  const equippedWeapon = () => {
    const type = window.OwnedInventory?.equippedWeaponType;
    const gfx = window.activeTransformCard?.p?.gfx;
    return type === 'chainsword' && weaponMorphModes[gfx]?.[83] ? 83 : weaponBases[type];
  };
  const warmed = new Set();
  function warmWeapon(gfx, heading, weapon) {
    if (!gfx) return;
    const key = gfx + '/' + (weapon || 0) + '/' + heading;
    if (warmed.has(key)) return;
    warmed.add(key);
    for (const clip of ['idle', 'attack', 'hurt']) for (const frame of get(gfx, heading, clip, weapon) || []) load(frame[0]);
    for (const dir of Object.keys(directions)) for (const frame of get(gfx, dir, 'walk', weapon) || []) load(frame[0]);
  }
  const duration = frames => frames?.reduce((total, frame) => total + frame[5], 0) || 0;
  function load(file) {
    if (!loaded.has(file)) {
      const image = new Image();
      image.src = asset(file);
      loaded.set(file, image);
    }
    return loaded.get(file);
  }
  function pose(now) {
    const action = characterActionState;
    if (action && now >= action.started && now < action.until) {
      return {clip: action.action, time: now - action.started};
    }
    if (characterDead) return {clip: 'death', time: Infinity};
    if (now < characterWalkUntil) {
      const phase = Math.max(0, Math.min(.999, (now - characterWalkStarted) / Math.max(1, characterWalkDuration)));
      return {clip: 'walk', phase};
    }
    return {clip: 'idle', time: now};
  }
  function paintSprite(element, frame, x, y, scale) {
    const [file, , , w, h, , sx, sy, atlasWidth] = frame;
    const image = load(file);
    if (!image.complete || !image.naturalWidth) return false;
    const style = element.style;
    style.backgroundImage = 'url("' + asset(file) + '")';
    style.backgroundPosition = (-(sx || 0) * scale) + 'px ' + (-(sy || 0) * scale) + 'px';
    style.backgroundSize = (atlasWidth || image.naturalWidth) * scale + 'px auto';
    style.width = w * scale + 'px';
    style.height = h * scale + 'px';
    style.left = x * scale + 'px';
    style.top = y * scale + 'px';
    element.hidden = false;
    return true;
  }
  function paintComposite(layers, overlays, left, top, scale, gfx) {
    if (!overlays) return;
    layers.extras.hidden = false;
    let index = 0;
    for (const [attribute, frame] of overlays) {
      let layer = layers.shadow;
      if (attribute !== 'shadow') {
        layer = layers.extras.children[index++];
        if (!layer) {
          layer = document.createElement('div');
          layer.className = 'transform-atlas';
          layers.extras.append(layer);
        }
        layer.style.zIndex = gfx === 12681 ? (/^dk-original-(20415|20545|20547|20548)-/.test(frame[0]) ? '0' : '2') : '';
        layer.style.mixBlendMode = attribute === 8 ? 'screen' : attribute === 128 ? 'multiply' : 'normal';
      }
      layer.hidden = true;
      paintSprite(layer, frame, left + frame[1], top + frame[2], scale);
    }
    for (; index < layers.extras.children.length; index++) layers.extras.children[index].hidden = true;
  }
  function draw(element, gfx, heading, animation, scale, weapon, layers) {
    const frames = get(gfx, heading, animation.clip, weapon);
    if (!frames?.length) return false;
    for (const frame of frames) load(frame[0]);
    const total = duration(frames);
    const time = animation.phase != null ? animation.phase * total
      : animation.clip === 'idle' ? animation.time % total : Math.min(animation.time, total);
    let index = 0, passed = frames[0][5];
    while (index < frames.length - 1 && time >= passed) passed += frames[++index][5];
    const frame = frames[index];
    const [file, x, y, , , , sx, sy] = frame;
    const [dx, dy] = animation.clip === 'walk' ? walkOffset(frames, heading, index) : [0, 0];
    const left = x - dx, top = y - dy;
    if (!paintSprite(element, frame, left, top, scale)) return false;
    if (layers) element.style.zIndex = gfx === 12681 ? '1' : '';
    if (layers) layers.shadow.hidden = layers.light.hidden = layers.extras.hidden = true;
    const address = [file, sx, sy].join(':');
    if (layers && deathKnightOriginalLayers[gfx]) {
      paintComposite(layers, deathKnightOriginalLayers[gfx][address], left, top, scale, gfx);
    } else if (layers && gfx === 3784) {
      for (const name of ['shadow', 'light']) {
        const layer = layers[name];
        const overlay = deathKnightLayers[name + '/' + address];
        if (overlay) paintSprite(layer, overlay, left + overlay[1], top + overlay[2], scale);
      }
    }
    return true;
  }
  return {
    draw, pose, equippedWeapon, warmWeapon, walkOffset, paintSprite,
    preloadFrames(frames) { for (const frame of frames) load(frame[0]); },
    preload(gfx, heading, clips) { for (const clip of clips) for (const frame of get(gfx, heading, clip) || []) load(frame[0]); },
    has: gfx => !!monsterActionIndex[gfx],
    hasClip: (gfx, heading, clip, weapon) => !!get(gfx, heading, clip, weapon)?.length,
    actionDuration: (gfx, heading, clip, weapon) => duration(get(gfx, heading, clip, weapon))
  };
})();
