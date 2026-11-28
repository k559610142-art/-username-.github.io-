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
  const swordAtlas = 'oil-parasol-elf-stance.png';
  const swordAtlasWidth = 1024;
  const swordAtlasHeight = 448;
  // 收傘預備、下劈、上挑、收勢。每列各有八方向。
  const swordPoses = [
    [[-31, -101, 62, 101, 2, 2],[-32, -101, 61, 101, 130, 2],[-41, -101, 57, 101, 258, 2],[-20, -101, 45, 101, 386, 2],[-27, -101, 56, 101, 514, 2],[-28, -101, 56, 101, 642, 2],[-29, -101, 50, 101, 770, 2],[-28, -101, 44, 101, 898, 2]],
    [[-42, -95, 79, 95, 2, 114],[-35, -95, 75, 95, 130, 114],[-46, -95, 73, 95, 258, 114],[-28, -95, 65, 95, 386, 114],[-16, -95, 51, 95, 514, 114],[-30, -95, 51, 95, 642, 114],[-45, -95, 61, 95, 770, 114],[-36, -95, 64, 95, 898, 114]],
    [[-35, -101, 70, 101, 2, 226],[-33, -101, 74, 101, 130, 226],[-35, -101, 77, 101, 258, 226],[-24, -101, 75, 101, 386, 226],[-29, -101, 66, 101, 514, 226],[-29, -101, 53, 101, 642, 226],[-41, -101, 57, 101, 770, 226],[-49, -101, 78, 101, 898, 226]],
    [[-28, -98, 67, 98, 2, 338],[-29, -98, 70, 98, 130, 338],[-28, -98, 64, 98, 258, 338],[-17, -98, 32, 98, 386, 338],[-34, -98, 56, 98, 514, 338],[-38, -98, 66, 98, 642, 338],[-45, -98, 60, 98, 770, 338],[-24, -98, 40, 98, 898, 338]]
  ];
  const swordAttacks = {
    attack: [[0, 166], [1, 244], [3, 430]],
    attack_rise: [[3, 166], [2, 244], [3, 430]]
  };
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
    for (const [attack, sequence] of Object.entries(swordAttacks)) {
      clips[key + attack] = sequence.map(([pose, ms]) => {
        const [x, y, width, height, sx, sy] = swordPoses[pose][direction];
        return [swordAtlas, x, y, width, height, ms, sx, sy, swordAtlasWidth, swordAtlasHeight];
      });
    }
    clips[key + 'skill'] = [frame(idle, 100), reactionFrame(cast, 280), frame(idle, 120)];
    clips[key + 'hurt'] = [reactionFrame(recoil, 140), frame(idle, 100)];
    clips[key + 'death'] = [reactionFrame(recoil, 140), reactionFrame(fall, 230), reactionFrame(fallen, 380)];
  }
  monsterActionIndex[gfx] = clips;
  MonsterActions.preload(gfx, 'SE', ['attack']);
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
    attackClips: Object.keys(swordAttacks),
    keepDeathAppearance: true,
    fx: ['外觀變身'],
    p: {id: gfx, gfx, lv: 1, w: 1791, a: 4095, m: 1, en: 0, rb: 0}
  };
  window.OilParasolAppearance = appearance;
  characterCatalog.jobs['油傘女'] = characterCatalog.jobs['幻術師'];
  SPRITE_MOVEMENT.profiles['油傘女:1'] = SPRITE_MOVEMENT.profiles['幻術師:1'];
})();
