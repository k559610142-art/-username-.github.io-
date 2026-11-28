// 月下楓林朱傘行：透明圖集依 NW、N、NE、E、SE、S、SW、W 排列。
(() => {
  const gfx = 980001;
  const atlas = 'oil-parasol-live.png?v=rear1';
  const atlasWidth = 1024;
  const atlasHeight = 336;
  const reactionAtlas = 'oil-parasol-live-reactions.png?v=cast2';
  const reactionHeight = 448;
  // 各列依序為待機、跨步與揮傘；座標以角色腳底為原點。
  const poses = [
    [
      [-15, -98, 47, 98, 2, 2],
      [-18, -95, 36, 95, 130, 2],
      [-30, -97, 46, 97, 258, 2],
      [-33, -97, 48, 97, 386, 2],
      [-31, -98, 48, 98, 514, 2],
      [-24, -98, 50, 98, 642, 2],
      [-18, -99, 44, 99, 770, 2],
      [-16, -97, 46, 97, 898, 2]
    ],
    [
      [-23, -98, 48, 98, 2, 114],
      [-18, -98, 37, 98, 130, 114],
      [-28, -98, 53, 98, 258, 114],
      [-34, -98, 62, 98, 386, 114],
      [-41, -97, 54, 97, 514, 114],
      [-23, -99, 51, 99, 642, 114],
      [-11, -97, 57, 97, 770, 114],
      [-26, -94, 60, 94, 898, 114]
    ],
    [
      [-54, -99, 78, 99, 2, 226],
      [-38, -101, 76, 101, 130, 226],
      [-22, -100, 80, 100, 258, 226],
      [-30, -89, 99, 89, 386, 226],
      [-54, -90, 89, 90, 514, 226],
      [-31, -96, 63, 96, 642, 226],
      [-35, -91, 82, 91, 770, 226],
      [-50, -87, 96, 87, 898, 226]
    ]
  ];
  const swordAtlas = 'oil-parasol-sword-combo.png';
  // 收傘預備、下劈、上挑、直刺。每列各有八方向。
  const swordPoses = [
    [
      [-22, -105, 55, 105, 2, 2],
      [-17, -105, 42, 105, 130, 2],
      [-24, -105, 57, 105, 258, 2],
      [-19, -105, 53, 105, 386, 2],
      [-10, -105, 49, 105, 514, 2],
      [-5, -105, 42, 105, 642, 2],
      [-25, -105, 46, 105, 770, 2],
      [-7, -105, 49, 105, 898, 2]
    ],
    [
      [-58, -91, 84, 91, 2, 114],
      [-15, -91, 47, 91, 130, 114],
      [-26, -91, 79, 91, 258, 114],
      [-14, -91, 82, 91, 386, 114],
      [-12, -91, 69, 91, 514, 114],
      [-11, -91, 46, 91, 642, 114],
      [-49, -91, 67, 91, 770, 114],
      [-47, -91, 101, 91, 898, 114]
    ],
    [
      [-43, -104, 71, 104, 2, 226],
      [-18, -104, 44, 104, 130, 226],
      [-21, -104, 67, 104, 258, 226],
      [-16, -104, 83, 104, 386, 226],
      [-11, -104, 68, 104, 514, 226],
      [-9, -104, 37, 104, 642, 226],
      [-49, -104, 68, 104, 770, 226],
      [-33, -104, 79, 104, 898, 226]
    ],
    [
      [-73, -92, 96, 92, 2, 338],
      [-17, -92, 44, 92, 130, 338],
      [-17, -92, 97, 92, 258, 338],
      [-7, -92, 114, 92, 386, 338],
      [-19, -92, 102, 92, 514, 338],
      [-17, -92, 39, 92, 642, 338],
      [-68, -92, 113, 92, 770, 338],
      [-68, -92, 115, 92, 898, 338]
    ]
  ];
  const swordTimings = [90, 115, 105, 120];
  // 施法、後仰、跪倒、倒地各有八方向圖格。
  const reactions = [
    [
      [-19, -106, 38, 106, 2, 2],
      [-27, -106, 40, 106, 130, 2],
      [-27, -106, 40, 106, 258, 2],
      [-28, -106, 38, 106, 386, 2],
      [-28, -106, 37, 106, 514, 2],
      [-26, -106, 39, 106, 642, 2],
      [-26, -106, 42, 106, 770, 2],
      [-24, -106, 46, 106, 898, 2]
    ],
    [
      [-48, -75, 67, 75, 2, 114],
      [-32, -80, 54, 80, 130, 114],
      [-42, -81, 74, 81, 258, 114],
      [-36, -80, 62, 80, 386, 114],
      [-39, -84, 75, 84, 514, 114],
      [-27, -81, 62, 81, 642, 114],
      [-37, -83, 86, 83, 770, 114],
      [-24, -79, 62, 79, 898, 114]
    ],
    [
      [-44, -75, 88, 75, 2, 226],
      [-45, -69, 90, 69, 130, 226],
      [-42, -68, 83, 68, 258, 226],
      [-50, -72, 100, 72, 386, 226],
      [-54, -58, 109, 58, 514, 226],
      [-51, -63, 102, 63, 642, 226],
      [-50, -62, 101, 62, 770, 226],
      [-48, -64, 96, 64, 898, 226]
    ],
    [
      [-44, -36, 87, 48, 2, 338],
      [-46, -34, 91, 45, 130, 338],
      [-54, -37, 108, 49, 258, 338],
      [-47, -33, 93, 44, 386, 338],
      [-53, -39, 107, 52, 514, 338],
      [-49, -36, 97, 48, 642, 338],
      [-53, -37, 107, 49, 770, 338],
      [-49, -35, 97, 46, 898, 338]
    ]
  ];
  const clips = {};
  for (let direction = 0; direction < 8; direction++) {
    const [idle, stride] = poses.map(row => row[direction]);
    const [cast, recoil, fall, fallen] = reactions.map(row => row[direction]);
    const frame = ([x, y, width, height, sx, sy], ms) =>
      [atlas, x, y, width, height, ms, sx, sy, atlasWidth, atlasHeight];
    const reactionFrame = ([x, y, width, height, sx, sy], ms) =>
      [reactionAtlas, x, y, width, height, ms, sx, sy, atlasWidth, reactionHeight];
    const key = 'd' + direction + '/';
    clips[key + 'idle'] = [frame(idle, 500)];
    clips[key + 'walk'] = [frame(idle, 90), frame(stride, 130), frame(idle, 90), frame(stride, 130)];
    clips[key + 'attack'] = swordPoses.map((row,index)=>{
      const [x,y,width,height,sx,sy]=row[direction];
      return [swordAtlas,x,y,width,height,swordTimings[index],sx,sy,atlasWidth,448];
    });
    clips[key + 'skill'] = [frame(idle, 100), reactionFrame(cast, 280), frame(idle, 120)];
    clips[key + 'hurt'] = [reactionFrame(recoil, 140), frame(idle, 100)];
    clips[key + 'death'] = [reactionFrame(recoil, 140), reactionFrame(fall, 230), reactionFrame(fallen, 380)];
  }
  monsterActionIndex[gfx] = clips;
  islandMonsterFrames[gfx] = Object.fromEntries(Object.entries(clips).map(([name,frames])=>[
    name,frames.map(([file,...frame])=>['../monster-actions/'+file,...frame])
  ]));
  window.NativeMorphGroundAnchors = {
    ...window.NativeMorphGroundAnchors,
    [gfx]: Object.fromEntries(['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'].map(heading => [heading, [0, 0]]))
  };
  const appearance = {
    n: '油傘女', originalExtra: true, renderScale: 0.7,
    f: {idle: 1, walk: 4, attack: 4, skill: 3, hurt: 2, death: 3}, s: {},
    keepDeathAppearance: true,
    fx: ['外觀變身'],
    p: {id: gfx, gfx, lv: 1, w: 1791, a: 4095, m: 1, en: 0, rb: 0}
  };
  window.OilParasolAppearance = appearance;
  characterCatalog.jobs['油傘女'] = characterCatalog.jobs['幻術師'];
  SPRITE_MOVEMENT.profiles['油傘女:1'] = SPRITE_MOVEMENT.profiles['幻術師:1'];
})();
