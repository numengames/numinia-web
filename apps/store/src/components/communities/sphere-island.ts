/**
 * The island of the sphere of Numen Games: the oracle drawn in WebGL (a
 * fragment-shader ray–sphere, lit, with an amber rim) and the turning.
 * Imported only when a sphere comes into view (HouseSphere.astro).
 *
 * It moves only when asked: a drag (with inertia that dies out), the arrow
 * keys (Home = rest), a dot taking the focus or a legend chip being pointed
 * at (the dot comes to the front). On arrival it settles once — a single
 * turn into its rest — and then stays still; under reduced motion nothing
 * animates at all. No frame is ever requested while nothing moves.
 *
 * Touch has no hover: the first tap on a dot shows its name and brings it to
 * the front, the second goes. A mouse goes on the first click (the name was
 * on hover); the keyboard shows it on focus and goes on Enter. Esc closes
 * the names. Without WebGL the built CSS sphere stays and slides its picture.
 */

import {
  clampPitch,
  dotPlace,
  inertiaStep,
  keyTurn,
  REST,
  ringPaths,
  ringRadius,
  ringTilt,
  springStep,
  yawToFront,
  type Turn,
} from '../../lib/house-sphere';

const VERTEX = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAGMENT = [
  'precision highp float;',
  'uniform vec2 uRes;uniform sampler2D uTex;uniform float uYaw;uniform float uPitch;',
  'const float PI=3.14159265;',
  'float mirror(float x){float f=mod(x,2.0);return f>1.0?2.0-f:f;}',
  'void main(){',
  ' vec2 p=(gl_FragCoord.xy/uRes)*2.0-1.0;float px=2.0/uRes.x;float r2=dot(p,p);',
  ' if(r2>(1.0+px)*(1.0+px)){gl_FragColor=vec4(0.0);return;}',
  ' float z=sqrt(max(0.0,1.0-r2));vec3 n=vec3(p,z);',
  ' float cp=cos(uPitch),sp=sin(uPitch);vec3 a=vec3(n.x,n.y*cp+n.z*sp,-n.y*sp+n.z*cp);',
  ' float cy=cos(uYaw),sy=sin(uYaw);vec3 m=vec3(a.x*cy+a.z*sy,a.y,-a.x*sy+a.z*cy);',
  ' float lon=atan(m.x,m.z);float lat=asin(clamp(m.y,-1.0,1.0));',
  ' float u=mirror(lon/PI+0.5);float v=clamp(0.5-lat/PI,0.0,1.0);',
  ' vec3 col=texture2D(uTex,vec2(u,v)).rgb;',
  ' vec3 L=normalize(vec3(-0.55,0.65,0.75));float dif=max(dot(n,L),0.0);',
  ' col*=0.28+0.86*dif;',
  ' vec3 H=normalize(L+vec3(0.0,0.0,1.0));col+=pow(max(dot(n,H),0.0),70.0)*0.28;',
  ' float rim=pow(1.0-z,2.6);col=mix(col,vec3(0.937,0.647,0.090),rim*0.42);',
  ' float al=1.0-smoothstep(1.0-px*1.5,1.0+px*0.5,sqrt(r2));',
  ' gl_FragColor=vec4(col*al,al);',
  '}',
].join('\n');

interface Painter {
  draw(turn: Turn): void;
  resize(): void;
}

/** The WebGL painter, or null when the browser cannot draw it (the CSS sphere stays). */
function webglPainter(canvas: HTMLCanvasElement, onReady: () => void): Painter | null {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const context = gl;
  const shader = (type: number, source: string): WebGLShader | null => {
    const made = context.createShader(type);
    if (!made) return null;
    context.shaderSource(made, source);
    context.compileShader(made);
    return context.getShaderParameter(made, context.COMPILE_STATUS) ? made : null;
  };
  const vertex = shader(context.VERTEX_SHADER, VERTEX);
  const fragment = shader(context.FRAGMENT_SHADER, FRAGMENT);
  const program = context.createProgram();
  if (!vertex || !fragment || !program) return null;
  context.attachShader(program, vertex);
  context.attachShader(program, fragment);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) return null;
  context.useProgram(program);
  const buffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    context.STATIC_DRAW,
  );
  const position = context.getAttribLocation(program, 'p');
  context.enableVertexAttribArray(position);
  context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
  const uRes = context.getUniformLocation(program, 'uRes');
  const uYaw = context.getUniformLocation(program, 'uYaw');
  const uPitch = context.getUniformLocation(program, 'uPitch');
  const texture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, texture);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
  let ready = false;
  let last: Turn = REST;
  const painter: Painter = {
    draw(turn) {
      last = turn;
      if (!ready) return;
      context.uniform2f(uRes, canvas.width, canvas.height);
      context.uniform1f(uYaw, turn.yaw);
      context.uniform1f(uPitch, turn.pitch);
      context.clearColor(0, 0, 0, 0);
      context.clear(context.COLOR_BUFFER_BIT);
      context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
    },
    resize() {
      const side = canvas.getBoundingClientRect().width;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(side * ratio));
      canvas.height = canvas.width;
      context.viewport(0, 0, canvas.width, canvas.height);
      painter.draw(last);
    },
  };
  const picture = new Image();
  picture.onload = () => {
    context.bindTexture(context.TEXTURE_2D, texture);
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      picture,
    );
    ready = true;
    painter.resize();
    onReady();
  };
  picture.src = canvas.dataset['src'] ?? '';
  return painter;
}

/** Wake one built sphere. */
export function mountSphere(root: HTMLElement): void {
  const canvas = root.querySelector<HTMLCanvasElement>('.esfera-gl');
  const cssSphere = root.querySelector<HTMLElement>('.esfera-css');
  const handle = root.querySelector<HTMLElement>('[data-sphere-handle]');
  const back = root.querySelectorAll<SVGPathElement>('.anillo.atras path');
  const front = root.querySelectorAll<SVGPathElement>('.anillo.delante path');
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
  if (!canvas || !cssSphere || !handle || back.length < 2 || front.length < 2) return;
  const sphereCss: HTMLElement = cssSphere;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const radius = ringRadius(root.dataset['big'] !== undefined);
  let turn: Turn = REST;
  let target: Turn | null = null;
  let velocity = 0;
  let frame = 0;
  let drag: { x: number; y: number } | null = null;

  const painter = webglPainter(canvas, () => root.classList.add('lista'));

  function draw(): void {
    const tilt = ringTilt(turn.pitch);
    const paths = ringPaths(turn.yaw, tilt, radius);
    back[0]?.setAttribute('d', paths.back);
    back[1]?.setAttribute('d', paths.backTicks);
    front[0]?.setAttribute('d', paths.front);
    front[1]?.setAttribute('d', paths.frontTicks);
    dots.forEach((dot, index) => {
      const place = dotPlace(index, dots.length, turn.yaw, tilt, radius);
      dot.style.left = `${place.left}%`;
      dot.style.top = `${place.top}%`;
      dot.classList.toggle('detras', place.behind);
      dot.classList.toggle('oculto', place.hidden);
      dot.classList.toggle('izq', place.onLeft);
      dot.classList.toggle('frente', place.front);
    });
    if (painter) painter.draw(turn);
    else sphereCss.style.backgroundPosition = `${50 - turn.yaw * 30}% ${40 - turn.pitch * 20}%`;
  }

  function step(): void {
    frame = 0;
    let moving = false;
    if (target) {
      const next = springStep(turn, target);
      turn = next.turn;
      if (next.done) target = null;
      else moving = true;
    } else if (!drag) {
      const next = inertiaStep(velocity);
      velocity = next.velocity;
      if (!next.done) {
        turn = { yaw: turn.yaw + velocity, pitch: turn.pitch };
        moving = true;
      }
    }
    draw();
    if (moving) frame = requestAnimationFrame(step);
  }
  const animate = (): void => {
    if (!frame) frame = requestAnimationFrame(step);
  };
  /** Go to a turn: sprung, or at once under reduced motion. */
  const go = (to: Turn): void => {
    velocity = 0;
    if (still) {
      target = null;
      turn = to;
      draw();
    } else {
      target = to;
      animate();
    }
  };
  const bring = (index: number): void =>
    go({ yaw: yawToFront(index, dots.length, turn.yaw), pitch: turn.pitch });

  // Names: the dot that is named (touch) or marked (a legend chip).
  const name = (index: number): void => {
    dots.forEach((dot, at) => {
      dot.classList.toggle('nombrado', at === index);
      dot.classList.toggle('activo', at === index);
    });
    if (index >= 0) bring(index);
  };

  // ---- the drag ----
  root.addEventListener('pointerdown', (event) => {
    const onDot = (event.target as Element).closest('[data-dot], .mas-com');
    if (!onDot) name(-1);
    if (onDot) return;
    drag = { x: event.clientX, y: event.clientY };
    target = null;
    velocity = 0;
    root.setPointerCapture(event.pointerId);
    root.classList.add('arrastrando');
  });
  root.addEventListener('pointermove', (event) => {
    root.classList.remove('callada');
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = { x: event.clientX, y: event.clientY };
    turn = { yaw: turn.yaw - dx * 0.009, pitch: clampPitch(turn.pitch + dy * 0.007) };
    velocity = -dx * 0.009;
    draw();
  });
  const release = (): void => {
    if (!drag) return;
    drag = null;
    root.classList.remove('arrastrando');
    if (still) velocity = 0;
    else animate();
  };
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  // ---- the keyboard ----
  handle.tabIndex = 0;
  root.dataset['live'] = '';
  handle.addEventListener('keydown', (event) => {
    if (event.target !== handle) return;
    const next = keyTurn(event.key, turn);
    if (!next) return;
    event.preventDefault();
    go(next);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    name(-1);
    root.classList.add('callada');
  });
  root.addEventListener('focusin', () => root.classList.remove('callada'));

  // ---- the dots ----
  let pointerKind = 'mouse';
  dots.forEach((dot, index) => {
    const link = dot.querySelector('a');
    if (!link) return;
    link.addEventListener('focus', () => bring(index));
    link.addEventListener('pointerdown', (event) => {
      pointerKind = event.pointerType || 'mouse';
    });
    link.addEventListener('click', (event) => {
      const touch = pointerKind === 'touch' || pointerKind === 'pen';
      pointerKind = 'mouse';
      if (touch && !dot.classList.contains('nombrado')) {
        event.preventDefault();
        name(index);
      }
    });
  });

  // ---- the legend: pointing at a chip brings its dot to the front ----
  const figure = root.closest('[data-house-figure]');
  figure?.querySelectorAll<HTMLElement>('[data-ring-chip]').forEach((chip) => {
    const index = dots.findIndex((dot) => dot.dataset['dot'] === chip.dataset['ringChip']);
    if (index < 0) return;
    const mark = (): void => {
      bring(index);
      dots.forEach((dot, at) => dot.classList.toggle('activo', at === index));
    };
    const unmark = (): void => dots[index]?.classList.remove('activo');
    chip.addEventListener('mouseenter', mark);
    chip.addEventListener('focus', mark);
    chip.addEventListener('mouseleave', unmark);
    chip.addEventListener('blur', unmark);
  });

  if (painter) {
    new ResizeObserver(() => painter.resize()).observe(canvas);
  } else {
    canvas.hidden = true;
    root.classList.add('sin-gl');
  }

  // One settle turn on arrival, so it shows it turns — then still for good.
  if (still) draw();
  else {
    turn = { yaw: REST.yaw - 1.1, pitch: REST.pitch };
    draw();
    window.setTimeout(() => go(REST), 250);
  }
}
