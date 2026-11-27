// 月下楓林朱傘行：透明圖集依 NW、N、NE、E、SE、S、SW、W 排列。
(() => {
  const gfx = 980001;
  const atlas = 'red-parasol-v1.png';
  const atlasWidth = 1024;
  const atlasHeight = 336;
  const reactionAtlas = 'red-parasol-reactions-v1.png';
  const reactionHeight = 448;
  // 各列依序為待機、跨步與揮傘；座標以角色腳底為原點。
  const poses = [
    [
      [-16, -98, 50, 98, 2, 2],
      [-29, -95, 55, 95, 130, 2],
      [-33, -97, 52, 97, 258, 2],
      [-35, -97, 53, 97, 386, 2],
      [-32, -98, 51, 98, 514, 2],
      [-25, -98, 52, 98, 642, 2],
      [-22, -99, 52, 99, 770, 2],
      [-18, -97, 50, 97, 898, 2]
    ],
    [
      [-26, -98, 54, 98, 2, 114],
      [-31, -98, 56, 98, 130, 114],
      [-28, -98, 54, 98, 258, 114],
      [-34, -98, 63, 98, 386, 114],
      [-41, -97, 54, 97, 514, 114],
      [-25, -99, 55, 99, 642, 114],
      [-11, -97, 56, 97, 770, 114],
      [-26, -94, 61, 94, 898, 114]
    ],
    [
      [-55, -99, 81, 99, 2, 226],
      [-38, -101, 62, 101, 130, 226],
      [-21, -100, 77, 100, 258, 226],
      [-26, -89, 91, 89, 386, 226],
      [-51, -90, 83, 90, 514, 226],
      [-30, -96, 60, 96, 642, 226],
      [-36, -91, 84, 91, 770, 226],
      [-48, -87, 92, 87, 898, 226]
    ]
  ];
  // 施法、後仰、跪倒、倒地各有八方向圖格。
  const reactions = [
    [
      [-24, -102, 55, 102, 2, 2],
      [-27, -102, 57, 102, 130, 2],
      [-25, -102, 51, 102, 258, 2],
      [-22, -101, 51, 101, 386, 2],
      [-30, -101, 56, 101, 514, 2],
      [-29, -102, 53, 102, 642, 2],
      [-27, -101, 50, 101, 770, 2],
      [-25, -101, 50, 101, 898, 2]
    ],
    [
      [-50, -75, 72, 75, 2, 114],
      [-31, -80, 52, 80, 130, 114],
      [-43, -81, 76, 81, 258, 114],
      [-38, -80, 67, 80, 386, 114],
      [-38, -84, 72, 84, 514, 114],
      [-26, -81, 60, 81, 642, 114],
      [-34, -83, 80, 83, 770, 114],
      [-25, -79, 65, 79, 898, 114]
    ],
    [
      [-37, -75, 74, 75, 2, 226],
      [-43, -69, 85, 69, 130, 226],
      [-42, -68, 83, 68, 258, 226],
      [-41, -72, 82, 72, 386, 226],
      [-49, -58, 98, 58, 514, 226],
      [-43, -63, 86, 63, 642, 226],
      [-43, -62, 86, 62, 770, 226],
      [-46, -64, 92, 64, 898, 226]
    ],
    [
      [-45, -36, 90, 48, 2, 338],
      [-45, -34, 89, 45, 130, 338],
      [-47, -37, 93, 49, 258, 338],
      [-44, -33, 87, 44, 386, 338],
      [-47, -39, 94, 52, 514, 338],
      [-44, -36, 87, 48, 642, 338],
      [-46, -37, 92, 49, 770, 338],
      [-45, -35, 89, 46, 898, 338]
    ]
  ];
  const clips = {};
  for (let direction = 0; direction < 8; direction++) {
    const [idle, stride, strike] = poses.map(row => row[direction]);
    const [cast, recoil, fall, fallen] = reactions.map(row => row[direction]);
    const frame = ([x, y, width, height, sx, sy], ms) =>
      [atlas, x, y, width, height, ms, sx, sy, atlasWidth, atlasHeight];
    const reactionFrame = ([x, y, width, height, sx, sy], ms) =>
      [reactionAtlas, x, y, width, height, ms, sx, sy, atlasWidth, reactionHeight];
    const key = 'd' + direction + '/';
    clips[key + 'idle'] = [frame(idle, 500)];
    clips[key + 'walk'] = [frame(idle, 90), frame(stride, 130), frame(idle, 90), frame(stride, 130)];
    clips[key + 'attack'] = [frame(idle, 110), frame(strike, 130), frame(idle, 190)];
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
    f: {idle: 1, walk: 4, attack: 3, skill: 3, hurt: 2, death: 3}, s: {},
    keepDeathAppearance: true,
    fx: ['外觀變身'],
    p: {id: gfx, gfx, lv: 1, w: 1791, a: 4095, m: 1, en: 0, rb: 0}
  };
  window.OilParasolAppearance = appearance;
  characterCatalog.jobs['油傘女'] = characterCatalog.jobs['幻術師'];
  SPRITE_MOVEMENT.profiles['油傘女:1'] = SPRITE_MOVEMENT.profiles['幻術師:1'];
})();
