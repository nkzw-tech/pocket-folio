import {
  CanvasTexture,
  SRGBColorSpace,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { bookHardware } from './binder-hardware';
import { paintBinderFace } from './binder-page-texture';
import { sheetLayer, type Face } from './binder-sheet';
import { clamp, type PageGrip } from './flexible-page-math';
export type BookTurn = {
  cancel?: boolean;
  direction: 'next' | 'previous';
  grip?: PageGrip;
  progress?: number;
};
type Side = 'left' | 'right';
export type BookView = {
  color: string;
  columns: number;
  doubleSided: boolean;
  mobileSide: Side;
  narrow: boolean;
  rows: number;
  sheets: number;
  spread: number;
};
const neutralGrip = { pull: 0, x: 0.9, y: 0.65 };
function texture(canvas: HTMLCanvasElement) {
  const map = new CanvasTexture(canvas);
  map.flipY = false;
  map.generateMipmaps = false;
  map.minFilter = LinearFilter;
  return map;
}

function disposeFace(face: Face | undefined) {
  face?.image.dispose();
  face?.behind?.dispose();
  face?.lettering?.dispose();
}

export function createBinderScene(
  host: HTMLCanvasElement,
  initial: BookView,
  complete: () => void,
  onReady: () => void,
  onStartupError: () => void,
) {
  const book = host.parentElement!;
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas: host,
    powerPreference: 'low-power',
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const hardware = bookHardware();
  scene.add(hardware.group, new HemisphereLight(0xff_fc_f6, 0x78_84_9e, 1.75));
  const key = new DirectionalLight(0xff_ff_ff, 2.1);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight(0xab_c5_ff, 1.1);
  rim.position.set(4, -2, 3);
  scene.add(rim);
  const blank = texture(document.createElement('canvas'));
  const left = sheetLayer(4),
    right = sheetLayer(4),
    moving = sheetLayer(8);
  scene.add(left.group, right.group, moving.group);
  // Project the lifted film onto the exposed face. The shadow stays attached
  // at the rings and spreads toward the lifted outer edge.
  const shadow = new Mesh(
    moving.film,
    new ShaderMaterial({
      depthWrite: false,
      forceSinglePass: true,
      fragmentShader: `varying vec2 st;varying float rise;
      void main(){float feather=.008+min(rise*.00009,.06);
      vec2 e=smoothstep(vec2(0.),vec2(feather),min(st,1.-st));
      gl_FragColor=vec4(.014,.012,.022,e.x*e.y*.28*smoothstep(0.,16.,rise));}`,
      side: DoubleSide,
      transparent: true,
      vertexShader: `varying vec2 st;varying float rise;
      void main(){st=uv;rise=position.z;vec3 p=vec3(position.x+position.z*.25,-position.y-position.z*.13,2.);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    }),
  );
  shadow.frustumCulled = false;
  shadow.renderOrder = 7;
  scene.add(shadow);
  const underGeometry = new PlaneGeometry(1, 1);
  function underlay() {
    const mesh = new Mesh(
      underGeometry,
      new MeshBasicMaterial({ depthWrite: false, transparent: true }),
    );
    mesh.renderOrder = 2;

    scene.add(mesh);
    return mesh;
  }
  const underlays = [underlay(), underlay()];
  const turningUnderlays = [underlay(), underlay()];
  // All artwork uses top-down atlas coordinates, including the flat underlay.
  const underUV = underGeometry.getAttribute('uv');
  for (let i = 0; i < underUV.count; i++) {
    underUV.setY(i, 1 - underUV.getY(i));
  }
  const faces = new Map<HTMLElement, Face>();
  const dirty = new WeakSet<HTMLElement>();
  const renderedFaces: Array<Face | undefined> = [];
  let lit: Element | null = null;
  let view = initial;
  let turn: BookTurn | undefined;
  let width = 1,
    height = 1,
    centerX = 0,
    centerY = 0;
  let progress = 0,
    speed = 0,
    shift = 0,
    shiftSpeed = 0;
  let previousTime = 0,
    releaseTime = 0;
  let frame = 0,
    layout = true,
    rebind = true,
    disposed = false;
  function invalidate() {
    if (!disposed && !frame) {
      frame = requestAnimationFrame(book.hasAttribute('data-webgl') ? draw : drawFirstFrame);
    }
  }
  function findFace(sheet: number, side: Side) {
    const el = book.querySelector<HTMLElement>(`[data-sheet="${sheet}"][data-face-side="${side}"]`);
    if (!el) {
      return;
    }
    if (dirty.delete(el) || !faces.has(el)) {
      disposeFace(faces.get(el));
      const painted = paintBinderFace(el);
      if (!painted) {
        faces.delete(el);
        return;
      }
      const behind = painted.underlay && texture(painted.underlay);
      if (behind) {
        behind.colorSpace = SRGBColorSpace;
      }
      faces.set(el, {
        behind,
        cards: painted.cards,
        image: texture(painted.artwork),
        lettering: painted.lettering && texture(painted.lettering),
      });
    }
    return faces.get(el);
  }
  let idle = 0;
  function warmNeighbor() {
    idle = 0;
    if (turn || disposed || layout) {
      return;
    }
    const el = [...book.querySelectorAll<HTMLElement>('[data-face-side]')].find(
      (face) =>
        !face.classList.contains('folio-rest') &&
        (!faces.has(face) || dirty.has(face)) &&
        [...face.querySelectorAll('img')].every((image) => image.complete),
    );
    if (!el) {
      return;
    }
    const face = findFace(
      Number(el.dataset.sheet),
      el.dataset.faceSide === 'left' ? 'left' : 'right',
    );
    if (face) {
      renderer.initTexture(face.image);
      if (face.lettering) {
        renderer.initTexture(face.lettering);
      }
      if (face.behind) {
        renderer.initTexture(face.behind);
      }
      idle = window.requestIdleCallback(warmNeighbor);
    }
  }
  function measure() {
    const parent = book.getBoundingClientRect();
    const side = view.narrow ? view.mobileSide : 'right';
    const bounds = book.querySelector(`.folio-rest.folio-${side}`)?.getBoundingClientRect();
    if (!bounds?.width || parent.width < 1) {
      return false;
    }
    width = bounds.width;
    height = bounds.height;
    // Use the canvas' actual content box (the book has a one-pixel border).
    const canvas = host.getBoundingClientRect();
    const spine = side === 'right' ? bounds.left - 14 : bounds.right + 14;
    centerX = canvas.left + canvas.width / 2 - spine;
    centerY = bounds.top - canvas.top - canvas.height / 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.width, canvas.height, false);
    const distance = Math.max(width, height) * 5;
    camera.fov = (2 * Math.atan(canvas.height / (2 * distance)) * 180) / Math.PI;
    camera.aspect = canvas.width / canvas.height;
    // The camera stays at least five sheet widths from the binder. Clip the
    // empty foreground so the depth buffer can distinguish cards near contact.
    camera.near = distance / 2;
    camera.far = distance + 100;
    camera.position.set(centerX, centerY, distance);
    camera.updateProjectionMatrix();
    hardware.resize(width, height, view.color);
    for (const el of faces.keys()) {
      dirty.add(el);
    }
    layout = false;
    rebind = true;
    return true;
  }
  function placeUnderlay(mesh: ReturnType<typeof underlay>, face: Face | undefined, side: number) {
    mesh.visible = Boolean(face?.behind);
    if (mesh.material.map !== (face?.behind ?? null)) {
      mesh.material.map = face?.behind ?? null;
      mesh.material.needsUpdate = true;
    }
    mesh.scale.set(width, height, 1);
    mesh.position.set(side * (14 + width / 2), -height / 2, -1.1);
  }
  function bind() {
    for (const [el, face] of faces) {
      if (!book.contains(el)) {
        disposeFace(face);
        faces.delete(el);
        dirty.delete(el);
      }
    }
    const forward = turn?.direction === 'next';
    hardware.stack(
      width,
      height,
      view.spread - Number(Boolean(turn && !forward)),
      view.sheets - view.spread - Number(Boolean(turn && forward)),
    );
    const sheet = view.spread + (forward ? 1 : 0);
    const restingLeft = findFace(view.spread - (turn && !forward ? 1 : 0), 'left');
    const restingRight = findFace(view.spread + 1 + (turn && forward ? 1 : 0), 'right');
    for (const [i, layer, face] of [
      [0, left, restingLeft],
      [1, right, restingRight],
    ] as const) {
      renderedFaces[i] = face;
      layer.captions(Boolean(turn));
      layer.group.visible = Boolean(face);
      layer.opacity(1);
      underlays[i].material.opacity = 1;
      placeUnderlay(underlays[i], face, i ? 1 : -1);
      if (face) {
        layer.bind(i ? face : undefined, i ? undefined : face, view, blank);
        layer.pose(i ? 0 : 1, neutralGrip, width, height, view, 'next', 0);
      }
    }
    shadow.visible = moving.group.visible = Boolean(turn);
    moving.captions(true);
    if (turn) {
      const front = findFace(sheet, 'right');
      const back = findFace(sheet, 'left');
      moving.bind(front, back, view, blank);
      placeUnderlay(turningUnderlays[0], back, -1);
      placeUnderlay(turningUnderlays[1], front, 1);
    } else {
      for (const mesh of turningUnderlays) {
        mesh.visible = false;
      }
    }
    light(turn ? null : lit?.isConnected ? lit : null);
    rebind = false;
  }
  // While hovered, the existing tilt and seeded foil render the pocket in
  // its hit target. Hide the matching GPU card to avoid two silhouettes.
  function light(pocket: Element | null) {
    if (lit !== pocket) {
      lit?.removeAttribute('data-webgl-lit');
      lit = pocket;
      lit?.setAttribute('data-webgl-lit', '');
    }
    const row = pocket?.parentElement;
    const index = row && pocket ? Array.prototype.indexOf.call(row.children, pocket) : -1;
    left.light(pocket?.closest('.folio-left') ? renderedFaces[0]?.cards[index] : undefined);
    right.light(pocket?.closest('.folio-right') ? renderedFaces[1]?.cards[index] : undefined);
  }
  function findLight() {
    const pocket = turn
      ? null
      : book.querySelector(
          '.folio-rest .folio-page:not(.folio-page-reverse) .folio-pocket:is(:hover,[data-card-touch],:focus-within):has(.folio-insert)',
        );
    if (pocket !== lit) {
      light(pocket);
      invalidate();
    }
  }
  const interactionEvents = [
    'pointerover',
    'pointerout',
    'focusin',
    'focusout',
    'pointerup',
    'pointercancel',
  ] as const;
  for (const name of interactionEvents) {
    book.addEventListener(name, findLight);
  }
  function drawFirstFrame(time: number) {
    try {
      draw(time);
    } catch {
      onStartupError();
    }
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || (layout && !measure())) {
      return;
    }
    if (rebind) {
      bind();
    }
    const dt = clamp((time - previousTime) / 1000, 0.001, 0.032);
    previousTime = time;
    let done = false;
    if (turn) {
      const target = turn.progress ?? (turn.cancel ? 0 : 1);
      const before = progress;
      if (turn.progress !== undefined) {
        progress = target;
      } else {
        speed += (240 * (target - progress) - 27 * speed) * dt;
        progress = clamp(progress + speed * dt);
        done = Math.abs(target - progress) < 0.0015 || time - releaseTime > 700;
        if (done) {
          progress = target;
        }
      }
      const angularSpeed = (progress - before) / dt;
      shiftSpeed +=
        (-520 * shift - 18 * shiftSpeed + Math.min(12, angularSpeed ** 2) * width * 0.065) * dt;
      shift = clamp(shift + shiftSpeed * dt, -width * 0.004, width * 0.004);
      const p = turn.direction === 'next' ? progress : 1 - progress;
      const lift = Math.sin(p * Math.PI);
      moving.group.position.z = 2 * lift;
      moving.pose(p, turn.grip ?? neutralGrip, width, height, view, turn.direction, shift * lift);
      // Near contact, resolve the pile to the same backing used at rest. An
      // assigned card keeps its own pocket, while an empty one reveals the
      // nearest card below it. The flat sleeve contributes its tint only once.
      for (const [i, layer, distance] of [
        [0, left, 1 - p],
        [1, right, p],
      ] as const) {
        const exposed = MathUtils.smoothstep(distance, 0, 0.18);
        layer.opacity(exposed);
        underlays[i].material.opacity = exposed;
        turningUnderlays[i].material.opacity = 1 - exposed;
      }
      if (view.narrow && view.doubleSided) {
        const sign = turn.direction === 'next' ? 1 : -1;
        camera.position.x = centerX - sign * (width + 28) * progress;
      }
    }
    if (done) {
      // The React commit promotes the page and restores its native controls.
      // Paint that same spread before the browser presents this frame.
      complete();
      if (layout) {
        measure();
      }
      if (rebind) {
        bind();
      }
    }
    renderer.render(scene, camera);
    if (!book.hasAttribute('data-webgl')) {
      book.dataset.webgl = '';
      onReady();
    }
    if (!turn && !idle && typeof window.requestIdleCallback === 'function') {
      idle = window.requestIdleCallback(warmNeighbor);
    }
    if (turn && turn.progress === undefined) {
      invalidate();
    }
  }
  function setTurn(next: BookTurn | undefined) {
    const old = turn;
    turn = next;
    if (old?.direction !== next?.direction) {
      progress = 0;
      speed = 0;
      shift = 0;
      shiftSpeed = 0;
      rebind = true;
      camera.position.x = centerX;
    }
    if (next?.progress === undefined) {
      releaseTime = performance.now();
    }
    invalidate();
  }
  function mark(target: Element) {
    const face = target.closest<HTMLElement>('[data-face-side]');
    if (face) {
      dirty.add(face);
      rebind = true;
      invalidate();
    }
  }
  const images = (ev: Event) => {
    const image = ev.target as HTMLImageElement | null;
    if (image?.tagName === 'IMG') {
      mark(image);
    }
  };
  book.addEventListener('load', images, true);
  book.addEventListener('error', images, true);
  const changes = new MutationObserver((entries) => {
    for (const entry of entries) {
      const el =
        entry.target.nodeType === Node.ELEMENT_NODE
          ? (entry.target as Element)
          : entry.target.parentElement;
      if (el === book && entry.type === 'childList') {
        rebind = true;
        invalidate();
      } else if (el && !(entry.type === 'attributes' && el.hasAttribute('data-face-side'))) {
        mark(el);
      }
    }
  });
  changes.observe(book, {
    attributeFilter: ['src', 'class', 'data-status', 'data-pocket-opening', 'data-pocket-edge'],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  const sizes = new ResizeObserver(() => {
    layout = true;
    invalidate();
  });
  sizes.observe(book);
  function refreshFonts() {
    for (const el of faces.keys()) {
      dirty.add(el);
    }
    rebind = true;
    invalidate();
  }
  document.fonts.addEventListener('loadingdone', refreshFonts);
  invalidate();
  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      if (idle) {
        window.cancelIdleCallback(idle);
      }
      light(null);
      for (const name of interactionEvents) {
        book.removeEventListener(name, findLight);
      }
      changes.disconnect();
      sizes.disconnect();
      document.fonts.removeEventListener('loadingdone', refreshFonts);
      book.removeEventListener('load', images, true);
      book.removeEventListener('error', images, true);
      delete book.dataset.webgl;
      for (const face of faces.values()) {
        disposeFace(face);
      }
      blank.dispose();
      hardware.dispose();
      left.dispose();
      right.dispose();
      moving.dispose();
      shadow.material.dispose();
      underGeometry.dispose();
      [...underlays, ...turningUnderlays].forEach((mesh) => mesh.material.dispose());
      renderer.dispose();
    },
    setTurn,
    update(next: BookView) {
      if (
        view.color !== next.color ||
        view.narrow !== next.narrow ||
        view.mobileSide !== next.mobileSide ||
        view.columns !== next.columns ||
        view.rows !== next.rows
      ) {
        layout = true;
      }
      view = next;
      rebind = true;
      invalidate();
    },
  };
}
