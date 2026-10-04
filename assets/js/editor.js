/* KaosSlider – editor visuale */
(function () {
	'use strict';

	const { __, _x, _n, sprintf } = wp.i18n;

	const C = window.KaosSliderConfig;
	const A = window.KaosSlider.anim;
	const root = document.getElementById('kaosslider-editor');

	const DEVICES = ['desktop', 'tablet', 'mobile'];
	const DEVICE_LABEL = { desktop: __( 'Desktop', 'kaosslider' ), tablet: __( 'Tablet', 'kaosslider' ), mobile: __( 'Mobile', 'kaosslider' ) };
	const DEVICE_ICON = { desktop: 'desktop', tablet: 'tablet', mobile: 'smartphone' };
	const TYPE_LABEL = { text: _x( 'Text', 'layer type', 'kaosslider' ), button: __( 'Button', 'kaosslider' ), image: __( 'Image', 'kaosslider' ), shape: __( 'Shape', 'kaosslider' ), draw: __( 'Drawing', 'kaosslider' ), film: __( 'Filmstrip', 'kaosslider' ) };
	const TYPE_ICON = { text: 'editor-textcolor', button: 'button', image: 'format-image', shape: 'marker', draw: 'art', film: 'images-alt2' };
	let DRAW_SHAPES = {};

	const EFFECTS_IN = [
		['none', __( 'None (appears)', 'kaosslider' )], ['fade', __( 'Fade', 'kaosslider' )], ['fadeUp', __( 'From below', 'kaosslider' )], ['fadeDown', __( 'From above', 'kaosslider' )],
		['fadeLeft', __( 'From the left', 'kaosslider' )], ['fadeRight', __( 'From the right', 'kaosslider' )], ['zoomIn', __( 'Zoom in', 'kaosslider' )], ['zoomOut', __( 'Zoom out', 'kaosslider' )],
		['rotateIn', __( 'Rotation', 'kaosslider' )], ['blurIn', __( 'Blur', 'kaosslider' )], ['maskUp', __( 'Mask from below', 'kaosslider' )], ['maskLeft', __( 'Mask from the left', 'kaosslider' )],
		['flipUp', __( 'Flip', 'kaosslider' )], ['revealUp', __( 'Reveal from below', 'kaosslider' )], ['skewIn', __( 'Skewed', 'kaosslider' )], ['dropIn', __( 'Drop from above', 'kaosslider' )]
	];
	const EFFECTS_OUT = [
		['none', __( 'None (stays visible)', 'kaosslider' )], ['fade', __( 'Fade', 'kaosslider' )], ['fadeUp', __( 'Downwards', 'kaosslider' )], ['fadeDown', __( 'Upwards', 'kaosslider' )],
		['fadeLeft', __( 'To the left', 'kaosslider' )], ['fadeRight', __( 'To the right', 'kaosslider' )], ['zoomIn', __( 'Shrink', 'kaosslider' )], ['zoomOut', __( 'Grow', 'kaosslider' )],
		['rotateIn', __( 'Rotation', 'kaosslider' )], ['blurIn', __( 'Blur', 'kaosslider' )], ['maskUp', __( 'Mask downwards', 'kaosslider' )], ['maskLeft', __( 'Mask to the left', 'kaosslider' )],
		['flipUp', __( 'Flip', 'kaosslider' )], ['revealUp', __( 'Sink downwards', 'kaosslider' )], ['skewIn', __( 'Skewed', 'kaosslider' )], ['dropIn', __( 'Upwards', 'kaosslider' )]
	];
	EFFECTS_IN.push(
		['bounceIn', __( 'Bounce', 'kaosslider' )], ['elasticUp', __( 'Elastic from below', 'kaosslider' )], ['lightSpeed', __( 'Light speed', 'kaosslider' )], ['rollIn', __( 'Roll', 'kaosslider' )],
		['swingIn', __( '3D swing', 'kaosslider' )], ['zoomBlur', __( 'Blurred zoom', 'kaosslider' )], ['scaleX', __( 'Stretch horizontally', 'kaosslider' )], ['scaleY', __( 'Stretch vertically', 'kaosslider' )],
		['rotateY', __( '3D rotation', 'kaosslider' )], ['typewriter', __( 'Typewriter', 'kaosslider' )], ['draw', __( 'Hand drawing', 'kaosslider' )], ['custom', __( 'Custom…', 'kaosslider' )]
	);
	EFFECTS_OUT.push(
		['bounceIn', __( 'Bounce', 'kaosslider' )], ['elasticUp', __( 'Elastic downwards', 'kaosslider' )], ['lightSpeed', __( 'Light speed', 'kaosslider' )], ['rollIn', __( 'Roll', 'kaosslider' )],
		['swingIn', __( '3D swing', 'kaosslider' )], ['zoomBlur', __( 'Blurred zoom', 'kaosslider' )], ['scaleX', __( 'Squeeze horizontally', 'kaosslider' )], ['scaleY', __( 'Squeeze vertically', 'kaosslider' )],
		['rotateY', __( '3D rotation', 'kaosslider' )], ['draw', __( 'Erase the stroke', 'kaosslider' )], ['custom', __( 'Custom…', 'kaosslider' )]
	);
	/* Gruppi per i menu degli effetti dei livelli. */
	const EFFECT_GROUPS = [
		[__( 'Basic', 'kaosslider' ), ['none', 'fade', 'fadeUp', 'fadeDown', 'fadeLeft', 'fadeRight', 'dropIn']],
		[__( 'Zoom and rotation', 'kaosslider' ), ['zoomIn', 'zoomOut', 'zoomBlur', 'rotateIn', 'rollIn', 'skewIn', 'blurIn']],
		[__( 'Masks and reveals', 'kaosslider' ), ['maskUp', 'maskLeft', 'revealUp', 'scaleX', 'scaleY']],
		[__( '3D', 'kaosslider' ), ['flipUp', 'swingIn', 'rotateY']],
		[__( 'Dynamic', 'kaosslider' ), ['bounceIn', 'elasticUp', 'lightSpeed']],
		[_x( 'Text', 'layer type', 'kaosslider' ), ['typewriter']],
		[__( 'Drawing', 'kaosslider' ), ['draw']],
		[__( 'Advanced', 'kaosslider' ), ['custom']]
	];
	const TRANSITION_GROUPS = [
		[__( 'Fades', 'kaosslider' ), [['fade', __( 'Fade', 'kaosslider' )], ['fadeBlack', __( 'Fade through background', 'kaosslider' )], ['blur', __( 'Blur', 'kaosslider' )], ['zoomBlur', __( 'Blurred zoom', 'kaosslider' )]]],
		[__( 'Zoom', 'kaosslider' ), [['zoom', __( 'Zoom in', 'kaosslider' )], ['zoomOut', __( 'Zoom out', 'kaosslider' )]]],
		[_x( 'Slide', 'transition', 'kaosslider' ), [['slide', __( 'Horizontal slide', 'kaosslider' )], ['slideV', __( 'Vertical slide', 'kaosslider' )], ['slideOver', __( 'Cover', 'kaosslider' )], ['slideReveal', __( 'Uncover', 'kaosslider' )], ['parallax', __( 'Parallax slide', 'kaosslider' )]]],
		[__( 'Wipes and shapes', 'kaosslider' ), [['wipe', __( 'Horizontal wipe', 'kaosslider' )], ['wipeV', __( 'Vertical wipe', 'kaosslider' )], ['curtain', __( 'Curtain (from the centre)', 'kaosslider' )], ['curtainH', __( 'Horizontal curtain', 'kaosslider' )], ['circle', __( 'Circle', 'kaosslider' )], ['diamond', __( 'Diamond', 'kaosslider' )]]],
		[__( '3D', 'kaosslider' ), [['cube', __( '3D cube', 'kaosslider' )], ['flip', __( 'Horizontal flip', 'kaosslider' )], ['flipV', __( 'Vertical flip', 'kaosslider' )]]],
		[__( 'In pieces', 'kaosslider' ), [['stripsV', __( 'Vertical strips', 'kaosslider' )], ['stripsH', __( 'Horizontal strips', 'kaosslider' )], ['blinds', __( 'Blinds', 'kaosslider' )], ['mosaic', __( 'Mosaic', 'kaosslider' )]]],
		[__( 'Other', 'kaosslider' ), [['random', __( 'Random (different every time)', 'kaosslider' )]]]
	];

	const EASINGS = [
		['easeOut', __( 'Smooth landing', 'kaosslider' )], ['easeInOut', _x( 'Smooth', 'easing', 'kaosslider' )], ['easeIn', __( 'Accelerating', 'kaosslider' )], ['expo', __( 'Exponential', 'kaosslider' )],
		['back', __( 'Slight bounce', 'kaosslider' )], ['linear', __( 'Linear', 'kaosslider' )], ['ease', __( 'Standard', 'kaosslider' )]
	];
	const POSITIONS_LABEL = {
		'left top': __( 'Top left', 'kaosslider' ), 'center top': __( 'Top centre', 'kaosslider' ), 'right top': __( 'Top right', 'kaosslider' ),
		'left center': __( 'Centre left', 'kaosslider' ), 'center center': __( 'Centre', 'kaosslider' ), 'right center': __( 'Centre right', 'kaosslider' ),
		'left bottom': __( 'Bottom left', 'kaosslider' ), 'center bottom': __( 'Bottom centre', 'kaosslider' ), 'right bottom': __( 'Bottom right', 'kaosslider' )
	};
	const FONT_SUGGESTIONS = [
		'var(--e-global-typography-primary-font-family)', 'var(--e-global-typography-secondary-font-family)',
		'var(--global-heading-font-family)', 'var(--global-body-font-family)',
		'Arial, sans-serif', 'Helvetica, Arial, sans-serif', 'Georgia, serif', 'system-ui, sans-serif'
	];

	const S = {
		id: C.sliderId, title: '', alias: '', data: null, previewUrl: '',
		device: 'desktop', slide: 0, sel: null, panel: 'auto', tab: 'content',
		zoom: 'fit', z: 1, dirty: false, playing: false, timers: [], raf: 0, saving: false
	};
	let undoStack = [];
	let redoStack = [];
	let histTimer = null;
	let clipboard = null;
	const $ = {};

	/* ================= Utility ================= */

	function h(tag, attrs, ...kids) {
		const el = document.createElement(tag);
		if (attrs) {
			for (const k in attrs) {
				const v = attrs[k];
				if (v == null || v === false) { continue; }
				if (k === 'class') { el.className = v; }
				else if (k === 'style' && typeof v === 'object') { Object.assign(el.style, v); }
				else if (k === 'html') { el.innerHTML = v; }
				else if (k.startsWith('on') && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); }
				else if (k in el && typeof v !== 'string') { el[k] = v; }
				else { el.setAttribute(k, v === true ? '' : v); }
			}
		}
		kids.flat(Infinity).forEach((c) => {
			if (c == null || c === false) { return; }
			el.append(c.nodeType ? c : document.createTextNode(String(c)));
		});
		return el;
	}

	const icon = (name) => h('span', { class: 'dashicons dashicons-' + name, 'aria-hidden': 'true' });
	const uid = (p) => p + Math.random().toString(36).slice(2, 8);
	const clone = (o) => JSON.parse(JSON.stringify(o));
	const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
	const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

	function api(path, opts = {}) {
		return fetch(C.restUrl + path, {
			method: opts.method || 'GET',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': C.nonce },
			body: opts.body ? JSON.stringify(opts.body) : undefined,
			credentials: 'same-origin'
		}).then((r) => r.json().then((json) => {
			if (!r.ok) { throw new Error(json && json.message ? json.message : ( __( 'Error', 'kaosslider' ) + ' ' ) + r.status); }
			return json;
		}));
	}

	function toast(msg, type) {
		const t = h('div', { class: 'kse-toast' + (type ? ' is-' + type : '') }, msg);
		root.append(t);
		setTimeout(() => t.classList.add('is-out'), 1800);
		setTimeout(() => t.remove(), 2300);
	}

	/* ================= Dati ================= */

	const settings = () => S.data.settings;
	const slide = () => S.data.slides[S.slide];
	const layer = () => (S.sel ? slide().layers.find((l) => l.id === S.sel) || null : null);
	const grid = () => settings().grid[S.device];
	const slideDuration = () => slide().duration || settings().delay;

	function normalize(data) {
		data.slides.forEach((sl) => {
			sl.layers.forEach((l) => {
				DEVICES.forEach((d) => {
					if (!l.resp[d] || Array.isArray(l.resp[d])) { l.resp[d] = {}; }
				});
			});
		});
		return data;
	}

	function resolve(l, dev) {
		const o = Object.assign({}, l.resp.desktop);
		if (dev !== 'desktop') { Object.assign(o, l.resp.tablet); }
		if (dev === 'mobile') { Object.assign(o, l.resp.mobile); }
		return o;
	}

	function getResp(l, key) {
		return resolve(l, S.device)[key];
	}

	function setResp(l, key, v) {
		l.resp[S.device][key] = v;
	}

	function isOverridden(l, key) {
		return S.device !== 'desktop' && Object.prototype.hasOwnProperty.call(l.resp[S.device], key);
	}

	function newLayer(type) {
		const count = slide().layers.length;
		const l = {
			id: uid('l'), type, name: TYPE_LABEL[type] + ' ' + (count + 1), hidden: false, locked: false,
			tag: 'div', content: '', link: '', target: '_self', image: '', alt: '',
			resp: {
				desktop: { x: 50, y: 50, w: 0, h: 0, fs: 32, ax: 'center', ay: 'middle', ta: 'center', hide: false, fit: 'custom' },
				tablet: {}, mobile: {}
			},
			style: {
				color: '#ffffff', bg: 'transparent', fontFamily: '', gfont: '', fontWeight: '', italic: false, uppercase: false,
				lineHeight: 1.2, letterSpacing: 0, padV: 0, padH: 0, radius: 0, radiusLinked: true, radiusTL: 0, radiusTR: 0, radiusBR: 0, radiusBL: 0,
				borderWidth: 0, borderColor: '#ffffff', borderOpacity: 1, borderStyle: 'solid', strokeWidth: 0, strokeColor: '#000000', strokeOpacity: 1, strokeOnly: false,
				opacity: 1, shadow: 'none', hoverColor: '', hoverBg: '', objectFit: 'cover', objectPosition: 'center center'
			},
			anim: {
				in: { effect: 'fadeUp', duration: 900, delay: Math.min(3000, 300 + count * 200), easing: 'easeOut', split: 'none', stagger: 60 },
				out: { effect: 'none', duration: 500, at: 0, easing: 'easeIn' },
				loop: 'none'
			}
		};
		if (type === 'text') {
			Object.assign(l, { tag: 'h2', content: __( 'Your headline here', 'kaosslider' ) });
			Object.assign(l.resp.desktop, { fs: 56 });
			Object.assign(l.style, { fontWeight: '700', lineHeight: 1.1 });
		}
		if (type === 'button') {
			Object.assign(l, { content: __( 'Learn more', 'kaosslider' ), link: '#' });
			Object.assign(l.resp.desktop, { fs: 16, y: 65 });
			Object.assign(l.style, { color: '#111111', bg: '#ffffff', fontWeight: '600', padV: 14, padH: 34, radius: 40, hoverColor: '#ffffff', hoverBg: '#111111', lineHeight: 1.2 });
			l.anim.in.effect = 'fadeUp';
		}
		if (type === 'image') {
			Object.assign(l.resp.desktop, { w: 300 });
			l.anim.in.effect = 'zoomIn';
		}
		l.draw = { mode: 'shape', shape: 'underline', stroke: '#ffd166', width: 5, chalk: false, fillAfter: true };
		l.film = { images: [], speed: 40, direction: 'left', gap: 12, perforations: false, grayscale: false, pauseHover: true };
		if (type === 'draw') {
			Object.assign(l.resp.desktop, { w: 320, h: 110, y: 62 });
			Object.assign(l.anim.in, { effect: 'draw', duration: 1200 });
		}
		if (type === 'film') {
			Object.assign(l.resp.desktop, { h: 220, y: 78, fit: 'fullw' });
			Object.assign(l.anim.in, { effect: 'fade', duration: 800 });
		}
		if (type === 'shape') {
			Object.assign(l.resp.desktop, { w: 120, h: 4, y: 40 });
			Object.assign(l.style, { bg: '#ffffff' });
			l.anim.in.effect = 'maskLeft';
		}
		return l;
	}

	function cloneLayer(l) {
		const c = clone(l);
		c.id = uid('l');
		c.name = l.name + ( ' ' + __( 'copy', 'kaosslider' ) );
		return c;
	}

	function cloneSlide(sl) {
		const c = clone(sl);
		c.id = uid('s');
		c.name = sl.name + ( ' ' + __( 'copy', 'kaosslider' ) );
		c.layers.forEach((l) => { l.id = uid('l'); });
		return c;
	}

	/* ================= CSS dei livelli (specchio di KaosSlider_Render::css) ================= */

	const px = (n) => 'calc(' + (+n || 0) + 'px * var(--s, 1))';
	const TX = { left: '0', center: '-50%', right: '-100%' };
	const TY = { top: '0', middle: '-50%', bottom: '-100%' };
	const SHADOWS = { soft: '0 2px 14px rgba(0,0,0,.35)', strong: '0 3px 6px rgba(0,0,0,.75)' };
	const r3 = (n) => +n.toFixed(3);
	const GLASS_DEFAULTS = { glassBlur: 30, glassSaturate: 180, glassBright: 108, glassEdge: 45, glassShine: 25, glassGrain: 0, glassDepth: 30 };
	// Stili di partenza per il vetro: impostano solo i cursori, poi si personalizza.
	const GLASS_PRESETS = [
		['soft', _x( 'Subtle', 'glass style', 'kaosslider' ), { glassBlur: 12, glassSaturate: 140, glassBright: 105, glassEdge: 25, glassShine: 10, glassGrain: 0, glassDepth: 15, bg: 'rgba(255,255,255,0.1)' }],
		['light', _x( 'Light', 'glass style', 'kaosslider' ), { glassBlur: 30, glassSaturate: 180, glassBright: 110, glassEdge: 50, glassShine: 25, glassGrain: 12, glassDepth: 30, bg: 'rgba(255,255,255,0.18)' }],
		['dark', _x( 'Dark', 'glass style', 'kaosslider' ), { glassBlur: 30, glassSaturate: 160, glassBright: 80, glassEdge: 25, glassShine: 10, glassGrain: 12, glassDepth: 40, bg: 'rgba(20,20,24,0.35)' }],
		['frost', _x( 'Frost', 'glass style', 'kaosslider' ), { glassBlur: 60, glassSaturate: 120, glassBright: 115, glassEdge: 60, glassShine: 35, glassGrain: 25, glassDepth: 20, bg: 'rgba(230,240,255,0.25)' }],
		['liquid', _x( 'Liquid', 'glass style', 'kaosslider' ), { glassBlur: 8, glassSaturate: 200, glassBright: 105, glassEdge: 90, glassShine: 45, glassGrain: 0, glassDepth: 35, bg: 'rgba(255,255,255,0.06)' }]
	];
	const grain = (amount) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 ${r3(amount / 100 * 0.3)}'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)'/%3E%3C/svg%3E")`;
	// Specchio di KaosSlider_Render::glass_props.
	function glassProps(st, p, gradText) {
		const g = Object.assign({}, GLASS_DEFAULTS);
		Object.keys(g).forEach((k) => { if (st[k] != null) { g[k] = +st[k]; } });
		const filter = 'blur(' + px(g.glassBlur) + ') saturate(' + g.glassSaturate + '%) brightness(' + g.glassBright + '%)';
		const out = { 'backdrop-filter': filter, '-webkit-backdrop-filter': filter };
		const shadows = [];
		if (g.glassEdge > 0) {
			const a = g.glassEdge / 100;
			shadows.push('inset 0 1px 0 rgba(255,255,255,' + r3(a * 0.9) + ')', 'inset 0 0 0 1px rgba(255,255,255,' + r3(a * 0.35) + ')', 'inset 0 -1px 0 rgba(255,255,255,' + r3(a * 0.2) + ')');
		}
		if (g.glassDepth > 0) { shadows.push('0 ' + px(10) + ' ' + px(40) + ' rgba(0,0,0,' + r3(g.glassDepth / 100 * 0.45) + ')'); }
		if (p['box-shadow']) { shadows.push(p['box-shadow']); }
		if (shadows.length) { out['box-shadow'] = shadows.join(','); }
		if (!gradText) {
			const layers = [];
			if (g.glassGrain > 0) { layers.push(grain(g.glassGrain) + ' 0 0/160px 160px repeat'); }
			if (g.glassShine > 0) {
				const a = g.glassShine / 100;
				layers.push('linear-gradient(135deg,rgba(255,255,255,' + r3(a * 0.6) + ') 0%,rgba(255,255,255,' + r3(a * 0.12) + ') 38%,rgba(255,255,255,0) 60%)');
			}
			if (layers.length) { layers.push(p.background); out.background = layers.join(','); }
		}
		return out;
	}
	const DROPS = { soft: 'drop-shadow(0 2px 10px rgba(0,0,0,.35))', strong: 'drop-shadow(0 3px 4px rgba(0,0,0,.7))' };

	const SHADOW_DEFAULTS = { Color: '#000000', Opacity: 0.5, Blur: 20, Density: 0, Distance: 8, Angle: 90 };
	// Specchio di KaosSlider_Render::shadow_value. kind: box, text o drop.
	function shadowValue(st, pre, kind) {
		const mode = st[pre];
		if (mode !== 'custom') {
			if (!SHADOWS[mode]) { return ''; }
			return kind === 'drop' ? DROPS[mode] : SHADOWS[mode];
		}
		const v = (k) => (st[pre + k] != null && st[pre + k] !== '' ? st[pre + k] : SHADOW_DEFAULTS[k]);
		const a = v('Angle') * Math.PI / 180;
		const one = px(+(Math.cos(a) * v('Distance')).toFixed(2)) + ' ' + px(+(Math.sin(a) * v('Distance')).toFixed(2)) + ' ' + px(v('Blur'));
		const color = withAlpha(v('Color'), +v('Opacity'));
		if (kind === 'box') { return one + ' ' + px(+(v('Blur') * v('Density') / 100).toFixed(2)) + ' ' + color; }
		const copies = Array(1 + Math.round(v('Density') / 25)).fill(one + ' ' + color);
		return kind === 'drop' ? copies.map((c) => 'drop-shadow(' + c + ')').join(' ') : copies.join(',');
	}
	const withAlpha = (c, a) => (a == null || a >= 1 ? c : 'color-mix(in srgb, ' + c + ' ' + Math.round(a * 100) + '%, transparent)');
	const isGradient = (v) => typeof v === 'string' && /gradient\(/i.test(v);
	const fitOf = (l, r) => (['image', 'shape', 'draw', 'film'].includes(l.type) && r.fit) ? r.fit : 'custom';
	const gradTextProps = (g) => ({
		'--ks-tg': g, background: g, '-webkit-background-clip': 'text', 'background-clip': 'text',
		'-webkit-text-fill-color': 'transparent', color: 'transparent'
	});

	function layerCss(sel, l, r) {
		const s = l.style;
		const w = r.w > 0 ? px(r.w) : 'auto';
		const hh = r.h > 0 ? px(r.h) : 'auto';
		const fit = fitOf(l, r);
		let box;
		let inner;
		if (fit === 'fullw') {
			box = ['0', r.y + '%', '0', TY[r.ay], '100%', hh];
			inner = ['100%', r.h > 0 ? '100%' : 'auto'];
		} else if (fit === 'fullh') {
			box = [r.x + '%', '0', TX[r.ax], '0', w, '100%'];
			inner = [r.w > 0 ? '100%' : 'auto', '100%'];
		} else if (fit === 'cover' || fit === 'contain') {
			box = ['0', '0', '0', '0', '100%', '100%'];
			inner = ['100%', '100%'];
		} else {
			box = [r.x + '%', r.y + '%', TX[r.ax], TY[r.ay], w, hh];
			inner = ['100%', r.h > 0 ? '100%' : 'auto'];
		}
		let css = sel + '{display:block;left:' + box[0] + ';top:' + box[1] + ';transform:translate(' + box[2] + ',' + box[3] + ');' +
			'width:' + box[4] + ';height:' + box[5] + ';' +
			'white-space:' + (r.w > 0 ? 'normal' : 'nowrap') + ';text-align:' + r.ta + ';}';
		if (l.type === 'image') {
			const of = (fit === 'cover' || fit === 'contain') ? fit : s.objectFit;
			css += sel + ' .ks-inner{width:' + inner[0] + ';height:' + inner[1] + ';object-fit:' + of + ';object-position:' + (s.objectPosition || 'center center') + '}';
		}
		const isText = l.type === 'text' || l.type === 'button';
		const gradText = isText && isGradient(s.color);
		const p = {
			'font-size': px(r.fs),
			color: s.color || 'inherit',
			background: s.bg || 'transparent',
			'line-height': s.lineHeight,
			'letter-spacing': px(s.letterSpacing),
			padding: px(s.padV) + ' ' + px(s.padH),
			'border-radius': s.radiusLinked === false ? [s.radiusTL, s.radiusTR, s.radiusBR, s.radiusBL].map(px).join(' ') : px(s.radius),
			opacity: s.opacity,
			'font-style': s.italic ? 'italic' : 'normal',
			'text-transform': s.uppercase ? 'uppercase' : 'none'
		};
		if (s.fontFamily) { p['font-family'] = s.fontFamily; }
		if (s.fontWeight) { p['font-weight'] = s.fontWeight; }
		if (s.borderWidth > 0) { p.border = px(s.borderWidth) + ' ' + (s.borderStyle || 'solid') + ' ' + withAlpha(s.borderColor || 'currentColor', s.borderOpacity); }
		if ((l.type === 'text' || l.type === 'button') && s.strokeWidth > 0) {
			p['-webkit-text-stroke'] = px(s.strokeWidth) + ' ' + withAlpha(s.strokeColor || '#000', s.strokeOpacity);
			p['paint-order'] = 'stroke fill';
		}
		// "shadow": lettere per testi e bottoni, riquadro per gli altri; "boxShadow": riquadro di testi e bottoni.
		if (isText) {
			const letters = shadowValue(s, 'shadow', gradText ? 'drop' : 'text');
			if (letters) { p[gradText ? 'filter' : 'text-shadow'] = letters; }
		}
		const boxShadow = shadowValue(s, isText ? 'boxShadow' : 'shadow', 'box');
		if (boxShadow) { p['box-shadow'] = boxShadow; }
		if (gradText) { Object.assign(p, gradTextProps(s.color)); }
		if (isText && s.strokeOnly && s.strokeWidth > 0) { p['-webkit-text-fill-color'] = 'transparent'; p.color = 'transparent'; }
		if (s.glass) { Object.assign(p, glassProps(s, p, gradText)); }
		css += sel + ' .ks-inner{' + Object.keys(p).map((k) => k + ':' + p[k]).join(';') + '}';
		if (l.type === 'draw') {
			css += sel + ' .ks-draw path,' + sel + ' .ks-draw text{stroke:' + l.draw.stroke + ';stroke-width:' + px(l.draw.width) + '}';
			css += sel + ' .ks-draw text{fill:' + (s.color && !isGradient(s.color) ? s.color : l.draw.stroke) + '}';
		}
		if (l.type === 'film') {
			css += sel + ' .ks-film{--ks-film-gap:' + px(l.film.gap) + '}';
		}
		return css;
	}

	function canvasCss() {
		return slide().layers.map((l) => layerCss('#kse-canvas .ks-l-' + l.id, l, resolve(l, S.device))).join('');
	}

	/* ================= Storico (annulla/ripeti) ================= */

	const snapshot = () => JSON.stringify({ title: S.title, alias: S.alias, data: S.data });

	function pushHistory() {
		clearTimeout(histTimer);
		histTimer = null;
		const snap = snapshot();
		if (undoStack[undoStack.length - 1] === snap) { return; }
		undoStack.push(snap);
		if (undoStack.length > 100) { undoStack.shift(); }
		redoStack = [];
		updateTopbar();
	}

	function queueHistory() {
		clearTimeout(histTimer);
		histTimer = setTimeout(pushHistory, 400);
	}

	function flushHistory() {
		if (histTimer) { pushHistory(); }
	}

	function restore(snap) {
		const o = JSON.parse(snap);
		S.title = o.title;
		S.alias = o.alias;
		S.data = o.data;
		S.slide = clamp(S.slide, 0, S.data.slides.length - 1);
		if (!layer()) { S.sel = null; }
		S.dirty = true;
		$.title.value = S.title;
		refresh();
	}

	function undo() {
		flushHistory();
		if (undoStack.length < 2) { return; }
		redoStack.push(undoStack.pop());
		restore(undoStack[undoStack.length - 1]);
	}

	function redo() {
		if (!redoStack.length) { return; }
		const snap = redoStack.pop();
		undoStack.push(snap);
		restore(snap);
	}

	/* ================= Modifiche ================= */

	function change(fn, opts = {}) {
		fn();
		S.dirty = true;
		refresh(opts);
		if (opts.immediate) { pushHistory(); } else { queueHistory(); }
	}

	function refresh(opts = {}) {
		const skip = opts.skip || [];
		const only = opts.only || ['slides', 'layers', 'canvas', 'props', 'timeline'];
		const run = (part, fn) => { if (only.includes(part) && !skip.includes(part)) { fn(); } };
		if (S.playing) { stopPlay(true); }
		run('slides', renderSlides);
		run('layers', renderLayers);
		run('canvas', renderCanvas);
		run('props', renderProps);
		run('timeline', renderTimeline);
		updateTopbar();
	}

	function select(id) {
		S.sel = id;
		if (id && S.panel === 'settings') { S.panel = 'auto'; }
		refresh({ skip: ['canvas', 'slides'] });
		updateSelbox();
	}

	/* ================= Struttura UI ================= */

	function buildUI() {
		root.innerHTML = '';

		$.title = h('input', {
			class: 'kse-title', type: 'text', value: S.title, 'aria-label': __( 'Slider name', 'kaosslider' ),
			oninput: (e) => change(() => { S.title = e.target.value; }, { only: [] })
		});
		$.devices = h('div', { class: 'kse-seg kse-devices', role: 'group', 'aria-label': __( 'Device', 'kaosslider' ) },
			DEVICES.map((d) => h('button', {
				type: 'button', 'data-dev': d, title: DEVICE_LABEL[d],
				onclick: () => { S.device = d; refresh({ skip: ['slides'] }); }
			}, icon(DEVICE_ICON[d])))
		);
		$.undo = h('button', { type: 'button', class: 'kse-btn kse-icon', title: __( 'Undo (Ctrl+Z)', 'kaosslider' ), onclick: undo }, icon('undo'));
		$.redo = h('button', { type: 'button', class: 'kse-btn kse-icon', title: __( 'Redo (Ctrl+Shift+Z)', 'kaosslider' ), onclick: redo }, icon('redo'));
		$.zoom = h('select', {
			class: 'kse-zoom', title: __( 'Zoom', 'kaosslider' ),
			onchange: (e) => { S.zoom = e.target.value; fitZoom(); }
		}, [['fit', __( 'Fit', 'kaosslider' )], ['50', '50%'], ['75', '75%'], ['100', '100%']].map(([v, t]) => h('option', { value: v }, t)));
		$.play = h('button', { type: 'button', class: 'kse-btn', onclick: () => (S.playing ? stopPlay() : playSlide()) });
		$.preview = h('button', { type: 'button', class: 'kse-btn', title: __( 'Save and open the preview on the site', 'kaosslider' ), onclick: openPreview }, icon('external'), ( ' ' + __( 'Preview', 'kaosslider' ) ));
		$.settingsBtn = h('button', {
			type: 'button', class: 'kse-btn',
			onclick: () => { S.panel = S.panel === 'settings' ? 'auto' : 'settings'; renderProps(); updateTopbar(); }
		}, icon('admin-generic'), ( ' ' + __( 'Settings', 'kaosslider' ) ));
		const sc = '[kaosslider id="' + S.id + '"]';
		$.shortcode = h('button', {
			type: 'button', class: 'kse-btn kse-code', title: __( 'Copy shortcode', 'kaosslider' ),
			onclick: () => navigator.clipboard.writeText(sc).then(() => toast(__( 'Shortcode copied', 'kaosslider' )))
		}, sc);
		$.save = h('button', { type: 'button', class: 'kse-btn kse-primary', onclick: () => save() }, __( 'Save', 'kaosslider' ));

		const top = h('div', { class: 'kse-top' },
			h('a', { class: 'kse-btn kse-icon', href: C.adminUrl, title: __( 'Back to the list', 'kaosslider' ) }, icon('arrow-left-alt')),
			h('img', { class: 'kse-mark', src: C.markUrl, alt: 'KaosSlider' }),
			$.title,
			h('div', { class: 'kse-top-group' }, $.devices),
			h('div', { class: 'kse-top-group' }, $.undo, $.redo, $.zoom),
			h('div', { class: 'kse-spacer' }),
			$.play, $.preview, $.settingsBtn, $.shortcode, $.save
		);

		$.slides = h('div', { class: 'kse-slides' });
		$.left = h('aside', { class: 'kse-left' });
		$.right = h('aside', { class: 'kse-right' });
		$.stage = h('div', { class: 'kse-stage' });
		$.stageOuter = h('div', { class: 'kse-stage-outer' }, $.stage);
		$.center = h('div', { class: 'kse-center' }, $.stageOuter);
		$.timeline = h('div', { class: 'kse-timeline' });

		root.append(top, $.slides, h('div', { class: 'kse-main' }, $.left, $.center, $.right), $.timeline);

		$.center.addEventListener('pointerdown', onCanvasPointerDown);
		$.center.addEventListener('dblclick', onCanvasDblClick);
		$.center.addEventListener('contextmenu', onCanvasContextMenu);
		$.center.addEventListener('click', (e) => { if (e.target.closest('a')) { e.preventDefault(); } });
		new ResizeObserver(() => fitZoom()).observe($.center);
	}

	function updateTopbar() {
		if (!$.save) { return; }
		$.devices.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.dev === S.device));
		$.undo.disabled = undoStack.length < 2;
		$.redo.disabled = !redoStack.length;
		$.play.innerHTML = '';
		$.play.append(icon(S.playing ? 'controls-pause' : 'controls-play'), S.playing ? ( ' ' + __( 'Stop', 'kaosslider' ) ) : ( ' ' + __( 'Play', 'kaosslider' ) ));
		$.settingsBtn.classList.toggle('is-active', S.panel === 'settings');
		if (!S.saving) { $.save.textContent = S.dirty ? __( 'Save •', 'kaosslider' ) : __( 'Saved', 'kaosslider' ); }
		$.save.classList.toggle('is-dirty', S.dirty);
	}

	/* ================= Barra slide ================= */

	function renderSlides() {
		const box = $.slides;
		box.innerHTML = '';
		let dragFrom = null;
		S.data.slides.forEach((sl, i) => {
			const tab = h('div', {
				class: 'kse-slide-tab' + (i === S.slide ? ' is-active' : '') + (sl.hidden ? ' is-hidden' : ''),
				draggable: 'true',
				title: __( 'Drag to reorder', 'kaosslider' ),
				onclick: (e) => {
					if (e.target.closest('button')) { return; }
					S.slide = i;
					S.sel = null;
					refresh();
				},
				ondragstart: (e) => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; },
				ondragover: (e) => { e.preventDefault(); tab.classList.add('is-over'); },
				ondragleave: () => tab.classList.remove('is-over'),
				ondrop: (e) => {
					e.preventDefault();
					if (dragFrom === null || dragFrom === i) { return; }
					change(() => {
						const [moved] = S.data.slides.splice(dragFrom, 1);
						S.data.slides.splice(i, 0, moved);
						S.slide = i;
					}, { immediate: true });
				}
			},
			h('span', { class: 'kse-slide-num' }, i + 1),
			h('span', { class: 'kse-slide-name' }, sl.name),
			sl.hidden ? icon('hidden') : null,
			i === S.slide ? h('span', { class: 'kse-slide-actions' },
				h('button', { type: 'button', title: __( 'Duplicate slide', 'kaosslider' ), onclick: () => change(() => { S.data.slides.splice(i + 1, 0, cloneSlide(sl)); S.slide = i + 1; S.sel = null; }, { immediate: true }) }, icon('admin-page')),
				h('button', { type: 'button', title: sl.hidden ? __( 'Show slide', 'kaosslider' ) : __( 'Hide slide', 'kaosslider' ), onclick: () => change(() => { sl.hidden = !sl.hidden; }, { immediate: true }) }, icon(sl.hidden ? 'visibility' : 'hidden')),
				S.data.slides.length > 1 ? h('button', {
					type: 'button', title: __( 'Delete slide', 'kaosslider' ),
					onclick: () => {
						if (!window.confirm(sprintf( __( 'Delete the slide "%s"?', 'kaosslider' ), sl.name ))) { return; }
						change(() => { S.data.slides.splice(i, 1); S.slide = clamp(i - 1, 0, S.data.slides.length - 1); S.sel = null; }, { immediate: true });
					}
				}, icon('trash')) : null
			) : null);
			box.append(tab);
		});
		box.append(h('button', {
			type: 'button', class: 'kse-btn kse-add-slide',
			onclick: () => change(() => {
				const sl = clone(C.newSlide);
				sl.id = uid('s');
				sl.name = sprintf( __( 'Slide %d', 'kaosslider' ), S.data.slides.length + 1 );
				S.data.slides.push(sl);
				S.slide = S.data.slides.length - 1;
				S.sel = null;
			}, { immediate: true })
		}, icon('plus-alt2'), ( ' ' + __( 'Slide', 'kaosslider' ) )));
	}

	/* ================= Pannello livelli ================= */

	function addLayer(type) {
		const l = newLayer(type);
		if (type === 'image') {
			pickMedia('image', (a) => {
				l.image = a.url;
				l.alt = a.alt || '';
				l.resp.desktop.w = Math.min(a.width || 300, 400);
				change(() => { slide().layers.push(l); S.sel = l.id; S.tab = 'content'; }, { immediate: true });
			});
			return;
		}
		change(() => { slide().layers.push(l); S.sel = l.id; S.tab = 'content'; }, { immediate: true });
	}

	function deleteLayer(id) {
		change(() => {
			const ls = slide().layers;
			const i = ls.findIndex((l) => l.id === id);
			if (i > -1) { ls.splice(i, 1); }
			if (S.sel === id) { S.sel = null; }
		}, { immediate: true });
	}

	function duplicateLayer(l) {
		const c = cloneLayer(l);
		const ls = slide().layers;
		change(() => { ls.splice(ls.indexOf(l) + 1, 0, c); S.sel = c.id; }, { immediate: true });
	}

	function renderLayers() {
		const box = $.left;
		box.innerHTML = '';
		box.append(
			h('div', { class: 'kse-panel-title' }, __( 'Add layer', 'kaosslider' )),
			h('div', { class: 'kse-add-grid' },
				['text', 'button', 'image', 'shape', 'draw', 'film'].map((t) => h('button', { type: 'button', class: 'kse-add-btn', onclick: () => addLayer(t) }, icon(TYPE_ICON[t]), h('span', null, TYPE_LABEL[t])))
			),
			h('div', { class: 'kse-panel-title' }, __( 'Layers', 'kaosslider' ), h('small', null, __( 'top = in front', 'kaosslider' )))
		);

		const list = h('div', { class: 'kse-layer-list' });
		const layers = slide().layers;
		let dragFrom = null;
		if (!layers.length) {
			list.append(h('p', { class: 'kse-empty' }, __( 'No layers yet. Add a text, a button, an image or a shape.', 'kaosslider' )));
		}
		layers.slice().reverse().forEach((l) => {
			const idx = layers.indexOf(l);
			const item = h('div', {
				class: 'kse-layer-item' + (l.id === S.sel ? ' is-active' : '') + (l.hidden ? ' is-hidden' : ''),
				draggable: 'true',
				onclick: (e) => { if (!e.target.closest('button')) { select(l.id); } },
				oncontextmenu: (e) => layerMenu(e, l),
				ondragstart: (e) => { dragFrom = idx; e.dataTransfer.effectAllowed = 'move'; },
				ondragover: (e) => { e.preventDefault(); item.classList.add('is-over'); },
				ondragleave: () => item.classList.remove('is-over'),
				ondrop: (e) => {
					e.preventDefault();
					if (dragFrom === null || dragFrom === idx) { return; }
					change(() => {
						const [moved] = layers.splice(dragFrom, 1);
						layers.splice(idx, 0, moved);
					}, { immediate: true });
				}
			},
			icon(TYPE_ICON[l.type]),
			h('span', { class: 'kse-layer-name', title: l.name }, l.name),
			h('button', { type: 'button', title: __( 'Duplicate', 'kaosslider' ), onclick: () => duplicateLayer(l) }, icon('admin-page')),
			h('button', { type: 'button', title: l.hidden ? __( 'Show', 'kaosslider' ) : __( 'Hide', 'kaosslider' ), class: l.hidden ? 'is-on' : '', onclick: () => change(() => { l.hidden = !l.hidden; }, { immediate: true }) }, icon(l.hidden ? 'hidden' : 'visibility')),
			h('button', { type: 'button', title: l.locked ? __( 'Unlock', 'kaosslider' ) : __( 'Lock', 'kaosslider' ), class: l.locked ? 'is-on' : '', onclick: () => change(() => { l.locked = !l.locked; }, { immediate: true }) }, icon(l.locked ? 'lock' : 'unlock')),
			h('button', { type: 'button', title: __( 'Delete', 'kaosslider' ), onclick: () => deleteLayer(l.id) }, icon('trash')));
			list.append(item);
		});
		box.append(list);
		box.append(h('div', { class: 'kse-shortcuts' },
			h('strong', null, __( 'Shortcuts', 'kaosslider' )),
			h('div', null, __( 'Double click: edit text', 'kaosslider' )),
			h('div', null, 'Frecce: sposta (Shift = 10px)'),
			h('div', null, __( 'Ctrl+C / Ctrl+V: copy/paste layer', 'kaosslider' )),
			h('div', null, __( 'Ctrl+D: duplicate · Del: delete', 'kaosslider' )),
			h('div', null, __( 'Shift while dragging: no snapping', 'kaosslider' )),
			h('div', null, __( 'Right click: quick menu', 'kaosslider' ))
		));
	}

	/* ================= Canvas ================= */

	function bgPreview(bg) {
		const box = h('div', { class: 'ks-bg' });
		if (bg.type === 'image' && bg.image) {
			box.append(h('div', { class: 'ks-bg-img', style: { backgroundImage: 'url("' + bg.image + '")', backgroundSize: bg.size, backgroundPosition: bg.position, backgroundRepeat: bg.repeat || 'no-repeat' } }));
		}
		if (bg.type === 'video') {
			if (bg.poster) {
				box.append(h('div', { class: 'ks-bg-img', style: { backgroundImage: 'url("' + bg.poster + '")' } }));
			}
			if (bg.videoSource === 'mp4' && bg.video) {
				box.append(h('video', { class: 'ks-bg-video is-playing', muted: true, autoplay: true, loop: true, playsInline: true },
					[bg.video, bg.videoAlt].filter(Boolean).map((src) => h('source', { src, type: videoMime(src) || null }))));
			} else if (bg.videoSource === 'youtube' && bg.video && !bg.poster) {
				const m = bg.video.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
				if (m) {
					box.append(h('div', { class: 'ks-bg-img', style: { backgroundImage: 'url("https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg")' } }));
				}
			}
			if (bg.video && bg.videoSource !== 'mp4') {
				box.append(h('div', { class: 'kse-video-badge' }, icon('video-alt3'), bg.videoSource === 'youtube' ? ' YouTube' : ' Vimeo'));
			}
		}
		return box;
	}

	function renderLayerEl(l) {
		const r = resolve(l, S.device);
		const el = h('div', {
			class: 'ks-layer ks-ltype-' + l.type + ' ks-l-' + l.id + ' kse-layer' + (r.hide ? ' kse-devhidden' : '') + (l.locked ? ' kse-locked' : ''),
			'data-id': l.id
		});
		let inner;
		if (l.type === 'text') {
			inner = h(l.tag || 'div', { class: 'ks-inner' + (isGradient(l.style.color) ? ' ks-gradtext' : ''), html: l.content });
		} else if (l.type === 'button') {
			inner = h('a', { class: 'ks-inner ks-btn' + (isGradient(l.style.color) ? ' ks-gradtext' : ''), href: '#', html: l.content, draggable: 'false' });
		} else if (l.type === 'image') {
			inner = l.image
				? h('img', { class: 'ks-inner', src: l.image, alt: '', draggable: 'false' })
				: h('div', { class: 'ks-inner kse-img-ph' }, icon('format-image'));
		} else if (l.type === 'draw') {
			inner = svgFromString(drawSvg(l));
		} else if (l.type === 'film') {
			const fm = l.film;
			const items = (fm.images.length ? fm.images : []).concat(fm.images).map((src) => h('div', { class: 'ks-film-item' }, h('img', { src, alt: '', draggable: 'false' })));
			inner = h('div', {
				class: 'ks-inner ks-film' + (fm.perforations ? ' ks-film-perf' : '') + (fm.grayscale ? ' ks-film-gray' : '') + (fm.pauseHover ? ' ks-film-hover' : ''),
				'data-speed': fm.speed, 'data-dir': fm.direction
			}, fm.images.length ? h('div', { class: 'ks-film-track' }, items) : h('div', { class: 'kse-img-ph' }, icon('images-alt2'), ( ' ' + __( 'Add the images', 'kaosslider' ) )));
		} else {
			inner = h('div', { class: 'ks-inner ks-shape' });
		}
		el.append(h('div', { class: 'ks-anim' }, inner));
		return el;
	}

	/* ---------- Disegno a mano e pellicola (stesso markup di KaosSlider_Render) ---------- */

	const escHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

	function svgFromString(str) {
		const t = document.createElement('div');
		t.innerHTML = str;
		return t.firstElementChild;
	}

	function drawSvg(l) {
		const dr = l.draw;
		const fid = 'ks-chalk-' + l.id;
		const filter = dr.chalk ? '<defs><filter id="' + fid + '" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter></defs>' : '';
		const fattr = dr.chalk ? ' filter="url(#' + fid + ')"' : '';
		if (dr.mode === 'text') {
			const r = l.resp.desktop;
			const tmp = document.createElement('div');
			tmp.innerHTML = l.content;
			return '<svg class="ks-inner ks-draw ks-draw-text' + (dr.fillAfter ? ' ks-draw-fill' : '') + '" viewBox="0 0 ' + (r.w > 0 ? r.w : 600) + ' ' + (r.h > 0 ? r.h : 160) + '" preserveAspectRatio="xMidYMid meet">' + filter +
				'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="' + r.fs + '"' + fattr + '>' + escHtml(tmp.textContent) + '</text></svg>';
		}
		const shape = DRAW_SHAPES[dr.shape] || DRAW_SHAPES.underline || { d: 'M6 70 C 52 61, 118 79, 194 65' };
		const paths = shape.d.split(/(?=M)/).filter((p) => p.trim()).map((p) => '<path d="' + p.trim() + '" pathLength="1" vector-effect="non-scaling-stroke"' + fattr + '/>').join('');
		return '<svg class="ks-inner ks-draw" viewBox="0 0 200 100" preserveAspectRatio="none">' + filter + paths + '</svg>';
	}

	function drawContent(l) {
		const dr = l.draw;
		const box = h('div');
		box.append(section(__( 'Drawing', 'kaosslider' ),
			field(__( 'What to draw', 'kaosslider' ), segCtl(dr.mode, [['shape', __( 'Shape', 'kaosslider' )], ['text', _x( 'Text', 'layer type', 'kaosslider' )]], liveNow((v) => {
				dr.mode = v;
				if (v === 'text' && !l.content) { l.content = __( 'Signature', 'kaosslider' ); }
				if (v === 'text' && (l.resp.desktop.fs || 0) < 40) { l.resp.desktop.fs = 90; }
			})))
		));
		if (dr.mode === 'shape') {
			const grid = h('div', { class: 'kse-shape-grid' }, Object.entries(DRAW_SHAPES).map(([key, s]) => h('button', {
				type: 'button', class: key === dr.shape ? 'is-active' : '', title: s.label,
				onclick: () => change(() => { dr.shape = key; }, { immediate: true })
			}, svgFromString('<svg viewBox="0 0 200 100" preserveAspectRatio="none"><path d="' + s.d + '" vector-effect="non-scaling-stroke"/></svg>'), h('span', null, s.label))));
			box.append(section(__( 'Shape', 'kaosslider' ), grid));
		} else {
			box.append(section(_x( 'Text', 'layer type', 'kaosslider' ),
				field(__( 'Text to draw', 'kaosslider' ), textCtl(l.content, live((v) => { l.content = v; }))),
				h('p', { class: 'kse-hint' }, __( 'Font and fill colour are chosen in the Style tab. Handwriting fonts (e.g. "Dancing Script", "Caveat") give the signature effect.', 'kaosslider' ))));
		}
		box.append(section(__( 'Stroke', 'kaosslider' ),
			field(__( 'Colour', 'kaosslider' ), colorCtl(dr.stroke, live((v) => { dr.stroke = v; }))),
			field(__( 'Thickness', 'kaosslider' ), rangeCtl(dr.width, live((v) => { dr.width = v; }), { min: 0.5, max: 40, step: 0.5 })),
			field('', toggleCtl(dr.chalk, liveNow((v) => { dr.chalk = v; }), __( 'Chalk effect', 'kaosslider' )), { help: __( 'Rough edges, like a chalk or marker stroke.', 'kaosslider' ) }),
			dr.mode === 'text' ? field('', toggleCtl(dr.fillAfter, liveNow((v) => { dr.fillAfter = v; }), __( 'Fill the text after the stroke', 'kaosslider' ))) : null,
			h('p', { class: 'kse-hint' }, __( 'Stroke speed and delay: Animation tab, "Hand drawing" effect.', 'kaosslider' ))));
		return box;
	}

	function pickMediaMulti(cb) {
		const frame = wp.media({ title: __( 'Choose the filmstrip images', 'kaosslider' ), library: { type: 'image' }, multiple: 'add', button: { text: __( 'Add to the filmstrip', 'kaosslider' ) } });
		frame.on('select', () => cb(frame.state().get('selection').toJSON()));
		frame.open();
	}

	function filmContent(l) {
		const fm = l.film;
		const list = h('div', { class: 'kse-film-list' }, fm.images.map((src, i) => h('div', { class: 'kse-film-thumb', style: { backgroundImage: 'url("' + src + '")' } },
			h('button', { type: 'button', title: __( 'Move left', 'kaosslider' ), disabled: i === 0, onclick: () => change(() => { fm.images.splice(i - 1, 0, fm.images.splice(i, 1)[0]); }, { immediate: true }) }, icon('arrow-left-alt2')),
			h('button', { type: 'button', title: __( 'Remove', 'kaosslider' ), onclick: () => change(() => { fm.images.splice(i, 1); }, { immediate: true }) }, icon('no-alt')))));
		return section(__( 'Filmstrip', 'kaosslider' ),
			list,
			h('button', {
				type: 'button', class: 'kse-btn kse-primary-ghost',
				onclick: () => pickMediaMulti((sel) => change(() => { sel.forEach((a) => fm.images.push(a.url)); }, { immediate: true }))
			}, icon('plus-alt2'), ( ' ' + __( 'Add images', 'kaosslider' ) )),
			field(__( 'Speed', 'kaosslider' ), rangeCtl(fm.speed, live((v) => { fm.speed = v; }), { min: 2, max: 400, step: 1 }), { help: __( 'Pixels per second.', 'kaosslider' ) }),
			field(__( 'Direction', 'kaosslider' ), segCtl(fm.direction, [['left', __( '← To the left', 'kaosslider' )], ['right', __( 'To the right →', 'kaosslider' )]], liveNow((v) => { fm.direction = v; }))),
			field(__( 'Space between images', 'kaosslider' ), numCtl(fm.gap, live((v) => { fm.gap = v; }), { min: 0, max: 200, unit: 'px' })),
			field('', toggleCtl(fm.perforations, liveNow((v) => { fm.perforations = v; }), __( 'Film perforations', 'kaosslider' ))),
			field('', toggleCtl(fm.grayscale, liveNow((v) => { fm.grayscale = v; }), __( 'Black and white (colour on hover)', 'kaosslider' ))),
			field('', toggleCtl(fm.pauseHover, liveNow((v) => { fm.pauseHover = v; }), __( 'Pause on hover', 'kaosslider' ))),
			h('p', { class: 'kse-hint' }, __( 'Height and width in the Position tab ("Full width" mode recommended).', 'kaosslider' )));
	}

	/* Effetto animato della slide nel canvas (stesso motore del sito). */
	function startCanvasFx(slideEl, sl) {
		if (S.fxInst) { S.fxInst.stop(); S.fxInst = null; }
		if (!sl.fx || sl.fx.type === 'none') { return; }
		const cv = h('canvas', { class: 'ks-fx' + (sl.fx.front ? ' ks-fx-front' : '') });
		slideEl.insertBefore(cv, slideEl.querySelector('.ks-layers'));
		requestAnimationFrame(() => {
			const gl = ['fluid', 'rays', 'morph', 'panorama', 'liquid'].includes(sl.fx.type);
			S.fxInst = gl
				? (window.KaosSliderGL ? window.KaosSliderGL.create(cv, Object.assign({}, sl.fx), slideEl) : null)
				: new window.KaosSlider.fx.Canvas(cv, sl.fx);
			if (S.fxInst) { S.fxInst.start(); }
		});
	}

	/* Campi degli effetti WebGL (cambiano in base al tipo). */
	function glFxFields(fx) {
		const box = h('div');
		const t = fx.type;
		const L = (fn) => live(fn);
		const N = (fn) => liveNow(fn);
		const add = (...els) => els.forEach((e) => { if (e) { box.append(e); } });
		const HELP = {
			fluid: __( 'Coloured ink that moves and mixes following the mouse. With "Automatic splashes" it also animates on its own.', 'kaosslider' ),
			rays: __( 'Light beams that start from a point and sway slowly. They blend with the slide in "screen" mode.', 'kaosslider' ),
			morph: __( 'Thousands of particles form the words one after another; the mouse scatters them.', 'kaosslider' ),
			liquid: __( 'The background image ripples like a liquid on hover. It uses the slide background image, or one chosen here.', 'kaosslider' ),
			panorama: __( '360° spherical photo (2:1 equirectangular format) that turns when dragged. It rotates on its own when nobody touches it.', 'kaosslider' )
		};
		add(h('p', { class: 'kse-hint' }, HELP[t]));
		if (t === 'morph') {
			add(field(__( 'Words', 'kaosslider' ), textCtl(fx.text, L((v) => { fx.text = v; })), { help: __( 'Separate them with | (e.g. HELLO|WELCOME|♥). Symbols like ★ ● ♥ work too.', 'kaosslider' ) }),
				field(__( 'Change every', 'kaosslider' ), numCtl(fx.interval, L((v) => { fx.interval = v; }), { min: 1, max: 60, step: 0.5, unit: 's' })),
				field(__( 'Font', 'kaosslider' ), textCtl(fx.font, L((v) => { fx.font = v; }), { placeholder: 'Arial Black, sans-serif' }), { help: __( 'A system font or one already loaded on the page.', 'kaosslider' ) }),
				field(__( 'Amount', 'kaosslider' ), rangeCtl(fx.count, L((v) => { fx.count = v; }), { min: 20, max: 400, step: 5 }), { help: __( '× 20 particles.', 'kaosslider' ) }));
		}
		if (t === 'panorama' || t === 'liquid') {
			add(field(t === 'panorama' ? __( '360° image', 'kaosslider' ) : __( 'Image (optional)', 'kaosslider' ), mediaCtl(fx.image, 'image', N((v) => { fx.image = v; })), { wide: true }));
		}
		if (t !== 'panorama' && t !== 'liquid') {
			add(field(__( 'Colour', 'kaosslider' ), colorCtl(fx.color === 'multi' ? '' : fx.color, L((v) => { fx.color = v || 'multi'; }), true, { alpha: false }),
				{ help: t === 'rays' ? __( 'Light colour.', 'kaosslider' ) : __( 'Several colours separated by commas; empty = rainbow.', 'kaosslider' ) }));
		}
		if (t === 'rays') {
			add(field(__( 'Horizontal source', 'kaosslider' ), rangeCtl(fx.x, L((v) => { fx.x = v; }), { min: 0, max: 100, step: 1 }), { help: __( '%: 0 = left, 100 = right.', 'kaosslider' ) }),
				field(__( 'Vertical source', 'kaosslider' ), rangeCtl(fx.y, L((v) => { fx.y = v; }), { min: 0, max: 100, step: 1 }), { help: __( '%: 0 = top, 100 = bottom.', 'kaosslider' ) }));
		}
		if (t === 'panorama') {
			add(field(__( 'Starting direction', 'kaosslider' ), rangeCtl(fx.x, L((v) => { fx.x = v; }), { min: 0, max: 100, step: 1 })));
		}
		const sizeLabel = { fluid: __( 'Splash and swirl size', 'kaosslider' ), rays: __( 'Number of rays', 'kaosslider' ), morph: __( 'Particle size', 'kaosslider' ), liquid: __( 'Distortion radius', 'kaosslider' ), panorama: __( 'Zoom (field of view)', 'kaosslider' ) }[t];
		add(field(sizeLabel, rangeCtl(fx.size, L((v) => { fx.size = v; }), { min: 0.5, max: 12, step: 0.5 })));
		if (t !== 'liquid') {
			add(field({ fluid: __( 'Ink duration', 'kaosslider' ), rays: __( 'Speed', 'kaosslider' ), morph: __( 'Reassembly speed', 'kaosslider' ), panorama: __( 'Rotation speed', 'kaosslider' ) }[t], rangeCtl(fx.speed, L((v) => { fx.speed = v; }), { min: 0.1, max: 4, step: 0.1 })));
		}
		if (t !== 'panorama' && t !== 'morph') {
			add(field({ fluid: __( 'Strength', 'kaosslider' ), rays: __( 'Brightness', 'kaosslider' ), liquid: __( 'Intensity', 'kaosslider' ) }[t], rangeCtl(fx.intensity, L((v) => { fx.intensity = v; }), { min: 0, max: 4, step: 0.1 })));
		}
		if (t !== 'panorama' && t !== 'liquid') {
			add(field(__( 'Opacity', 'kaosslider' ), rangeCtl(fx.opacity, L((v) => { fx.opacity = v; }), { min: 0.05, max: 1, step: 0.05 })));
		}
		if (t === 'fluid' || t === 'panorama') {
			add(field('', toggleCtl(fx.auto, N((v) => { fx.auto = v; }), t === 'fluid' ? __( 'Automatic splashes', 'kaosslider' ) : __( 'Automatic rotation', 'kaosslider' ))));
		}
		if (t !== 'panorama') {
			add(field('', toggleCtl(fx.interactive, N((v) => { fx.interactive = v; }), __( 'Reacts to the mouse', 'kaosslider' ))));
		}
		if (t === 'fluid' || t === 'rays' || t === 'morph') {
			add(field('', toggleCtl(fx.front, N((v) => { fx.front = v; }), __( 'In front of the layers', 'kaosslider' ))));
		}
		add(h('p', { class: 'kse-hint' }, __( 'WebGL effect: if the device does not support it, the normal slide background stays visible.', 'kaosslider' )));
		return box;
	}

	function buildSlideEl(sl, cls) {
		const slideEl = h('div', { class: 'ks-slide ' + cls, style: { background: sl.bg.color || 'transparent' } });
		slideEl.append(bgPreview(sl.bg));
		if (sl.bg.overlayOpacity > 0) {
			slideEl.append(h('div', { class: 'ks-overlay', style: { background: sl.bg.overlayColor, opacity: sl.bg.overlayOpacity } }));
		}
		const layersEl = h('div', { class: 'ks-layers' });
		sl.layers.forEach((l) => { if (!l.hidden) { layersEl.append(renderLayerEl(l)); } });
		slideEl.append(layersEl);
		return slideEl;
	}

	/* Anteprima della transizione: la slide precedente esce e quella corrente entra, con lo stesso motore del sito. */
	function previewTransition() {
		if (S.playing) { stopPlay(true); }
		renderCanvas();
		const slides = S.data.slides;
		const sl = slide();
		const prevSl = slides.length > 1 ? slides[(S.slide - 1 + slides.length) % slides.length] : null;
		const nextEl = $.canvas.querySelector('.ks-slide');
		const prevEl = prevSl
			? buildSlideEl(prevSl, 'is-leaving')
			: h('div', { class: 'ks-slide is-leaving', style: { background: '#000' } }, h('div', { class: 'kse-video-badge' }, __( 'Previous slide', 'kaosslider' )));
		if (prevSl) {
			$.css.textContent += prevSl.layers.map((l) => layerCss('#kse-canvas .ks-l-' + l.id, l, resolve(l, S.device))).join('');
		}
		$.canvas.insertBefore(prevEl, nextEl);
		S.playing = true;
		updateSelbox();

		const tr = sl.transition || {};
		const effect = !tr.effect || tr.effect === 'default' ? settings().transition : tr.effect;
		const speed = tr.duration > 0 ? tr.duration : settings().speed;
		const easing = window.KaosSlider.easings[tr.easing && tr.easing !== 'default' ? tr.easing : 'easeInOut'];
		const run = window.KaosSlider.transition(prevEl, nextEl, effect, { speed, easing, dir: 1, slices: tr.slices || 0 });
		nextEl.querySelectorAll('.kse-layer').forEach((el) => {
			const l = sl.layers.find((x) => x.id === el.dataset.id);
			if (l) { A.playIn(el, cfgOf(l)); }
		});
		updateTopbar();
		S.timers.push(setTimeout(() => {
			prevEl.classList.remove('is-leaving');
			run.cleanup();
			prevEl.remove();
		}, speed));
		S.timers.push(setTimeout(() => { stopPlay(); }, speed + 1800));
	}

	function renderCanvas() {
		const g = grid();
		const sl = slide();
		$.stage.innerHTML = '';
		$.css = h('style');
		$.canvas = h('div', {
			id: 'kse-canvas', class: 'kaosslider ks-type-slider ks-ready kse-canvas',
			style: { width: g.w + 'px', height: g.h + 'px', background: settings().bgColor || 'transparent' }
		});
		const slideEl = buildSlideEl(sl, 'is-active');
		$.canvas.append($.css, slideEl);
		startCanvasFx(slideEl, sl);
		requestAnimationFrame(() => $.canvas.querySelectorAll('.ks-film').forEach((el) => window.KaosSlider.fx.film(el)));

		$.guideV = h('div', { class: 'kse-guide kse-guide-v' });
		$.guideH = h('div', { class: 'kse-guide kse-guide-h' });
		$.selbox = h('div', { class: 'kse-selbox' }, ['e', 's', 'se'].map((d) => h('span', { class: 'kse-handle kse-h-' + d, 'data-dir': d })));
		$.sizeLabel = h('div', { class: 'kse-size-label' }, DEVICE_LABEL[S.device] + ' · ' + g.w + '×' + g.h);
		$.stage.append($.canvas, $.guideV, $.guideH, $.selbox, $.sizeLabel);
		$.stage.style.width = g.w + 'px';
		$.stage.style.height = g.h + 'px';
		$.css.textContent = canvasCss();
		fitZoom();
		// Le immagini cambiano dimensione al caricamento: riallinea il riquadro di selezione.
		$.canvas.querySelectorAll('img').forEach((img) => img.addEventListener('load', updateSelbox));
		requestAnimationFrame(updateSelbox);
	}

	function updateCss() {
		if ($.css) { $.css.textContent = canvasCss(); }
		updateSelbox();
	}

	function fitZoom() {
		if (!$.stage || !S.data) { return; }
		const g = grid();
		let z;
		if (S.zoom === 'fit') {
			const w = $.center.clientWidth - 60;
			const hgt = $.center.clientHeight - 60;
			z = Math.min(1, w / g.w, hgt / g.h);
		} else {
			z = +S.zoom / 100;
		}
		S.z = Math.max(0.1, z);
		$.stage.style.transform = 'scale(' + S.z + ')';
		$.stage.style.setProperty('--z', S.z);
		$.stageOuter.style.width = g.w * S.z + 'px';
		$.stageOuter.style.height = g.h * S.z + 'px';
		updateSelbox();
	}

	function layerEl(id) {
		return $.canvas ? $.canvas.querySelector('.kse-layer[data-id="' + id + '"]') : null;
	}

	function updateSelbox() {
		if (!$.selbox) { return; }
		const l = layer();
		const el = l ? layerEl(l.id) : null;
		$.canvas && $.canvas.querySelectorAll('.kse-layer.is-selected').forEach((x) => x.classList.remove('is-selected'));
		if (!el || S.playing) {
			$.selbox.style.display = 'none';
			return;
		}
		el.classList.add('is-selected');
		const sr = $.stage.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		Object.assign($.selbox.style, {
			display: 'block',
			left: (r.left - sr.left) / S.z + 'px',
			top: (r.top - sr.top) / S.z + 'px',
			width: r.width / S.z + 'px',
			height: r.height / S.z + 'px'
		});
		const fit = fitOf(l, resolve(l, S.device));
		const media = l.type === 'image' || l.type === 'shape';
		$.selbox.classList.toggle('is-locked', l.locked);
		$.selbox.querySelector('.kse-h-e').style.display = (fit === 'custom' || fit === 'fullh') ? '' : 'none';
		$.selbox.querySelector('.kse-h-s').style.display = media && (fit === 'custom' || fit === 'fullw') ? '' : 'none';
		$.selbox.querySelector('.kse-h-se').style.display = media && fit === 'custom' ? '' : 'none';
	}

	function showGuides(x, y) {
		$.guideV.style.display = x ? 'block' : 'none';
		$.guideH.style.display = y ? 'block' : 'none';
	}

	function onCanvasPointerDown(e) {
		if (e.button !== 0) { return; }
		if (S.playing) { stopPlay(); }
		const handle = e.target.closest('.kse-handle');
		if (handle) {
			e.preventDefault();
			startResize(e, handle.dataset.dir);
			return;
		}
		if (e.target.closest('[contenteditable="true"]')) { return; }
		const el = e.target.closest('.kse-layer');
		if (!el) {
			if (S.sel) { select(null); }
			return;
		}
		e.preventDefault();
		if (S.sel !== el.dataset.id) { select(el.dataset.id); }
		const l = layer();
		if (l && !l.locked) { startMove(e, l); }
	}

	function startMove(e, l) {
		const g = grid();
		const r = resolve(l, S.device);
		const fit = fitOf(l, r);
		if (fit === 'cover' || fit === 'contain') { return; } // occupa tutta la slide: niente da spostare
		const sx = e.clientX;
		const sy = e.clientY;
		let moved = false;
		const snap = (v, size, targets, shift) => {
			if (shift) { return [v, false]; }
			for (const t of targets) {
				if (Math.abs(v - t) * size / 100 < 6 / S.z) { return [t, t === 50]; }
			}
			return [v, false];
		};
		const onMove = (ev) => {
			const dx = (ev.clientX - sx) / S.z;
			const dy = (ev.clientY - sy) / S.z;
			if (!moved && Math.abs(dx) + Math.abs(dy) < 3) { return; }
			moved = true;
			const [nx, gx] = snap(r.x + dx / g.w * 100, g.w, [50, 0, 100], ev.shiftKey);
			const [ny, gy] = snap(r.y + dy / g.h * 100, g.h, [50, 0, 100], ev.shiftKey);
			if (fit !== 'fullw') { setResp(l, 'x', round(nx)); }
			if (fit !== 'fullh') { setResp(l, 'y', round(ny)); }
			updateCss();
			showGuides(gx && fit !== 'fullw', gy && fit !== 'fullh');
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			showGuides(false, false);
			if (moved) { change(() => {}, { only: ['props'], immediate: true }); }
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function startResize(e, dir) {
		const l = layer();
		if (!l || l.locked) { return; }
		const el = layerEl(l.id);
		const g = grid();
		const r = resolve(l, S.device);
		const w0 = r.w || el.offsetWidth;
		const h0 = r.h || el.offsetHeight;
		const sx = e.clientX;
		const sy = e.clientY;
		const onMove = (ev) => {
			const dx = (ev.clientX - sx) / S.z;
			const dy = (ev.clientY - sy) / S.z;
			if (dir.includes('e')) {
				const f = r.ax === 'center' ? 2 : 1;
				setResp(l, 'w', Math.max(10, Math.round(w0 + dx * f)));
				if (r.ax === 'right') { setResp(l, 'x', round(r.x + dx / g.w * 100)); }
			}
			if (dir.includes('s')) {
				const f = r.ay === 'middle' ? 2 : 1;
				setResp(l, 'h', Math.max(1, Math.round(h0 + dy * f)));
				if (r.ay === 'bottom') { setResp(l, 'y', round(r.y + dy / g.h * 100)); }
			}
			updateCss();
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			change(() => {}, { only: ['props'], immediate: true });
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	/* ---------- Menu col tasto destro ---------- */

	function closeContextMenu() {
		if (S.ctx) {
			S.ctx.off();
			S.ctx.menu.remove();
			S.ctx = null;
		}
	}

	function openContextMenu(e, title, items) {
		e.preventDefault();
		closeContextMenu();
		const menu = h('div', { class: 'kse-ctx', role: 'menu' },
			title ? h('div', { class: 'kse-ctx-title' }, title) : null,
			items.filter(Boolean).map((it) => (it === '-'
				? h('div', { class: 'kse-ctx-sep', role: 'separator' })
				: h('button', {
					type: 'button', role: 'menuitem', class: 'kse-ctx-item' + (it.danger ? ' is-danger' : ''), disabled: !!it.disabled,
					onclick: () => { closeContextMenu(); it.action(); }
				}, icon(it.icon), h('span', null, it.label), it.key ? h('kbd', null, it.key) : null))));
		root.append(menu);
		const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 8);
		const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
		Object.assign(menu.style, { left: Math.max(8, x) + 'px', top: Math.max(8, y) + 'px' });
		const onDoc = (ev) => { if (!menu.contains(ev.target)) { closeContextMenu(); } };
		const onKey = (ev) => { if (ev.key === 'Escape') { closeContextMenu(); } };
		setTimeout(() => {
			document.addEventListener('pointerdown', onDoc);
			window.addEventListener('blur', closeContextMenu);
		}, 0);
		document.addEventListener('keydown', onKey);
		S.ctx = {
			menu,
			off: () => {
				document.removeEventListener('pointerdown', onDoc);
				document.removeEventListener('keydown', onKey);
				window.removeEventListener('blur', closeContextMenu);
			}
		};
		const first = menu.querySelector('.kse-ctx-item:not([disabled])');
		if (first) { first.focus(); }
	}

	/* Apre il pannello di destra sulla scheda richiesta e la evidenzia per un attimo. */
	function openTab(l, tab) {
		S.sel = l.id;
		S.tab = tab;
		S.panel = 'auto';
		refresh({ skip: ['canvas', 'slides'] });
		updateSelbox();
		$.right.scrollTop = 0;
		const t = $.right.querySelector('.kse-tabs .is-active');
		if (t) { t.classList.add('kse-flash'); setTimeout(() => t.classList.remove('kse-flash'), 900); }
	}

	function openSlideSection(name) {
		S.sel = null;
		S.panel = 'auto';
		refresh({ skip: ['canvas', 'slides'] });
		updateSelbox();
		const t = [...$.right.querySelectorAll('.kse-section-title')].find((x) => x.textContent === name);
		if (t) {
			$.right.scrollTop = t.parentNode.offsetTop - 60;
			t.parentNode.classList.add('kse-flash');
			setTimeout(() => t.parentNode.classList.remove('kse-flash'), 900);
		}
	}

	function pasteLayer() {
		if (!clipboard) { return; }
		const c = cloneLayer(clipboard);
		c.name = clipboard.name;
		const d = c.resp.desktop;
		d.x = round(Math.min(100, d.x + 2));
		d.y = round(Math.min(100, d.y + 2));
		change(() => { slide().layers.push(c); S.sel = c.id; }, { immediate: true });
	}

	function moveLayer(l, where) {
		const ls = slide().layers;
		const i = ls.indexOf(l);
		const to = { front: ls.length - 1, forward: Math.min(ls.length - 1, i + 1), backward: Math.max(0, i - 1), back: 0 }[where];
		if (to === i) { return; }
		change(() => { ls.splice(to, 0, ls.splice(i, 1)[0]); }, { immediate: true });
	}

	function layerMenu(e, l) {
		if (S.sel !== l.id) { select(l.id); }
		const ls = slide().layers;
		const i = ls.indexOf(l);
		const el = layerEl(l.id);
		openContextMenu(e, TYPE_LABEL[l.type] + ': ' + l.name, [
			{ icon: 'edit', label: __( 'Content', 'kaosslider' ), action: () => openTab(l, 'content') },
			{ icon: 'art', label: __( 'Style', 'kaosslider' ), action: () => openTab(l, 'style') },
			{ icon: 'controls-play', label: __( 'Animation', 'kaosslider' ), action: () => openTab(l, 'anim') },
			{ icon: 'move', label: __( 'Position and size', 'kaosslider' ), action: () => openTab(l, 'pos') },
			(l.type === 'text' || l.type === 'button') && el ? { icon: 'editor-textcolor', label: __( 'Edit the text on the canvas', 'kaosslider' ), action: () => startInlineEdit(el) } : null,
			(l.type === 'image' || l.type === 'button' || l.type === 'text') ? { icon: 'admin-links', label: __( 'Link', 'kaosslider' ), action: () => openTab(l, 'content') } : null,
			'-',
			{ icon: 'admin-page', label: __( 'Duplicate', 'kaosslider' ), key: 'Ctrl+D', action: () => duplicateLayer(l) },
			{ icon: 'clipboard', label: __( 'Copy', 'kaosslider' ), key: 'Ctrl+C', action: () => { clipboard = clone(l); toast(__( 'Layer copied', 'kaosslider' )); } },
			{ icon: 'editor-paste-text', label: __( 'Paste', 'kaosslider' ), key: 'Ctrl+V', disabled: !clipboard, action: pasteLayer },
			'-',
			{ icon: 'arrow-up-alt', label: __( 'Bring to front', 'kaosslider' ), disabled: i === ls.length - 1, action: () => moveLayer(l, 'front') },
			{ icon: 'arrow-up-alt2', label: __( 'Bring forward', 'kaosslider' ), disabled: i === ls.length - 1, action: () => moveLayer(l, 'forward') },
			{ icon: 'arrow-down-alt2', label: __( 'Send backward', 'kaosslider' ), disabled: i === 0, action: () => moveLayer(l, 'backward') },
			{ icon: 'arrow-down-alt', label: __( 'Send to back', 'kaosslider' ), disabled: i === 0, action: () => moveLayer(l, 'back') },
			'-',
			{ icon: l.locked ? 'unlock' : 'lock', label: l.locked ? __( 'Unlock', 'kaosslider' ) : __( 'Lock', 'kaosslider' ), action: () => change(() => { l.locked = !l.locked; }, { immediate: true }) },
			{ icon: 'hidden', label: __( 'Hide', 'kaosslider' ), action: () => change(() => { l.hidden = true; S.sel = null; }, { immediate: true }) },
			{ icon: 'trash', label: __( 'Delete', 'kaosslider' ), key: __( 'Del', 'kaosslider' ), danger: true, action: () => deleteLayer(l.id) }
		]);
	}

	function slideMenu(e) {
		const sl = slide();
		openContextMenu(e, sprintf( __( 'Slide: %s', 'kaosslider' ), sl.name ), [
			{ icon: 'format-image', label: __( 'Slide background', 'kaosslider' ), action: () => openSlideSection(__( 'Background', 'kaosslider' )) },
			{ icon: 'randomize', label: __( 'Entrance transition', 'kaosslider' ), action: () => openSlideSection(__( 'Entrance transition', 'kaosslider' )) },
			{ icon: 'star-filled', label: __( 'Animated effect', 'kaosslider' ), action: () => openSlideSection(__( 'Animated effect', 'kaosslider' )) },
			{ icon: 'clock', label: __( 'Name and duration', 'kaosslider' ), action: () => openSlideSection(__( 'General', 'kaosslider' )) },
			'-',
			{ icon: 'editor-paste-text', label: __( 'Paste layer', 'kaosslider' ), key: 'Ctrl+V', disabled: !clipboard, action: pasteLayer },
			{ icon: 'editor-textcolor', label: __( 'Add text', 'kaosslider' ), action: () => addLayer('text') },
			{ icon: 'button', label: __( 'Add button', 'kaosslider' ), action: () => addLayer('button') },
			{ icon: 'format-image', label: __( 'Add image', 'kaosslider' ), action: () => addLayer('image') },
			{ icon: 'marker', label: __( 'Add shape', 'kaosslider' ), action: () => addLayer('shape') },
			{ icon: 'art', label: __( 'Add drawing', 'kaosslider' ), action: () => addLayer('draw') },
			{ icon: 'images-alt2', label: __( 'Add filmstrip', 'kaosslider' ), action: () => addLayer('film') },
			'-',
			{ icon: 'controls-play', label: __( 'Play the slide', 'kaosslider' ), action: playSlide },
			{ icon: 'admin-generic', label: _x( 'Slider settings', 'menu', 'kaosslider' ), action: () => { S.panel = 'settings'; renderProps(); updateTopbar(); } }
		]);
	}

	function onCanvasContextMenu(e) {
		if (e.target.closest('[contenteditable="true"]')) { return; } // menu del browser per copia/incolla del testo
		if (S.playing) { stopPlay(); }
		const el = e.target.closest('.kse-layer');
		const l = el ? slide().layers.find((x) => x.id === el.dataset.id) : null;
		if (l) { layerMenu(e, l); } else { slideMenu(e); }
	}

	/* Modifica del testo direttamente sul canvas. */
	function onCanvasDblClick(e) {
		const el = e.target.closest('.kse-layer');
		if (el) { startInlineEdit(el); }
	}

	function startInlineEdit(el) {
		const l = slide().layers.find((x) => x.id === el.dataset.id);
		if (!l || l.locked || (l.type !== 'text' && l.type !== 'button')) { return; }
		const inner = el.querySelector('.ks-inner');
		inner.contentEditable = 'true';
		inner.focus();
		document.execCommand('selectAll', false, null);
		$.selbox.style.display = 'none';
		const onKey = (ev) => {
			if (ev.key === 'Enter') {
				ev.preventDefault();
				if (l.type === 'text') { document.execCommand('insertLineBreak'); } else { inner.blur(); }
			}
			if (ev.key === 'Escape') { inner.blur(); }
			ev.stopPropagation();
		};
		inner.addEventListener('keydown', onKey);
		inner.addEventListener('blur', () => {
			inner.removeEventListener('keydown', onKey);
			inner.contentEditable = 'false';
			const html = inner.innerHTML.replace(/(<br\s*\/?>)+$/i, '').trim();
			if (html !== l.content) {
				change(() => { l.content = html; }, { immediate: true });
			} else {
				updateSelbox();
			}
		}, { once: true });
	}

	/* ================= Riproduzione nel canvas ================= */

	function cfgOf(l) {
		return { in: l.anim.in, out: l.anim.out, loop: l.anim.loop };
	}

	function playSlide() {
		if (S.playing) { stopPlay(true); }
		renderCanvas();
		S.playing = true;
		updateSelbox();
		const sl = slide();
		const dur = slideDuration();
		$.canvas.querySelectorAll('.kse-layer').forEach((el) => {
			const l = sl.layers.find((x) => x.id === el.dataset.id);
			if (!l) { return; }
			A.playIn(el, cfgOf(l));
			const o = l.anim.out;
			if (o.effect !== 'none') {
				const at = o.at > 0 ? o.at : Math.max(0, dur - o.duration);
				S.timers.push(setTimeout(() => A.playOut(el, cfgOf(l)), at));
			}
		});
		const t0 = performance.now();
		const head = $.timeline.querySelector('.kse-tl-playhead');
		const total = +$.timeline.dataset.total || dur;
		if (head) { head.style.display = 'block'; }
		const step = (t) => {
			const el = t - t0;
			if (head) { head.style.left = Math.min(100, el / total * 100) + '%'; }
			if (el > dur + 400) {
				stopPlay();
				return;
			}
			S.raf = requestAnimationFrame(step);
		};
		S.raf = requestAnimationFrame(step);
		updateTopbar();
	}

	function stopPlay(silent) {
		S.playing = false;
		S.timers.forEach(clearTimeout);
		S.timers = [];
		cancelAnimationFrame(S.raf);
		const head = $.timeline && $.timeline.querySelector('.kse-tl-playhead');
		if (head) { head.style.display = 'none'; }
		if (!silent) {
			renderCanvas();
			updateTopbar();
		}
	}

	function testLayer(l) {
		const el = layerEl(l.id);
		if (!el) { return; }
		const cfg = cfgOf(l);
		const quick = { in: Object.assign({}, cfg.in, { delay: 0 }), out: cfg.out, loop: cfg.loop };
		A.playIn(el, quick);
		clearTimeout(S.testTimer);
		S.testTimer = setTimeout(() => { if (!S.playing) { renderCanvas(); } }, cfg.in.duration + cfg.in.stagger * 40 + 1500);
	}

	/* ================= Timeline ================= */

	function renderTimeline() {
		const tl = $.timeline;
		tl.innerHTML = '';
		const sl = slide();
		const dur = slideDuration();
		const ends = sl.layers.map((l) => l.anim.in.delay + l.anim.in.duration);
		const total = Math.max(dur, ...ends, 1000) * 1.04;
		tl.dataset.total = total;
		const pct = (ms) => (ms / total * 100) + '%';

		const ruler = h('div', { class: 'kse-tl-ruler' });
		const stepMs = total > 20000 ? 5000 : total > 8000 ? 1000 : 500;
		for (let t = 0; t <= total; t += stepMs) {
			ruler.append(h('span', { class: 'kse-tl-tick' + (t % 1000 ? ' is-minor' : ''), style: { left: pct(t) } }, t % 1000 ? '' : (t / 1000) + 's'));
		}
		ruler.append(h('div', { class: 'kse-tl-end', style: { left: pct(dur) }, title: __( 'Slide end', 'kaosslider' ) }));

		const durInput = h('input', {
			type: 'number', min: 0, step: 100, value: sl.duration, placeholder: String(settings().delay),
			title: __( 'Duration of this slide in milliseconds (empty or 0 = slider default duration)', 'kaosslider' ),
			onchange: (e) => change(() => { sl.duration = Math.max(0, parseInt(e.target.value, 10) || 0); }, { immediate: true })
		});

		tl.append(h('div', { class: 'kse-tl-head' },
			h('div', { class: 'kse-tl-label' }, h('strong', null, __( 'Timeline', 'kaosslider' )), h('label', null, __( 'Duration', 'kaosslider' ) + ' ', durInput, ' ms')),
			h('div', { class: 'kse-tl-track' }, ruler)
		));

		const rows = h('div', { class: 'kse-tl-rows' });
		sl.layers.slice().reverse().forEach((l) => {
			const a = l.anim.in;
			const o = l.anim.out;
			const outAt = o.effect !== 'none' ? (o.at > 0 ? o.at : Math.max(0, dur - o.duration)) : dur;
			const visEnd = o.effect !== 'none' ? outAt + o.duration : dur;
			const bar = h('div', {
				class: 'kse-tl-bar' + (l.id === S.sel ? ' is-active' : ''),
				style: { left: pct(a.delay), width: 'calc(' + pct(Math.max(visEnd - a.delay, 50)) + ')' },
				title: __( 'Drag to change the entrance delay', 'kaosslider' )
			},
			h('div', { class: 'kse-tl-in', style: { width: Math.min(100, a.duration / Math.max(visEnd - a.delay, 1) * 100) + '%' } },
				h('span', { class: 'kse-tl-grip', title: __( 'Entrance duration', 'kaosslider' ) })),
			o.effect !== 'none' ? h('div', {
				class: 'kse-tl-out',
				style: { left: ((outAt - a.delay) / Math.max(visEnd - a.delay, 1) * 100) + '%', right: '0' },
				title: __( 'Drag to change the exit time', 'kaosslider' )
			}) : null,
			h('span', { class: 'kse-tl-text' }, (a.delay / 1000).toFixed(2) + 's'));

			bar.addEventListener('pointerdown', (e) => timelineDrag(e, l, bar, total));
			rows.append(h('div', { class: 'kse-tl-row' + (l.hidden ? ' is-hidden' : '') },
				h('div', { class: 'kse-tl-label', onclick: () => select(l.id), oncontextmenu: (e) => layerMenu(e, l) }, icon(TYPE_ICON[l.type]), ' ', l.name),
				h('div', { class: 'kse-tl-track', onpointerdown: (e) => { if (e.target === e.currentTarget) { select(l.id); } } },
					bar, h('div', { class: 'kse-tl-endline', style: { left: pct(dur) } }))
			));
		});
		if (!sl.layers.length) {
			rows.append(h('div', { class: 'kse-tl-empty' }, __( 'Add some layers to see their timeline.', 'kaosslider' )));
		}
		tl.append(rows);
		tl.append(h('div', { class: 'kse-tl-overlay' }, h('div', { class: 'kse-tl-playhead' })));
	}

	function timelineDrag(e, l, bar, total) {
		e.preventDefault();
		e.stopPropagation();
		if (S.sel !== l.id) {
			S.sel = l.id;
			refresh({ skip: ['canvas', 'slides', 'timeline'] });
			updateSelbox();
		}
		const track = bar.parentNode;
		const msPerPx = total / track.clientWidth;
		const sx = e.clientX;
		const a = l.anim.in;
		const o = l.anim.out;
		const mode = e.target.classList.contains('kse-tl-grip') ? 'duration' : e.target.classList.contains('kse-tl-out') ? 'out' : 'delay';
		const d0 = a.delay;
		const du0 = a.duration;
		const dur = slideDuration();
		const out0 = o.at > 0 ? o.at : Math.max(0, dur - o.duration);
		const snap = (v) => Math.round(v / 50) * 50;
		const onMove = (ev) => {
			const dms = (ev.clientX - sx) * msPerPx;
			if (mode === 'delay') { a.delay = Math.max(0, snap(d0 + dms)); }
			if (mode === 'duration') { a.duration = Math.max(50, snap(du0 + dms)); }
			if (mode === 'out') { o.at = Math.max(a.delay + 50, snap(out0 + dms)); }
			renderTimeline();
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			change(() => {}, { skip: ['canvas', 'slides', 'layers'], immediate: true });
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	/* ================= Controlli dei pannelli ================= */

	function field(label, control, opts = {}) {
		return h('div', { class: 'kse-field' + (opts.wide ? ' is-wide' : '') + (opts.cls ? ' ' + opts.cls : '') },
			label ? h('label', { class: 'kse-label' }, label, opts.badge || null) : null,
			h('div', { class: 'kse-ctl' }, control),
			opts.help ? h('p', { class: 'kse-help' }, opts.help) : null
		);
	}

	function textCtl(value, onInput, attrs = {}) {
		return h('input', Object.assign({ type: 'text', value: value == null ? '' : value, oninput: (e) => onInput(e.target.value) }, attrs));
	}

	function areaCtl(value, onInput, attrs = {}) {
		const t = h('textarea', Object.assign({ rows: 3, oninput: (e) => onInput(e.target.value) }, attrs));
		t.value = value || '';
		return t;
	}

	function numCtl(value, onInput, o = {}) {
		const inp = h('input', {
			type: 'number', value: value, min: o.min, max: o.max, step: o.step || 1,
			oninput: (e) => {
				const v = parseFloat(e.target.value);
				if (!isNaN(v)) { onInput(o.min != null ? Math.max(o.min, o.max != null ? Math.min(o.max, v) : v) : v); }
			}
		});
		return o.unit ? h('div', { class: 'kse-unit' }, inp, h('span', null, o.unit)) : inp;
	}

	function rangeCtl(value, onInput, o) {
		const num = h('input', { type: 'number', value, min: o.min, max: o.max, step: o.step });
		const rng = h('input', { type: 'range', value, min: o.min, max: o.max, step: o.step });
		rng.addEventListener('input', () => { num.value = rng.value; onInput(parseFloat(rng.value)); });
		num.addEventListener('input', () => {
			const v = parseFloat(num.value);
			if (!isNaN(v)) { rng.value = v; onInput(clamp(v, o.min, o.max)); }
		});
		return h('div', { class: 'kse-range' }, rng, num);
	}

	function selectCtl(value, options, onChange) {
		const s = h('select', { onchange: (e) => onChange(e.target.value) }, options.map(([v, t]) => h('option', { value: v }, t)));
		s.value = value;
		return s;
	}

	function toggleCtl(checked, onChange, label) {
		return h('label', { class: 'kse-toggle' },
			h('input', { type: 'checkbox', checked: !!checked, onchange: (e) => onChange(e.target.checked) }),
			h('span', { class: 'kse-switch' }), label ? h('span', null, label) : null);
	}

	function segCtl(value, options, onChange) {
		return h('div', { class: 'kse-seg' }, options.map(([v, t, ic]) => h('button', {
			type: 'button', class: String(v) === String(value) ? 'is-active' : '', title: t,
			onclick: () => onChange(v)
		}, ic ? icon(ic) : t)));
	}

	/* Colore con barra dell'opacità (0–100%). Con l'opacità piena il valore resta esadecimale, altrimenti rgba().
	 * o.alpha = false per i colori che hanno già un'opacità a parte (es. effetti animati). */
	function colorCtl(value, onInput, allowEmpty, o = {}) {
		const txt = h('input', { type: 'text', value: value || '', placeholder: allowEmpty ? 'nessuno' : '#ffffff' });
		const pick = h('input', { type: 'color', value: '#000000' });
		const fillEl = h('i', { class: 'kse-swatch-fill' });
		const sw = h('span', { class: 'kse-swatch' }, fillEl, pick);
		const aRange = h('input', { type: 'range', min: 0, max: 100, step: 1, 'aria-label': __( 'Colour opacity', 'kaosslider' ) });
		const aNum = h('input', { type: 'number', min: 0, max: 100, step: 1 });
		const alphaRow = o.alpha === false ? null : h('div', { class: 'kse-alpha', title: __( 'Colour opacity', 'kaosslider' ) },
			h('div', { class: 'kse-alpha-track' }, aRange), aNum, h('span', { class: 'kse-unit' }, '%'));
		const sync = (v) => {
			fillEl.style.background = v || 'transparent';
			const pc = parseColor(v);
			if (pc) { pick.value = pc.hex; }
			if (!alphaRow) { return; }
			alphaRow.classList.toggle('is-disabled', !pc);
			alphaRow.title = pc ? __( 'Colour opacity', 'kaosslider' ) : __( 'Opacity is available for hex, rgb and named colours', 'kaosslider' );
			if (pc) {
				aRange.value = aNum.value = Math.round(pc.a * 100);
				alphaRow.style.setProperty('--ks-c', pc.hex);
			}
		};
		const emit = (v) => { txt.value = v; sync(v); onInput(v); };
		const setAlpha = (pct) => {
			const pc = parseColor(txt.value) || { hex: pick.value };
			emit(makeColor(pc.hex, clamp(pct, 0, 100) / 100));
		};
		pick.addEventListener('input', () => {
			const pc = parseColor(txt.value);
			emit(makeColor(pick.value, pc && pc.a > 0 ? pc.a : 1)); // da "transparent" si passa a un colore visibile
		});
		aRange.addEventListener('input', () => setAlpha(+aRange.value));
		aNum.addEventListener('input', () => { if (aNum.value !== '' && !isNaN(+aNum.value)) { setAlpha(+aNum.value); } });
		txt.addEventListener('input', () => { sync(txt.value.trim()); onInput(txt.value.trim()); });
		sync(value);
		return h('div', { class: 'kse-color-wrap' }, h('div', { class: 'kse-color' }, sw, txt), alphaRow);
	}

	/* ---------- Gradienti ---------- */

	const GRAD_FNS = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient',
		'repeating-conic-gradient', 'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color-mix', 'var', 'calc'];
	const TO_ANGLE = {
		'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45,
		'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315
	};

	/* Stesse regole di KaosSlider_Sanitizer::gradient(): ciò che passa qui viene accettato anche dal server. */
	function validGradient(v) {
		v = (v || '').replace(/\s+/g, ' ').trim();
		if (!v || v.length > 3000) { return false; }
		if (!/^(repeating-)?(linear|radial|conic)-gradient\(/i.test(v)) { return false; }
		if (/[^a-zA-Z0-9#%.,\s()\-/]/.test(v)) { return false; }
		const fns = v.match(/[a-zA-Z-]+\s*\(/g) || [];
		if (fns.some((f) => !GRAD_FNS.includes(f.replace(/\s*\($/, '').toLowerCase()))) { return false; }
		return (v.match(/\(/g) || []).length === (v.match(/\)/g) || []).length;
	}

	function splitTop(str) {
		const out = [];
		let depth = 0;
		let cur = '';
		for (const ch of str) {
			if (ch === '(') { depth++; }
			if (ch === ')') { depth--; }
			if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else { cur += ch; }
		}
		if (cur.trim()) { out.push(cur.trim()); }
		return out;
	}

	/* Converte un gradiente lineare/radiale semplice nel modello dell'editor visuale; null se è "avanzato". */
	function parseGradient(css) {
		const m = /^(linear|radial)-gradient\((.*)\)$/i.exec((css || '').trim());
		if (!m) { return null; }
		const args = splitTop(m[2]);
		const g = { type: m[1].toLowerCase(), angle: 180, shape: 'circle', stops: [] };
		const first = (args[0] || '').toLowerCase();
		if (g.type === 'linear') {
			if (/^-?\d+(\.\d+)?deg$/.test(first)) { g.angle = parseFloat(first); args.shift(); }
			else if (TO_ANGLE[first] != null) { g.angle = TO_ANGLE[first]; args.shift(); }
		} else if (/^(circle|ellipse)\b/.test(first) || / at /.test(first)) {
			g.shape = /^ellipse/.test(first) ? 'ellipse' : 'circle';
			args.shift();
		}
		for (const a of args) {
			const pm = /^(.*?)\s+(-?\d+(\.\d+)?)%$/.exec(a);
			const color = (pm ? pm[1] : a).trim();
			if (!color || (/\s/.test(color) && !/\(/.test(color))) { return null; }
			g.stops.push({ c: color, p: pm ? parseFloat(pm[2]) : null });
		}
		if (g.stops.length < 2) { return null; }
		const n = g.stops.length;
		g.stops.forEach((s, i) => { if (s.p == null) { s.p = round(i / (n - 1) * 100, 1); } });
		return g;
	}

	function gradientCss(g) {
		const stops = g.stops.slice().sort((a, b) => a.p - b.p).map((s) => s.c + ' ' + round(s.p, 1) + '%').join(', ');
		return g.type === 'radial'
			? 'radial-gradient(' + g.shape + ' at center, ' + stops + ')'
			: 'linear-gradient(' + round(g.angle, 1) + 'deg, ' + stops + ')';
	}

	/* hex / rgb(a) / transparent → { hex, a }; null per colori non scomponibili (es. var(--…)). */
	function parseColor(c) {
		c = (c || '').trim();
		let m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
		if (m) {
			let x = m[1];
			if (x.length === 3) { x = x.split('').map((ch) => ch + ch).join(''); }
			return { hex: '#' + x.slice(0, 6).toLowerCase(), a: x.length === 8 ? round(parseInt(x.slice(6), 16) / 255, 2) : 1 };
		}
		m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(c);
		if (m) {
			const hx = [m[1], m[2], m[3]].map((n) => clamp(+n, 0, 255).toString(16).padStart(2, '0')).join('');
			const a = m[4] == null ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]);
			return { hex: '#' + hx, a: clamp(a, 0, 1) };
		}
		if (c === 'transparent') { return { hex: '#000000', a: 0 }; }
		if (/^[a-z]{3,20}$/i.test(c)) { // nomi dei colori (red, white…): il browser li traduce in esadecimale
			const ctx = parseColor.ctx || (parseColor.ctx = document.createElement('canvas').getContext('2d'));
			ctx.fillStyle = '#010203';
			ctx.fillStyle = c;
			if (ctx.fillStyle !== '#010203' && /^#[0-9a-f]{6}$/i.test(ctx.fillStyle)) { return { hex: ctx.fillStyle, a: 1 }; }
		}
		return null;
	}

	function makeColor(hex, a) {
		if (a >= 1) { return hex; }
		const n = parseInt(hex.slice(1), 16);
		return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + round(a, 2) + ')';
	}

	function gradientEditor(css, onInput) {
		let g = parseGradient(css);
		let active = 0;
		const box = h('div', { class: 'kse-grad' });
		const visual = h('div', { class: 'kse-grad-visual' });
		const msg = h('p', { class: 'kse-help' });
		const cssArea = h('textarea', { rows: 3, class: 'kse-grad-css', spellcheck: false });
		cssArea.value = css;

		const emit = () => {
			const v = gradientCss(g);
			cssArea.value = v;
			msg.textContent = '';
			msg.classList.remove('is-error');
			onInput(v);
		};

		cssArea.addEventListener('input', () => {
			const v = cssArea.value.replace(/\s+/g, ' ').trim();
			if (!validGradient(v)) {
				msg.textContent = __( 'Invalid CSS: use linear-gradient(…), radial-gradient(…) or conic-gradient(…), without url() or semicolons.', 'kaosslider' );
				msg.classList.add('is-error');
				return;
			}
			g = parseGradient(v);
			active = 0;
			renderVisual();
			onInput(v);
		});

		function stopsCss() {
			return g.stops.slice().sort((a, b) => a.p - b.p).map((s) => s.c + ' ' + s.p + '%').join(', ');
		}

		function renderVisual() {
			visual.innerHTML = '';
			if (!g) {
				msg.classList.remove('is-error');
				msg.textContent = __( 'Advanced gradient (several layers, conic or with multiple positions): edit it in the CSS below.', 'kaosslider' );
				return;
			}
			active = clamp(active, 0, g.stops.length - 1);
			const fill = h('div', { class: 'kse-grad-fill', style: { background: 'linear-gradient(90deg, ' + stopsCss() + ')' } });
			const bar = h('div', { class: 'kse-grad-bar', title: __( 'Click the bar to add a colour, drag the points to move them', 'kaosslider' ) }, fill);

			g.stops.forEach((s, i) => {
				const handle = h('span', { class: 'kse-grad-handle' + (i === active ? ' is-active' : ''), style: { left: s.p + '%' } },
					h('i', { style: { background: s.c } }));
				handle.addEventListener('pointerdown', (e) => {
					e.preventDefault();
					e.stopPropagation();
					active = i;
					const rect = bar.getBoundingClientRect();
					const move = (ev) => {
						s.p = round(clamp((ev.clientX - rect.left) / rect.width * 100, 0, 100), 1);
						handle.style.left = s.p + '%';
						fill.style.background = 'linear-gradient(90deg, ' + stopsCss() + ')';
						emit();
					};
					const up = () => {
						window.removeEventListener('pointermove', move);
						window.removeEventListener('pointerup', up);
						renderVisual();
					};
					window.addEventListener('pointermove', move);
					window.addEventListener('pointerup', up);
					// Evidenzia subito il punto senza ricostruire la barra (il trascinamento usa questi elementi).
					bar.querySelectorAll('.kse-grad-handle').forEach((x) => x.classList.toggle('is-active', x === handle));
				});
				bar.append(handle);
			});

			bar.addEventListener('pointerdown', (e) => {
				if (e.target.closest('.kse-grad-handle')) { return; }
				const rect = bar.getBoundingClientRect();
				const p = round(clamp((e.clientX - rect.left) / rect.width * 100, 0, 100), 1);
				g.stops.push({ c: g.stops[active].c, p });
				active = g.stops.length - 1;
				emit();
				renderVisual();
			});

			const s = g.stops[active];
			const pc = parseColor(s.c);
			const colorText = h('input', { type: 'text', value: s.c });
			const picker = h('input', { type: 'color', value: pc ? pc.hex : '#000000' });
			const swatch = h('span', { class: 'kse-swatch', style: { background: s.c } }, picker);
			const setColor = (v, repaint) => {
				s.c = v;
				swatch.style.background = v;
				bar.querySelectorAll('.kse-grad-handle')[active].querySelector('i').style.background = v;
				fill.style.background = 'linear-gradient(90deg, ' + stopsCss() + ')';
				emit();
				if (repaint) { renderVisual(); }
			};
			picker.addEventListener('input', () => {
				const cur = parseColor(s.c);
				const v = makeColor(picker.value, cur ? cur.a : 1);
				colorText.value = v;
				setColor(v, false);
			});
			colorText.addEventListener('input', () => { if (colorText.value.trim()) { setColor(colorText.value.trim(), false); } });
			colorText.addEventListener('change', () => renderVisual());

			const alpha = pc ? rangeCtl(Math.round(pc.a * 100), (v) => {
				const cur = parseColor(s.c) || { hex: '#000000' };
				const val = makeColor(cur.hex, v / 100);
				colorText.value = val;
				setColor(val, false);
			}, { min: 0, max: 100, step: 1 }) : h('span', { class: 'kse-help' }, __( 'Opacity not available for this colour', 'kaosslider' ));
			const pos = numCtl(s.p, (v) => { s.p = clamp(v, 0, 100); emit(); }, { min: 0, max: 100, step: 1, unit: '%' });
			pos.addEventListener('change', () => renderVisual());

			visual.append(
				h('div', { class: 'kse-grad-row' },
					segCtl(g.type, [['linear', __( 'Linear', 'kaosslider' )], ['radial', __( 'Radial', 'kaosslider' )]], (v) => { g.type = v; emit(); renderVisual(); }),
					h('button', {
						type: 'button', class: 'kse-btn', title: __( 'Reverse the colours', 'kaosslider' ),
						onclick: () => { g.stops.forEach((st) => { st.p = round(100 - st.p, 1); }); emit(); renderVisual(); }
					}, icon('image-flip-horizontal'))),
				g.type === 'linear'
					? field(__( 'Angle', 'kaosslider' ), rangeCtl(g.angle, (v) => { g.angle = v; emit(); }, { min: 0, max: 360, step: 1 }))
					: field(__( 'Shape', 'kaosslider' ), segCtl(g.shape, [['circle', __( 'Circle', 'kaosslider' )], ['ellipse', __( 'Ellipse', 'kaosslider' )]], (v) => { g.shape = v; emit(); renderVisual(); })),
				bar,
				h('div', { class: 'kse-grad-stop' },
					h('div', { class: 'kse-grad-stop-title' }, __( 'Selected colour', 'kaosslider' ),
						g.stops.length > 2 ? h('button', {
							type: 'button', class: 'kse-link-danger',
							onclick: () => { g.stops.splice(active, 1); active = 0; emit(); renderVisual(); }
						}, __( 'Delete', 'kaosslider' )) : null),
					h('div', { class: 'kse-color' }, swatch, colorText),
					field(__( 'Opacity', 'kaosslider' ), alpha),
					field(__( 'Position', 'kaosslider' ), pos)
				)
			);
		}

		renderVisual();
		box.append(visual, h('label', { class: 'kse-label' }, __( 'Gradient CSS', 'kaosslider' )), cssArea, msg,
			h('p', { class: 'kse-help' }, __( 'You can paste any CSS gradient, even with several colours or several layers separated by commas.', 'kaosslider' )));
		return box;
	}

	/* ---------- Web font (catalogo Google Fonts open source, anteprime via Bunny Fonts) ---------- */

	const FONT_CATS = { s: __( 'Sans serif', 'kaosslider' ), r: __( 'Serif', 'kaosslider' ), d: __( 'Display', 'kaosslider' ), h: __( 'Handwriting', 'kaosslider' ), m: __( 'Monospace', 'kaosslider' ) };
	const FONT_FALLBACK = { s: 'sans-serif', r: 'serif', d: 'sans-serif', h: 'cursive', m: 'monospace' };
	let FONTS = [];
	const fontIndex = {};
	const loadedFonts = {};

	function setFontCatalog(list) {
		FONTS = (list || []).map((f) => ({ family: f[0], cat: f[1], weights: f[2].split(',').map(Number), italic: !!f[3] }));
		FONTS.forEach((f) => { fontIndex[f.family] = f; });
	}

	const fontInfo = (family) => fontIndex[family] || null;
	const bunnySlug = (family) => family.toLowerCase().replace(/ /g, '-');

	/* Carica un font nell'editor (solo per l'anteprima dell'amministratore: i visitatori usano la modalità scelta nelle impostazioni). */
	function loadFont(family, weights) {
		const f = fontInfo(family);
		if (!f) { return; }
		const ws = (weights || f.weights).join(',');
		const key = family + ':' + ws;
		if (loadedFonts[key]) { return; }
		loadedFonts[key] = true;
		document.head.append(h('link', { rel: 'stylesheet', href: 'https://fonts.bunny.net/css?family=' + bunnySlug(family) + ':' + ws + '&display=swap' }));
		// Quando il font arriva, il riquadro di selezione va riallineato alle nuove misure del testo.
		if (document.fonts) { document.fonts.load('16px "' + family + '"').then(() => updateSelbox()).catch(() => {}); }
	}

	function loadUsedFonts() {
		S.data.slides.forEach((sl) => sl.layers.forEach((l) => { if (l.style.gfont) { loadFont(l.style.gfont); } }));
	}

	function fontCtl(s) {
		const label = s.gfont || (s.fontFamily ? _x( 'Custom', 'font', 'kaosslider' ) : __( 'Theme font', 'kaosslider' ));
		const btn = h('button', { type: 'button', class: 'kse-font-btn', onclick: () => openFontPicker(s, btn) },
			h('span', { class: 'kse-font-name', style: { fontFamily: s.fontFamily || 'inherit' } }, label),
			s.gfont ? h('small', null, FONT_CATS[(fontInfo(s.gfont) || {}).cat] || '') : (s.fontFamily ? h('small', null, s.fontFamily) : null),
			icon('arrow-down-alt2'));
		return btn;
	}

	function openFontPicker(s, anchor) {
		closeFontPicker();
		let cat = '';
		let shown = 0;
		let matches = [];
		const PAGE = 60;
		const io = new IntersectionObserver((entries) => {
			entries.forEach((en) => {
				if (en.isIntersecting) {
					const fam = en.target.dataset.family;
					const f = fontInfo(fam);
					loadFont(fam, [f.weights.includes(400) ? 400 : f.weights[0]]);
					io.unobserve(en.target);
				}
			});
		}, { rootMargin: '100px' });

		const choose = (family) => {
			const f = fontInfo(family);
			change(() => {
				s.gfont = family;
				s.fontFamily = "'" + family + "', " + FONT_FALLBACK[f.cat];
				const w = +(s.fontWeight || 400);
				if (s.fontWeight && !f.weights.includes(w)) {
					s.fontWeight = String(f.weights.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a)));
				}
			}, { immediate: true });
			loadFont(family);
			closeFontPicker();
		};

		const list = h('div', { class: 'kse-fp-list' });
		const renderMore = () => {
			matches.slice(shown, shown + PAGE).forEach((f) => {
				const row = h('button', {
					type: 'button', class: 'kse-fp-item' + (f.family === s.gfont ? ' is-active' : ''), 'data-family': f.family,
					onclick: () => choose(f.family)
				}, h('span', { style: { fontFamily: "'" + f.family + "', " + FONT_FALLBACK[f.cat] } }, f.family), h('small', null, sprintf( _n( '%d weight', '%d weights', f.weights.length, 'kaosslider' ), f.weights.length )));
				list.append(row);
				io.observe(row);
			});
			shown += PAGE;
		};
		const refilter = () => {
			const q = search.value.trim().toLowerCase();
			matches = FONTS.filter((f) => (!cat || f.cat === cat) && (!q || f.family.toLowerCase().includes(q)));
			list.innerHTML = '';
			shown = 0;
			count.textContent = sprintf( _n( '%d font', '%d fonts', matches.length, 'kaosslider' ), matches.length );
			renderMore();
			list.scrollTop = 0;
		};
		list.addEventListener('scroll', () => {
			if (list.scrollTop + list.clientHeight > list.scrollHeight - 200 && shown < matches.length) { renderMore(); }
		});

		const search = h('input', { type: 'search', class: 'kse-fp-search', placeholder: sprintf( __( 'Search %d fonts…', 'kaosslider' ), FONTS.length ), oninput: refilter });
		const count = h('span', { class: 'kse-fp-count' });
		const chips = h('div', { class: 'kse-fp-chips' }, [['', __( 'All', 'kaosslider' )]].concat(Object.entries(FONT_CATS)).map(([k, t]) => h('button', {
			type: 'button', class: k === cat ? 'is-active' : '',
			onclick: (e) => { cat = k; chips.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === e.currentTarget)); refilter(); }
		}, t)));

		const custom = h('input', { type: 'text', list: 'kse-fonts', placeholder: __( 'e.g. var(--e-global-typography-primary-font-family)', 'kaosslider' ), value: s.gfont ? '' : (s.fontFamily || '') });
		const customRow = h('div', { class: 'kse-fp-custom' },
			custom, h('datalist', { id: 'kse-fonts' }, FONT_SUGGESTIONS.map((f) => h('option', { value: f }))),
			h('button', {
				type: 'button', class: 'kse-btn',
				onclick: () => { change(() => { s.gfont = ''; s.fontFamily = custom.value.trim(); }, { immediate: true }); closeFontPicker(); }
			}, __( 'Use', 'kaosslider' )));

		const pop = h('div', { class: 'kse-fp', role: 'dialog', 'aria-label': __( 'Choose the font', 'kaosslider' ) },
			h('div', { class: 'kse-fp-head' }, search, count),
			chips,
			h('button', {
				type: 'button', class: 'kse-fp-item kse-fp-theme' + (!s.gfont && !s.fontFamily ? ' is-active' : ''),
				onclick: () => { change(() => { s.gfont = ''; s.fontFamily = ''; }, { immediate: true }); closeFontPicker(); }
			}, h('span', null, __( 'Theme font', 'kaosslider' )), h('small', null, __( 'use the site font', 'kaosslider' ))),
			list,
			h('details', { class: 'kse-fp-more' }, h('summary', null, __( 'Custom CSS value', 'kaosslider' )), customRow,
				h('p', { class: 'kse-help' }, __( 'For fonts already loaded by the theme or by the Elementor/Kadence global fonts.', 'kaosslider' ))));

		root.append(pop);
		const r = anchor.getBoundingClientRect();
		const top = Math.min(r.bottom + 6, window.innerHeight - pop.offsetHeight - 10);
		Object.assign(pop.style, { top: Math.max(10, top) + 'px', left: Math.max(10, r.right - pop.offsetWidth) + 'px' });
		refilter();
		search.focus();

		const onDoc = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) { closeFontPicker(); } };
		const onKey = (e) => { if (e.key === 'Escape') { closeFontPicker(); } };
		setTimeout(() => document.addEventListener('pointerdown', onDoc), 0);
		document.addEventListener('keydown', onKey);
		S.fontPicker = { pop, io, off: () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); } };
	}

	function closeFontPicker() {
		if (!S.fontPicker) { return; }
		S.fontPicker.io.disconnect();
		S.fontPicker.off();
		S.fontPicker.pop.remove();
		S.fontPicker = null;
	}

	/* Colore pieno oppure gradiente (stesso campo dati: una stringa CSS). */
	function paintCtl(value, onInput, allowEmpty) {
		let lastColor = isGradient(value) ? '' : (value || '');
		let lastGrad = isGradient(value) ? value : '';
		const body = h('div', { class: 'kse-paint-body' });
		const seg = h('div', { class: 'kse-seg kse-paint-mode' });
		const show = (mode, notify) => {
			seg.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.m === mode));
			body.innerHTML = '';
			if (mode === 'color') {
				body.append(colorCtl(lastColor, (v) => { lastColor = v; onInput(v); }, allowEmpty));
				if (notify) { onInput(lastColor); }
			} else {
				if (!lastGrad) {
					const base = parseColor(lastColor);
					lastGrad = 'linear-gradient(135deg, ' + (base && base.a > 0 ? lastColor : '#7c5cff') + ' 0%, #ff5c6c 100%)';
				}
				body.append(gradientEditor(lastGrad, (v) => { lastGrad = v; onInput(v); }));
				if (notify) { onInput(lastGrad); }
			}
		};
		[['color', __( 'Colour', 'kaosslider' )], ['gradient', __( 'Gradient', 'kaosslider' )]].forEach(([m, t]) => {
			seg.append(h('button', { type: 'button', 'data-m': m, onclick: () => show(m, true) }, t));
		});
		show(isGradient(value) ? 'gradient' : 'color', false);
		return h('div', { class: 'kse-paint' }, seg, body);
	}

	function pickMedia(type, cb) {
		const frame = wp.media({ title: type === 'video' ? __( 'Choose a video', 'kaosslider' ) : __( 'Choose an image', 'kaosslider' ), library: { type }, multiple: false, button: { text: __( 'Use this file', 'kaosslider' ) } });
		frame.on('select', () => cb(frame.state().get('selection').first().toJSON()));
		frame.open();
	}

	const VIDEO_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg' };
	const videoExt = (url) => (url || '').split(/[?#]/)[0].split('.').pop().toLowerCase();
	const videoMime = (url) => VIDEO_MIME[videoExt(url)] || '';
	// Avvisa per i formati che i browser non riproducono.
	function videoHelp(url, text) {
		const ext = videoExt(url);
		if (url && ['avi', 'wmv', 'mkv', 'flv', '3gp', '3g2', 'mpg', 'mpeg'].includes(ext)) {
			return sprintf( __( '⚠ Browsers cannot play .%s files: convert it to MP4 (H.264) or WebM.', 'kaosslider' ), ext );
		}
		if (ext === 'mov') {
			return text + ( ' ' + __( 'Note: MOV files shot on iPhone (HEVC) do not play in every browser, add an MP4 or WebM as an alternative.', 'kaosslider' ) );
		}
		return text;
	}

	function mediaCtl(url, type, onChange) {
		const box = h('div', { class: 'kse-media' });
		if (url && type === 'image') {
			box.append(h('div', { class: 'kse-media-thumb', style: { backgroundImage: 'url("' + url + '")' } }));
		}
		box.append(
			h('div', { class: 'kse-media-actions' },
				h('button', { type: 'button', class: 'kse-btn', onclick: () => pickMedia(type, (a) => onChange(a.url, a)) }, url ? __( 'Change', 'kaosslider' ) : __( 'Choose from the library', 'kaosslider' )),
				url ? h('button', { type: 'button', class: 'kse-btn', onclick: () => onChange('', null) }, __( 'Remove', 'kaosslider' )) : null),
			textCtl(url, (v) => onChange(v, null), { placeholder: __( 'or paste a URL', 'kaosslider' ), class: 'kse-media-url', onchange: () => renderProps() })
		);
		return box;
	}

	function section(title, ...kids) {
		return h('div', { class: 'kse-section' }, title ? h('div', { class: 'kse-section-title' }, title) : null, kids);
	}

	/* Campi responsive: scrivono nel device attivo; tablet/mobile ereditano finché non vengono personalizzati. */
	function respBadge(l, keys) {
		if (S.device === 'desktop') { return null; }
		const over = keys.some((k) => isOverridden(l, k));
		return over
			? h('button', {
				type: 'button', class: 'kse-badge is-custom', title: sprintf( __( 'Custom value for %s: click to restore inheritance', 'kaosslider' ), DEVICE_LABEL[S.device] ),
				onclick: () => change(() => { keys.forEach((k) => delete l.resp[S.device][k]); }, { immediate: true })
			}, '● ' + DEVICE_LABEL[S.device] + ' ×')
			: h('span', { class: 'kse-badge', title: __( 'Inherited value', 'kaosslider' ) }, 'eredita');
	}

	const live = (fn) => (v) => change(() => fn(v), { skip: ['props'] });
	const liveNow = (fn) => (v) => change(() => fn(v), { immediate: true });

	/* Ombra preimpostata o personalizzata. Passando a "Personalizzata" si parte dai valori dell'ombra scelta prima. */
	function shadowCtl(s, pre, letters) {
		const mode = s[pre] || 'none';
		const v = (k) => (s[pre + k] != null && s[pre + k] !== '' ? s[pre + k] : SHADOW_DEFAULTS[k]);
		const set = (k) => live((x) => { s[pre + k] = x; });
		const FROM = { soft: { Opacity: 0.35, Blur: 14, Distance: 2 }, strong: { Opacity: 0.75, Blur: 6, Distance: 3 } };
		return h('div', null,
			field('', segCtl(mode, [['none', _x( 'None', 'shadow', 'kaosslider' )], ['soft', _x( 'Soft', 'shadow', 'kaosslider' )], ['strong', _x( 'Sharp', 'shadow', 'kaosslider' )], ['custom', _x( 'Custom', 'shadow', 'kaosslider' )]], liveNow((m) => {
				if (m === 'custom' && s[pre] !== 'custom') {
					Object.keys(SHADOW_DEFAULTS).forEach((k) => { if (s[pre + k] == null) { s[pre + k] = SHADOW_DEFAULTS[k]; } });
					if (FROM[s[pre]]) { Object.keys(FROM[s[pre]]).forEach((k) => { s[pre + k] = FROM[s[pre]][k]; }); s[pre + 'Angle'] = 90; s[pre + 'Density'] = 0; }
				}
				s[pre] = m;
			})), { wide: true }),
			mode === 'custom' ? field(__( 'Colour', 'kaosslider' ), colorCtl(v('Color'), set('Color'))) : null,
			mode === 'custom' ? field(__( 'Opacity', 'kaosslider' ), rangeCtl(v('Opacity'), set('Opacity'), { min: 0, max: 1, step: 0.05 })) : null,
			mode === 'custom' ? field(__( 'Size', 'kaosslider' ), rangeCtl(v('Blur'), set('Blur'), { min: 0, max: 200, step: 1 }), { help: __( 'How blurred and wide the shadow is.', 'kaosslider' ) }) : null,
			mode === 'custom' ? field(__( 'Density', 'kaosslider' ), rangeCtl(v('Density'), set('Density'), { min: 0, max: 100, step: 1 }),
				{ help: letters ? __( 'Higher = fuller, darker shadow around the letters.', 'kaosslider' ) : __( 'Higher = fuller shadow that spreads beyond the box.', 'kaosslider' ) }) : null,
			mode === 'custom' ? field(__( 'Distance', 'kaosslider' ), rangeCtl(v('Distance'), set('Distance'), { min: 0, max: 300, step: 1 }), { help: __( '0 = shadow all around (glow effect).', 'kaosslider' ) }) : null,
			mode === 'custom' ? field(__( 'Direction', 'kaosslider' ), rangeCtl(v('Angle'), set('Angle'), { min: 0, max: 360, step: 5 }), { help: __( 'In degrees: 90 = down, 0 = right, 180 = left, 270 = up.', 'kaosslider' ) }) : null);
	}

	function glassGroup(s) {
		const val = (k) => (s[k] != null ? s[k] : GLASS_DEFAULTS[k]);
		const slider = (label, k, min, max, step, help) => field(label, rangeCtl(val(k), live((v) => { s[k] = v; }), { min, max, step }), help ? { help } : undefined);
		return h('div', { class: 'kse-subgroup' },
			h('div', { class: 'kse-subgroup-title' }, __( 'Glass effect', 'kaosslider' )),
			field('', toggleCtl(s.glass, liveNow((v) => {
				s.glass = v;
				if (v) {
					Object.keys(GLASS_DEFAULTS).forEach((k) => { if (s[k] == null) { s[k] = GLASS_DEFAULTS[k]; } });
					if (!s.bg || s.bg === 'transparent') { s.bg = 'rgba(255,255,255,0.14)'; }
				}
			}), __( 'Frosted glass', 'kaosslider' )),
				{ help: __( 'Blurs and brightens what is behind the box, like the glass surfaces of iOS and macOS. The glass tint is the Background colour above: use it semi-transparent.', 'kaosslider' ) }),
			s.glass ? field(__( 'Starting style', 'kaosslider' ), h('div', { class: 'kse-seg kse-seg-wrap' }, GLASS_PRESETS.map(([id, label, values]) => h('button', {
				type: 'button', title: sprintf( __( 'Apply the %s style', 'kaosslider' ), label ),
				onclick: () => change(() => Object.assign(s, values), { immediate: true })
			}, label))), { wide: true, help: __( 'Sets the values below, which you can then fine-tune.', 'kaosslider' ) }) : null,
			s.glass ? slider(__( 'Blur', 'kaosslider' ), 'glassBlur', 0, 150, 1) : null,
			s.glass ? slider(__( 'Saturation', 'kaosslider' ), 'glassSaturate', 50, 300, 5, __( 'Makes the colours behind the glass more vivid.', 'kaosslider' )) : null,
			s.glass ? slider(__( 'Brightness', 'kaosslider' ), 'glassBright', 50, 150, 1, __( 'Below 100 the glass darkens, above 100 it brightens.', 'kaosslider' )) : null,
			s.glass ? slider(__( 'Edge highlight', 'kaosslider' ), 'glassEdge', 0, 100, 1, __( 'Thin line of light on the top edge and along the outline.', 'kaosslider' )) : null,
			s.glass ? slider(__( 'Sheen', 'kaosslider' ), 'glassShine', 0, 100, 1, __( 'Diagonal reflection from the top left corner.', 'kaosslider' )) : null,
			s.glass ? slider(__( 'Grain', 'kaosslider' ), 'glassGrain', 0, 100, 1, __( 'Light matte texture, typical of frosted glass.', 'kaosslider' )) : null,
			s.glass ? slider(__( 'Depth', 'kaosslider' ), 'glassDepth', 0, 100, 1, __( 'Soft shadow that lifts the glass off the background.', 'kaosslider' )) : null);
	}

	/* ================= Pannello proprietà ================= */

	function renderProps() {
		const p = $.right;
		const scroll = p.scrollTop;
		p.innerHTML = '';
		if (S.panel === 'settings') {
			p.append(settingsPanel());
		} else {
			const l = layer();
			p.append(l ? layerPanel(l) : slidePanel());
		}
		p.scrollTop = scroll;
	}

	function slidePanel() {
		const sl = slide();
		const bg = sl.bg;
		const wrap = h('div', { class: 'kse-props' },
			h('div', { class: 'kse-props-head' }, h('strong', null, __( 'Slide', 'kaosslider' )), h('span', null, sl.name)),
			h('p', { class: 'kse-hint' }, __( 'Click a layer on the canvas to edit it, or add one from the panel on the left.', 'kaosslider' ))
		);
		wrap.append(section(__( 'General', 'kaosslider' ),
			field(__( 'Name', 'kaosslider' ), textCtl(sl.name, live((v) => { sl.name = v; }))),
			field(__( 'Duration (ms)', 'kaosslider' ), numCtl(sl.duration, live((v) => { sl.duration = v; }), { min: 0, step: 100 }), { help: sprintf( __( '0 = default duration (%d ms)', 'kaosslider' ), settings().delay ) })
		));

		if (!sl.transition) { sl.transition = { effect: 'default', duration: 0, easing: 'default', slices: 0 }; }
		const tr = sl.transition;
		const trEffect = tr.effect === 'default' ? settings().transition : tr.effect;
		const sliced = ['stripsV', 'stripsH', 'blinds', 'mosaic'].includes(trEffect);
		const defName = (TRANSITION_GROUPS.flatMap(([, o]) => o).find(([v]) => v === settings().transition) || [, __( 'Fade', 'kaosslider' )])[1];
		wrap.append(section(__( 'Entrance transition', 'kaosslider' ),
			field(__( 'Effect', 'kaosslider' ), groupSelectCtl(tr.effect, TRANSITION_GROUPS, liveNow((v) => { tr.effect = v; }), [['default', sprintf( __( 'Slider default (%s)', 'kaosslider' ), defName )]])),
			field(__( 'Duration', 'kaosslider' ), numCtl(tr.duration, live((v) => { tr.duration = v; }), { min: 0, step: 50, unit: 'ms' }), { help: sprintf( __( '0 = default speed (%d ms).', 'kaosslider' ), settings().speed ) }),
			field(__( 'Easing', 'kaosslider' ), selectCtl(tr.easing, [['default', _x( 'Default', 'easing', 'kaosslider' )]].concat(EASINGS), liveNow((v) => { tr.easing = v; }))),
			sliced ? field(trEffect === 'mosaic' ? __( 'Mosaic columns', 'kaosslider' ) : __( 'Number of strips', 'kaosslider' ), numCtl(tr.slices, live((v) => { tr.slices = Math.round(v); }), { min: 0, max: 40 }), { help: __( '0 = automatic. With video backgrounds these transitions become a fade.', 'kaosslider' ) }) : null,
			h('button', { type: 'button', class: 'kse-btn kse-primary-ghost', onclick: previewTransition }, icon('controls-play'), ( ' ' + __( 'Preview transition', 'kaosslider' ) ))
		));

		if (!sl.fx) { sl.fx = { type: 'none', color: '#ffffff', count: 120, size: 3, speed: 1, opacity: 0.8, wind: 0, interactive: true, front: false }; }
		const fx = sl.fx;
		if (fx.intensity == null) { Object.assign(fx, { intensity: 1, x: 50, y: 0, text: 'KAOS|SLIDER|♥', image: '', interval: 4, auto: true, font: '' }); }
		const FX_GROUPS = [
			[__( 'Particles and weather', 'kaosslider' ), [['snow', __( 'Snow', 'kaosslider' )], ['rain', __( 'Rain', 'kaosslider' )], ['stars', __( 'Twinkling stars', 'kaosslider' )], ['bubbles', __( 'Bubbles', 'kaosslider' )], ['confetti', __( 'Confetti', 'kaosslider' )], ['network', __( 'Particle network', 'kaosslider' )], ['fireflies', __( 'Fireflies', 'kaosslider' )]]],
			['WebGL', [['fluid', __( 'Fluid / ink', 'kaosslider' )], ['rays', __( 'Light rays', 'kaosslider' )], ['morph', __( 'Particles that become words', 'kaosslider' )], ['liquid', __( 'Liquid background distortion', 'kaosslider' )], ['panorama', __( '360° panorama', 'kaosslider' )]]]
		];
		const GL = ['fluid', 'rays', 'morph', 'panorama', 'liquid'].includes(fx.type);
		const fxSec = section(__( 'Animated effect', 'kaosslider' ),
			field(__( 'Type', 'kaosslider' ), groupSelectCtl(fx.type, FX_GROUPS, liveNow((v) => {
				fx.type = v;
				const presets = { snow: [140, 3, 1], rain: [220, 3, 1], stars: [160, 2.5, 1], bubbles: [50, 4, 1], confetti: [150, 4, 1], network: [80, 3, 1], fireflies: [45, 3, 1], fluid: [120, 3, 1], rays: [120, 3, 0.6], morph: [150, 3, 1], panorama: [120, 3, 1], liquid: [120, 3, 1] };
				if (v === 'rays' && fx.color === '#ffffff') { fx.color = '#fff3d6'; }
				if (v === 'fluid' && fx.color === '#ffffff') { fx.color = 'multi'; }
				if (presets[v] && !fx._touched) { [fx.count, fx.size, fx.speed] = presets[v]; }
				if (v === 'confetti' && fx.color === '#ffffff') { fx.color = 'multi'; }
			})))
		);
		if (GL) {
			fxSec.append(glFxFields(fx));
		} else if (fx.type !== 'none') {
			const mark = (fn) => live((v) => { fx._touched = true; fn(v); });
			fxSec.append(
				field(__( 'Colour', 'kaosslider' ), colorCtl(fx.color === 'multi' ? '' : fx.color, live((v) => { fx.color = v || 'multi'; }), true, { alpha: false }),
					{ help: __( 'You can enter several colours separated by commas (e.g. #ff0000,#ffd166). Empty with confetti = multicoloured.', 'kaosslider' ) }),
				field(__( 'Amount', 'kaosslider' ), rangeCtl(fx.count, mark((v) => { fx.count = v; }), { min: 5, max: 800, step: 5 }), { help: __( 'Based on a 1240×700 slide: on phones it shrinks proportionally.', 'kaosslider' ) }),
				field(__( 'Size', 'kaosslider' ), rangeCtl(fx.size, mark((v) => { fx.size = v; }), { min: 0.5, max: 30, step: 0.5 })),
				field(__( 'Speed', 'kaosslider' ), rangeCtl(fx.speed, mark((v) => { fx.speed = v; }), { min: 0.1, max: 6, step: 0.1 })),
				field(__( 'Opacity', 'kaosslider' ), rangeCtl(fx.opacity, live((v) => { fx.opacity = v; }), { min: 0.05, max: 1, step: 0.05 })),
				['snow', 'rain', 'confetti', 'bubbles', 'stars'].includes(fx.type) ? field(__( 'Wind', 'kaosslider' ), rangeCtl(fx.wind, live((v) => { fx.wind = v; }), { min: -5, max: 5, step: 0.5 }), { help: __( 'Negative = to the left, positive = to the right.', 'kaosslider' ) }) : null,
				field('', toggleCtl(fx.interactive, liveNow((v) => { fx.interactive = v; }), fx.type === 'network' ? __( 'Connect the particles to the mouse', 'kaosslider' ) : __( 'The particles move away from the mouse', 'kaosslider' ))),
				field('', toggleCtl(fx.front, liveNow((v) => { fx.front = v; }), __( 'In front of the layers', 'kaosslider' )), { help: __( 'Off: the effect sits between the background and the texts.', 'kaosslider' ) })
			);
		}
		wrap.append(fxSec);

		const bgSec = section(__( 'Background', 'kaosslider' ),
			field(__( 'Type', 'kaosslider' ), segCtl(bg.type, [['color', __( 'Colour', 'kaosslider' )], ['image', __( 'Image', 'kaosslider' )], ['video', __( 'Video', 'kaosslider' )]], liveNow((v) => { bg.type = v; }))),
			field(__( 'Colour / gradient', 'kaosslider' ), paintCtl(bg.color, live((v) => { bg.color = v; })), { wide: true, help: bg.type === 'color' ? null : __( 'Visible under the image or video while they load.', 'kaosslider' ) })
		);
		if (bg.type === 'image') {
			bgSec.append(
				field(__( 'Image', 'kaosslider' ), mediaCtl(bg.image, 'image', liveNow((v) => { bg.image = v; })), { wide: true }),
				field(__( 'Size', 'kaosslider' ), selectCtl(bg.size, [['cover', __( 'Cover (fills, may crop)', 'kaosslider' )], ['contain', __( 'Contain (whole, may leave edges)', 'kaosslider' )], ['100% auto', __( 'Full width', 'kaosslider' )], ['auto 100%', __( 'Full height', 'kaosslider' )], ['100% 100%', __( 'Stretch (distorts)', 'kaosslider' )], ['auto', __( 'Original size', 'kaosslider' )]], liveNow((v) => { bg.size = v; }))),
				field(__( 'Tiling', 'kaosslider' ), selectCtl(bg.repeat || 'no-repeat', [['no-repeat', _x( 'None', 'shadow', 'kaosslider' )], ['repeat', __( 'Repeat', 'kaosslider' )], ['repeat-x', __( 'Repeat horizontally', 'kaosslider' )], ['repeat-y', __( 'Repeat vertically', 'kaosslider' )]], liveNow((v) => { bg.repeat = v; }))),
				field(__( 'Position', 'kaosslider' ), selectCtl(bg.position, C.positions.map((x) => [x, POSITIONS_LABEL[x] || x]), liveNow((v) => { bg.position = v; }))),
				field(__( 'Ken Burns effect', 'kaosslider' ), selectCtl(bg.kenburns, [['none', _x( 'None', 'effect', 'kaosslider' )], ['in', __( 'Slow zoom in', 'kaosslider' )], ['out', __( 'Slow zoom out', 'kaosslider' )], ['left', __( 'Pan left', 'kaosslider' )], ['right', __( 'Pan right', 'kaosslider' )]], liveNow((v) => { bg.kenburns = v; })), { help: __( 'Visible in the preview and on the site.', 'kaosslider' ) })
			);
		}
		if (bg.type === 'video') {
			bgSec.append(
				field(__( 'Source', 'kaosslider' ), segCtl(bg.videoSource, [['mp4', __( 'Video file', 'kaosslider' )], ['youtube', 'YouTube'], ['vimeo', 'Vimeo']], liveNow((v) => { bg.videoSource = v; }))),
				bg.videoSource === 'mp4' ? field(__( 'Video', 'kaosslider' ), mediaCtl(bg.video, 'video', liveNow((v) => { bg.video = v; })), { wide: true, help: videoHelp(bg.video, __( 'Formats: MP4 (H.264), WebM, OGV or MOV. Recommended: 10–30 seconds, under 5 MB.', 'kaosslider' )) }) : null,
				bg.videoSource === 'mp4' ? field(__( 'Alternative format', 'kaosslider' ), mediaCtl(bg.videoAlt, 'video', liveNow((v) => { bg.videoAlt = v; })), { wide: true, help: videoHelp(bg.videoAlt, __( 'Optional: the same video in another format. The browser uses the first one it can play, e.g. WebM (lighter) + MP4 for Safari and iPhone.', 'kaosslider' )) }) : null,
				bg.videoSource !== 'mp4' ? videoLinkField(bg) : null,
				field(__( 'Poster image', 'kaosslider' ), mediaCtl(bg.poster, 'image', liveNow((v) => { bg.poster = v; })), { wide: true, help: __( 'Shown while the video loads.', 'kaosslider' ) })
			);
		}
		bgSec.append(
			field(__( 'Overlay', 'kaosslider' ), paintCtl(bg.overlayColor, live((v) => { bg.overlayColor = v; })), { wide: true, help: __( 'A gradient from transparent to black darkens only part of the slide (e.g. the bottom, where the text is).', 'kaosslider' ) }),
			field(__( 'Overlay opacity', 'kaosslider' ), rangeCtl(bg.overlayOpacity, live((v) => { bg.overlayOpacity = v; }), { min: 0, max: 1, step: 0.05 }), { help: __( 'Darkens the background to make the text readable.', 'kaosslider' ) }),
			field(__( 'Background parallax (mouse)', 'kaosslider' ), rangeCtl(bg.parallax || 0, live((v) => { bg.parallax = v; }), { min: 0, max: 10, step: 1 }),
				{ help: settings().parallax ? __( '0 = still. Usually the background has a low depth (1–3) and the foreground layers a higher one.', 'kaosslider' ) : __( 'First turn on "Mouse parallax" in the slider settings.', 'kaosslider' ) })
		);
		wrap.append(bgSec);
		return wrap;
	}

	/* Link YouTube/Vimeo con verifica: il server interroga oEmbed e dice se il video esiste ed è incorporabile. */
	const videoInfoCache = {};

	function videoLinkField(bg) {
		const status = h('div', { class: 'kse-video-status' });
		let timer = null;

		const show = (info, url) => {
			if (url !== (bg.video || '').trim()) { return; } // risposta di un link nel frattempo cambiato
			status.innerHTML = '';
			if (!info) {
				status.className = 'kse-video-status is-loading';
				status.append(__( 'Checking the video…', 'kaosslider' ));
				return;
			}
			if (info.ok === true) {
				status.className = 'kse-video-status is-ok';
				status.append(icon('yes-alt'), ' ', info.title || __( 'Video available', 'kaosslider' ));
				if (info.thumbnail && bg.poster !== info.thumbnail) {
					status.append(h('button', {
						type: 'button', class: 'kse-btn kse-btn-small',
						onclick: () => change(() => { bg.poster = info.thumbnail; }, { immediate: true })
					}, bg.poster ? __( 'Replace the poster with the thumbnail', 'kaosslider' ) : __( 'Use the thumbnail as poster', 'kaosslider' )));
				}
			} else {
				status.className = 'kse-video-status ' + (info.ok === false ? 'is-error' : 'is-warn');
				status.append(icon('warning'), ' ', info.message);
				if (info.ok === false) {
					status.append(h('div', { class: 'kse-help' }, __( 'On the site the poster (or the background colour) will be shown instead of the video.', 'kaosslider' )));
				}
			}
		};

		const check = () => {
			const url = (bg.video || '').trim();
			status.innerHTML = '';
			status.className = 'kse-video-status';
			if (!url) { return; }
			const key = bg.videoSource + '|' + url;
			if (videoInfoCache[key]) { show(videoInfoCache[key], url); return; }
			show(null, url);
			api('/video-info?source=' + bg.videoSource + '&url=' + encodeURIComponent(url))
				.then((info) => {
					if (info.ok !== null) { videoInfoCache[key] = info; }
					show(info, url);
				})
				.catch((err) => show({ ok: null, message: err.message }, url));
		};

		const input = textCtl(bg.video, (v) => {
			change(() => { bg.video = v; }, { skip: ['props'] });
			clearTimeout(timer);
			timer = setTimeout(check, 700);
		}, { placeholder: bg.videoSource === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://vimeo.com/…' });

		check();
		return field(__( 'Video link', 'kaosslider' ), h('div', null, input, status), { wide: true, help: __( 'The video starts muted and looping, without controls.', 'kaosslider' ) });
	}

	function layerPanel(l) {
		const tabs = [['content', __( 'Content', 'kaosslider' )], ['style', __( 'Style', 'kaosslider' )], ['anim', __( 'Animation', 'kaosslider' )], ['pos', __( 'Position', 'kaosslider' )]];
		const wrap = h('div', { class: 'kse-props' },
			h('div', { class: 'kse-props-head' },
				icon(TYPE_ICON[l.type]), h('strong', null, TYPE_LABEL[l.type]), h('span', null, l.name),
				h('button', { type: 'button', class: 'kse-btn kse-icon', title: __( 'Close (Esc)', 'kaosslider' ), onclick: () => select(null) }, icon('no-alt'))),
			h('div', { class: 'kse-tabs' }, tabs.map(([k, t]) => h('button', {
				type: 'button', class: S.tab === k ? 'is-active' : '',
				onclick: () => { S.tab = k; renderProps(); }
			}, t)))
		);
		const body = { content: contentTab, style: styleTab, anim: animTab, pos: posTab }[S.tab](l);
		wrap.append(body);
		return wrap;
	}

	function contentTab(l) {
		const box = h('div');
		box.append(section(null, field(__( 'Layer name', 'kaosslider' ), textCtl(l.name, live((v) => { l.name = v; })))));
		if (l.type === 'text') {
			box.append(section(_x( 'Text', 'layer type', 'kaosslider' ),
				field(__( 'HTML tag', 'kaosslider' ), selectCtl(l.tag, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'].map((t) => [t, t.toUpperCase()]), liveNow((v) => { l.tag = v; })), { help: __( 'Use only one H1 per page (SEO).', 'kaosslider' ) }),
				field(__( 'Content', 'kaosslider' ), areaCtl(l.content, live((v) => { l.content = v; }), { rows: 4 }), { wide: true, help: __( 'You can use simple HTML: <br>, <strong>, <em>, <span style="…">. Or double-click the text on the canvas.', 'kaosslider' ) })
			));
		}
		if (l.type === 'button') {
			box.append(section(__( 'Button', 'kaosslider' ),
				field(_x( 'Text', 'layer type', 'kaosslider' ), textCtl(l.content, live((v) => { l.content = v; }))),
			));
		}
		if (l.type === 'image') {
			box.append(section(__( 'Image', 'kaosslider' ),
				field(__( 'File', 'kaosslider' ), mediaCtl(l.image, 'image', liveNow((v, a) => {
					l.image = v;
					if (a && a.alt && !l.alt) { l.alt = a.alt; }
				})), { wide: true }),
				field(__( 'Alternative text', 'kaosslider' ), textCtl(l.alt, live((v) => { l.alt = v; })), { help: __( 'Describes the image (accessibility and SEO).', 'kaosslider' ) })
			));
		}
		if (l.type === 'shape') {
			box.append(h('p', { class: 'kse-hint' }, __( 'Shapes are for decorative lines, boxes and backgrounds behind text. Colour and corners in "Style", size in "Position".', 'kaosslider' )));
		}
		if (l.type === 'draw') { box.append(drawContent(l)); }
		if (l.type === 'film') { box.append(filmContent(l)); }
		if (l.type !== 'shape' && l.type !== 'film') {
			box.append(section(__( 'Link', 'kaosslider' ),
				field(__( 'URL', 'kaosslider' ), textCtl(l.link, live((v) => { l.link = v; }), { placeholder: 'https://… oppure /pagina/' }), { wide: true }),
				field(__( 'Open in', 'kaosslider' ), segCtl(l.target, [['_self', __( 'Same tab', 'kaosslider' )], ['_blank', __( 'New tab', 'kaosslider' )]], liveNow((v) => { l.target = v; })))
			));
		}
		return box;
	}

	function styleTab(l) {
		const s = l.style;
		const box = h('div');
		const isText = l.type === 'text' || l.type === 'button' || (l.type === 'draw' && l.draw.mode === 'text');
		if (isText) {
			const WEIGHT_NAMES = { 100: _x( 'Thin', 'font weight', 'kaosslider' ), 200: _x( 'Extra light', 'font weight', 'kaosslider' ), 300: _x( 'Light', 'font weight', 'kaosslider' ), 400: _x( 'Regular', 'font weight', 'kaosslider' ), 500: _x( 'Medium', 'font weight', 'kaosslider' ), 600: _x( 'Semibold', 'font weight', 'kaosslider' ), 700: _x( 'Bold', 'font weight', 'kaosslider' ), 800: _x( 'Extra bold', 'font weight', 'kaosslider' ), 900: _x( 'Black', 'font weight', 'kaosslider' ) };
			const gf = s.gfont && fontInfo(s.gfont);
			const weights = gf ? gf.weights : [300, 400, 500, 600, 700, 800, 900];
			box.append(section(_x( 'Text', 'layer type', 'kaosslider' ),
				field(__( 'Text colour', 'kaosslider' ), paintCtl(s.color, live((v) => { s.color = v; })), { wide: true, help: __( 'With a gradient the text is filled with it (the box background is not shown).', 'kaosslider' ) }),
				field(__( 'Font', 'kaosslider' ), fontCtl(s), { wide: true }),
				field(__( 'Weight', 'kaosslider' ), selectCtl(s.fontWeight, [['', _x( 'Default', 'easing', 'kaosslider' )]].concat(weights.map((w) => [String(w), w + ' ' + (WEIGHT_NAMES[w] || '')])), liveNow((v) => { s.fontWeight = v; })),
					{ help: gf ? sprintf( __( 'Only the weights available for %s are listed.', 'kaosslider' ), s.gfont ) : null }),
				field(__( 'Line height', 'kaosslider' ), numCtl(s.lineHeight, live((v) => { s.lineHeight = v; }), { min: 0.5, max: 4, step: 0.05 })),
				field(__( 'Letter spacing', 'kaosslider' ), numCtl(s.letterSpacing, live((v) => { s.letterSpacing = v; }), { min: -20, max: 50, step: 0.5, unit: 'px' })),
				field('', h('div', { class: 'kse-inline' },
					toggleCtl(s.italic, liveNow((v) => { s.italic = v; }), __( 'Italic', 'kaosslider' )),
					toggleCtl(s.uppercase, liveNow((v) => { s.uppercase = v; }), __( 'Uppercase', 'kaosslider' ))))
			));
			if (l.type !== 'draw') box.append(section(__( 'Letter outline', 'kaosslider' ),
				field(__( 'Thickness', 'kaosslider' ), numCtl(s.strokeWidth || 0, live((v) => { s.strokeWidth = v; }), { min: 0, max: 30, step: 0.5, unit: 'px' }), { help: __( '0 = no outline.', 'kaosslider' ) }),
				field(__( 'Colour', 'kaosslider' ), colorCtl(s.strokeColor || '#000000', live((v) => { s.strokeColor = v; }))),
				s.strokeOpacity != null && s.strokeOpacity < 1 ? field(__( 'Opacity', 'kaosslider' ), rangeCtl(s.strokeOpacity, live((v) => { s.strokeOpacity = v; }), { min: 0, max: 1, step: 0.05 }), { help: __( 'Previous setting: you can now set the opacity directly in the colour and put this back to 1.', 'kaosslider' ) }) : null,
				field('', toggleCtl(s.strokeOnly, liveNow((v) => { s.strokeOnly = v; }), __( 'Outline only (hollow letters)', 'kaosslider' )),
					{ help: __( 'The "outline" effect, popular for headlines. The outline is always a solid colour, even when the text uses a gradient.', 'kaosslider' ) })
			));
			if (isText) { box.append(section(__( 'Letter shadow', 'kaosslider' ), shadowCtl(s, 'shadow', true))); }
		}
		box.append(section(__( 'Box', 'kaosslider' ),
			field(l.type === 'shape' ? __( 'Shape colour', 'kaosslider' ) : __( 'Background', 'kaosslider' ), paintCtl(s.bg, live((v) => { s.bg = v; }), true), { wide: true, help: __( 'Solid colour (rgba(…) and var(--global-colour) work too) or gradient.', 'kaosslider' ) }),
			isText ? field(__( 'Vertical padding', 'kaosslider' ), numCtl(s.padV, live((v) => { s.padV = v; }), { min: 0, unit: 'px' })) : null,
			isText ? field(__( 'Horizontal padding', 'kaosslider' ), numCtl(s.padH, live((v) => { s.padH = v; }), { min: 0, unit: 'px' })) : null,
			field(__( 'Rounded corners', 'kaosslider' ), radiusCtl(s), { wide: true }),
			h('div', { class: 'kse-subgroup' },
				h('div', { class: 'kse-subgroup-title' }, __( 'Box border', 'kaosslider' )),
				field(__( 'Thickness', 'kaosslider' ), numCtl(s.borderWidth, live((v) => { s.borderWidth = v; }), { min: 0, max: 50, unit: 'px' }), { help: __( '0 = no border.', 'kaosslider' ) }),
				field(__( 'Style', 'kaosslider' ), segCtl(s.borderStyle || 'solid', [['solid', _x( 'Solid', 'border style', 'kaosslider' )], ['dashed', __( 'Dashed', 'kaosslider' )], ['dotted', __( 'Dotted', 'kaosslider' )], ['double', __( 'Double', 'kaosslider' )]], liveNow((v) => { s.borderStyle = v; }))),
				field(__( 'Colour', 'kaosslider' ), colorCtl(s.borderColor, live((v) => { s.borderColor = v; }))),
				s.borderOpacity != null && s.borderOpacity < 1 ? field(__( 'Opacity', 'kaosslider' ), rangeCtl(s.borderOpacity, live((v) => { s.borderOpacity = v; }), { min: 0, max: 1, step: 0.05 }), { help: __( 'Previous setting: you can now set the opacity directly in the colour and put this back to 1.', 'kaosslider' ) }) : null),
			field(__( 'Opacity', 'kaosslider' ), rangeCtl(s.opacity, live((v) => { s.opacity = v; }), { min: 0, max: 1, step: 0.05 })),
			l.type !== 'draw' && l.type !== 'film' && l.type !== 'image' ? glassGroup(s) : null,
			h('div', { class: 'kse-subgroup' },
				h('div', { class: 'kse-subgroup-title' }, isText ? __( 'Box shadow', 'kaosslider' ) : __( 'Shadow', 'kaosslider' )),
				shadowCtl(s, isText ? 'boxShadow' : 'shadow', false)),
			l.type === 'image' ? field(__( 'Fit inside the box', 'kaosslider' ), selectCtl(s.objectFit, [['cover', __( 'Cover (crops)', 'kaosslider' )], ['contain', __( 'Contain (whole)', 'kaosslider' )], ['fill', __( 'Stretch', 'kaosslider' )]], liveNow((v) => { s.objectFit = v; })), { help: __( 'When you set both width and height. In "Cover/Contain the whole slide" the mode chosen in Position applies.', 'kaosslider' ) }) : null,
			l.type === 'image' ? field(__( 'Focal point', 'kaosslider' ), selectCtl(s.objectPosition || 'center center', C.positions.map((x) => [x, POSITIONS_LABEL[x] || x]), liveNow((v) => { s.objectPosition = v; })), { help: __( 'Which part of the image stays visible when it is cropped.', 'kaosslider' ) }) : null
		));
		if (l.type === 'button' || (l.link && l.type === 'text')) {
			box.append(section(__( 'On hover', 'kaosslider' ),
				field(__( 'Text colour', 'kaosslider' ), paintCtl(s.hoverColor, live((v) => { s.hoverColor = v; }), true), { wide: true }),
				field(__( 'Background', 'kaosslider' ), paintCtl(s.hoverBg, live((v) => { s.hoverBg = v; }), true), { wide: true, help: __( 'Visible on the site and in the preview.', 'kaosslider' ) })
			));
		}
		return box;
	}

	/* Angoli: un valore per tutti oppure uno per angolo. */
	function radiusCtl(s) {
		const linked = s.radiusLinked !== false;
		const toggle = h('button', {
			type: 'button', class: 'kse-btn kse-icon' + (linked ? ' is-active' : ''), title: linked ? __( 'Linked corners: click to set them one by one', 'kaosslider' ) : __( 'Separate corners: click to link them', 'kaosslider' ),
			onclick: () => change(() => {
				if (linked) {
					s.radiusTL = s.radiusTR = s.radiusBR = s.radiusBL = s.radius;
					s.radiusLinked = false;
				} else {
					s.radius = Math.max(s.radiusTL, s.radiusTR, s.radiusBR, s.radiusBL);
					s.radiusLinked = true;
				}
			}, { immediate: true })
		}, icon(linked ? 'admin-links' : 'editor-unlink'));
		if (linked) {
			return h('div', { class: 'kse-radius' }, numCtl(s.radius, live((v) => { s.radius = v; }), { min: 0, unit: 'px' }), toggle);
		}
		const corner = (key, label) => h('label', { class: 'kse-corner' }, h('span', null, label), numCtl(s[key], live((v) => { s[key] = v; }), { min: 0, unit: 'px' }));
		return h('div', { class: 'kse-radius' },
			h('div', { class: 'kse-corners' },
				corner('radiusTL', __( '↖ Top left', 'kaosslider' )), corner('radiusTR', __( '↗ Top right', 'kaosslider' )),
				corner('radiusBL', __( '↙ Bottom left', 'kaosslider' )), corner('radiusBR', __( '↘ Bottom right', 'kaosslider' ))),
			toggle);
	}

	function animTab(l) {
		const a = l.anim.in;
		const o = l.anim.out;
		const box = h('div');
		box.append(h('div', { class: 'kse-test-row' },
			h('button', { type: 'button', class: 'kse-btn kse-primary-ghost', onclick: () => testLayer(l) }, icon('controls-play'), ( ' ' + __( 'Test this layer', 'kaosslider' ) )),
			h('button', { type: 'button', class: 'kse-btn', onclick: playSlide }, __( 'Play slide', 'kaosslider' ))));

		const typewriter = a.effect === 'typewriter';
		const inSec = section(__( 'Entrance', 'kaosslider' ),
			field(__( 'Effect', 'kaosslider' ), effectSelect(a.effect, EFFECTS_IN, liveNow((v) => {
				a.effect = v;
				if (v === 'typewriter' && a.stagger < 20) { a.stagger = 60; }
			}), l)),
			a.effect === 'custom' ? customAnimFields(a, __( 'Starting state', 'kaosslider' )) : null,
			typewriter
				? field(__( 'Typing speed', 'kaosslider' ), numCtl(a.stagger, live((v) => { a.stagger = v; }), { min: 10, step: 10, unit: 'ms' }), { help: __( 'Milliseconds between one letter and the next. When typing ends a blinking cursor appears.', 'kaosslider' ) })
				: field(__( 'Duration', 'kaosslider' ), numCtl(a.duration, live((v) => { a.duration = v; }), { min: 0, step: 50, unit: 'ms' })),
			field(__( 'Delay', 'kaosslider' ), numCtl(a.delay, live((v) => { a.delay = v; }), { min: 0, step: 50, unit: 'ms' }), { help: __( 'From the start of the slide. You can also drag the bar in the timeline.', 'kaosslider' ) }),
			typewriter ? null : field(__( 'Easing', 'kaosslider' ), selectCtl(a.easing, EASINGS, liveNow((v) => { a.easing = v; })))
		);
		if (typewriter && l.type !== 'text') {
			inSec.append(h('p', { class: 'kse-hint' }, __( 'The typewriter works on text layers: here the layer will fade in.', 'kaosslider' )));
		}
		if (l.type === 'text' && !typewriter) {
			inSec.append(
				field(__( 'Animate by', 'kaosslider' ), segCtl(a.split, [['none', __( 'Block', 'kaosslider' )], ['lines', __( 'Lines', 'kaosslider' )], ['words', __( 'Words', 'kaosslider' )], ['chars', __( 'Letters', 'kaosslider' )]], liveNow((v) => { a.split = v; }))),
				a.split !== 'none' ? field(__( 'Interval', 'kaosslider' ), numCtl(a.stagger, live((v) => { a.stagger = v; }), { min: 0, step: 10, unit: 'ms' }), { help: __( 'Delay between one word/letter/line and the next.', 'kaosslider' ) }) : null
			);
			if (a.split !== 'none' && a.effect === 'revealUp') {
				inSec.append(h('p', { class: 'kse-hint' }, __( '"Reveal" effect with split text: each part rises from under a mask. Great for hero headlines.', 'kaosslider' )));
			}
		}
		box.append(inSec);

		box.append(section(__( 'Exit', 'kaosslider' ),
			field(__( 'Effect', 'kaosslider' ), effectSelect(o.effect, EFFECTS_OUT, liveNow((v) => { o.effect = v; }), l)),
			o.effect === 'custom' ? customAnimFields(o, __( 'End state', 'kaosslider' )) : null,
			o.effect !== 'none' ? field(__( 'Duration', 'kaosslider' ), numCtl(o.duration, live((v) => { o.duration = v; }), { min: 0, step: 50, unit: 'ms' })) : null,
			o.effect !== 'none' ? field(__( 'Time', 'kaosslider' ), numCtl(o.at, live((v) => { o.at = v; }), { min: 0, step: 50, unit: 'ms' }), { help: __( '0 = exits at the end of the slide. Otherwise, milliseconds from the start of the slide.', 'kaosslider' ) }) : null,
			o.effect !== 'none' ? field(__( 'Easing', 'kaosslider' ), selectCtl(o.easing, EASINGS, liveNow((v) => { o.easing = v; }))) : null
		));

		box.append(section(__( 'Continuous animation', 'kaosslider' ),
			field(__( 'After the entrance', 'kaosslider' ), selectCtl(l.anim.loop, [['none', _x( 'None', 'shadow', 'kaosslider' )], ['pulse', __( 'Pulse', 'kaosslider' )], ['float', __( 'Float', 'kaosslider' )], ['rotate', __( 'Continuous rotation', 'kaosslider' )], ['swing', __( 'Swing', 'kaosslider' )], ['blink', __( 'Blink', 'kaosslider' )]], liveNow((v) => { l.anim.loop = v; })))
		));

		box.append(section(__( 'Mouse parallax', 'kaosslider' ),
			field(__( 'Depth', 'kaosslider' ), rangeCtl(l.parallax || 0, live((v) => { l.parallax = v; }), { min: 0, max: 10, step: 1 }),
				{ help: settings().parallax
					? __( '0 = still. The higher it is, the more the layer moves with the mouse: layers with different depths create the 3D effect.', 'kaosslider' )
					: __( 'First turn on "Mouse parallax" in the slider settings.', 'kaosslider' ) })
		));
		return box;
	}

	/* Campi dell'effetto personalizzato (entrata: da dove parte; uscita: dove arriva). */
	function customAnimFields(a, title) {
		if (!a.custom) { a.custom = { x: 0, y: 60, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, skewX: 0, opacity: 0, blur: 0, origin: 'center center' }; }
		const c = a.custom;
		const n = (key, label, o) => field(label, numCtl(c[key], live((v) => { c[key] = v; }), o));
		return h('div', { class: 'kse-custom-anim' },
			h('div', { class: 'kse-custom-title' }, title),
			h('div', { class: 'kse-grid2' },
				n('x', __( 'Move X', 'kaosslider' ), { step: 10, unit: 'px' }),
				n('y', __( 'Move Y', 'kaosslider' ), { step: 10, unit: 'px' }),
				n('scale', __( 'Scale', 'kaosslider' ), { min: 0, max: 5, step: 0.05 }),
				n('rotate', __( 'Rotation', 'kaosslider' ), { step: 5, unit: '°' }),
				n('rotateX', __( '3D rotation X', 'kaosslider' ), { step: 5, unit: '°' }),
				n('rotateY', __( '3D rotation Y', 'kaosslider' ), { step: 5, unit: '°' }),
				n('skewX', __( 'Skew', 'kaosslider' ), { min: -80, max: 80, step: 1, unit: '°' }),
				n('blur', __( 'Blur', 'kaosslider' ), { min: 0, max: 50, step: 1, unit: 'px' })),
			field(__( 'Opacity', 'kaosslider' ), rangeCtl(c.opacity, live((v) => { c.opacity = v; }), { min: 0, max: 1, step: 0.05 })),
			field(__( 'Rotation point', 'kaosslider' ), selectCtl(c.origin, C.positions.map((x) => [x, POSITIONS_LABEL[x] || x]), liveNow((v) => { c.origin = v; }))));
	}

	function groupSelectCtl(value, groups, onChange, top) {
		const s = h('select', { onchange: (e) => onChange(e.target.value) },
			(top || []).map(([v, t]) => h('option', { value: v }, t)),
			groups.map(([label, opts]) => h('optgroup', { label }, opts.map(([v, t]) => h('option', { value: v }, t)))));
		s.value = value;
		return s;
	}

	function effectSelect(value, list, onChange, l) {
		const names = Object.fromEntries(list);
		if (l && l.type !== 'draw') { delete names.draw; }
		if (l && l.type !== 'text') { delete names.typewriter; }
		const groups = EFFECT_GROUPS
			.map(([g, keys]) => [g, keys.filter((k) => names[k]).map((k) => [k, names[k]])])
			.filter(([, opts]) => opts.length);
		return groupSelectCtl(value, groups, onChange);
	}

	function posTab(l) {
		const r = resolve(l, S.device);
		const box = h('div');
		const set = (key) => live((v) => setResp(l, key, v));
		const setNow = (key) => liveNow((v) => setResp(l, key, v));

		box.append(h('div', { class: 'kse-device-note' }, icon(DEVICE_ICON[S.device]),
			S.device === 'desktop'
				? ( ' ' + __( 'You are editing Desktop: tablet and mobile inherit these values.', 'kaosslider' ) )
				: ' ' + sprintf( __( 'You are editing %s: the values changed here apply only to this device.', 'kaosslider' ), DEVICE_LABEL[S.device] )));

		const quick = h('div', { class: 'kse-quick-align' },
			[['left', __( 'Align left', 'kaosslider' ), 'align-left'], ['center', __( 'Centre horizontally', 'kaosslider' ), 'align-center'], ['right', __( 'Align right', 'kaosslider' ), 'align-right']].map(([ax, t, ic]) =>
				h('button', { type: 'button', class: 'kse-btn kse-icon', title: t, onclick: () => change(() => { setResp(l, 'ax', ax); setResp(l, 'x', ax === 'left' ? 5 : ax === 'right' ? 95 : 50); }, { immediate: true }) }, icon(ic))),
			h('span', { class: 'kse-sep' }),
			[['top', __( 'Top', 'kaosslider' ), 'arrow-up-alt2'], ['middle', __( 'Centre vertically', 'kaosslider' ), 'minus'], ['bottom', __( 'Bottom', 'kaosslider' ), 'arrow-down-alt2']].map(([ay, t, ic]) =>
				h('button', { type: 'button', class: 'kse-btn kse-icon', title: t, onclick: () => change(() => { setResp(l, 'ay', ay); setResp(l, 'y', ay === 'top' ? 8 : ay === 'bottom' ? 92 : 50); }, { immediate: true }) }, icon(ic)))
		);

		const anchor = h('div', { class: 'kse-anchor' },
			['top', 'middle', 'bottom'].map((ay) => ['left', 'center', 'right'].map((ax) => h('button', {
				type: 'button', class: r.ax === ax && r.ay === ay ? 'is-active' : '', title: sprintf( __( 'Anchor point: %s', 'kaosslider' ), POSITIONS_LABEL[ax + ' ' + (ay === 'middle' ? 'center' : ay)] ),
				onclick: () => change(() => { setResp(l, 'ax', ax); setResp(l, 'ay', ay); }, { immediate: true })
			}))));

		const media = l.type === 'image' || l.type === 'shape';
		const fit = fitOf(l, r);
		const FIT_HELP = {
			custom: __( 'Width and height in px, scaled proportionally on small screens.', 'kaosslider' ),
			fullw: __( 'Takes up the full width of the slide; you can only move it vertically.', 'kaosslider' ),
			fullh: __( 'Takes up the full height of the slide; you can only move it horizontally.', 'kaosslider' ),
			cover: __( 'Fills the whole slide, cropping the edges if the proportions do not match.', 'kaosslider' ),
			contain: __( 'Fits entirely inside the slide without cropping, leaving empty space at the sides if needed.', 'kaosslider' )
		};
		if (media) {
			box.append(section(__( 'Sizing', 'kaosslider' ),
				field(__( 'Mode', 'kaosslider' ), selectCtl(fit, [['custom', _x( 'Custom', 'shadow', 'kaosslider' )], ['fullw', __( 'Full width', 'kaosslider' )], ['fullh', __( 'Full height', 'kaosslider' )], ['cover', __( 'Cover the whole slide', 'kaosslider' )], ['contain', __( 'Contain in the slide', 'kaosslider' )]], setNow('fit')),
					{ badge: respBadge(l, ['fit']), help: FIT_HELP[fit] })
			));
		}

		if (fit !== 'cover' && fit !== 'contain') {
			box.append(section(__( 'Position', 'kaosslider' ), fit === 'custom' ? quick : null,
				fit !== 'fullw' ? field(__( 'X (horizontal)', 'kaosslider' ), numCtl(r.x, set('x'), { step: 0.5, unit: '%' }), { badge: respBadge(l, ['x']) }) : null,
				fit !== 'fullh' ? field(__( 'Y (vertical)', 'kaosslider' ), numCtl(r.y, set('y'), { step: 0.5, unit: '%' }), { badge: respBadge(l, ['y']) }) : null,
				fit === 'custom' ? field(__( 'Anchor', 'kaosslider' ), anchor, { badge: respBadge(l, ['ax', 'ay']), help: __( 'Which point of the layer sits at the X/Y coordinates.', 'kaosslider' ) }) : null,
				fit === 'fullw' ? field(__( 'Vertical anchor', 'kaosslider' ), segCtl(r.ay, [['top', _x( 'Top', 'anchor', 'kaosslider' )], ['middle', __( 'Centre', 'kaosslider' )], ['bottom', _x( 'Bottom', 'anchor', 'kaosslider' )]], setNow('ay')), { badge: respBadge(l, ['ay']) }) : null,
				fit === 'fullh' ? field(__( 'Horizontal anchor', 'kaosslider' ), segCtl(r.ax, [['left', __( 'Left', 'kaosslider' )], ['center', __( 'Centre', 'kaosslider' )], ['right', __( 'Right', 'kaosslider' )]], setNow('ax')), { badge: respBadge(l, ['ax']) }) : null
			));
		}

		box.append(section(__( 'Dimensions', 'kaosslider' ),
			(fit === 'custom' || fit === 'fullh') ? field(__( 'Width', 'kaosslider' ), numCtl(r.w, set('w'), { min: 0, unit: 'px' }), { badge: respBadge(l, ['w']), help: l.type === 'text' ? __( '0 = automatic (the text does not wrap on its own).', 'kaosslider' ) : __( '0 = automatic.', 'kaosslider' ) }) : null,
			media && (fit === 'custom' || fit === 'fullw') ? field(__( 'Height', 'kaosslider' ), numCtl(r.h, set('h'), { min: 0, unit: 'px' }), { badge: respBadge(l, ['h']), help: __( '0 = automatic (original proportions).', 'kaosslider' ) }) : null,
			media && (fit === 'cover' || fit === 'contain') ? h('p', { class: 'kse-hint' }, __( 'Automatic size: the layer always follows the slide.', 'kaosslider' )) : null,
			(l.type === 'text' || l.type === 'button') ? field(__( 'Text size', 'kaosslider' ), numCtl(r.fs, set('fs'), { min: 4, max: 400, unit: 'px' }), { badge: respBadge(l, ['fs']) }) : null,
			(l.type === 'text' || l.type === 'button') ? field(__( 'Text alignment', 'kaosslider' ), segCtl(r.ta, [['left', __( 'Left', 'kaosslider' ), 'editor-alignleft'], ['center', __( 'Centre', 'kaosslider' ), 'editor-aligncenter'], ['right', __( 'Right', 'kaosslider' ), 'editor-alignright']], setNow('ta')), { badge: respBadge(l, ['ta']) }) : null
		));

		box.append(section(__( 'Visibility', 'kaosslider' ),
			field('', toggleCtl(r.hide, setNow('hide'), sprintf( __( 'Hide on %s', 'kaosslider' ), DEVICE_LABEL[S.device] )), { badge: respBadge(l, ['hide']) })
		));
		box.append(h('p', { class: 'kse-hint' }, sprintf( __( 'Sizes in px refer to the %dpx canvas and shrink proportionally on smaller screens.', 'kaosslider' ), grid().w )));
		// A modifica confermata (invio/uscita dal campo) aggiorna le etichette "eredita" / "personalizzato".
		box.addEventListener('change', (e) => { if (e.target.type === 'number') { setTimeout(renderProps); } });
		return box;
	}

	function settingsPanel() {
		const st = settings();
		const L = (fn) => live(fn);
		const N = (fn) => liveNow(fn);
		const isCar = st.type === 'carousel';
		const wrap = h('div', { class: 'kse-props' },
			h('div', { class: 'kse-props-head' }, icon('admin-generic'), h('strong', null, __( 'Slider settings', 'kaosslider' )),
				h('button', { type: 'button', class: 'kse-btn kse-icon', title: __( 'Close', 'kaosslider' ), onclick: () => { S.panel = 'auto'; renderProps(); updateTopbar(); } }, icon('no-alt')))
		);

		wrap.append(section(__( 'General', 'kaosslider' ),
			field(__( 'Alias', 'kaosslider' ), textCtl(S.alias, (v) => change(() => { S.alias = v; }, { only: [] })), { help: sprintf( __( 'Also allows [kaosslider alias="%s"].', 'kaosslider' ), S.alias || __( 'name', 'kaosslider' ) ) }),
			field(__( 'Type', 'kaosslider' ), segCtl(st.type, [['slider', __( 'Slider', 'kaosslider' )], ['carousel', __( 'Carousel', 'kaosslider' )]], N((v) => {
				st.type = v;
				if (v === 'carousel' && st.grid.desktop.w > 800) {
					st.grid = { desktop: { w: 400, h: 500 }, tablet: { w: 400, h: 500 }, mobile: { w: 400, h: 500 } };
					st.height = 'fixed';
				}
				if (v === 'slider' && st.grid.desktop.w < 800) {
					st.grid = { desktop: { w: 1240, h: 700 }, tablet: { w: 1024, h: 700 }, mobile: { w: 480, h: 720 } };
				}
			}))),
			!isCar ? field(__( 'Height', 'kaosslider' ), segCtl(st.height, [['fullscreen', __( 'Fullscreen', 'kaosslider' )], ['fixed', __( 'Proportional', 'kaosslider' )]], N((v) => { st.height = v; })), { help: st.height === 'fullscreen' ? __( 'Takes up the full height of the window.', 'kaosslider' ) : __( 'Height = canvas height, reduced proportionally on narrow screens.', 'kaosslider' ) }) : null,
			!isCar && st.height === 'fullscreen' ? field(__( 'Subtract from the height', 'kaosslider' ), numCtl(st.offset, L((v) => { st.offset = v; }), { min: 0, unit: 'px' }), { help: __( 'E.g. the header height, if the slider must fit entirely above the fold.', 'kaosslider' ) }) : null,
			field('', toggleCtl(st.fullWidth, N((v) => { st.fullWidth = v; }), __( 'Full width (breaks out of the theme container)', 'kaosslider' ))),
			field('', toggleCtl(st.responsive !== false, N((v) => { st.responsive = v; }), __( 'Responsive', 'kaosslider' )),
				{ help: st.responsive !== false
					? __( 'On screens narrower than the canvas, layers and texts shrink proportionally (the tablet/mobile versions can still be customised).', 'kaosslider' )
					: __( 'Real px sizes on every screen: on narrower ones, whatever goes beyond the slide is cut off.', 'kaosslider' ) }),
			field(__( 'Slider background', 'kaosslider' ), paintCtl(st.bgColor, L((v) => { st.bgColor = v; }), true), { wide: true })
		));

		const gridSec = section(isCar ? __( 'Card size (canvas)', 'kaosslider' ) : __( 'Canvas size', 'kaosslider' ),
			h('p', { class: 'kse-hint' }, isCar
				? __( 'Reference size of each card. Cards adapt to the available width keeping their proportions.', 'kaosslider' )
				: __( 'Work area where you position the layers. On screens narrower than the canvas, everything is reduced proportionally.', 'kaosslider' ))
		);
		DEVICES.forEach((d) => {
			gridSec.append(field(DEVICE_LABEL[d], h('div', { class: 'kse-inline' },
				numCtl(st.grid[d].w, L((v) => { st.grid[d].w = v; }), { min: 200, max: 4000, unit: _x( 'W', 'width abbreviation', 'kaosslider' ) }),
				numCtl(st.grid[d].h, L((v) => { st.grid[d].h = v; }), { min: 100, max: 4000, unit: _x( 'H', 'height abbreviation', 'kaosslider' ) }))));
		});
		wrap.append(gridSec);

		if (isCar) {
			const carSec = section(__( 'Carousel', 'kaosslider' ));
			DEVICES.forEach((d) => {
				carSec.append(field(sprintf( __( 'Visible cards · %s', 'kaosslider' ), DEVICE_LABEL[d] ), numCtl(st.perView[d], L((v) => { st.perView[d] = Math.round(v); }), { min: 1, max: 8 })));
			});
			carSec.append(field(__( 'Space between cards', 'kaosslider' ), numCtl(st.gap, L((v) => { st.gap = v; }), { min: 0, max: 400, unit: 'px' })));
			carSec.append(field(__( 'Style', 'kaosslider' ), segCtl(st.carouselStyle || 'flat', [['flat', __( 'Flat', 'kaosslider' )], ['coverflow', __( '3D', 'kaosslider' )], ['zoom', __( 'Centre zoom', 'kaosslider' )]], N((v) => { st.carouselStyle = v; })),
				{ help: st.carouselStyle && st.carouselStyle !== 'flat' ? __( 'The active card sits in the centre and the side ones rotate or shrink. It looks best with 3 visible cards.', 'kaosslider' ) : __( 'Identical cards side by side.', 'kaosslider' ) }));
			wrap.append(carSec);
		}

		if (!isCar) {
			wrap.append(section(__( 'Scroll-driven video', 'kaosslider' ),
				field('', toggleCtl(st.scrollVideo, N((v) => { st.scrollVideo = v; }), __( 'Enable', 'kaosslider' )),
					{ help: __( 'The background video (file) of the first slide moves forwards and backwards with the scroll, while the slide stays fixed on screen. The other slides are not shown.', 'kaosslider' ) }),
				st.scrollVideo ? field(__( 'Scroll length', 'kaosslider' ), rangeCtl(st.scrollLength, L((v) => { st.scrollLength = v; }), { min: 150, max: 1000, step: 10 }), { help: __( 'In % of the screen height (300 = three screens of scrolling to see the whole video).', 'kaosslider' ) }) : null,
				st.scrollVideo ? h('p', { class: 'kse-hint' }, __( 'For smooth scrubbing use a short MP4 (5–15 s) with a keyframe every few frames, e.g. with ffmpeg: -g 5. Visible only on the site and in the preview.', 'kaosslider' )) : null));
		}
		wrap.append(section(__( 'Playback', 'kaosslider' ),
			!isCar ? field(__( 'Default transition', 'kaosslider' ), groupSelectCtl(st.transition, TRANSITION_GROUPS, N((v) => { st.transition = v; })), { help: __( 'Each slide can use a different one (slide panel).', 'kaosslider' ) }) : null,
			field(__( 'Transition speed', 'kaosslider' ), numCtl(st.speed, L((v) => { st.speed = v; }), { min: 0, max: 10000, step: 50, unit: 'ms' })),
			field('', toggleCtl(st.parallax, N((v) => { st.parallax = v; }), __( 'Mouse parallax', 'kaosslider' )), { help: __( 'Layers and background follow the mouse according to the "depth" set on each one. Desktop computers only.', 'kaosslider' ) }),
			st.parallax ? field(__( 'Parallax intensity', 'kaosslider' ), rangeCtl(st.parallaxStrength, L((v) => { st.parallaxStrength = v; }), { min: 0, max: 100, step: 1 })) : null,
			field('', toggleCtl(st.scrollParallax, N((v) => { st.scrollParallax = v; }), __( 'Background parallax on scroll', 'kaosslider' )), { help: __( 'The background scrolls more slowly than the page.', 'kaosslider' ) }),
			field('', toggleCtl(st.autoplay, N((v) => { st.autoplay = v; }), __( 'Autoplay', 'kaosslider' ))),
			field(isCar ? __( 'Interval', 'kaosslider' ) : __( 'Default slide duration', 'kaosslider' ), numCtl(st.delay, L((v) => { st.delay = v; }), { min: 500, step: 100, unit: 'ms' })),
			field('', toggleCtl(st.pauseOnHover, N((v) => { st.pauseOnHover = v; }), __( 'Pause on hover', 'kaosslider' ))),
			field('', toggleCtl(st.loop, N((v) => { st.loop = v; }), __( 'Start over after the last slide', 'kaosslider' )))
		));

		wrap.append(section(__( 'Navigation', 'kaosslider' ),
			field('', toggleCtl(st.arrows, N((v) => { st.arrows = v; }), __( 'Arrows', 'kaosslider' ))),
			field('', toggleCtl(st.bullets, N((v) => { st.bullets = v; }), __( 'Dots', 'kaosslider' ))),
			!isCar ? field('', toggleCtl(st.progress, N((v) => { st.progress = v; }), __( 'Progress bar', 'kaosslider' ))) : null,
			field('', toggleCtl(st.swipe, N((v) => { st.swipe = v; }), __( 'Swipe / drag', 'kaosslider' ))),
			field('', toggleCtl(st.keyboard, N((v) => { st.keyboard = v; }), __( 'Keyboard arrows', 'kaosslider' ))),
			field(__( 'Navigation colour', 'kaosslider' ), colorCtl(st.navColor, L((v) => { st.navColor = v; })))
		));
		return wrap;
	}

	/* ================= Salvataggio e anteprima ================= */

	function save() {
		if (S.saving) { return Promise.resolve(); }
		flushHistory();
		S.saving = true;
		$.save.disabled = true;
		$.save.textContent = __( 'Saving…', 'kaosslider' );
		return api('/sliders/' + S.id, { method: 'POST', body: { title: S.title, alias: S.alias, data: S.data } })
			.then((res) => {
				S.title = res.title;
				S.alias = res.alias;
				S.data = normalize(res.data);
				S.dirty = false;
				S.slide = clamp(S.slide, 0, S.data.slides.length - 1);
				if (!layer()) { S.sel = null; }
				undoStack[undoStack.length - 1] = snapshot();
				const focused = document.activeElement && $.right.contains(document.activeElement);
				refresh(focused ? { skip: ['props'] } : {});
				toast(__( 'Slider saved', 'kaosslider' ), 'ok');
			})
			.catch((err) => {
				toast(sprintf( __( 'Error: %s', 'kaosslider' ), err.message ), 'error');
				throw err;
			})
			.finally(() => {
				S.saving = false;
				$.save.disabled = false;
				updateTopbar();
			});
	}

	function openPreview() {
		// La finestra va aperta subito (prima della risposta del server) per non essere bloccata come popup.
		const win = window.open('', '_blank');
		save().then(() => {
			if (win) { win.location.href = S.previewUrl; } else { window.open(S.previewUrl, '_blank'); }
		}).catch(() => { if (win) { win.close(); } });
	}

	/* ================= Tastiera ================= */

	function onKeyDown(e) {
		const mod = e.ctrlKey || e.metaKey;
		const key = e.key.toLowerCase();
		if (mod && key === 's') {
			e.preventDefault();
			save().catch(() => {});
			return;
		}
		if (e.target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('.media-modal:not([style*="display: none"])')) { return; }
		if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) { redo(); } else { undo(); } return; }
		if (mod && key === 'y') { e.preventDefault(); redo(); return; }
		if (mod && key === 'v' && clipboard) {
			e.preventDefault();
			pasteLayer();
			return;
		}
		const l = layer();
		if (!l) { return; }
		if (mod && key === 'c') { clipboard = clone(l); toast(__( 'Layer copied', 'kaosslider' )); return; }
		if (mod && key === 'd') { e.preventDefault(); duplicateLayer(l); return; }
		if (key === 'delete' || key === 'backspace') { e.preventDefault(); deleteLayer(l.id); return; }
		if (key === 'escape') { select(null); return; }
		const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
		if (arrows[key] && !l.locked) {
			e.preventDefault();
			const step = e.shiftKey ? 10 : 1;
			const g = grid();
			const r = resolve(l, S.device);
			setResp(l, 'x', round(r.x + arrows[key][0] * step / g.w * 100, 3));
			setResp(l, 'y', round(r.y + arrows[key][1] * step / g.h * 100, 3));
			updateCss();
			S.dirty = true;
			queueHistory();
			clearTimeout(S.nudgeTimer);
			S.nudgeTimer = setTimeout(() => refresh({ only: ['props'] }), 300);
		}
	}

	/* ================= Avvio ================= */

	const catalog = fetch(C.fontsUrl).then((r) => r.json()).then(setFontCatalog).catch(() => setFontCatalog([]));

	const shapes = fetch(C.drawShapesUrl).then((r) => r.json()).then((j) => { DRAW_SHAPES = j || {}; }).catch(() => {});

	Promise.all([api('/sliders/' + S.id), catalog, shapes]).then(([res]) => {
		S.title = res.title;
		S.alias = res.alias;
		S.data = normalize(res.data);
		S.previewUrl = res.previewUrl;
		buildUI();
		pushHistory();
		loadUsedFonts();
		refresh();
		document.addEventListener('keydown', onKeyDown);
		window.addEventListener('beforeunload', (e) => {
			if (S.dirty) { e.preventDefault(); e.returnValue = ''; }
		});
	}).catch((err) => {
		root.innerHTML = '';
		root.append(h('div', { class: 'kse-loading' }, sprintf( __( 'Unable to load the slider: %s', 'kaosslider' ), err.message ) + ' ', h('a', { href: C.adminUrl }, __( 'Back to the list', 'kaosslider' ))));
	});
})();
