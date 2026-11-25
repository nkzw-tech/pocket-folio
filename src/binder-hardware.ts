import {
  CanvasTexture,
  BoxGeometry,
  MeshMatcapMaterial,
  SphereGeometry,
  SRGBColorSpace,
  RepeatWrapping,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
} from 'three';
export function bookHardware() {
  const group = new Group();
  const outline = new Shape();
  const r = 0.022;
  outline.moveTo(r, 0);
  outline.lineTo(1 - r, 0);
  outline.quadraticCurveTo(1, 0, 1, r);
  outline.lineTo(1, 1 - r);
  outline.quadraticCurveTo(1, 1, 1 - r, 1);
  outline.lineTo(r, 1);
  outline.quadraticCurveTo(0, 1, 0, 1 - r);
  outline.lineTo(0, r);
  outline.quadraticCurveTo(0, 0, r, 0);
  const panel = new ExtrudeGeometry(outline, {
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.003,
    bevelThickness: 0.1,
    curveSegments: 8,
    depth: 1,
  });
  // A small repeating weave catches the light on the cover and the inset lining.
  const swatch = document.createElement('canvas');
  swatch.width = swatch.height = 128;
  const cloth = swatch.getContext('2d')!;
  cloth.fillStyle = '#e5e5e5';
  cloth.fillRect(0, 0, 128, 128);
  for (let i = -128; i < 256; i += 4) {
    cloth.strokeStyle = '#bababa';
    cloth.beginPath();
    cloth.moveTo(i, 0);
    cloth.lineTo(i + 128, 128);
    cloth.stroke();
    cloth.strokeStyle = '#f6f6f6';
    cloth.beginPath();
    cloth.moveTo(i, 0);
    cloth.lineTo(i - 128, 128);
    cloth.stroke();
  }
  const grain = new CanvasTexture(swatch);
  grain.wrapS = grain.wrapT = RepeatWrapping;
  grain.anisotropy = 4;
  grain.colorSpace = SRGBColorSpace;

  const trim = new MeshStandardMaterial({
    bumpMap: grain,
    bumpScale: 0.14,
    map: grain,
    roughness: 0.68,
  });
  const lining = new MeshStandardMaterial({ map: grain, roughness: 0.93 });
  const covers = [-1, 1].map(() => {
    const cover = new Mesh(panel, trim),
      liner = new Mesh(panel, lining);
    group.add(cover, liner);
    return { cover, liner };
  });
  const reflection = document.createElement('canvas');
  reflection.width = reflection.height = 96;
  const ctx = reflection.getContext('2d')!;
  const bands = ctx.createLinearGradient(25, 0, 65, 96);
  for (const [position, color] of [
    [0, '#65707f'],
    [0.28, '#fff'],
    [0.44, '#dde1e9'],
    [0.5, '#31333a'],
    [0.6, '#181a21'],
    [0.77, '#aaaeb6'],
    [1, '#343946'],
  ] as const) {
    bands.addColorStop(position, color);
  }
  ctx.fillStyle = bands;
  ctx.fillRect(0, 0, 96, 96);
  const chrome = new CanvasTexture(reflection);
  chrome.colorSpace = SRGBColorSpace;
  const metal = new MeshMatcapMaterial({ matcap: chrome });
  const railGeometry = new BoxGeometry(1, 1, 1);
  const railMaterial = new MeshStandardMaterial({
    color: 0x57_5a_63,
    metalness: 0.62,
    roughness: 0.36,
  });
  const rail = new Mesh(railGeometry, railMaterial);
  group.add(rail);
  const studGeometry = new SphereGeometry(1, 12, 8);
  const studs = [new Mesh(studGeometry, metal), new Mesh(studGeometry, metal)];
  group.add(...studs);
  const ringGeometry = new TorusGeometry(1, 0.105, 12, 64);
  const rings = Array.from({ length: 3 }, () => new Mesh(ringGeometry, metal));
  group.add(...rings);
  const edges = new Group();
  const lip = new MeshBasicMaterial({
    color: 0xa4_ac_bd,
    depthWrite: false,
    opacity: 0.16,
    transparent: true,
  });
  for (let i = 0; i < 10; i++) {
    edges.add(new Mesh(railGeometry, lip));
  }
  group.add(edges);
  return {
    dispose() {
      panel.dispose();
      ringGeometry.dispose();
      grain.dispose();
      chrome.dispose();
      studGeometry.dispose();
      railGeometry.dispose();
      railMaterial.dispose();
      trim.dispose();
      lining.dispose();
      metal.dispose();
      lip.dispose();
    },
    group,
    resize(w: number, h: number, color: string) {
      grain.repeat.set(w / 115, h / 115);
      rail.scale.set(9, h * 0.87, 2);
      rail.position.set(0, -h / 2, -0.8);
      studs.forEach((stud, i) => {
        stud.scale.set(2.8, 2.8, 1.4);
        stud.position.set(0, -h * (i ? 0.92 : 0.08), 0.8);
      });
      trim.color.set(color);
      lining.color.set(color).multiplyScalar(0.4);
      covers.forEach(({ cover, liner }, i) => {
        const x = i === 0 ? -w - 26 : 0;
        cover.position.set(x, -h - 13, -8);
        cover.scale.set(w + 26, h + 23, 4);
        liner.position.set(x + 5, -h - 7, -4);
        liner.scale.set(w + 16, h + 14, 2);
      });
      rings.forEach((ring, i) => {
        ring.position.set(0, (-h * (i * 2 + 1)) / 6, 3);
        ring.scale.set(16, 12, 12);
        ring.rotation.x = 0.98;
      });
    },
    stack(w: number, h: number, leftSheets: number, rightSheets: number) {
      edges.children.forEach((edge, i) => {
        const row = i % 5,
          side = i < 5 ? -1 : 1;
        edge.visible = row < Math.min(5, (side < 0 ? leftSheets : rightSheets) - 1);
        edge.scale.set(w - 2, 0.8, 1);
        edge.position.set(side * (14 + w / 2 + row * 0.55), -h - 1 - row * 1.15, -1.5 - row * 0.16);
      });
    },
  };
}
