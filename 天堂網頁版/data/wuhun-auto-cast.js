// The reference recording shows casts about five seconds apart.
const WuhunAutoCast = (() => {
  const directionIds = {NW:0,N:1,NE:2,E:3,SE:4,S:5,SW:6,W:7};
  const phases = ['bossCastGesture','bossCastStart','bossCastLoop','bossCastEnd'];
  const duration = frames => frames.reduce((ms,f) => ms + f[5], 0);
  function currentFrame(frames,time) {
    for (const frame of frames) {
      time -= frame[5];
      if (time < 0) return frame;
    }
    return null;
  }
  function plan(gfx,heading) {
    const config = wuhunAutoConfig[gfx];
    const clips = config ? phases : ['skill'];
    const sequence = [], effects = [];
    let time = 0;
    for (const clip of clips) {
      const length = MonsterActions.actionDuration(gfx,heading,clip);
      if (!length) continue;
      for (const [offset,id] of config?.events[clip] || []) {
        const options = wuhunAutoEffects[id];
        for (const [attribute,frames] of options?.[directionIds[heading]] || options?.[0] || []) {
          effects.push({attribute,frames,start:time+offset});
        }
      }
      sequence.push({clip,start:time,end:time+length});
      time += length;
    }
    const total = Math.max(time,...effects.map(effect => effect.start + duration(effect.frames)));
    return {sequence,effects,total,heading};
  }
  function update(phantom,now,pose,allowed) {
    if (phantom.nextCast == null) phantom.nextCast = now + 2000;
    if (pose.clip === 'death') {
      phantom.cast = null;
      phantom.nextCast = now + 2000;
      return {pose,effects:[]};
    }
    if (!phantom.cast && allowed && now >= phantom.nextCast) {
      const cast = plan(phantom.gfx,characterHeading);
      if (cast.sequence.length) {
        phantom.cast = {...cast,started:now};
        phantom.nextCast = now + Math.max(5000,cast.total + 250);
        for (const track of cast.effects) MonsterActions.preloadFrames(track.frames);
      } else phantom.nextCast = now + 5000;
    }
    const cast = phantom.cast;
    if (!cast) return {pose,effects:[]};
    const elapsed = Math.max(0,now-cast.started);
    if (elapsed >= cast.total) {
      phantom.cast = null;
      return {pose,effects:[]};
    }
    const phase = cast.sequence.find(item => elapsed < item.end);
    const effects = cast.effects.flatMap(track => {
      if (elapsed < track.start) return [];
      const frame = currentFrame(track.frames,elapsed-track.start);
      return frame ? [[track.attribute,frame]] : [];
    });
    return {pose:phase ? {clip:phase.clip,time:elapsed-phase.start,heading:cast.heading} : pose,effects,casting:true};
  }
  return {update};
})();
