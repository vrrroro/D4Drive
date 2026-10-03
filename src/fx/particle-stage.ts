/**
 * D4DRIVE — particle stage
 *
 * One WebGL2 context, one fixed full-viewport canvas, many concurrent jobs.
 * A "job" takes any rasterisable source (image, canvas, paused video) plus a
 * live viewport rect and either scatters it into sand (`dissolve`) or condenses
 * sand back into it (`assemble`).
 *
 * The scatter maths deliberately mirrors the ParticleScroll component this
 * project is built around — same hash, same swirl/gravity/drift vocabulary — so
 * every dissolve on the site shares one motion DNA.
 *
 * A single shared context matters: browsers cap concurrent WebGL contexts
 * (~16), and the fleet grid alone would blow past that with a canvas per card.
 */

export type ParticleSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement;

export interface ParticleOptions {
  /** Grain spacing in CSS px. Smaller is finer and denser. */
  density: number;
  /** Size of a fully scattered grain in CSS px. */
  size: number;
  /** Max distance a grain travels from home, in CSS px. */
  spread: number;
  /** Downward bias of the cloud, -1..1. Negative lifts it. */
  gravity: number;
  /** Idle float speed of scattered grains, 0..1. */
  drift: number;
  /** Sideways arc in CSS px taken in flight. */
  swirl: number;
  /** Per-grain timing randomness, 0..0.95. */
  stagger: number;
  /** How much of the stagger follows `sweepAngle` rather than pure noise. */
  sweep: number;
  /** Direction the dissolve travels across the plate, in radians. */
  sweepAngle: number;
  /** Opacity of fully scattered grains, 0..1. */
  fade: number;
  /**
   * Drain colour out of the grains, 0..1. WebGL samples the raw source, not
   * the CSS-filtered result, so anything rendered under `grayscale()` has to
   * match here or the sand arrives in colour and snaps grey on landing.
   */
  desaturate: number;
  /** How the source maps onto the rect. */
  fit: "cover" | "fill";
}

export interface ParticleJobSpec extends Partial<ParticleOptions> {
  source: ParticleSource;
  /** Live viewport rect, re-read every frame so the job tracks layout. */
  rect: () => DOMRect | null;
  mode: "dissolve" | "assemble";
  /** Seconds. */
  duration: number;
  onDone?: () => void;
}

const DEFAULTS: ParticleOptions = {
  density: 2,
  size: 1.25,
  spread: 220,
  gravity: 0.35,
  drift: 0.7,
  swirl: 60,
  stagger: 0.7,
  sweep: 0.55,
  sweepAngle: 0,
  fade: 0.85,
  desaturate: 0,
  fit: "fill",
};

const VERT = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform vec2  uOrigin;
uniform vec2  uRect;
uniform vec2  uGrid;
uniform vec2  uUvScale;
uniform vec2  uUvOffset;
uniform float uDensity;
uniform float uProgress;
uniform float uStagger;
uniform float uSweep;
uniform vec2  uSweepDir;
uniform float uSpread;
uniform float uGravity;
uniform float uDrift;
uniform float uSwirl;
uniform float uTime;
uniform float uFade;
uniform float uSize;
uniform float uDpr;

out vec2  vHome;
out float vSize;
out float vAlpha;
out float vLod;
out float vMerge;

float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main () {
  float fid = float(gl_VertexID);
  vec2 cell = vec2(mod(fid, uGrid.x), floor(fid / uGrid.x));
  vec2 local = (cell + 0.5) * uDensity;
  vec2 norm = local / uRect;

  if (norm.x > 1.0 || norm.y > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vHome = vec2(0.0); vSize = 0.0; vAlpha = 0.0; vLod = 0.0; vMerge = 0.0;
    return;
  }

  vec2 home = uOrigin + local;

  float h1 = hash(cell);
  float h2 = hash(cell + vec2(1.7, 9.1));
  float h3 = hash(cell + vec2(5.5, 2.9));
  float h4 = hash(cell + vec2(8.4, 4.2));

  // Blend per-grain noise with a directional gradient so the plate lets go
  // like wind crossing sand rather than uniform static.
  float sweepT = clamp(dot(norm - 0.5, uSweepDir) + 0.5, 0.0, 1.0);
  float delay = mix(h1, sweepT, uSweep) * uStagger;

  float t = clamp((uProgress - delay) / max(1.0 - delay, 1e-3), 0.0, 1.0);
  // Grains hang at home, then let go — and read in reverse as a soft landing.
  float e = pow(t, 1.5);

  vec2 dir = normalize(vec2(h2 - 0.5, h3 - 0.5) + vec2(1e-4, 0.0));
  float reach = 0.08 + 0.92 * pow(h4, 2.4);
  vec2 off = dir * uSpread * reach;
  off.y += uGravity * uSpread * (0.25 + 0.75 * h4);

  vec2 pos = home + off * e;

  vec2 perp = vec2(-dir.y, dir.x);
  pos += perp * (h2 - 0.5) * 2.0 * uSwirl * sin(e * 3.14159);

  float tt = uTime * uDrift;
  float amp = e * (uSpread * 0.05 + 2.5);
  pos += vec2(
    sin(tt * (4.0 + 5.0 * h2) + h3 * 40.0),
    cos(tt * (3.5 + 5.5 * h3) + h2 * 40.0)
  ) * amp;

  // Shake loose of the grid right at the moment of release.
  pos += vec2(h4 - 0.5, h1 - 0.5) * uDensity * 3.0 * smoothstep(0.0, 0.35, e);

  vHome = local;
  vSize = mix(uDensity * 1.35, uSize, e);
  vAlpha = (1.0 - smoothstep(0.5, 1.0, t)) * mix(1.0, uFade, e);
  vLod = e * 1.6;
  vMerge = 1.0 - smoothstep(0.0, 0.30, e);

  gl_Position = vec4(
    pos.x / uRes.x * 2.0 - 1.0,
    1.0 - pos.y / uRes.y * 2.0,
    0.0,
    1.0
  );
  gl_PointSize = max(vSize * uDpr, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uContent;
uniform vec2 uRect;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
uniform float uDesat;

in vec2  vHome;
in float vSize;
in float vAlpha;
in float vLod;
in float vMerge;

out vec4 outColor;

void main () {
  vec2 o = gl_PointCoord - 0.5;
  vec2 local = clamp((vHome + o * vSize) / uRect, 0.0, 1.0);
  vec4 tex = textureLod(uContent, uUvOffset + local * uUvScale, vLod);

  // A grain is a soft disc; a landed cell is a square that tiles seamlessly.
  float circle = 1.0 - smoothstep(0.25, 0.5, length(o));
  float mask = mix(circle, 1.0, vMerge);

  float a = vAlpha * mask * tex.a;
  if (a < 0.004) discard;

  vec3 rgb = mix(tex.rgb, vec3(dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722))), uDesat);
  outColor = vec4(rgb * a, a);
}`;

interface Job {
  tex: WebGLTexture;
  texW: number;
  texH: number;
  spec: ParticleJobSpec;
  o: ParticleOptions;
  startAt: number;
  cancelled: boolean;
}

interface Stage {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  u: Record<string, WebGLUniformLocation | null>;
}

let stage: Stage | null = null;
let stageFailed = false;
const jobs = new Set<Job>();
let raf = 0;
let clock = 0;
let lastFrame = 0;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[particle-stage]", gl.getShaderInfoLog(sh));
  }
  return sh;
}

function createStage(): Stage | null {
  if (stage) return stage;
  if (stageFailed || typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "60",
  } satisfies Partial<CSSStyleDeclaration>);

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) {
    stageFailed = true;
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[particle-stage]", gl.getProgramInfoLog(program));
    stageFailed = true;
    return null;
  }

  const u: Stage["u"] = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    u[info.name] = gl.getUniformLocation(program, info.name);
  }

  document.body.appendChild(canvas);
  stage = { gl, canvas, program, vao: gl.createVertexArray()!, u };
  return stage;
}

function sourceSize(src: ParticleSource): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  if (src instanceof HTMLImageElement)
    return [src.naturalWidth || src.width, src.naturalHeight || src.height];
  return [src.width, src.height];
}

function makeTexture(gl: WebGL2RenderingContext, src: ParticleSource) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // No FLIP_Y. Sampling is done in the rect's own top-left-origin coordinates,
  // so the source's first row must stay at v=0; flipping on upload would put it
  // at v=1 and render every plate upside down.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

/** `object-fit` mapping from a texture of `tw×th` onto a rect of `rw×rh`. */
function uvFit(fit: ParticleOptions["fit"], tw: number, th: number, rw: number, rh: number) {
  if (fit === "fill" || !tw || !th || !rw || !rh) return { s: [1, 1], o: [0, 0] };
  const texAspect = tw / th;
  const rectAspect = rw / rh;
  if (texAspect > rectAspect) {
    const sx = rectAspect / texAspect;
    return { s: [sx, 1], o: [(1 - sx) / 2, 0] };
  }
  const sy = texAspect / rectAspect;
  return { s: [1, sy], o: [0, (1 - sy) / 2] };
}

function syncSize(s: Stage) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(window.innerWidth * dpr));
  const h = Math.max(1, Math.round(window.innerHeight * dpr));
  if (s.canvas.width !== w || s.canvas.height !== h) {
    s.canvas.width = w;
    s.canvas.height = h;
  }
  return dpr;
}

function frame(now: number) {
  const s = stage;
  if (!s) return;
  const { gl } = s;

  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 30) : 0;
  lastFrame = now;
  clock += dt;

  const dpr = syncSize(s);
  const w = window.innerWidth;
  const h = window.innerHeight;

  gl.viewport(0, 0, s.canvas.width, s.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(s.program);
  gl.bindVertexArray(s.vao);
  gl.activeTexture(gl.TEXTURE0);

  const finished: Job[] = [];

  for (const job of jobs) {
    if (job.cancelled) {
      finished.push(job);
      continue;
    }
    const rect = job.spec.rect();
    const elapsed = Math.min((now - job.startAt) / (job.spec.duration * 1000), 1);

    if (rect && rect.width > 0 && rect.height > 0) {
      const o = job.o;
      // Coarsen the grid on very large plates so a full-viewport dissolve
      // stays inside one frame budget.
      const density = Math.max(o.density, Math.sqrt((rect.width * rect.height) / 900000));
      const gridX = Math.ceil(rect.width / density);
      const gridY = Math.ceil(rect.height / density);
      const progress = job.spec.mode === "dissolve" ? elapsed : 1 - elapsed;
      const uv = uvFit(o.fit, job.texW, job.texH, rect.width, rect.height);

      gl.bindTexture(gl.TEXTURE_2D, job.tex);
      gl.uniform1i(s.u.uContent!, 0);
      gl.uniform2f(s.u.uRes!, w, h);
      gl.uniform2f(s.u.uOrigin!, rect.left, rect.top);
      gl.uniform2f(s.u.uRect!, rect.width, rect.height);
      gl.uniform2f(s.u.uGrid!, gridX, gridY);
      gl.uniform2f(s.u.uUvScale!, uv.s[0], uv.s[1]);
      gl.uniform2f(s.u.uUvOffset!, uv.o[0], uv.o[1]);
      gl.uniform1f(s.u.uDensity!, density);
      gl.uniform1f(s.u.uProgress!, progress);
      gl.uniform1f(s.u.uStagger!, Math.min(Math.max(o.stagger, 0), 0.95));
      gl.uniform1f(s.u.uSweep!, Math.min(Math.max(o.sweep, 0), 1));
      gl.uniform2f(s.u.uSweepDir!, Math.cos(o.sweepAngle), Math.sin(o.sweepAngle));
      gl.uniform1f(s.u.uSpread!, Math.max(o.spread, 0));
      gl.uniform1f(s.u.uGravity!, Math.min(Math.max(o.gravity, -1), 1));
      gl.uniform1f(s.u.uDrift!, Math.max(o.drift, 0));
      gl.uniform1f(s.u.uSwirl!, Math.max(o.swirl, 0));
      gl.uniform1f(s.u.uTime!, clock);
      gl.uniform1f(s.u.uFade!, Math.min(Math.max(o.fade, 0), 1));
      gl.uniform1f(s.u.uSize!, Math.max(o.size, 0.5));
      gl.uniform1f(s.u.uDesat!, Math.min(Math.max(o.desaturate, 0), 1));
      gl.uniform1f(s.u.uDpr!, dpr);
      gl.drawArrays(gl.POINTS, 0, gridX * gridY);
    }

    if (elapsed >= 1) finished.push(job);
  }

  gl.disable(gl.BLEND);

  for (const job of finished) {
    jobs.delete(job);
    s.gl.deleteTexture(job.tex);
    if (!job.cancelled) job.spec.onDone?.();
  }

  if (jobs.size > 0) {
    raf = requestAnimationFrame(frame);
  } else {
    raf = 0;
    lastFrame = 0;
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

export function particlesSupported(): boolean {
  return createStage() !== null;
}

/**
 * Queue a dissolve/assemble. Returns a cancel function, or `null` if WebGL2 is
 * unavailable — callers must treat `null` as "fall back to a CSS transition".
 */
export function runParticles(spec: ParticleJobSpec): (() => void) | null {
  const s = createStage();
  if (!s) return null;

  const [texW, texH] = sourceSize(spec.source);
  if (!texW || !texH) return null;

  const job: Job = {
    tex: makeTexture(s.gl, spec.source),
    texW,
    texH,
    spec,
    o: { ...DEFAULTS, ...spec },
    startAt: performance.now(),
    cancelled: false,
  };
  jobs.add(job);

  if (!raf) {
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  return () => {
    job.cancelled = true;
  };
}
