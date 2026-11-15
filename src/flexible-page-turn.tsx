import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  cardStockStride,
  cardStockVertexCapacity,
  writeCardStock,
  type CardStockRect,
} from './card-stock-mesh';
import {
  clamp,
  pocketHinges,
  writeSheetMesh,
  type PageGrip,
  type PocketHinge,
} from './flexible-page-math';

type DrawableCanvas = HTMLCanvasElement & {
  getElementImageDefaultSize: (element: HTMLElement) => { height: number; width: number };
  requestPaint: () => void;
};
type ElementGL = WebGL2RenderingContext & {
  texElementSubImage2D: (
    target: number,
    level: number,
    x: number,
    y: number,
    element: HTMLElement,
  ) => void;
};
export function supportsFlexiblePages() {
  if (typeof document === 'undefined') {
    return false;
  }
  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return (
    'content' in canvas &&
    canvas.content === 'drawable' &&
    'requestPaint' in canvas &&
    'updateElementGeometry' in canvas &&
    typeof WebGL2RenderingContext !== 'undefined' &&
    typeof (WebGL2RenderingContext.prototype as Partial<ElementGL>).texElementSubImage2D ===
      'function'
  );
}

const vertexShader = `#version 300 es
in vec3 position;
in vec2 uv;
in float edge;
out float stockEdge;
uniform vec2 viewport;
uniform vec2 origin;
uniform float padding;
uniform bool shadow;
out vec2 texCoord;
out vec3 surface;
void main() {
  vec3 p = vec3(origin + position.xy, position.z);
  surface = position;
  stockEdge = edge;
  texCoord = uv;
  vec2 screen;
  if (shadow) {
    screen = p.xy + vec2(p.z * 0.12, p.z * 0.06 + 3.0);
  } else {
    screen = viewport * 0.5 + (p.xy - viewport * 0.5) * (4000.0 / (4000.0 - p.z));
  }
  gl_Position = vec4((screen.x + padding) / (viewport.x + padding * 2.0) * 2.0 - 1.0, 1.0 - (screen.y + padding) / (viewport.y + padding * 2.0) * 2.0, -p.z / 2000.0, 1.0);
}`;
const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D frontImage;
uniform sampler2D backImage;
uniform bool shadow;
uniform float lift;
uniform bool cardPass;
uniform bool doubleStock;
uniform int cardCount;
uniform vec4 cardRects[16];
uniform vec2 pageSize;
in float stockEdge;
in vec2 texCoord;
in vec3 surface;
out vec4 color;
void main() {
  if (shadow) {
    float edge = smoothstep(0.0, 0.025, texCoord.x) * smoothstep(0.0, 0.025, 1.0 - texCoord.x)
      * smoothstep(0.0, 0.02, texCoord.y) * smoothstep(0.0, 0.02, 1.0 - texCoord.y);
    color = vec4(0.0, 0.0, 0.0, edge * lift * 0.22);
    return;
  }
  if (!cardPass) {
    for (int i = 0; i < 16; i++) {
      if (i >= cardCount) break;
      vec4 rect = cardRects[i];
      vec2 p = (texCoord - rect.xy) * pageSize;
      vec2 size = (rect.zw - rect.xy) * pageSize;
      float radius = size.x * 0.025;
      if (all(greaterThanEqual(p, vec2(0.0))) && all(lessThanEqual(p, size)) &&
          length(p - clamp(p, vec2(radius), size - radius)) <= radius) discard;
    }
  }
  if (stockEdge > 0.5) {
    vec3 normal = normalize(cross(dFdx(surface), dFdy(surface)));
    float light = 0.62 + 0.30 * abs(dot(normal, normalize(vec3(-0.5,-0.6,1.0))));
    float seam = doubleStock ? 1.0 - smoothstep(0.025, 0.1, abs(texCoord.y - 0.5)) : 0.0;
    color = vec4(vec3(0.81, 0.79, 0.73) * light * (1.0 - seam * 0.45), 1.0);
    return;
  }
  // A sheet has one surface, but solid cards have two independently wound
  // outward faces. Use their material identity rather than camera facing.
  bool front = cardPass ? stockEdge > -0.5 : gl_FrontFacing;
  vec4 paper = front ? texture(frontImage, texCoord) : texture(backImage, vec2(1.0 - texCoord.x, texCoord.y));
  vec3 normal = normalize(cross(dFdx(surface), dFdy(surface)));
  float facing = abs(normal.z);
  float diffuse = 0.76 + 0.24 * facing;
  float glint = pow(max(0.0, dot(faceforward(normal, vec3(0,0,-1), normal), normalize(vec3(-0.4,-0.3,1.0)))), 22.0);
  // The sleeve catches a soft moving reflection. Card scans stay legible.
  vec3 rgb = paper.rgb * diffuse + vec3(0.75, 0.84, 1.0) * glint * lift * 0.09;
  color = vec4(rgb, paper.a);
}`;

export type FlexibleTurn = {
  cancel?: boolean;
  direction: 'next' | 'previous';
  grip?: PageGrip;
  progress?: number;
};

export type FlexiblePageController = {
  cancel: () => void;
  ready: (direction: FlexibleTurn['direction']) => boolean;
  update: (turn: FlexibleTurn | undefined) => void;
};

export function FlexiblePageTurn({
  columns,
  complete,
  doubleSided,
  faces,
  failed,
  pageKey,
  ref,
  rows,
  turn,
}: {
  columns: number;
  complete: () => void;
  doubleSided: boolean;
  faces: ReadonlyArray<ReactNode>;
  failed: () => void;
  pageKey: number;
  ref: Ref<FlexiblePageController>;
  rows: number;
  turn?: FlexibleTurn;
}) {
  const controller = useRef<FlexiblePageController | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      cancel: () => controller.current?.cancel(),
      ready: (direction) => controller.current?.ready(direction) ?? false,
      update: (next) => controller.current?.update(next),
    }),
    [],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const invalidate = useRef<(() => void) | null>(null);
  const finish = useEffectEvent(complete);
  const fail = useEffectEvent(failed);

  useEffect(() => {
    const canvas = canvasRef.current as DrawableCanvas;
    const elements = [...canvas.querySelectorAll<HTMLElement>(':scope > .flexible-page-source')];
    const book = canvas.parentElement!;
    const page = book.querySelector<HTMLElement>('.folio-right')!;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    }) as ElementGL | null;
    if (!gl || typeof gl.texElementSubImage2D !== 'function') {
      fail();
      return;
    }
    let stopped = false;
    let frame = 0;
    const prepared = [false, false, false, false];
    const dirty = new Set([0, 1, 2, 3]);
    const sourceCards: Array<Array<CardStockRect>> = [[], [], [], []];
    const sourceAreas: Array<Array<CardStockRect>> = [[], [], [], []];
    const cardRects: Array<Array<CardStockRect>> = [[], []];
    const hinges: Array<{ x?: Array<PocketHinge>; y?: Array<PocketHinge> }> = [{}, {}];
    const rectUniforms = [new Float32Array(64), new Float32Array(64)];
    let state: FlexibleTurn | undefined;
    let holding: (FlexibleTurn & { progress: number }) | undefined;
    let holdVersion = 0;
    let progress = 0;
    let velocity = 0;
    let previousTime = 0;
    let settledTime = 0;
    let width = 1;
    let height = 1;
    let viewportWidth = 1;
    let viewportHeight = 1;
    let top = 10;
    const padding = 80;
    const textureSizes = ['', '', '', ''];
    const shaders: Array<WebGLShader> = [];
    const textures: Array<WebGLTexture> = [];
    const buffers: Array<WebGLBuffer> = [];
    const program = gl.createProgram()!;
    const abort = () => {
      if (!stopped) {
        stopped = true;
        cancelAnimationFrame(frame);
        fail();
      }
    };
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertexShader],
        [gl.FRAGMENT_SHADER, fragmentShader],
      ] as const) {
        const shader = gl.createShader(type)!;
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error('Page shader did not compile');
        }
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Page shaders did not link');
      }
      gl.useProgram(program);
      const segmentsX = columns * 18;
      const segmentsY = rows * 14;
      const vertices = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 3);
      const uv = new Float32Array((segmentsX + 1) * (segmentsY + 1) * 2);
      const indices: Array<number> = [];
      for (let y = 0; y <= segmentsY; y++) {
        for (let x = 0; x <= segmentsX; x++) {
          const index = y * (segmentsX + 1) + x;
          uv[index * 2] = x / segmentsX;
          uv[index * 2 + 1] = y / segmentsY;
          if (y < segmentsY && x < segmentsX) {
            const below = index + segmentsX + 1;
            indices.push(index, below, index + 1, index + 1, below, below + 1);
          }
        }
      }
      const positionBuffer = gl.createBuffer()!;
      const uvBuffer = gl.createBuffer()!;
      const indexBuffer = gl.createBuffer()!;
      const stockBuffer = gl.createBuffer()!;
      const stockVertices = new Float32Array(cardStockVertexCapacity * cardStockStride);
      buffers.push(positionBuffer, uvBuffer, indexBuffer, stockBuffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, stockBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, stockVertices.byteLength, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      const texCoord = gl.getAttribLocation(program, 'uv');
      const edge = gl.getAttribLocation(program, 'edge');
      gl.disableVertexAttribArray(edge);
      gl.vertexAttrib1f(edge, 0);
      gl.enableVertexAttribArray(texCoord);
      gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
      const uniforms = Object.fromEntries(
        [
          'viewport',
          'origin',
          'padding',
          'shadow',
          'lift',
          'frontImage',
          'backImage',
          'cardPass',
          'doubleStock',
          'cardCount',
          'cardRects[0]',
          'pageSize',
        ].map((name) => [name, gl.getUniformLocation(program, name)]),
      );
      gl.uniform1i(uniforms.frontImage, 0);
      gl.uniform1i(uniforms.backImage, 1);
      for (let index = 0; index < 4; index++) {
        const texture = gl.createTexture()!;
        textures.push(texture);
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      canvas.setAttribute('content', 'drawable');
      for (const element of elements) {
        element.setAttribute('drawable', '');
      }
      const resize = () => {
        width = page.clientWidth;
        height = page.clientHeight;
        top = page.offsetTop;
        viewportWidth = book.clientWidth;
        viewportHeight = book.clientHeight;
        const ratio = Math.min(devicePixelRatio, 2);
        canvas.width = Math.round((viewportWidth + padding * 2) * ratio);
        canvas.height = Math.round((viewportHeight + padding * 2) * ratio);
        canvas.style.width = `${viewportWidth + padding * 2}px`;
        canvas.style.height = `${viewportHeight + padding * 2}px`;
        for (const element of elements) {
          element.style.width = `${width}px`;
          element.style.height = `${height}px`;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        invalidate.current?.();
      };
      const paint = (event: Event) => {
        const changed = (event as Event & { changedElements?: ReadonlyArray<Element> })
          .changedElements;
        for (const [index, element] of elements.entries()) {
          if (!changed || changed.includes(element)) {
            dirty.add(index);
          }
        }
        // Freeze prepared textures during a gesture. CSS hover/drag changes must
        // never cause synchronous HTML-to-GPU uploads on the pointer path.
        if (stopped || state || holding || !width || !height) {
          return;
        }
        try {
          for (const index of dirty) {
            const element = elements[index];
            if ([...element.querySelectorAll('img')].some((image) => !image.complete)) {
              continue;
            }
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[index]);
            const size = canvas.getElementImageDefaultSize(element);
            const key = `${size.width}:${size.height}`;
            if (textureSizes[index] !== key) {
              gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA8,
                Math.ceil(size.width),
                Math.ceil(size.height),
                0,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                null,
              );
              textureSizes[index] = key;
            }
            gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, element);
            const areas = [
              ...element.querySelectorAll<HTMLElement>('.folio-card, .folio-empty-pocket'),
            ];
            sourceAreas[index] = areas.map((card) => {
              let left = 0;
              let top = 0;
              let current: HTMLElement | null = card;
              while (current && current !== element) {
                left += current.offsetLeft;
                top += current.offsetTop;
                current = current.offsetParent as HTMLElement | null;
              }
              return {
                bottom: (top + card.offsetHeight) / height,
                left: left / width,
                right: (left + card.offsetWidth) / width,
                top: top / height,
              };
            });
            sourceCards[index] = sourceAreas[index].filter((_, area) =>
              areas[area].closest('.folio-pocket.is-occupied'),
            );
            prepared[index] = true;
            dirty.delete(index);
          }
          for (let pair = 0; pair < 2; pair++) {
            const areas = [
              ...sourceAreas[pair * 2],
              ...sourceAreas[pair * 2 + 1].map((rect) => ({
                ...rect,
                left: 1 - rect.right,
                right: 1 - rect.left,
              })),
            ];
            hinges[pair] = areas.length
              ? {
                  x: pocketHinges(areas.map(({ left, right }) => ({ end: right, start: left }))),
                  y: pocketHinges(areas.map(({ bottom, top }) => ({ end: bottom, start: top }))),
                }
              : {};
            const front = sourceCards[pair * 2];
            const back = sourceCards[pair * 2 + 1].map((rect) => ({
              ...rect,
              left: 1 - rect.right,
              right: 1 - rect.left,
            }));
            const combined = [...front];
            for (const rect of back) {
              if (
                !combined.some(
                  (other) =>
                    Math.abs(other.left - rect.left) < 0.015 &&
                    Math.abs(other.top - rect.top) < 0.015,
                )
              ) {
                combined.push(rect);
              }
            }
            cardRects[pair] = combined.slice(0, 16);
            rectUniforms[pair].fill(0);
            cardRects[pair].forEach((rect, index) => {
              rectUniforms[pair].set([rect.left, rect.top, rect.right, rect.bottom], index * 4);
            });
          }
          if (gl.getError() !== gl.NO_ERROR) {
            abort();
            return;
          }
          if (prepared[0] && prepared[1]) {
            // Issue a real draw while hidden, so lazy GPU pipeline compilation
            // also happens before the user grabs a page.
            draw({ direction: 'next', progress: 0 });
          }
          canvas.dataset.prepared = String(prepared.every(Boolean));
        } catch {
          abort();
        }
      };
      const draw = (pose: FlexibleTurn & { progress: number }) => {
        const amount = pose.direction === 'next' ? pose.progress : 1 - pose.progress;
        const grip = pose.grip ?? { pull: 0, x: 0.95, y: 0.75 };
        const firstTexture = pose.direction === 'next' ? 0 : 2;
        writeSheetMesh(vertices, segmentsX, segmentsY, {
          columns,
          direction: pose.direction,
          grip,
          height,
          hingesX: hinges[firstTexture / 2].x,
          hingesY: hinges[firstTexture / 2].y,
          progress: amount,
          rows,
          width,
        });
        for (let unit = 0; unit < 2; unit++) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, textures[firstTexture + unit]);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.disableVertexAttribArray(edge);
        gl.vertexAttrib1f(edge, 0);
        gl.uniform1i(uniforms.cardPass, 0);
        gl.uniform1i(uniforms.doubleStock, doubleSided ? 1 : 0);
        gl.uniform1i(uniforms.cardCount, cardRects[firstTexture / 2].length);
        gl.uniform4fv(uniforms['cardRects[0]'], rectUniforms[firstTexture / 2]);
        gl.uniform2f(uniforms.pageSize, width, height);
        gl.uniform2f(uniforms.viewport, viewportWidth, viewportHeight);
        gl.uniform1f(uniforms.padding, padding);
        gl.uniform2f(uniforms.origin, viewportWidth / 2, top);
        gl.uniform1f(uniforms.lift, Math.sin(pose.progress * Math.PI));
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.uniform1i(uniforms.shadow, 1);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.uniform1i(uniforms.shadow, 0);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        const stockCount = writeCardStock(
          stockVertices,
          vertices,
          segmentsX,
          segmentsY,
          cardRects[firstTexture / 2],
          width,
          height,
          doubleSided,
        );
        if (stockCount) {
          gl.bindBuffer(gl.ARRAY_BUFFER, stockBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            0,
            stockVertices.subarray(0, stockCount * cardStockStride),
          );
          const stride = cardStockStride * Float32Array.BYTES_PER_ELEMENT;
          gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
          gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, stride, 12);
          gl.enableVertexAttribArray(edge);
          gl.vertexAttribPointer(edge, 1, gl.FLOAT, false, stride, 20);
          gl.uniform1i(uniforms.cardPass, 1);
          // Solid cards have outward-wound front/back faces. Drawing the hidden
          // face too blends it through faded search results in triangle-shaped
          // patches; depth testing alone cannot undo previously blended pixels.
          gl.enable(gl.CULL_FACE);
          gl.cullFace(gl.BACK);
          gl.drawArrays(gl.TRIANGLES, 0, stockCount);
          // The transparent sleeve is one two-sided surface, so keep both sides.
          gl.disable(gl.CULL_FACE);
        }
      };
      const holdUntilPainted = (pose: FlexibleTurn & { progress: number }) => {
        holding = pose;
        const version = ++holdVersion;
        canvas.dataset.holding = 'true';
        // Commit the real pages underneath, but retain the final GPU view.
        // Texture preparation stays frozen until those pages have decoded and
        // the browser has had a paint opportunity with the committed layout.
        finish();
        let decoded = false;
        let paints = 0;
        void Promise.all(
          [...book.querySelectorAll<HTMLImageElement>('.folio-rest img')].map((image) =>
            image.decode().catch(() => {}),
          ),
        ).then(() => {
          decoded = true;
        });
        const hold = () => {
          frame = 0;
          if (stopped || !holding || version !== holdVersion) {
            return;
          }
          // WebGL drawing buffers may be cleared after compositing. Redraw
          // the frozen pose, rather than letting the retained overlay go blank.
          draw(holding);
          if (decoded && ++paints >= 2) {
            holding = undefined;
            delete canvas.dataset.holding;
            delete canvas.dataset.ready;
            canvas.requestPaint();
          } else {
            frame = requestAnimationFrame(hold);
          }
        };
        frame = requestAnimationFrame(hold);
      };
      const render = (time: number) => {
        frame = 0;
        if (stopped || !state) {
          return;
        }
        const dt = clamp((time - previousTime) / 1000, 0, 1 / 30);
        previousTime = time;
        const dragging = state.progress !== undefined;
        const target = state.progress ?? (state.cancel ? 0 : 1);
        if (dragging) {
          // Follow the pointer directly; spring damping belongs to release.
          progress = target;
          velocity = 0;
        } else {
          velocity += ((target - progress) * 220 - velocity * 27) * dt;
          progress = clamp(progress + velocity * dt);
          settledTime += dt;
        }
        const settled =
          !dragging &&
          (settledTime > 0.54 ||
            (Math.abs(target - progress) < 0.002 && Math.abs(velocity) < 0.035));
        if (settled) {
          progress = target;
        }
        draw({ ...state, progress });
        canvas.dataset.ready = 'true';
        if (settled) {
          holdUntilPainted({ ...state, progress });
          return;
        }
        if (!dragging) {
          frame = requestAnimationFrame(render);
        }
      };
      const lost = (event: Event) => {
        event.preventDefault();
        abort();
      };
      controller.current = {
        cancel: () => {
          state = undefined;
          holding = undefined;
          holdVersion++;
          cancelAnimationFrame(frame);
          frame = 0;
          delete canvas.dataset.holding;
          delete canvas.dataset.ready;
          canvas.requestPaint();
        },
        ready: (direction) => {
          const first = direction === 'next' ? 0 : 2;
          return !stopped && !holding && prepared[first] && prepared[first + 1];
        },
        update: (next) => {
          if (!state) {
            progress = next?.progress ?? 0;
            velocity = 0;
            settledTime = 0;
          }
          state = next;
          if (!next) {
            if (holding) {
              return;
            }
            cancelAnimationFrame(frame);
            frame = 0;
            delete canvas.dataset.ready;
            canvas.requestPaint();
          } else if (!frame) {
            holding = undefined;
            holdVersion++;
            delete canvas.dataset.holding;
            previousTime = performance.now();
            frame = requestAnimationFrame(render);
          }
        },
      };
      invalidate.current = () => {
        prepared.fill(false);
        for (let index = 0; index < 4; index++) {
          dirty.add(index);
        }
        canvas.dataset.prepared = 'false';
        canvas.requestPaint();
      };
      canvas.addEventListener('paint', paint);
      canvas.addEventListener('webglcontextlost', lost);
      // A newly staged image may finish after its first paint was skipped.
      // Request another preparation paint even if that source is not visible.
      const imageReady = () => {
        if (!state && !holding && !stopped) {
          canvas.requestPaint();
        }
      };
      canvas.addEventListener('load', imageReady, true);
      canvas.addEventListener('error', imageReady, true);
      const observer = new ResizeObserver(resize);
      observer.observe(book);
      resize();
      return () => {
        stopped = true;
        holding = undefined;
        holdVersion++;
        delete canvas.dataset.holding;
        controller.current = null;
        invalidate.current = null;
        cancelAnimationFrame(frame);
        observer.disconnect();
        canvas.removeEventListener('paint', paint);
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('load', imageReady, true);
        canvas.removeEventListener('error', imageReady, true);
        for (const texture of textures) {
          gl.deleteTexture(texture);
        }
        for (const buffer of buffers) {
          gl.deleteBuffer(buffer);
        }
        for (const shader of shaders) {
          gl.deleteShader(shader);
        }
        gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    } catch {
      for (const shader of shaders) {
        gl.deleteShader(shader);
      }
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      abort();
    }
  }, [columns, controller, doubleSided, rows]);

  useLayoutEffect(() => {
    controller.current?.update(turn);
  }, [controller, turn]);
  useLayoutEffect(() => {
    invalidate.current?.();
  }, [pageKey]);

  return (
    <canvas aria-hidden="true" className="flexible-page-canvas" inert ref={canvasRef}>
      {faces.map((face, index) => (
        <div className="flexible-page-source" key={index}>
          {face}
        </div>
      ))}
    </canvas>
  );
}
