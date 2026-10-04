/* KaosSlider – blocco Gutenberg / Kadence */
(function (wp) {
	'use strict';

	var __ = wp.i18n.__;
	var _n = wp.i18n._n;
	var sprintf = wp.i18n.sprintf;

	var el = wp.element.createElement;
	var useState = wp.element.useState;
	var useEffect = wp.element.useEffect;
	var C = wp.components;
	var BE = wp.blockEditor;
	var cfg = window.KaosSliderBlock || {};

	// Marchio KaosSlider (assets/img/mark.svg): chevron arancio, "D" nel colore del testo
	var CHEV = '23.13,0 46.26,0 23.13,34.7 46.26,69.4 23.13,69.4 0,34.7';
	var logo = el('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 -32.62 134.64 134.64', width: 24, height: 24 },
		el('polygon', { points: CHEV, transform: 'translate(0 13.18) scale(.62)', fill: '#ff4d1f', opacity: 0.3 }),
		el('polygon', { points: CHEV, transform: 'translate(22 6.94) scale(.8)', fill: '#ff4d1f', opacity: 0.62 }),
		el('polygon', { points: CHEV, transform: 'translate(48 0)', fill: '#ff4d1f' }),
		el('path', { fill: 'currentColor', transform: 'translate(-61.39 -1.98)', d: 'M196.03,36.68c0,19.13-15.48,34.64-34.59,34.7l-11.56-17.35h11c.15,0,.3,0,.45,0,9.58,0,17.35-7.77,17.35-17.36s-7.77-17.37-17.35-17.37c-.24,0-.49,0-.73.02h-10.73l11.56-17.35c19.11.06,34.59,15.57,34.59,34.7Z' })
	);

	wp.blocks.registerBlockType('kaosslider/slider', {
		apiVersion: 3,
		title: 'KaosSlider',
		description: __( 'Inserts a slider or carousel made with KaosSlider.', 'kaosslider' ),
		category: 'media',
		icon: logo,
		keywords: ['slider', 'carosello', 'hero', 'kaos'],
		supports: { align: ['wide', 'full'], html: false },
		attributes: {
			sliderId: { type: 'integer', default: 0 },
			align: { type: 'string', default: 'full' }
		},

		edit: function (props) {
			var state = useState(null);
			var items = state[0];
			var setItems = state[1];
			var blockProps = BE.useBlockProps();

			useEffect(function () {
				wp.apiFetch({ path: '/kaosslider/v1/sliders' }).then(setItems)['catch'](function () { setItems([]); });
			}, []);

			var id = props.attributes.sliderId;
			var list = items || [];
			var current = list.filter(function (s) { return s.id === id; })[0];
			var options = [{ label: __( '— Choose a slider —', 'kaosslider' ), value: 0 }].concat(list.map(function (s) {
				return { label: s.title + ' (#' + s.id + ')', value: s.id };
			}));

			function picker() {
				return el(C.SelectControl, {
					label: __( 'Slider', 'kaosslider' ),
					value: id,
					options: options,
					onChange: function (v) { props.setAttributes({ sliderId: parseInt(v, 10) || 0 }); },
					__nextHasNoMarginBottom: true
				});
			}

			var body;
			if (items === null) {
				body = el(C.Spinner);
			} else if (!list.length) {
				body = el('p', null, __( 'You have not created any sliders yet.', 'kaosslider' ) + ' ', el('a', { href: cfg.adminUrl, target: '_blank' }, __( 'Create one ↗', 'kaosslider' )));
			} else {
				body = el('div', { style: { width: '100%', maxWidth: '420px' } },
					picker(),
					current ? el('p', { style: { marginTop: '10px' } },
						sprintf( _n( '%d slide', '%d slides', current.slideCount, 'kaosslider' ), current.slideCount ) + ' · ',
						el('a', { href: cfg.adminUrl + '&edit=' + current.id, target: '_blank' }, __( 'Edit slider ↗', 'kaosslider' ))) : null
				);
			}

			return el('div', blockProps,
				el(BE.InspectorControls, null,
					el(C.PanelBody, { title: 'KaosSlider' }, items === null ? el(C.Spinner) : picker())),
				el(C.Placeholder, {
					icon: logo,
					label: current ? sprintf( __( 'KaosSlider: %s', 'kaosslider' ), current.title ) : 'KaosSlider',
					instructions: current ? __( 'The animated slider is visible in the page preview.', 'kaosslider' ) : __( 'Choose which slider to show.', 'kaosslider' )
				}, body)
			);
		},

		save: function () {
			return null;
		}
	});
})(window.wp);
