import {
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  FrontSide,
  Group,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  type Texture,
  Vector4,
} from 'three';
import type { PaintedFace } from './binder-page-texture';
import type { BookView, BookTurn } from './binder-webgl';
import {
  cardStockStride,
  cardStockVertexCapacity,
  writeCardStock,
  type CardStockRect,
} from './card-stock-mesh';
import { pocketHinges, writeSheetMesh, type PageGrip } from './flexible-page-math';

export type Face = {
  behind?: Texture;
  cards: PaintedFace['cards'];
  image: Texture;
  lettering?: Texture;
};
const vertexShader = `
  attribute float edge;
  varying vec2 coords;
  varying float stockEdge;
  varying vec3 surface;
  void main(){
    coords=uv; stockEdge=edge;
    surface=vec3(position.x,-position.y,position.z);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(surface,1.);
  }`;
const fragmentShader = `
  uniform sampler2D frontMap,backMap,frontInk,backInk;
  uniform bool showInk;
  uniform bool stock;
  uniform vec4 litRect;
  uniform float lift, splitStock, opacity;
  uniform int count;
  uniform vec4 rects[16];
  varying vec2 coords;
  varying float stockEdge;
  varying vec3 surface;
  void main(){
    if(opacity<=0.)discard;
    bool front=stock ? stockEdge>-.5 : gl_FrontFacing;
    vec2 uv=front?coords:vec2(1.-coords.x,coords.y);
    if(stock && all(greaterThanEqual(uv,litRect.xy)) && all(lessThanEqual(uv,litRect.zw)))discard;
    vec3 normal=normalize(cross(dFdx(surface),dFdy(surface)));
    float facing=abs(normal.z);
    if(stock && stockEdge>.5){
      float seam=1.-smoothstep(.025,.12,abs(coords.y-.5));
      gl_FragColor=vec4(vec3(.80,.78,.73)*(.68+.28*facing)*(1.-.4*splitStock*seam),opacity);
      return;
    }
    if(!stock){
      for(int i=0;i<16;i++){
        if(i>=count)break;
        vec4 r=rects[i];
        if(all(greaterThan(coords,r.xy)) && all(lessThan(coords,r.zw)))discard;
      }
    }
    vec4 ink=front?texture2D(frontMap,uv):texture2D(backMap,uv);
    if(!stock && showInk){
      vec4 label=front?texture2D(frontInk,uv):texture2D(backInk,uv);
      ink=vec4(mix(ink.rgb,label.rgb,label.a),label.a+ink.a*(1.-label.a));
    }
    if(ink.a<.01)discard;
    float spec=pow(max(dot(normal,normalize(vec3(-.38,.34,1.))),0.),20.);
    ink.rgb=ink.rgb*(.78+.22*facing)+vec3(.76,.85,1.)*spec*lift*.11;
    if(!stock){ink.a=min(1.,ink.a+lift*spec*.13);}
    gl_FragColor=vec4(ink.rgb,ink.a*opacity);
  }`;

export function sheetLayer(order: number) {
  const nx = 32,
    ny = 20;
  const film = new PlaneGeometry(1, 1, nx, ny);
  const points = film.getAttribute('position');
  const uvs = film.getAttribute('uv');
  for (let i = 0; i < uvs.count; i++) {
    uvs.setY(i, 1 - uvs.getY(i));
  }
  film.setAttribute('edge', new Float32BufferAttribute(new Float32Array(points.count), 1));
  const stock = new BufferGeometry();
  const buffer = new InterleavedBuffer(
    new Float32Array(cardStockVertexCapacity * cardStockStride),
    cardStockStride,
  );
  buffer.setUsage(DynamicDrawUsage);
  stock.setAttribute('position', new InterleavedBufferAttribute(buffer, 3, 0));
  stock.setAttribute('uv', new InterleavedBufferAttribute(buffer, 2, 3));
  stock.setAttribute('edge', new InterleavedBufferAttribute(buffer, 1, 5));
  const uniforms = {
    backInk: { value: null as Texture | null },
    backMap: { value: null as Texture | null },
    count: { value: 0 },
    frontInk: { value: null as Texture | null },
    frontMap: { value: null as Texture | null },
    lift: { value: 0 },
    litRect: { value: new Vector4(-1, -1, -1, -1) },
    opacity: { value: 1 },
    rects: { value: Array.from({ length: 16 }, () => new Vector4()) },
    showInk: { value: false },
    splitStock: { value: 0 },
  };
  const material = (isStock: boolean) =>
    new ShaderMaterial({
      depthWrite: isStock,
      forceSinglePass: true,
      fragmentShader,
      side: isStock ? FrontSide : DoubleSide,
      transparent: true,
      uniforms: { ...uniforms, stock: { value: isStock } },
      vertexShader,
    });
  const sleeve = new Mesh(film, material(false));
  const cards = new Mesh(stock, material(true));
  sleeve.renderOrder = order + 1;
  cards.renderOrder = order;
  sleeve.frustumCulled = cards.frustumCulled = false;
  const group = new Group();
  group.add(sleeve, cards);
  let rects: Array<CardStockRect> = [];
  let hingesX: ReturnType<typeof pocketHinges>, hingesY: ReturnType<typeof pocketHinges>;
  return {
    bind(front: Face | undefined, back: Face | undefined, view: BookView, blank: Texture) {
      uniforms.frontMap.value = front?.image ?? blank;
      uniforms.frontInk.value = front?.lettering ?? blank;
      uniforms.backInk.value = back?.lettering ?? blank;
      uniforms.backMap.value = back?.image ?? blank;
      uniforms.splitStock.value = Number(view.doubleSided);
      rects = [];
      for (let i = 0; i < view.rows * view.columns; i++) {
        const reverse =
          Math.floor(i / view.columns) * view.columns + view.columns - 1 - (i % view.columns);
        const b = back?.cards[reverse];
        const rect = front?.cards[i] ?? (b && { ...b, left: 1 - b.right, right: 1 - b.left });
        if (rect) {
          rects.push(rect);
        }
      }
      uniforms.count.value = rects.length;
      rects.forEach(({ bottom, left, right, top }, i) =>
        uniforms.rects.value[i].set(left, top, right, bottom),
      );
      hingesX = pocketHinges(rects.map(({ left, right }) => ({ end: right, start: left })));
      hingesY = pocketHinges(rects.map(({ bottom, top }) => ({ end: bottom, start: top })));
    },
    captions(visible: boolean) {
      uniforms.showInk.value = visible;
    },
    dispose() {
      film.dispose();
      stock.dispose();
      sleeve.material.dispose();
      cards.material.dispose();
    },
    film,
    group,
    light(rect: CardStockRect | undefined) {
      if (rect) {
        uniforms.litRect.value.set(rect.left, rect.top, rect.right, rect.bottom);
      } else {
        uniforms.litRect.value.set(-1, -1, -1, -1);
      }
    },
    opacity(value: number) {
      uniforms.opacity.value = value;
      // A fading card beneath the turning sheet still contributes color, but
      // must not occlude the card landing on it at nearly the same depth.
      cards.material.depthWrite = value === 1;
    },
    pose(
      progress: number,
      grip: PageGrip,
      width: number,
      height: number,
      view: BookView,
      direction: BookTurn['direction'],
      shift: number,
    ) {
      uniforms.lift.value = Math.sin(progress * Math.PI);
      const array = points.array as Float32Array;
      writeSheetMesh(array, nx, ny, {
        columns: view.columns,
        direction,
        grip,
        height,
        hingesX: hingesX?.length === view.columns - 1 ? hingesX : undefined,
        hingesY: hingesY?.length === view.rows - 1 ? hingesY : undefined,
        progress,
        rows: view.rows,
        width,
      });
      points.needsUpdate = true;
      const count = writeCardStock(
        buffer.array as Float32Array,
        array,
        nx,
        ny,
        rects,
        width,
        height,
        view.doubleSided,
      );
      // A little play inside the sleeve, driven by acceleration and a damped landing.
      cards.position.y = shift;
      stock.setDrawRange(0, count);
      buffer.needsUpdate = true;
    },
  };
}
