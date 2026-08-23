import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';

/**
 * Cosmos Profondo · fondo de nebulosa fluida (Fragment Shader WebGL).
 *
 * - Ruido simplex + FBM con domain warping: corrientes de gas orgánicas.
 * - Parallax de ratón en dos profundidades + polvo de estrellas titilante.
 * - La velocidad de scroll acelera sutilmente la deriva del gas (uBoost).
 * - Sin dependencias externas: WebGL1 directo (más ligero que Three.js).
 * - Pausa cuando la pestaña no es visible y respeta prefers-reduced-motion.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uBoost;

vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

/* Ruido simplex 2D (Ashima Arts / Ian McEwan) */
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p){
  float f = 0.0;
  float a = 0.55;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return f;
}

float hash21(vec2 p){
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = uTime * 0.03 + uBoost * 0.22;
  vec2 m1 = uMouse * 0.05;   // capa profunda
  vec2 m2 = uMouse * 0.13;   // capa cercana

  /* Corrientes de gas: dominio deformado en cascada */
  float n1 = fbm(p * 1.35 + t * vec2(0.10, 0.06) + m1);
  float n2 = fbm(p * 2.40 - t * vec2(0.07, 0.09) + n1 * 0.7 + m2);
  float flow = fbm(p * 3.2 + vec2(n2, n1) * 1.15 + t * vec2(0.04, -0.03));

  vec3 deep   = vec3(0.008, 0.014, 0.045);
  vec3 cobalt = vec3(0.030, 0.090, 0.300);
  vec3 blue   = vec3(0.070, 0.240, 0.580);
  vec3 cyan   = vec3(0.160, 0.720, 0.950);
  vec3 turq   = vec3(0.100, 0.920, 0.800);

  vec3 col = mix(deep, cobalt, smoothstep(-0.4, 0.7, n1));
  col = mix(col, blue, smoothstep(0.0, 1.0, n2) * 0.75);

  float hi = smoothstep(0.45, 1.05, flow + n2 * 0.3);
  col += cyan * hi * 0.28;
  col += turq * pow(hi, 3.0) * 0.5;

  /* Filamentos luminosos estilo medusa */
  float filament = abs(snoise(p * 4.5 + vec2(n1, n2) + t * 0.15));
  col += turq * pow(1.0 - filament, 14.0) * 0.18 * hi;

  /* Polvo de estrellas: dos capas con parallax propio y titileo */
  float stars = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 sp = (uv + 0.5) * (160.0 + fi * 130.0) + uMouse * (20.0 + fi * 45.0);
    sp.y += t * 8.0 * (1.0 - fi * 0.4);
    vec2 id = floor(sp);
    vec2 gv = fract(sp) - 0.5;
    float h = hash21(id + fi * 19.7);
    if (h > 0.986 - fi * 0.003) {
      vec2 off = vec2(hash21(id + 3.17), hash21(id + 7.71)) - 0.5;
      float d = length(gv - off * 0.55);
      float tw = 0.55 + 0.45 * sin(uTime * (1.2 + h * 3.0) + h * 40.0);
      stars += tw * smoothstep(0.16, 0.0, d) * (0.75 - fi * 0.3);
    }
  }
  col += vec3(0.75, 0.88, 1.0) * stars;

  col *= 1.0 - 0.38 * length(uv - 0.5);   /* viñeta */
  col += cyan * uBoost * 0.03;            /* el scroll realza el cian */
  gl_FragColor = vec4(col, 1.0);
}
`;

@Component({
  selector: 'app-nebula-background',
  template: '<canvas #cv></canvas>',
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      display: block;
      pointer-events: none;
      /* Fallback estático si WebGL no está disponible */
      background:
        radial-gradient(900px 600px at 78% 18%, rgba(23,84,166,.35), transparent 60%),
        radial-gradient(700px 500px at 18% 82%, rgba(47,240,200,.14), transparent 65%),
        radial-gradient(1100px 800px at 45% 45%, rgba(11,26,74,.5), transparent 70%),
        #04070f;
    }
    canvas { width: 100%; height: 100%; display: block; }
  `
})
export class NebulaBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cv') cv!: ElementRef<HTMLCanvasElement>;
  private readonly zone = inject(NgZone);

  private gl: WebGLRenderingContext | null = null;
  private raf = 0;
  private running = false;
  private time = 30;
  private last = 0;

  private mouse = { x: 0, y: 0 };
  private mouseTarget = { x: 0, y: 0 };
  private boost = 0;
  private boostTarget = 0;
  private lastScrollY = window.scrollY;

  private uRes: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uMouse: WebGLUniformLocation | null = null;
  private uBoost: WebGLUniformLocation | null = null;

  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.init());
  }

  private init(): void {
    const canvas = this.cv.nativeElement;
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) as WebGLRenderingContext | null;
    if (!this.gl) return; // se mantiene el fallback CSS del host

    const compile = (type: number, src: string) => {
      const sh = this.gl!.createShader(type)!;
      this.gl!.shaderSource(sh, src);
      this.gl!.compileShader(sh);
      if (!this.gl!.getShaderParameter(sh, this.gl!.COMPILE_STATUS)) {
        console.error(this.gl!.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(this.gl.VERTEX_SHADER, VERT);
    const fs = compile(this.gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { this.gl = null; return; }

    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) { this.gl = null; return; }
    this.gl.useProgram(prog);

    // Triángulo a pantalla completa (cubre viewport con un solo draw call)
    const buf = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW);
    const loc = this.gl.getAttribLocation(prog, 'aPos');
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);

    this.uRes = this.gl.getUniformLocation(prog, 'uRes');
    this.uTime = this.gl.getUniformLocation(prog, 'uTime');
    this.uMouse = this.gl.getUniformLocation(prog, 'uMouse');
    this.uBoost = this.gl.getUniformLocation(prog, 'uBoost');

    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);

    this.onResize();

    if (this.reduced) {
      // Un solo fotograma sereno, sin bucle
      this.time = 42;
      this.draw();
      return;
    }
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private onResize = () => {
    if (!this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.cv.nativeElement.width !== w || this.cv.nativeElement.height !== h) {
      this.cv.nativeElement.width = w;
      this.cv.nativeElement.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.draw();
  };

  private onPointerMove = (e: PointerEvent) => {
    this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  private onScroll = () => {
    const dy = Math.abs(window.scrollY - this.lastScrollY);
    this.lastScrollY = window.scrollY;
    this.boostTarget = Math.min(1, this.boostTarget + dy / 260);
  };

  private onVisibility = () => {
    if (document.hidden) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    } else if (!this.reduced) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  };

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(64, now - this.last);
    this.last = now;

    this.time += dt * 0.06;
    this.boostTarget *= 0.94;
    this.boost += (this.boostTarget - this.boost) * 0.08;
    this.mouse.x += (this.mouseTarget.x - this.mouse.x) * 0.045;
    this.mouse.y += (this.mouseTarget.y - this.mouse.y) * 0.045;

    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    if (!this.gl) return;
    this.gl.uniform2f(this.uRes!, this.cv.nativeElement.width, this.cv.nativeElement.height);
    this.gl.uniform1f(this.uTime!, this.time);
    this.gl.uniform2f(this.uMouse!, this.mouse.x, this.mouse.y);
    this.gl.uniform1f(this.uBoost!, this.boost);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  ngOnDestroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.releaseContext();
  }

  /** Libera el contexto GPU */
  private releaseContext(): void {
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }
}
