/* KaosSlider – bacheca a griglia */
(function () {
	'use strict';

	var __ = wp.i18n.__;
	var _x = wp.i18n._x;
	var _n = wp.i18n._n;
	var sprintf = wp.i18n.sprintf;

	var C = window.KaosSliderConfig;
	var app = document.getElementById('ksl-app');
	var items = [];
	var query = '';

	/* ---------- Utility ---------- */

	function api(path, opts) {
		opts = opts || {};
		var headers = { 'Content-Type': 'application/json', 'X-WP-Nonce': C.nonce };
		var method = opts.method || 'GET';
		// Alcuni hosting bloccano DELETE/PUT: si usa POST con override, supportato dalle REST API di WordPress.
		if (method === 'DELETE' || method === 'PUT') {
			headers['X-HTTP-Method-Override'] = method;
			method = 'POST';
		}
		return fetch(C.restUrl + path, {
			method: method,
			headers: headers,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
			credentials: 'same-origin'
		}).then(function (r) {
			return r.json().then(function (json) {
				if (!r.ok) { throw new Error(json && json.message ? json.message : ( __( 'Error', 'kaosslider' ) + ' ' ) + r.status); }
				return json;
			});
		});
	}

	function h(tag, attrs) {
		var el = document.createElement(tag);
		var kids = Array.prototype.slice.call(arguments, 2);
		Object.keys(attrs || {}).forEach(function (k) {
			var v = attrs[k];
			if (v == null || v === false) { return; }
			if (k === 'class') { el.className = v; }
			else if (k === 'html') { el.innerHTML = v; }
			else if (k.indexOf('on') === 0 && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); }
			else { el.setAttribute(k, v === true ? '' : v); }
		});
		kids.forEach(function add(c) {
			if (c == null || c === false) { return; }
			if (Array.isArray(c)) { c.forEach(add); return; }
			el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
		});
		return el;
	}

	function icon(name) {
		return h('span', { class: 'dashicons dashicons-' + name, 'aria-hidden': 'true' });
	}

	function editUrl(id) {
		return C.adminUrl + '&edit=' + id;
	}

	function toast(msg, type) {
		var t = h('div', { class: 'ksl-toast' + (type ? ' is-' + type : '') }, msg);
		document.body.appendChild(t);
		setTimeout(function () { t.classList.add('is-out'); }, 1800);
		setTimeout(function () { t.remove(); }, 2300);
	}

	/* Finestra modale (sostituisce prompt/confirm del browser). */
	function modal(title, body, actions) {
		return new Promise(function (resolve) {
			var close = function (val) {
				document.removeEventListener('keydown', onKey);
				back.remove();
				resolve(val);
			};
			var onKey = function (e) { if (e.key === 'Escape') { close(null); } };
			var foot = h('div', { class: 'ksl-modal-foot' }, actions.map(function (a) {
				return h('button', {
					type: a.submit ? 'submit' : 'button',
					class: 'ksl-btn' + (a.primary ? ' is-primary' : '') + (a.danger ? ' is-danger' : ''),
					onclick: a.submit ? null : function () { close(a.value); }
				}, a.label);
			}));
			var form = h('form', { class: 'ksl-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
				h('div', { class: 'ksl-modal-head' }, h('h2', null, title),
					h('button', { type: 'button', class: 'ksl-icon-btn', 'aria-label': __( 'Close', 'kaosslider' ), onclick: function () { close(null); } }, icon('no-alt'))),
				h('div', { class: 'ksl-modal-body' }, body), foot);
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var a = actions.filter(function (x) { return x.submit; })[0];
				close(a ? a.value : true);
			});
			var back = h('div', { class: 'ksl-modal-back', onclick: function (e) { if (e.target === back) { close(null); } } }, form);
			document.body.appendChild(back);
			document.addEventListener('keydown', onKey);
			var first = form.querySelector('input, button.is-primary');
			if (first) { first.focus(); }
		});
	}

	function confirmModal(title, text, label) {
		return modal(title, h('p', null, text), [
			{ label: __( 'Cancel', 'kaosslider' ), value: false },
			{ label: label || __( 'Confirm', 'kaosslider' ), value: true, primary: true, danger: true, submit: true }
		]);
	}

	/* ---------- Font delle anteprime ---------- */

	var loadedCss = {};
	function loadCss(url) {
		if (!url || loadedCss[url]) { return; }
		loadedCss[url] = true;
		document.head.appendChild(h('link', { rel: 'stylesheet', href: url }));
	}

	/* ---------- Griglia ---------- */

	function render() {
		app.innerHTML = '';
		var search = h('input', {
			type: 'search', class: 'ksl-search', placeholder: __( 'Search sliders…', 'kaosslider' ), value: query, 'aria-label': __( 'Search sliders', 'kaosslider' ),
			oninput: function (e) { query = e.target.value; renderGrid(grid); }
		});
		var head = h('div', { class: 'ksl-head' },
			h('div', { class: 'ksl-brand' }, h('img', { class: 'ksl-logo', src: C.logoUrl, alt: 'KaosSlider' }), h('small', { class: 'ksl-version' }, 'v' + C.version)),
			search,
			h('div', { class: 'ksl-head-actions' },
				h('button', { type: 'button', class: 'ksl-btn', onclick: openSettings }, icon('admin-generic'), ( ' ' + __( 'Settings', 'kaosslider' ) )),
				h('button', { type: 'button', class: 'ksl-btn', onclick: function () { document.getElementById('ksl-import-file').click(); } }, icon('upload'), ( ' ' + __( 'Import', 'kaosslider' ) )),
				h('button', { type: 'button', class: 'ksl-btn is-primary', onclick: createSlider }, icon('plus-alt2'), ( ' ' + __( 'New slider', 'kaosslider' ) )))
		);
		var grid = h('div', { class: 'ksl-grid' });
		app.appendChild(head);
		app.appendChild(grid);
		app.appendChild(h('p', { class: 'ksl-help', html:
			sprintf(
				/* translators: 1: shortcode, 2: block name, 3: PHP code for theme files. */
				__( 'Insert a slider with the %1$s shortcode, the %2$s block (Gutenberg/Kadence), the Elementor widget or the Divi module. In theme files: %3$s', 'kaosslider' ),
				'<code>[kaosslider id="ID"]</code>', '<strong>KaosSlider</strong>', '<code>&lt;?php echo kaosslider( ID ); ?&gt;</code>'
			) }));
		renderGrid(grid);
	}

	function renderGrid(grid) {
		grid.innerHTML = '';
		grid.appendChild(h('button', { type: 'button', class: 'ksl-card ksl-new', onclick: createSlider },
			h('span', { class: 'ksl-new-plus' }, icon('plus-alt2')), h('strong', null, __( 'New slider', 'kaosslider' )), h('small', null, __( 'Start from a blank canvas', 'kaosslider' ))));

		var q = query.trim().toLowerCase();
		var list = items.filter(function (s) { return !q || s.title.toLowerCase().indexOf(q) > -1 || String(s.id) === q || (s.alias || '').indexOf(q) > -1; });
		list.forEach(function (s) { grid.appendChild(card(s)); });
		if (q && !list.length) {
			grid.appendChild(h('p', { class: 'ksl-empty' }, sprintf( __( 'No slider matches "%s".', 'kaosslider' ), query )));
		}
		fitThumbs();
	}

	function card(s) {
		var sc = '[kaosslider id="' + s.id + '"]';
		loadCss(s.fontCss);
		var thumbInner = h('div', { class: 'ksl-thumb-inner', html: s.preview || '' }, s.previewCss ? h('style', null, s.previewCss) : null);
		var act = function (name, label, fn, cls) {
			return h('button', { type: 'button', class: 'ksl-icon-btn' + (cls ? ' ' + cls : ''), title: label, 'aria-label': label, onclick: function (e) { e.preventDefault(); e.stopPropagation(); fn(s, e.currentTarget); } }, icon(name));
		};
		var go = function () { window.location.href = editUrl(s.id); };
		var thumb = h('div', {
			class: 'ksl-thumb', role: 'link', tabindex: '0', 'aria-label': sprintf( __( 'Edit %s', 'kaosslider' ), s.title ),
			onclick: go,
			onkeydown: function (e) { if (e.key === 'Enter') { go(); } }
		},
			thumbInner,
			h('span', { class: 'ksl-badge' }, s.type === 'carousel' ? __( 'Carousel', 'kaosslider' ) : __( 'Slider', 'kaosslider' )),
			h('span', { class: 'ksl-hover' },
				h('span', { class: 'ksl-edit' }, icon('edit'), __( 'Edit', 'kaosslider' )),
				h('span', { class: 'ksl-actions' },
					act('visibility', __( 'Preview on the site', 'kaosslider' ), function (x) { window.open(x.previewUrl, '_blank'); }),
					act('admin-page', __( 'Duplicate', 'kaosslider' ), duplicateSlider),
					act('download', __( 'Export JSON', 'kaosslider' ), exportSlider),
					act('trash', __( 'Delete', 'kaosslider' ), deleteSlider, 'is-danger'))));
		var date = new Date(s.modified).toLocaleString(document.documentElement.lang || undefined, { dateStyle: 'short', timeStyle: 'short' });
		return h('div', { class: 'ksl-card', 'data-id': s.id },
			thumb,
			h('div', { class: 'ksl-meta' },
				h('a', { class: 'ksl-name', href: editUrl(s.id), title: s.title }, s.title),
				h('div', { class: 'ksl-sub' }, sprintf( _n( '%d slide', '%d slides', s.slideCount, 'kaosslider' ), s.slideCount ) + ' · ' + date),
				h('button', {
					type: 'button', class: 'ksl-code', title: __( 'Click to copy', 'kaosslider' ),
					onclick: function (e) {
						var b = e.currentTarget;
						navigator.clipboard.writeText(sc).then(function () {
							b.textContent = __( 'Copied!', 'kaosslider' );
							setTimeout(function () { b.textContent = sc; }, 1200);
						});
					}
				}, sc)));
	}

	/* Le miniature sono la slide alla sua dimensione reale, ridotta per coprire il riquadro. */
	function fitThumbs() {
		Array.prototype.forEach.call(app.querySelectorAll('.ksl-thumb'), function (t) {
			var el = t.querySelector('.ks-thumb');
			if (!el) { return; }
			var w = +el.getAttribute('data-w') || 1240;
			var hh = +el.getAttribute('data-h') || 700;
			var s = Math.max(t.clientWidth / w, t.clientHeight / hh);
			el.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
		});
	}
	window.addEventListener('resize', fitThumbs);

	function load() {
		return api('/sliders?cards=1').then(function (list) {
			items = list;
			render();
		})['catch'](function (e) {
			app.innerHTML = '';
			app.appendChild(h('div', { class: 'ksl-error' }, sprintf( __( 'Unable to load the sliders: %s', 'kaosslider' ), e.message )));
		});
	}

	/* ---------- Azioni ---------- */

	function createSlider() {
		var name = h('input', { type: 'text', class: 'ksl-input', value: __( 'New slider', 'kaosslider' ), required: true });
		var type = 'slider';
		var seg = h('div', { class: 'ksl-seg' });
		[['slider', __( 'Slider / Hero', 'kaosslider' ), __( 'Full-width slides, one at a time', 'kaosslider' )], ['carousel', __( 'Carousel', 'kaosslider' ), __( 'Several cards side by side that scroll', 'kaosslider' )]].forEach(function (o) {
			seg.appendChild(h('button', {
				type: 'button', class: o[0] === type ? 'is-active' : '',
				onclick: function (e) {
					type = o[0];
					Array.prototype.forEach.call(seg.children, function (b) { b.classList.toggle('is-active', b === e.currentTarget); });
				}
			}, h('strong', null, o[1]), h('small', null, o[2])));
		});
		/* Altezza: schermo intero (solo slider) o personalizzata in px. */
		var heightMode = 'fullscreen';
		var heightSeg = h('div', { class: 'ksl-seg' });
		var heightInput = h('input', { type: 'number', class: 'ksl-input', min: '100', max: '4000', step: '10', value: '600' });
		var heightRow = h('label', { class: 'ksl-label ksl-height-row' }, __( 'Height in px (desktop)', 'kaosslider' ), heightInput);
		var heightNote = h('p', { class: 'ksl-note' });
		var renderHeight = function () {
			heightSeg.innerHTML = '';
			var opts = type === 'carousel'
				? [['fixed', __( 'Card height', 'kaosslider' ), __( 'Height of each card', 'kaosslider' )]]
				: [['fullscreen', __( 'Fullscreen', 'kaosslider' ), __( 'Takes up the full height of the window', 'kaosslider' )], ['fixed', _x( 'Custom', 'height', 'kaosslider' ), __( 'Choose the height in px yourself', 'kaosslider' )]];
			if (type === 'carousel') { heightMode = 'fixed'; }
			opts.forEach(function (o) {
				heightSeg.appendChild(h('button', {
					type: 'button', class: o[0] === heightMode ? 'is-active' : '',
					onclick: function () { heightMode = o[0]; renderHeight(); }
				}, h('strong', null, o[1]), h('small', null, o[2])));
			});
			heightSeg.style.gridTemplateColumns = opts.length === 1 ? '1fr' : '1fr 1fr';
			heightRow.style.display = heightMode === 'fixed' ? '' : 'none';
			if (type === 'carousel' && heightInput.value === '600') { heightInput.value = '500'; }
		};
		Array.prototype.forEach.call(seg.children, function (b) { b.addEventListener('click', function () { setTimeout(renderHeight); }); });

		var responsive = h('input', { type: 'checkbox', checked: true });
		var respNote = h('small', null, __( 'On smaller screens layers and texts shrink proportionally. Recommended.', 'kaosslider' ));
		responsive.addEventListener('change', function () {
			respNote.textContent = responsive.checked
				? __( 'On smaller screens layers and texts shrink proportionally. Recommended.', 'kaosslider' )
				: __( 'Real px sizes on every screen: on small ones, whatever goes beyond the slide is cut off.', 'kaosslider' );
		});
		var respRow = h('label', { class: 'ksl-radio' }, responsive, h('span', null, h('strong', null, __( 'Responsive', 'kaosslider' )), respNote));

		renderHeight();
		var body = h('div', null,
			h('label', { class: 'ksl-label' }, __( 'Name', 'kaosslider' ), name),
			h('div', { class: 'ksl-label' }, __( 'Type', 'kaosslider' )), seg,
			h('div', { class: 'ksl-label ksl-mt' }, __( 'Height', 'kaosslider' )), heightSeg, heightRow, heightNote,
			h('div', { class: 'ksl-label ksl-mt' }, __( 'Adaptation', 'kaosslider' )), respRow);
		modal(__( 'New slider', 'kaosslider' ), body, [{ label: __( 'Cancel', 'kaosslider' ), value: null }, { label: __( 'Create and open the editor', 'kaosslider' ), value: true, primary: true, submit: true }]).then(function (ok) {
			if (!ok) { return; }
			var hpx = Math.max(100, Math.min(4000, parseInt(heightInput.value, 10) || 600));
			api('/sliders', { method: 'POST', body: { title: name.value } }).then(function (s) {
				var d = s.data;
				d.settings.responsive = responsive.checked;
				if (type === 'carousel') {
					d.settings.type = 'carousel';
					d.settings.height = 'fixed';
					d.settings.grid = { desktop: { w: 400, h: hpx }, tablet: { w: 400, h: hpx }, mobile: { w: 400, h: hpx } };
				} else {
					d.settings.height = heightMode;
					if (heightMode === 'fixed') {
						d.settings.grid.desktop.h = hpx;
						d.settings.grid.tablet.h = hpx;
						d.settings.grid.mobile.h = Math.round(hpx * 1.2);
					}
				}
				return api('/sliders/' + s.id, { method: 'POST', body: { data: d } });
			}).then(function (s) {
				window.location.href = editUrl(s.id);
			})['catch'](function (err) { toast(err.message, 'error'); });
		});
	}

	function duplicateSlider(s) {
		api('/sliders/' + s.id + '/duplicate', { method: 'POST' }).then(function () {
			toast(__( 'Slider duplicated', 'kaosslider' ), 'ok');
			load();
		})['catch'](function (err) { toast(err.message, 'error'); });
	}

	function exportSlider(s) {
		api('/sliders/' + s.id).then(function (full) {
			var blob = new Blob([JSON.stringify({ kaosslider: C.version, title: full.title, data: full.data }, null, 2)], { type: 'application/json' });
			var a = h('a', { href: URL.createObjectURL(blob), download: 'kaosslider-' + (full.alias || full.id) + '.json' });
			document.body.appendChild(a);
			a.click();
			setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
		})['catch'](function (err) { toast(err.message, 'error'); });
	}

	function deleteSlider(s) {
		confirmModal(__( 'Delete the slider?', 'kaosslider' ), sprintf( __( '"%s" will be deleted. Pages that use it will no longer show it.', 'kaosslider' ), s.title ), __( 'Delete', 'kaosslider' )).then(function (ok) {
			if (!ok) { return; }
			api('/sliders/' + s.id, { method: 'DELETE' }).then(function () {
				toast(__( 'Slider deleted', 'kaosslider' ), 'ok');
				load();
			})['catch'](function (err) { toast(err.message, 'error'); });
		});
	}

	function openSettings() {
		api('/settings').then(function (st) {
			var mode = st.fontMode;
			var opts = [
				['local', __( 'Hosted on the site (recommended)', 'kaosslider' ), __( 'The font files are downloaded once to your server: visitors do not contact any external service. Ideal for GDPR.', 'kaosslider' )],
				['bunny', 'Bunny Fonts', __( 'European CDN without tracking, same catalogue. No files on the server.', 'kaosslider' )],
				['google', __( 'Google Fonts direct', 'kaosslider' ), __( 'Not recommended in the EU: the IP address of visitors is sent to Google.', 'kaosslider' )]
			];
			var list = h('div', { class: 'ksl-radio-list' }, opts.map(function (o) {
				return h('label', { class: 'ksl-radio' },
					h('input', { type: 'radio', name: 'ksl-font-mode', value: o[0], checked: o[0] === mode ? true : null }),
					h('span', null, h('strong', null, o[1]), h('small', null, o[2])));
			}));
			var body = h('div', null, h('div', { class: 'ksl-label' }, __( 'Web font loading', 'kaosslider' )), list);
			return modal(__( 'Settings', 'kaosslider' ), body, [{ label: __( 'Cancel', 'kaosslider' ), value: null }, { label: __( 'Save', 'kaosslider' ), value: true, primary: true, submit: true }]).then(function (ok) {
				if (!ok) { return; }
				var sel = body.querySelector('input[name="ksl-font-mode"]:checked');
				return api('/settings', { method: 'POST', body: { fontMode: sel ? sel.value : 'local' } }).then(function () {
					toast(__( 'Settings saved', 'kaosslider' ), 'ok');
					load();
				});
			});
		})['catch'](function (err) { toast(err.message, 'error'); });
	}

	document.getElementById('ksl-import-file').addEventListener('change', function (e) {
		var file = e.target.files[0];
		if (!file) { return; }
		var reader = new FileReader();
		reader.onload = function () {
			var json;
			try {
				json = JSON.parse(reader.result);
			} catch (err) {
				toast(__( 'The file is not valid JSON.', 'kaosslider' ), 'error');
				return;
			}
			api('/import', { method: 'POST', body: json }).then(function () {
				toast(__( 'Imported slider', 'kaosslider' ), 'ok');
				load();
			})['catch'](function (err) { toast(err.message, 'error'); });
		};
		reader.readAsText(file);
		e.target.value = '';
	});

	load();
})();
