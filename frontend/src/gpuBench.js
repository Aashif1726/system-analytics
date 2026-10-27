// GPU info and a compute benchmark that runs on the GPU of the machine showing this page,
// through WebGL. A fragment shader does a long chain of multiply-adds per pixel; we time it and
// convert to GFLOPS. It is an indicative FP32 shader throughput figure, not a vendor-rated number.

const ITER = 256;                // loop iterations per pixel (must be a constant in WebGL1 GLSL)
const FLOPS_PER_PIXEL = ITER * 32; // 2 statements x (2 mul + 2 add) x 4 components per iteration
const SIZE = 512;

export function gpuInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const info = {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return info;
  } catch {
    return null;
  }
}

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform float seed;
void main() {
  vec4 a = vec4(gl_FragCoord.xy * 0.001, seed, 1.0);
  vec4 b = vec4(seed, gl_FragCoord.yx * 0.001, 0.5);
  vec4 u = vec4(0.01, 0.02, 0.03, 0.04) + seed * 0.001;
  for (int i = 0; i < ${ITER}; i++) {
    a = a * 0.7 + b * 0.2 + u;
    b = b * 0.7 + a * 0.2 + u;
  }
  gl_FragColor = vec4(fract(a.x + b.y), fract(a.y + b.z), fract(a.z + b.w), 0.002);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Shader compile failed');
  return s;
}

/**
 * Runs for about `seconds`. Calls onSample({ t, gflops }) after every batch.
 * Resolves with { median, peak, samples, renderer }. Rejects if WebGL is unavailable.
 */
export async function runGpuBench({ seconds = 4, onSample, signal } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL is not available in this browser.');

  try {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Could not link the GPU program.');
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const seedLoc = gl.getUniformLocation(prog, 'seed');

    // Blending makes every draw depend on the previous one, so tile-based GPUs cannot skip overdraw.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.viewport(0, 0, SIZE, SIZE);

    const px = new Uint8Array(4);
    const samples = [];
    const start = performance.now();
    let draws = 1;
    let batch = 0;

    while (performance.now() - start < seconds * 1000) {
      if (signal?.aborted) break;
      const t0 = performance.now();
      for (let i = 0; i < draws; i++) {
        gl.uniform1f(seedLoc, (batch * 31 + i) % 97);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // forces the GPU to finish
      const dt = Math.max(performance.now() - t0, 0.01);
      const gflops = (draws * SIZE * SIZE * FLOPS_PER_PIXEL) / dt / 1e6;
      batch++;

      // The first batches include shader compilation and clock ramp-up; keep them out of the result.
      if (batch > 2) {
        samples.push(gflops);
        onSample?.({ t: (performance.now() - start) / 1000, gflops });
      }
      // Aim for ~50 ms batches: long enough to time well, short enough to avoid the GPU watchdog.
      draws = Math.max(1, Math.min(4096, Math.round(draws * (50 / dt))));
      await new Promise((r) => setTimeout(r, 0));
    }

    if (samples.length === 0) throw new Error('Benchmark was stopped before any result was measured.');
    const sorted = [...samples].sort((x, y) => x - y);
    return {
      median: sorted[Math.floor(sorted.length / 2)],
      peak: sorted[sorted.length - 1],
      samples: samples.length,
      renderer: gpuInfo()?.renderer ?? 'Unknown GPU',
    };
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
