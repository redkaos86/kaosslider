/*!
 * KaosSlider – effetti WebGL (fluido, raggi di luce, particelle che si trasformano, panorama 360°, distorsione liquida).
 * Caricato solo nelle pagine che usano questi effetti. Nessuna dipendenza.
 */
(function () {
	'use strict';

	var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- Utility WebGL ---------- */

	var QUAD_VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

	function getGL(canvas) {
		var opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };
		var gl = canvas.getContext('webgl2', opts);
		var v2 = !!gl;
		if (!gl) { gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); }
		return gl ? { gl: gl, v2: v2 } : null;
	}

	function shader(gl, type, src) {
		var s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			throw new Error('KaosSlider GL: ' + gl.getShaderInfoLog(s));
		}
		return s;
	}

	function Program(gl, vs, fs) {
		this.gl = gl;
		var p = gl.createProgram();
		gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
		gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
		gl.bindAttribLocation(p, 0, 'aPos');
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			throw new Error('KaosSlider GL: ' + gl.getProgramInfoLog(p));
		}
		this.p = p;
		this.u = {};
	}
	Program.prototype.use = function () {
		this.gl.useProgram(this.p);
		return this;
	};
	Program.prototype.loc = function (name) {
		if (!(name in this.u)) { this.u[name] = this.gl.getUniformLocation(this.p, name); }
		return this.u[name];
	};
	Program.prototype.set = function (name, a, b, c, d) {
		var gl = this.gl;
		var l = this.loc(name);
		if (l === null) { return this; }
		if (d !== undefined) { gl.uniform4f(l, a, b, c, d); }
		else if (c !== undefined) { gl.uniform3f(l, a, b, c); }
		else if (b !== undefined) { gl.uniform2f(l, a, b); }
		else { gl.uniform1f(l, a); }
		return this;
	};
	Program.prototype.tex = function (name, unit) {
		var l = this.loc(name);
		if (l !== null) { this.gl.uniform1i(l, unit); }
		return this;
	};

	function quad(gl) {
		var b = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, b);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		return b;
	}

	function hexToRgb(c, fallback) {
		var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((c || '').trim());
		if (!m) {
			var rgb = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c || '');
			return rgb ? [rgb[1] / 255, rgb[2] / 255, rgb[3] / 255] : (fallback || [1, 1, 1]);
		}
		var x = m[1].length === 3 ? m[1].split('').map(function (ch) { return ch + ch; }).join('') : m[1];
		var n = parseInt(x, 16);
		return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
	}

	function palette(p, canvas) {
		var raw = String(p.color || '#ffffff');
		if (raw === 'multi') { return null; }
		return raw.split(',').map(function (c) {
			c = c.trim();
			var m = /^var\((--[\w-]+)\)$/.exec(c);
			if (m) { c = getComputedStyle(canvas).getPropertyValue(m[1]).trim(); }
			return hexToRgb(c);
		});
	}

	function hsv(h, s, v) {
		var i = Math.floor(h * 6);
		var f = h * 6 - i;
		var pp = v * (1 - s);
		var q = v * (1 - f * s);
		var t = v * (1 - (1 - f) * s);
		return [[v, t, pp], [q, v, pp], [pp, v, t], [pp, q, v], [t, pp, v], [v, pp, q]][i % 6];
	}

	function loadImage(url, cb) {
		if (!url) { cb(null); return; }
		var img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = function () { cb(img); };
		img.onerror = function () { cb(null); };
		img.src = url;
	}

	/* Carica un'immagine come texture (ridimensionandola se supera il limite della scheda video). */
	function imageTexture(gl, img) {
		var max = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
		var src = img;
		if (img.width > max || img.height > max) {
			var k = max / Math.max(img.width, img.height);
			var c = document.createElement('canvas');
			c.width = Math.floor(img.width * k);
			c.height = Math.floor(img.height * k);
			c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
			src = c;
		}
		var t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return { tex: t, w: src.width, h: src.height };
	}

	/* ---------- Base comune ---------- */

	function Effect(canvas, p, slide) {
		var self = this;
		this.c = canvas;
		this.p = p;
		this.slide = slide;
		this.running = false;
		this.mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, inside: false, moved: false };
		this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
		var host = slide || canvas.parentNode;
		this.onMove = function (e) {
			var r = canvas.getBoundingClientRect();
			if (!r.width) { return; }
			self.mouse.x = (e.clientX - r.left) / r.width;
			self.mouse.y = 1 - (e.clientY - r.top) / r.height;
			self.mouse.inside = true;
			self.mouse.moved = true;
		};
		this.onLeave = function () { self.mouse.inside = false; };
		if (p.interactive !== false) {
			host.addEventListener('pointermove', this.onMove);
			host.addEventListener('pointerleave', this.onLeave);
		}
	}

	Effect.prototype.resize = function () {
		var w = this.c.offsetWidth;
		var h = this.c.offsetHeight;
		if (!w || !h) { return false; }
		var cw = Math.max(1, Math.round(w * this.dpr));
		var ch = Math.max(1, Math.round(h * this.dpr));
		if (cw === this.c.width && ch === this.c.height && this.w) { return false; }
		this.w = w;
		this.h = h;
		this.c.width = cw;
		this.c.height = ch;
		return true;
	};

	Effect.prototype.start = function () {
		if (this.running || this.failed) { return; }
		this.resize();
		var self = this;
		this.running = true;
		var last = performance.now();
		var t0 = last;
		var loop = function (t) {
			if (!self.running) { return; }
			if (!self.c.isConnected) { self.running = false; return; }
			var dt = Math.min(0.033, (t - last) / 1000);
			last = t;
			try {
				self.frame((t - t0) / 1000, dt);
			} catch (err) {
				self.fail(err);
				return;
			}
			if (reducedMotion) { self.running = false; return; } // un solo fotogramma
			self.raf = requestAnimationFrame(loop);
		};
		this.raf = requestAnimationFrame(loop);
	};

	Effect.prototype.stop = function () {
		this.running = false;
		cancelAnimationFrame(this.raf);
	};

	Effect.prototype.fail = function (err) {
		this.failed = true;
		this.running = false;
		this.c.style.display = 'none'; // si vede lo sfondo normale della slide
		if (window.console && err) { console.warn(err.message || err); }
	};

	function inherit(Child) {
		Child.prototype = Object.create(Effect.prototype);
		Child.prototype.constructor = Child;
	}

	/* ---------- Raggi di luce ---------- */

	var RAYS_FS = [
		'precision mediump float;',
		'varying vec2 vUv;',
		'uniform vec2 uRes; uniform float uTime; uniform vec2 uSrc; uniform vec3 uColor;',
		'uniform float uIntensity; uniform float uSpread; uniform float uSpeed; uniform float uOpacity;',
		'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
		'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
		'  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
		'void main(){',
		'  float asp = uRes.x / uRes.y;',
		'  vec2 p = vec2(vUv.x * asp, vUv.y); vec2 s = vec2(uSrc.x * asp, uSrc.y);',
		'  vec2 d = p - s; float dist = length(d); float a = atan(d.y, d.x);',
		'  vec2 dir = vec2(cos(a), sin(a));', // coordinate sul cerchio: nessuna cucitura a ±180°
		'  float t = uTime * uSpeed;',
		'  float r = noise(dir * 3.0 * uSpread + vec2(t * 0.35, -t * 0.2)) * 0.6 + noise(dir * 7.0 * uSpread - vec2(t * 0.5, t * 0.3)) * 0.4;',
		'  r = pow(r, 2.6);',
		'  float shaft = r * exp(-dist * 1.25);',
		'  float glow = exp(-dist * 6.0) * 0.55;',
		'  float v = (shaft * 1.6 + glow) * uIntensity;',
		'  v = clamp(v, 0.0, 1.0) * uOpacity;',
		'  gl_FragColor = vec4(uColor * v, v);',
		'}'
	].join('\n');

	function Rays(canvas, p, slide) {
		Effect.call(this, canvas, p, slide);
		var g = getGL(canvas);
		if (!g) { this.fail(); return; }
		this.gl = g.gl;
		this.prog = new Program(this.gl, QUAD_VS, RAYS_FS);
		quad(this.gl);
		this.color = (palette(p, canvas) || [[1, 0.95, 0.8]])[0];
		this.src = { x: (p.x != null ? +p.x : 50) / 100, y: 1 - (p.y != null ? +p.y : 0) / 100 };
		canvas.classList.add('ks-fx-screen');
	}
	inherit(Rays);
	Rays.prototype.frame = function (t) {
		var gl = this.gl;
		this.resize();
		var p = this.p;
		var tx = (p.x != null ? +p.x : 50) / 100;
		var ty = 1 - (p.y != null ? +p.y : 0) / 100;
		if (p.interactive !== false && this.mouse.inside) {
			// La sorgente segue un po' il mouse.
			tx += (this.mouse.x - tx) * 0.35;
			ty += (this.mouse.y - ty) * 0.35;
		}
		this.src.x += (tx - this.src.x) * 0.05;
		this.src.y += (ty - this.src.y) * 0.05;
		gl.viewport(0, 0, this.c.width, this.c.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.prog.use()
			.set('uRes', this.c.width, this.c.height)
			.set('uTime', t)
			.set('uSrc', this.src.x, this.src.y)
			.set('uColor', this.color[0], this.color[1], this.color[2])
			.set('uIntensity', +p.intensity || 1)
			.set('uSpread', Math.max(0.3, (+p.size || 3) / 3))
			.set('uSpeed', +p.speed || 1)
			.set('uOpacity', +p.opacity || 0.8);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};

	/* ---------- Distorsione liquida dello sfondo ---------- */

	var LIQUID_FS = [
		'precision mediump float;',
		'varying vec2 vUv;',
		'uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uMouse; uniform vec2 uVel;',
		'uniform float uTime; uniform float uStrength; uniform float uRadius; uniform float uHover;',
		'vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y; float ri = uImg.x / uImg.y;',
		'  vec2 sc = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0); return (uv - 0.5) * sc + 0.5; }',
		'void main(){',
		'  vec2 uv = vUv; vec2 asp = vec2(uRes.x / uRes.y, 1.0);',
		'  float d = length((uv - uMouse) * asp);',
		'  float f = smoothstep(uRadius, 0.0, d) * uHover;',
		'  vec2 idle = vec2(sin(uv.y * 9.0 + uTime * 0.8), cos(uv.x * 7.0 + uTime * 0.6)) * 0.0025;',
		'  vec2 ripple = normalize(uv - uMouse + 0.0001) * sin(d * 45.0 - uTime * 5.0) * 0.012;',
		'  vec2 off = (uVel * 0.9 + ripple) * f * uStrength + idle * uStrength;',
		'  vec2 t = cover(uv + off);',
		'  float split = length(off) * 0.6;',
		'  vec3 col = vec3(texture2D(uTex, t + vec2(split, 0.0)).r, texture2D(uTex, t).g, texture2D(uTex, t - vec2(split, 0.0)).b);',
		'  gl_FragColor = vec4(col, 1.0);',
		'}'
	].join('\n');

	function Liquid(canvas, p, slide) {
		Effect.call(this, canvas, p, slide);
		var g = getGL(canvas);
		if (!g) { this.fail(); return; }
		this.gl = g.gl;
		this.prog = new Program(this.gl, QUAD_VS, LIQUID_FS);
		quad(this.gl);
		this.vel = { x: 0, y: 0 };
		this.hover = 0;
		this.texture = null;
		var self = this;
		var url = p.image || bgImageOf(slide);
		canvas.style.opacity = '0';
		loadImage(url, function (img) {
			if (!img) { self.fail(new Error('KaosSlider: immagine per la distorsione non disponibile')); return; }
			self.texture = imageTexture(self.gl, img);
			canvas.style.transition = 'opacity .6s';
			canvas.style.opacity = '1';
			if (reducedMotion) { self.resize(); self.frame(0, 0.016); }
		});
	}
	inherit(Liquid);
	Liquid.prototype.frame = function (t, dt) {
		var gl = this.gl;
		this.resize();
		if (!this.texture) { return; }
		var m = this.mouse;
		this.vel.x = this.vel.x * 0.92 + (m.x - m.px) * 0.6;
		this.vel.y = this.vel.y * 0.92 + (m.y - m.py) * 0.6;
		m.px = m.x;
		m.py = m.y;
		this.hover += ((m.inside ? 1 : 0) - this.hover) * Math.min(1, dt * 4);
		gl.viewport(0, 0, this.c.width, this.c.height);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture.tex);
		this.prog.use().tex('uTex', 0)
			.set('uRes', this.c.width, this.c.height)
			.set('uImg', this.texture.w, this.texture.h)
			.set('uMouse', m.x, m.y)
			.set('uVel', this.vel.x, this.vel.y)
			.set('uTime', t)
			.set('uStrength', +this.p.intensity || 1)
			.set('uRadius', 0.12 + (+this.p.size || 3) * 0.03)
			.set('uHover', this.hover);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};

	function bgImageOf(slide) {
		if (!slide) { return ''; }
		var el = slide.querySelector('.ks-bg-img');
		if (!el) { return ''; }
		var u = el.getAttribute('data-bg');
		if (u) { return u; }
		var m = /url\(["']?(.*?)["']?\)/.exec(el.style.backgroundImage || '');
		return m ? m[1] : '';
	}

	/* ---------- Panorama 360° ---------- */

	var PANO_FS = [
		'precision highp float;',
		'varying vec2 vUv;',
		'uniform sampler2D uTex; uniform vec2 uRes; uniform float uYaw; uniform float uPitch; uniform float uFov;',
		'void main(){',
		'  vec2 p = vUv * 2.0 - 1.0; p.x *= uRes.x / uRes.y;',
		'  float f = 1.0 / tan(uFov * 0.5);',
		'  vec3 dir = normalize(vec3(p.x, p.y, -f));',
		'  float cp = cos(uPitch); float sp = sin(uPitch);',
		'  dir = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);',
		'  float cy = cos(uYaw); float sy = sin(uYaw);',
		'  dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);',
		'  float lon = atan(dir.x, -dir.z); float lat = asin(clamp(dir.y, -1.0, 1.0));',
		'  vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5);',
		'  gl_FragColor = texture2D(uTex, uv);',
		'}'
	].join('\n');

	function Panorama(canvas, p, slide) {
		Effect.call(this, canvas, p, slide);
		var g = getGL(canvas);
		if (!g) { this.fail(); return; }
		this.gl = g.gl;
		this.prog = new Program(this.gl, QUAD_VS, PANO_FS);
		quad(this.gl);
		this.yaw = (+p.x || 0) / 100 * Math.PI * 2;
		this.pitch = 0;
		this.vYaw = 0;
		this.vPitch = 0;
		this.idle = 0;
		var self = this;
		canvas.classList.add('ks-fx-drag');
		canvas.style.opacity = '0';
		loadImage(p.image || bgImageOf(slide), function (img) {
			if (!img) { self.fail(new Error('KaosSlider: immagine panoramica non disponibile')); return; }
			self.texture = imageTexture(self.gl, img);
			canvas.style.transition = 'opacity .6s';
			canvas.style.opacity = '1';
			if (reducedMotion) { self.resize(); self.frame(0, 0.016); }
		});
		// Trascinamento per guardarsi intorno, con inerzia.
		var drag = null;
		canvas.addEventListener('pointerdown', function (e) {
			drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
			try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
			canvas.classList.add('is-grabbing');
			e.stopPropagation();
		});
		canvas.addEventListener('pointermove', function (e) {
			if (!drag || e.pointerId !== drag.id) { return; }
			var k = (self.fov() / Math.max(1, canvas.offsetHeight));
			self.vYaw = -(e.clientX - drag.x) * k;
			self.vPitch = (e.clientY - drag.y) * k;
			self.yaw += self.vYaw;
			self.pitch += self.vPitch;
			drag.x = e.clientX;
			drag.y = e.clientY;
			self.idle = 0;
		});
		var end = function () { drag = null; canvas.classList.remove('is-grabbing'); };
		canvas.addEventListener('pointerup', end);
		canvas.addEventListener('pointercancel', end);
	}
	inherit(Panorama);
	Panorama.prototype.fov = function () {
		return (Math.max(30, Math.min(120, 40 + (+this.p.size || 3) * 6))) * Math.PI / 180;
	};
	Panorama.prototype.frame = function (t, dt) {
		var gl = this.gl;
		this.resize();
		if (!this.texture) { return; }
		this.idle += dt;
		this.vYaw *= 0.92;
		this.vPitch *= 0.92;
		this.yaw += this.vYaw * 0.5;
		this.pitch += this.vPitch * 0.5;
		if (this.p.auto !== false && this.idle > 2) {
			this.yaw += dt * 0.08 * (+this.p.speed || 1); // rotazione automatica quando nessuno trascina
		}
		this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
		gl.viewport(0, 0, this.c.width, this.c.height);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture.tex);
		this.prog.use().tex('uTex', 0)
			.set('uRes', this.c.width, this.c.height)
			.set('uYaw', this.yaw)
			.set('uPitch', this.pitch)
			.set('uFov', this.fov());
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};

	/* ---------- Particelle che si trasformano in parole/simboli ---------- */

	var MORPH_VS = [
		'attribute vec2 aPos; attribute vec3 aCol;',
		'uniform vec2 uRes; uniform float uSize;',
		'varying vec3 vCol;',
		'void main(){ vCol = aCol; vec2 c = aPos / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); gl_PointSize = uSize; }'
	].join('\n');
	var MORPH_FS = [
		'precision mediump float;',
		'varying vec3 vCol; uniform float uOpacity;',
		'void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); float a = smoothstep(0.5, 0.15, r) * uOpacity; if (a <= 0.0) discard; gl_FragColor = vec4(vCol * a, a); }'
	].join('\n');

	function Morph(canvas, p, slide) {
		Effect.call(this, canvas, p, slide);
		var g = getGL(canvas);
		if (!g) { this.fail(); return; }
		var gl = this.gl = g.gl;
		this.prog = new Program(gl, MORPH_VS, MORPH_FS);
		gl.bindAttribLocation(this.prog.p, 1, 'aCol');
		gl.linkProgram(this.prog.p);
		this.n = Math.max(200, Math.min(8000, Math.round((+p.count || 120) * 20)));
		this.pos = new Float32Array(this.n * 2);
		this.vel = new Float32Array(this.n * 2);
		this.tgt = new Float32Array(this.n * 2);
		this.col = new Float32Array(this.n * 3);
		this.words = String(p.text || 'KAOS|SLIDER|♥').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
		if (!this.words.length) { this.words = ['KAOS']; }
		this.word = 0;
		this.timer = 0;
		var pal = palette(p, canvas);
		for (var i = 0; i < this.n; i++) {
			var c = pal ? pal[i % pal.length] : hsv((i / this.n + Math.random() * 0.1) % 1, 0.7, 1);
			this.col[i * 3] = c[0];
			this.col[i * 3 + 1] = c[1];
			this.col[i * 3 + 2] = c[2];
		}
		this.posBuf = gl.createBuffer();
		this.colBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
		gl.bufferData(gl.ARRAY_BUFFER, this.col, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
	}
	inherit(Morph);

	Morph.prototype.resize = function () {
		var changed = Effect.prototype.resize.call(this);
		if (changed) {
			var first = !this.seeded;
			this.seeded = true;
			for (var i = 0; first && i < this.n; i++) {
				this.pos[i * 2] = Math.random() * this.w;
				this.pos[i * 2 + 1] = Math.random() * this.h;
			}
			this.setTarget(this.words[this.word]);
		}
		return changed;
	};

	/* Disegna la parola su un canvas nascosto e ne campiona i pixel: i punti diventano le destinazioni. */
	Morph.prototype.setTarget = function (word) {
		var w = this.w;
		var h = this.h;
		var sc = 0.25;
		var cw = Math.max(16, Math.round(w * sc));
		var ch = Math.max(16, Math.round(h * sc));
		var off = document.createElement('canvas');
		off.width = cw;
		off.height = ch;
		var ctx = off.getContext('2d', { willReadFrequently: true });
		var font = this.p.font || '"Arial Black", "Helvetica Neue", Arial, sans-serif';
		var fs = ch * 0.62;
		ctx.font = '900 ' + fs + 'px ' + font;
		var tw = ctx.measureText(word).width;
		if (tw > cw * 0.86) { fs *= cw * 0.86 / tw; }
		ctx.font = '900 ' + fs + 'px ' + font;
		ctx.fillStyle = '#fff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(word, cw / 2, ch / 2);
		var data = ctx.getImageData(0, 0, cw, ch).data;
		var pts = [];
		for (var y = 0; y < ch; y++) {
			for (var x = 0; x < cw; x++) {
				if (data[(y * cw + x) * 4 + 3] > 128) { pts.push(x / sc, y / sc); }
			}
		}
		var i;
		if (!pts.length) {
			for (i = 0; i < this.n; i++) { this.tgt[i * 2] = Math.random() * w; this.tgt[i * 2 + 1] = Math.random() * h; }
			return;
		}
		var cnt = pts.length / 2;
		for (i = 0; i < this.n; i++) {
			var k = Math.floor(Math.random() * cnt) * 2;
			this.tgt[i * 2] = pts[k] + (Math.random() - 0.5) / sc;
			this.tgt[i * 2 + 1] = pts[k + 1] + (Math.random() - 0.5) / sc;
		}
	};

	Morph.prototype.frame = function (t, dt) {
		var gl = this.gl;
		this.resize();
		if (!this.w) { return; }
		var p = this.p;
		this.timer += dt;
		var interval = Math.max(1, +p.interval || 4);
		if (this.words.length > 1 && this.timer > interval) {
			this.timer = 0;
			this.word = (this.word + 1) % this.words.length;
			this.setTarget(this.words[this.word]);
			// Piccola esplosione: le particelle partono in direzioni casuali prima di ricomporsi.
			for (var e = 0; e < this.n; e++) {
				this.vel[e * 2] += (Math.random() - 0.5) * 900 * dt;
				this.vel[e * 2 + 1] += (Math.random() - 0.5) * 900 * dt;
			}
		}
		var k = 4 * (+p.speed || 1);
		var damp = Math.pow(0.86, dt * 60);
		var mx = this.mouse.x * this.w;
		var my = (1 - this.mouse.y) * this.h;
		var repel = p.interactive !== false && this.mouse.inside;
		var R = 90;
		for (var i = 0; i < this.n; i++) {
			var ix = i * 2;
			var iy = ix + 1;
			var vx = this.vel[ix] + (this.tgt[ix] - this.pos[ix]) * k * dt;
			var vy = this.vel[iy] + (this.tgt[iy] - this.pos[iy]) * k * dt;
			if (repel) {
				var dx = this.pos[ix] - mx;
				var dy = this.pos[iy] - my;
				var d2 = dx * dx + dy * dy;
				if (d2 < R * R && d2 > 0.01) {
					var d = Math.sqrt(d2);
					var f = (1 - d / R) * 2400 * dt;
					vx += dx / d * f;
					vy += dy / d * f;
				}
			}
			vx *= damp;
			vy *= damp;
			this.vel[ix] = vx;
			this.vel[iy] = vy;
			this.pos[ix] += vx * dt * 6;
			this.pos[iy] += vy * dt * 6;
		}
		gl.viewport(0, 0, this.c.width, this.c.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		this.prog.use()
			.set('uRes', this.w, this.h)
			.set('uSize', Math.max(1, (+p.size || 3) * this.dpr))
			.set('uOpacity', +p.opacity || 0.9);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.POINTS, 0, this.n);
	};

	/* ---------- Fluido (inchiostro) ----------
	 * Simulazione di fluidi "stable fluids" su GPU: advezione, vorticità, pressione (Jacobi), sottrazione del gradiente. */

	var FL_VS = [
		'precision highp float;',
		'attribute vec2 aPos; uniform vec2 uTexel;',
		'varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
		'void main(){ vUv = aPos * 0.5 + 0.5; vL = vUv - vec2(uTexel.x, 0.0); vR = vUv + vec2(uTexel.x, 0.0);',
		'  vT = vUv + vec2(0.0, uTexel.y); vB = vUv - vec2(0.0, uTexel.y); gl_Position = vec4(aPos, 0.0, 1.0); }'
	].join('\n');
	var FL_HEAD = 'precision highp float; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;\n';
	var FL = {
		clear: FL_HEAD + 'uniform sampler2D uTex; uniform float uValue; void main(){ gl_FragColor = uValue * texture2D(uTex, vUv); }',
		splat: FL_HEAD + 'uniform sampler2D uTarget; uniform float uAspect; uniform vec3 uColor; uniform vec2 uPoint; uniform float uRadius;' +
			'void main(){ vec2 p = vUv - uPoint; p.x *= uAspect; vec3 s = exp(-dot(p, p) / uRadius) * uColor; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0); }',
		advect: FL_HEAD + 'uniform sampler2D uVel; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uDt; uniform float uDiss;' +
			'void main(){ vec2 c = vUv - uDt * texture2D(uVel, vUv).xy * uTexel; gl_FragColor = texture2D(uSrc, c) / (1.0 + uDiss * uDt); }',
		divergence: FL_HEAD + 'uniform sampler2D uVel; void main(){ float L = texture2D(uVel, vL).x; float R = texture2D(uVel, vR).x;' +
			'float T = texture2D(uVel, vT).y; float B = texture2D(uVel, vB).y; vec2 C = texture2D(uVel, vUv).xy;' +
			'if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;' +
			'gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }',
		curl: FL_HEAD + 'uniform sampler2D uVel; void main(){ float L = texture2D(uVel, vL).y; float R = texture2D(uVel, vR).y;' +
			'float T = texture2D(uVel, vT).x; float B = texture2D(uVel, vB).x; gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }',
		vorticity: FL_HEAD + 'uniform sampler2D uVel; uniform sampler2D uCurl; uniform float uCurlK; uniform float uDt;' +
			'void main(){ float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;' +
			'float C = texture2D(uCurl, vUv).x; vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 0.0001; f *= uCurlK * C; f.y *= -1.0;' +
			'vec2 v = texture2D(uVel, vUv).xy + f * uDt; gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0); }',
		pressure: FL_HEAD + 'uniform sampler2D uPres; uniform sampler2D uDiv; void main(){ float L = texture2D(uPres, vL).x; float R = texture2D(uPres, vR).x;' +
			'float T = texture2D(uPres, vT).x; float B = texture2D(uPres, vB).x; float d = texture2D(uDiv, vUv).x; gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0); }',
		gradient: FL_HEAD + 'uniform sampler2D uPres; uniform sampler2D uVel; void main(){ float L = texture2D(uPres, vL).x; float R = texture2D(uPres, vR).x;' +
			'float T = texture2D(uPres, vT).x; float B = texture2D(uPres, vB).x; vec2 v = texture2D(uVel, vUv).xy - vec2(R - L, T - B); gl_FragColor = vec4(v, 0.0, 1.0); }',
		display: FL_HEAD + 'uniform sampler2D uTex; uniform float uOpacity; void main(){ vec3 c = clamp(texture2D(uTex, vUv).rgb, 0.0, 1.0);' +
			'float a = max(c.r, max(c.g, c.b)) * uOpacity; gl_FragColor = vec4(c * uOpacity, a); }'
	};

	function Fluid(canvas, p, slide) {
		Effect.call(this, canvas, p, slide);
		var g = getGL(canvas);
		if (!g) { this.fail(); return; }
		var gl = this.gl = g.gl;
		this.v2 = g.v2;
		// Texture a virgola mobile: indispensabili per la simulazione.
		var ok;
		if (g.v2) {
			ok = gl.getExtension('EXT_color_buffer_float');
			this.fmt = { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR };
		} else {
			var hf = gl.getExtension('OES_texture_half_float');
			ok = hf;
			this.fmt = hf ? { internal: gl.RGBA, format: gl.RGBA, type: hf.HALF_FLOAT_OES, filter: gl.getExtension('OES_texture_half_float_linear') ? gl.LINEAR : gl.NEAREST } : null;
		}
		if (!ok) { this.fail(new Error('KaosSlider: WebGL senza texture float, effetto fluido disattivato')); return; }
		this.progs = {};
		for (var key in FL) {
			if (Object.prototype.hasOwnProperty.call(FL, key)) { this.progs[key] = new Program(gl, FL_VS, FL[key]); }
		}
		quad(gl);
		this.pal = palette(p, canvas);
		this.autoT = 0;
		this.hueT = Math.random();
		canvas.classList.add('ks-fx-screen');
	}
	inherit(Fluid);

	Fluid.prototype.fbo = function (w, h) {
		var gl = this.gl;
		var f = this.fmt;
		gl.activeTexture(gl.TEXTURE0);
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f.filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f.filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, f.type, null);
		var fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			throw new Error('KaosSlider: framebuffer float non supportato');
		}
		gl.viewport(0, 0, w, h);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		return { tex: tex, fb: fb, w: w, h: h };
	};

	Fluid.prototype.double = function (w, h) {
		var a = this.fbo(w, h);
		var b = this.fbo(w, h);
		return { read: a, write: b, w: w, h: h, swap: function () { var t = this.read; this.read = this.write; this.write = t; } };
	};

	Fluid.prototype.setup = function () {
		var asp = this.w / this.h;
		var sim = 128;
		var dye = 512;
		var sw = asp >= 1 ? Math.round(sim * asp) : sim;
		var sh = asp >= 1 ? sim : Math.round(sim / asp);
		var dw = asp >= 1 ? Math.round(dye * asp) : dye;
		var dh = asp >= 1 ? dye : Math.round(dye / asp);
		this.vel = this.double(sw, sh);
		this.dye = this.double(dw, dh);
		this.pres = this.double(sw, sh);
		this.div = this.fbo(sw, sh);
		this.curl = this.fbo(sw, sh);
		this.ready = true;
	};

	Fluid.prototype.blit = function (target) {
		var gl = this.gl;
		if (target) {
			gl.viewport(0, 0, target.w, target.h);
			gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
		} else {
			gl.viewport(0, 0, this.c.width, this.c.height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};

	Fluid.prototype.bind = function (unit, fbo) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
		return unit;
	};

	Fluid.prototype.color = function () {
		if (this.pal) { return this.pal[Math.floor(Math.random() * this.pal.length)]; }
		this.hueT = (this.hueT + 0.13 + Math.random() * 0.1) % 1;
		return hsv(this.hueT, 0.85, 1);
	};

	Fluid.prototype.splat = function (x, y, dx, dy, col) {
		var P = this.progs.splat;
		var asp = this.w / this.h;
		var rad = (0.15 + (+this.p.size || 3) * 0.05) / 100;
		P.use().tex('uTarget', this.bind(0, this.vel.read))
			.set('uAspect', asp).set('uPoint', x, y).set('uColor', dx, dy, 0).set('uRadius', rad)
			.set('uTexel', 1 / this.vel.w, 1 / this.vel.h);
		this.blit(this.vel.write);
		this.vel.swap();
		var k = 0.35 * (+this.p.intensity || 1);
		P.use().tex('uTarget', this.bind(0, this.dye.read))
			.set('uColor', col[0] * k, col[1] * k, col[2] * k)
			.set('uTexel', 1 / this.dye.w, 1 / this.dye.h);
		this.blit(this.dye.write);
		this.dye.swap();
	};

	Fluid.prototype.frame = function (t, dt) {
		var gl = this.gl;
		var changed = this.resize();
		if (!this.w) { return; }
		if (changed || !this.ready) { this.setup(); }
		gl.disable(gl.BLEND);
		var p = this.p;
		var m = this.mouse;
		var force = 6000 * (+p.intensity || 1);

		// Spruzzi: dal mouse e, se attivo, automatici.
		if (m.moved && m.inside) {
			var dx = (m.x - m.px) * force;
			var dy = (m.y - m.py) * force;
			if (Math.abs(dx) + Math.abs(dy) > 0.5) { this.splat(m.x, m.y, dx, dy, this.color()); }
			m.moved = false;
		}
		m.px = m.x;
		m.py = m.y;
		if (p.auto !== false) {
			this.autoT -= dt;
			if (this.autoT <= 0) {
				this.autoT = 0.9 + Math.random() * 1.6 / Math.max(0.2, +p.speed || 1);
				var ang = Math.random() * Math.PI * 2;
				this.splat(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6, Math.cos(ang) * 900, Math.sin(ang) * 900, this.color());
			}
		}

		var vt = [1 / this.vel.w, 1 / this.vel.h];
		var P = this.progs;
		P.curl.use().set('uTexel', vt[0], vt[1]).tex('uVel', this.bind(0, this.vel.read));
		this.blit(this.curl);
		P.vorticity.use().set('uTexel', vt[0], vt[1]).tex('uVel', this.bind(0, this.vel.read)).tex('uCurl', this.bind(1, this.curl))
			.set('uCurlK', 18 + (+p.size || 3) * 2).set('uDt', dt);
		this.blit(this.vel.write);
		this.vel.swap();
		P.divergence.use().set('uTexel', vt[0], vt[1]).tex('uVel', this.bind(0, this.vel.read));
		this.blit(this.div);
		P.clear.use().set('uTexel', vt[0], vt[1]).tex('uTex', this.bind(0, this.pres.read)).set('uValue', 0.8);
		this.blit(this.pres.write);
		this.pres.swap();
		P.pressure.use().set('uTexel', vt[0], vt[1]).tex('uDiv', this.bind(0, this.div));
		for (var i = 0; i < 20; i++) {
			P.pressure.tex('uPres', this.bind(1, this.pres.read));
			this.blit(this.pres.write);
			this.pres.swap();
		}
		P.gradient.use().set('uTexel', vt[0], vt[1]).tex('uPres', this.bind(0, this.pres.read)).tex('uVel', this.bind(1, this.vel.read));
		this.blit(this.vel.write);
		this.vel.swap();
		var diss = 0.2 + 1.2 / Math.max(0.2, +p.speed || 1) * 0.5;
		P.advect.use().set('uTexel', vt[0], vt[1]).set('uDt', dt).set('uDiss', 0.2)
			.tex('uVel', this.bind(0, this.vel.read)).tex('uSrc', this.bind(0, this.vel.read));
		this.blit(this.vel.write);
		this.vel.swap();
		P.advect.use().set('uTexel', 1 / this.dye.w, 1 / this.dye.h).set('uDiss', diss)
			.tex('uVel', this.bind(0, this.vel.read)).tex('uSrc', this.bind(1, this.dye.read));
		this.blit(this.dye.write);
		this.dye.swap();

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0, 0, 0, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.c.width, this.c.height);
		gl.clear(gl.COLOR_BUFFER_BIT);
		P.display.use().set('uTexel', 1 / this.c.width, 1 / this.c.height).tex('uTex', this.bind(0, this.dye.read)).set('uOpacity', +p.opacity || 0.9);
		this.blit(null);
	};

	/* ---------- Registro ---------- */

	var TYPES = { fluid: Fluid, rays: Rays, morph: Morph, panorama: Panorama, liquid: Liquid };

	window.KaosSliderGL = {
		types: Object.keys(TYPES),
		supported: function () {
			try {
				var c = document.createElement('canvas');
				return !!(c.getContext('webgl2') || c.getContext('webgl'));
			} catch (e) { return false; }
		},
		create: function (canvas, p, slide) {
			var C = TYPES[p.type];
			if (!C) { return null; }
			try {
				return new C(canvas, p, slide);
			} catch (err) {
				canvas.style.display = 'none';
				if (window.console) { console.warn(err.message || err); }
				return null;
			}
		}
	};

	try {
		window.dispatchEvent(new Event('kaosslider:gl'));
	} catch (e) { /* browser molto vecchi */ }
})();
