<?php
/**
 * Validazione dei dati dello slider: ogni chiave è in whitelist e tipizzata.
 * Tutto ciò che arriva dall'editor passa di qui prima di essere salvato o renderizzato.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Sanitizer {

	const DEVICES = array( 'desktop', 'tablet', 'mobile' );

	const ANIM_EFFECTS = array(
		'none', 'fade', 'fadeUp', 'fadeDown', 'fadeLeft', 'fadeRight', 'zoomIn', 'zoomOut',
		'rotateIn', 'blurIn', 'maskUp', 'maskLeft', 'flipUp', 'revealUp', 'skewIn', 'dropIn',
		'bounceIn', 'elasticUp', 'lightSpeed', 'rollIn', 'swingIn', 'zoomBlur', 'scaleX', 'scaleY', 'rotateY', 'typewriter', 'custom', 'draw',
	);
	const TRANSITIONS  = array(
		'fade', 'fadeBlack', 'slide', 'slideV', 'slideOver', 'slideReveal', 'parallax', 'zoom', 'zoomOut', 'zoomBlur', 'blur',
		'wipe', 'wipeV', 'curtain', 'curtainH', 'circle', 'diamond', 'cube', 'flip', 'flipV', 'stripsV', 'stripsH', 'blinds', 'mosaic', 'random',
	);
	const EASINGS      = array( 'linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'back', 'expo' );
	const LOOPS        = array( 'none', 'pulse', 'float', 'rotate', 'swing', 'blink' );

	// Limiti di sicurezza contro dati enormi (es. un file di import manomesso).
	const MAX_SLIDES = 100;
	const MAX_LAYERS = 200;

	public static function slider( $data ) {
		$data     = is_array( $data ) ? $data : array();
		$settings = isset( $data['settings'] ) && is_array( $data['settings'] ) ? $data['settings'] : array();
		$slides   = isset( $data['slides'] ) && is_array( $data['slides'] ) ? array_slice( array_values( $data['slides'] ), 0, self::MAX_SLIDES ) : array();

		$clean_slides = array();
		foreach ( $slides as $slide ) {
			if ( is_array( $slide ) ) {
				$clean_slides[] = self::slide( $slide );
			}
		}
		if ( ! $clean_slides ) {
			$clean_slides[] = self::slide( KaosSlider_Store::default_slide() );
		}

		return array(
			'version'  => 1,
			'settings' => self::settings( $settings ),
			'slides'   => $clean_slides,
		);
	}

	public static function settings( $s ) {
		$d   = KaosSlider_Store::default_settings();
		$out = array(
			'type'         => self::enum( $s, 'type', array( 'slider', 'carousel' ), $d['type'] ),
			'height'       => self::enum( $s, 'height', array( 'fullscreen', 'fixed' ), $d['height'] ),
			'offset'       => self::num( $s, 'offset', $d['offset'], 0, 2000 ),
			'fullWidth'    => self::bool( $s, 'fullWidth', $d['fullWidth'] ),
			'grid'         => array(),
			'transition'   => self::enum( $s, 'transition', self::TRANSITIONS, $d['transition'] ),
			'responsive'   => self::bool( $s, 'responsive', true ),
			'parallax'     => self::bool( $s, 'parallax', false ),
			'parallaxStrength' => self::num( $s, 'parallaxStrength', 30, 0, 100 ),
			'scrollParallax' => self::bool( $s, 'scrollParallax', false ),
			'speed'        => self::num( $s, 'speed', $d['speed'], 0, 10000 ),
			'autoplay'     => self::bool( $s, 'autoplay', $d['autoplay'] ),
			'delay'        => self::num( $s, 'delay', $d['delay'], 500, 120000 ),
			'pauseOnHover' => self::bool( $s, 'pauseOnHover', $d['pauseOnHover'] ),
			'loop'         => self::bool( $s, 'loop', $d['loop'] ),
			'arrows'       => self::bool( $s, 'arrows', $d['arrows'] ),
			'bullets'      => self::bool( $s, 'bullets', $d['bullets'] ),
			'progress'     => self::bool( $s, 'progress', $d['progress'] ),
			'navColor'     => self::color( $s, 'navColor', $d['navColor'] ),
			'swipe'        => self::bool( $s, 'swipe', $d['swipe'] ),
			'keyboard'     => self::bool( $s, 'keyboard', $d['keyboard'] ),
			'perView'      => array(),
			'gap'          => self::num( $s, 'gap', $d['gap'], 0, 400 ),
			'carouselStyle' => self::enum( $s, 'carouselStyle', array( 'flat', 'coverflow', 'zoom' ), 'flat' ),
			'scrollVideo'  => self::bool( $s, 'scrollVideo', false ),
			'scrollLength' => self::num( $s, 'scrollLength', 300, 150, 1000 ),
			'bgColor'      => self::paint( $s, 'bgColor', $d['bgColor'] ),
		);
		$grid = isset( $s['grid'] ) && is_array( $s['grid'] ) ? $s['grid'] : array();
		$pv   = isset( $s['perView'] ) && is_array( $s['perView'] ) ? $s['perView'] : array();
		foreach ( self::DEVICES as $dev ) {
			$g                    = isset( $grid[ $dev ] ) && is_array( $grid[ $dev ] ) ? $grid[ $dev ] : array();
			$out['grid'][ $dev ]  = array(
				'w' => self::num( $g, 'w', $d['grid'][ $dev ]['w'], 200, 4000 ),
				'h' => self::num( $g, 'h', $d['grid'][ $dev ]['h'], 100, 4000 ),
			);
			$out['perView'][ $dev ] = self::num( $pv, $dev, $d['perView'][ $dev ], 1, 8 );
		}
		return $out;
	}

	public static function slide( $s ) {
		$d  = KaosSlider_Store::default_slide();
		$bg = isset( $s['bg'] ) && is_array( $s['bg'] ) ? $s['bg'] : array();

		$layers = array();
		if ( isset( $s['layers'] ) && is_array( $s['layers'] ) ) {
			foreach ( array_slice( array_values( $s['layers'] ), 0, self::MAX_LAYERS ) as $layer ) {
				if ( is_array( $layer ) ) {
					$layers[] = self::layer( $layer );
				}
			}
		}

		$tr = isset( $s['transition'] ) && is_array( $s['transition'] ) ? $s['transition'] : array();

		return array(
			'id'       => self::id( $s, 'id', $d['id'] ),
			'transition' => array(
				'effect'   => self::enum( $tr, 'effect', array_merge( array( 'default' ), self::TRANSITIONS ), 'default' ),
				'duration' => self::num( $tr, 'duration', 0, 0, 10000 ),
				'easing'   => self::enum( $tr, 'easing', array_merge( array( 'default' ), self::EASINGS ), 'default' ),
				'slices'   => self::num( $tr, 'slices', 0, 0, 40 ),
			),
			'name'     => self::text( $s, 'name', 'Slide' ),
			'hidden'   => self::bool( $s, 'hidden', false ),
			'duration' => self::num( $s, 'duration', 0, 0, 120000 ),
			'bg'       => array(
				'type'           => self::enum( $bg, 'type', array( 'color', 'image', 'video' ), 'color' ),
				'color'          => self::paint( $bg, 'color', $d['bg']['color'] ),
				'image'          => self::url( $bg, 'image' ),
				'size'           => self::enum( $bg, 'size', array( 'cover', 'contain', 'auto', '100% auto', 'auto 100%', '100% 100%' ), 'cover' ),
				'repeat'         => self::enum( $bg, 'repeat', array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' ), 'no-repeat' ),
				'position'       => self::enum( $bg, 'position', self::positions(), 'center center' ),
				'kenburns'       => self::enum( $bg, 'kenburns', array( 'none', 'in', 'out', 'left', 'right' ), 'none' ),
				'videoSource'    => self::enum( $bg, 'videoSource', array( 'mp4', 'youtube', 'vimeo' ), 'mp4' ),
				'video'          => self::url( $bg, 'video' ),
				'videoAlt'       => self::url( $bg, 'videoAlt' ),
				'poster'         => self::url( $bg, 'poster' ),
				'overlayColor'   => self::paint( $bg, 'overlayColor', '#000000' ),
				'overlayOpacity' => self::num( $bg, 'overlayOpacity', 0, 0, 1 ),
				'parallax'       => self::num( $bg, 'parallax', 0, 0, 10 ),
			),
			'layers'   => $layers,
			'fx'       => self::fx( isset( $s['fx'] ) && is_array( $s['fx'] ) ? $s['fx'] : array() ),
		);
	}

	/**
	 * Effetto animato su canvas: neve, pioggia, stelle, bolle, coriandoli, rete di particelle, lucciole.
	 */
	public static function fx( $f ) {
		return array(
			'type'        => self::enum( $f, 'type', array( 'none', 'snow', 'rain', 'stars', 'bubbles', 'confetti', 'network', 'fireflies', 'fluid', 'rays', 'morph', 'panorama', 'liquid' ), 'none' ),
			'intensity'   => self::num( $f, 'intensity', 1, 0, 5 ),
			'x'           => self::num( $f, 'x', 50, 0, 100 ),
			'y'           => self::num( $f, 'y', 0, 0, 100 ),
			'text'        => isset( $f['text'] ) && is_string( $f['text'] ) ? mb_substr( sanitize_text_field( $f['text'] ), 0, 200 ) : 'KAOS|SLIDER|♥',
			'image'       => self::url( $f, 'image' ),
			'interval'    => self::num( $f, 'interval', 4, 1, 60 ),
			'auto'        => self::bool( $f, 'auto', true ),
			'font'        => self::font( $f, 'font' ),
			'color'       => self::colors( $f, 'color', '#ffffff' ),
			'count'       => self::num( $f, 'count', 120, 5, 800 ),
			'size'        => self::num( $f, 'size', 3, 0.5, 30 ),
			'speed'       => self::num( $f, 'speed', 1, 0.1, 6 ),
			'opacity'     => self::num( $f, 'opacity', 0.8, 0.05, 1 ),
			'wind'        => self::num( $f, 'wind', 0, -5, 5 ),
			'interactive' => self::bool( $f, 'interactive', true ),
			'front'       => self::bool( $f, 'front', false ),
		);
	}

	/**
	 * Uno o più colori separati da virgola (es. per i coriandoli), oppure "multi".
	 */
	private static function colors( $arr, $key, $default ) {
		if ( ! isset( $arr[ $key ] ) || ! is_string( $arr[ $key ] ) ) {
			return $default;
		}
		if ( 'multi' === trim( $arr[ $key ] ) ) {
			return 'multi';
		}
		$out = array();
		foreach ( array_slice( explode( ',', $arr[ $key ] ), 0, 8 ) as $c ) {
			$v = self::color( array( 'c' => trim( $c ) ), 'c', '' );
			if ( $v ) {
				$out[] = $v;
			}
		}
		return $out ? implode( ',', $out ) : $default;
	}

	public static function layer( $l ) {
		$type  = self::enum( $l, 'type', array( 'text', 'button', 'image', 'shape', 'draw', 'film' ), 'text' );
		$draw  = isset( $l['draw'] ) && is_array( $l['draw'] ) ? $l['draw'] : array();
		$film  = isset( $l['film'] ) && is_array( $l['film'] ) ? $l['film'] : array();
		$imgs  = array();
		if ( isset( $film['images'] ) && is_array( $film['images'] ) ) {
			foreach ( array_slice( $film['images'], 0, 40 ) as $u ) {
				if ( is_string( $u ) && esc_url_raw( $u ) ) {
					$imgs[] = esc_url_raw( $u );
				}
			}
		}
		$style = isset( $l['style'] ) && is_array( $l['style'] ) ? $l['style'] : array();
		$anim  = isset( $l['anim'] ) && is_array( $l['anim'] ) ? $l['anim'] : array();
		$in    = isset( $anim['in'] ) && is_array( $anim['in'] ) ? $anim['in'] : array();
		$outa  = isset( $anim['out'] ) && is_array( $anim['out'] ) ? $anim['out'] : array();
		$resp  = isset( $l['resp'] ) && is_array( $l['resp'] ) ? $l['resp'] : array();

		$clean_resp = array();
		foreach ( self::DEVICES as $dev ) {
			// resp() restituisce oggetti: vanno accettati anche quando i dati sono già stati validati (es. duplica).
			$r = isset( $resp[ $dev ] ) && ( is_array( $resp[ $dev ] ) || is_object( $resp[ $dev ] ) ) ? (array) $resp[ $dev ] : array();
			// Desktop ha sempre tutti i valori; tablet/mobile solo gli override.
			$clean_resp[ $dev ] = self::resp( $r, 'desktop' === $dev );
		}

		return array(
			'id'      => self::id( $l, 'id', 'l' . wp_generate_password( 6, false, false ) ),
			'type'    => $type,
			'draw'    => array(
				'mode'     => self::enum( $draw, 'mode', array( 'shape', 'text' ), 'shape' ),
				'shape'    => self::enum( $draw, 'shape', array_keys( self::draw_shapes() ), 'underline' ),
				'stroke'   => self::color( $draw, 'stroke', '#ffffff' ),
				'width'    => self::num( $draw, 'width', 4, 0.5, 60 ),
				'chalk'    => self::bool( $draw, 'chalk', false ),
				'fillAfter' => self::bool( $draw, 'fillAfter', true ),
			),
			'film'    => array(
				'images'      => $imgs,
				'speed'       => self::num( $film, 'speed', 40, 2, 600 ),
				'direction'   => self::enum( $film, 'direction', array( 'left', 'right' ), 'left' ),
				'gap'         => self::num( $film, 'gap', 12, 0, 200 ),
				'perforations' => self::bool( $film, 'perforations', false ),
				'grayscale'   => self::bool( $film, 'grayscale', false ),
				'pauseHover'  => self::bool( $film, 'pauseHover', true ),
			),
			'name'    => self::text(
				$l,
				'name',
				array(
					'text'   => 'Testo',
					'button' => 'Bottone',
					'image'  => 'Immagine',
					'shape'  => 'Forma',
					'draw'   => 'Disegno',
					'film'   => 'Pellicola',
				)[ $type ] ?? 'Livello'
			),
			'hidden'  => self::bool( $l, 'hidden', false ),
			'locked'  => self::bool( $l, 'locked', false ),
			'tag'     => self::enum( $l, 'tag', array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span' ), 'div' ),
			'content' => isset( $l['content'] ) && is_string( $l['content'] ) ? wp_kses_post( $l['content'] ) : '',
			'link'    => self::url( $l, 'link' ),
			'target'  => self::enum( $l, 'target', array( '_self', '_blank' ), '_self' ),
			'image'   => self::url( $l, 'image' ),
			'alt'     => self::text( $l, 'alt', '' ),
			'parallax' => self::num( $l, 'parallax', 0, 0, 10 ),
			'resp'    => $clean_resp,
			'style'   => array_merge(
				array(
					'color'         => self::paint( $style, 'color', '#ffffff' ),
					'bg'            => self::paint( $style, 'bg', 'transparent' ),
					'fontFamily'    => self::font( $style, 'fontFamily' ),
					'gfont'         => isset( $style['gfont'] ) && is_string( $style['gfont'] ) && preg_match( '/^[A-Za-z0-9 ]{1,60}$/', $style['gfont'] ) ? $style['gfont'] : '',
					'fontWeight'    => self::enum( $style, 'fontWeight', array( '', '100', '200', '300', '400', '500', '600', '700', '800', '900' ), '' ),
					'italic'        => self::bool( $style, 'italic', false ),
					'uppercase'     => self::bool( $style, 'uppercase', false ),
					'lineHeight'    => self::num( $style, 'lineHeight', 1.2, 0.5, 4 ),
					'letterSpacing' => self::num( $style, 'letterSpacing', 0, -20, 50 ),
					'padV'          => self::num( $style, 'padV', 0, 0, 500 ),
					'padH'          => self::num( $style, 'padH', 0, 0, 500 ),
					'radius'        => self::num( $style, 'radius', 0, 0, 1000 ),
					'radiusLinked'  => self::bool( $style, 'radiusLinked', true ),
					'radiusTL'      => self::num( $style, 'radiusTL', 0, 0, 1000 ),
					'radiusTR'      => self::num( $style, 'radiusTR', 0, 0, 1000 ),
					'radiusBR'      => self::num( $style, 'radiusBR', 0, 0, 1000 ),
					'radiusBL'      => self::num( $style, 'radiusBL', 0, 0, 1000 ),
					'borderWidth'   => self::num( $style, 'borderWidth', 0, 0, 50 ),
					'borderColor'   => self::color( $style, 'borderColor', '#ffffff' ),
					'borderOpacity' => self::num( $style, 'borderOpacity', 1, 0, 1 ),
					'borderStyle'   => self::enum( $style, 'borderStyle', array( 'solid', 'dashed', 'dotted', 'double' ), 'solid' ),
					'strokeWidth'   => self::num( $style, 'strokeWidth', 0, 0, 30 ),
					'strokeColor'   => self::color( $style, 'strokeColor', '#000000' ),
					'strokeOpacity' => self::num( $style, 'strokeOpacity', 1, 0, 1 ),
					'strokeOnly'    => self::bool( $style, 'strokeOnly', false ),
					'glass'         => self::bool( $style, 'glass', false ),
					'glassBlur'     => self::num( $style, 'glassBlur', 30, 0, 150 ),
					'glassSaturate' => self::num( $style, 'glassSaturate', 180, 50, 300 ),
					'glassBright'   => self::num( $style, 'glassBright', 108, 50, 150 ),
					'glassEdge'     => self::num( $style, 'glassEdge', 45, 0, 100 ),
					'glassShine'    => self::num( $style, 'glassShine', 25, 0, 100 ),
					'glassGrain'    => self::num( $style, 'glassGrain', 0, 0, 100 ),
					'glassDepth'    => self::num( $style, 'glassDepth', 30, 0, 100 ),
					'opacity'       => self::num( $style, 'opacity', 1, 0, 1 ),
					'hoverColor'    => self::paint( $style, 'hoverColor', '' ),
					'hoverBg'       => self::paint( $style, 'hoverBg', '' ),
					'objectFit'     => self::enum( $style, 'objectFit', array( 'cover', 'contain', 'fill' ), 'cover' ),
					'objectPosition' => self::enum( $style, 'objectPosition', self::positions(), 'center center' ),
				),
				// "shadow": lettere per testi e bottoni, riquadro per gli altri livelli; "boxShadow": riquadro di testi e bottoni.
				self::shadow_fields( $style, 'shadow' ),
				self::shadow_fields( $style, 'boxShadow' )
			),
			'anim'    => array(
				'in'   => array(
					'effect'   => self::enum( $in, 'effect', self::ANIM_EFFECTS, 'fadeUp' ),
					'duration' => self::num( $in, 'duration', 900, 0, 20000 ),
					'delay'    => self::num( $in, 'delay', 300, 0, 120000 ),
					'easing'   => self::enum( $in, 'easing', self::EASINGS, 'easeOut' ),
					'split'    => self::enum( $in, 'split', array( 'none', 'words', 'chars', 'lines' ), 'none' ),
					'stagger'  => self::num( $in, 'stagger', 60, 0, 2000 ),
					'custom'   => self::custom_anim( $in ),
				),
				'out'  => array(
					'effect'   => self::enum( $outa, 'effect', self::ANIM_EFFECTS, 'none' ),
					'duration' => self::num( $outa, 'duration', 500, 0, 20000 ),
					'at'       => self::num( $outa, 'at', 0, 0, 120000 ),
					'easing'   => self::enum( $outa, 'easing', self::EASINGS, 'easeIn' ),
					'custom'   => self::custom_anim( $outa ),
				),
				'loop' => self::enum( $anim, 'loop', self::LOOPS, 'none' ),
			),
		);
	}

	/**
	 * Ombra: preimpostata (morbida/netta) o personalizzata con colore, opacità, dimensione, densità, distanza e direzione.
	 */
	private static function shadow_fields( $style, $p ) {
		return array(
			$p              => self::enum( $style, $p, array( 'none', 'soft', 'strong', 'custom' ), 'none' ),
			$p . 'Color'    => self::color( $style, $p . 'Color', '#000000' ),
			$p . 'Opacity'  => self::num( $style, $p . 'Opacity', 0.5, 0, 1 ),
			$p . 'Blur'     => self::num( $style, $p . 'Blur', 20, 0, 200 ),
			$p . 'Density'  => self::num( $style, $p . 'Density', 0, 0, 100 ),
			$p . 'Distance' => self::num( $style, $p . 'Distance', 8, 0, 300 ),
			$p . 'Angle'    => self::num( $style, $p . 'Angle', 90, 0, 360 ),
		);
	}

	/**
	 * Effetto di animazione personalizzato: stato di partenza (entrata) o di arrivo (uscita).
	 */
	public static function custom_anim( $a ) {
		$c = isset( $a['custom'] ) && is_array( $a['custom'] ) ? $a['custom'] : array();
		return array(
			'x'       => self::num( $c, 'x', 0, -3000, 3000 ),
			'y'       => self::num( $c, 'y', 60, -3000, 3000 ),
			'scale'   => self::num( $c, 'scale', 1, 0, 5 ),
			'rotate'  => self::num( $c, 'rotate', 0, -720, 720 ),
			'rotateX' => self::num( $c, 'rotateX', 0, -360, 360 ),
			'rotateY' => self::num( $c, 'rotateY', 0, -360, 360 ),
			'skewX'   => self::num( $c, 'skewX', 0, -80, 80 ),
			'opacity' => self::num( $c, 'opacity', 0, 0, 1 ),
			'blur'    => self::num( $c, 'blur', 0, 0, 50 ),
			'origin'  => self::enum( $c, 'origin', self::positions(), 'center center' ),
		);
	}

	/**
	 * Valori responsive di un layer. Per tablet/mobile i valori assenti ereditano dal device superiore.
	 */
	public static function resp( $r, $full ) {
		$spec = array(
			'x'    => array( 'num', 50, -50, 150 ),
			'y'    => array( 'num', 50, -50, 150 ),
			'w'    => array( 'num', 0, 0, 4000 ),
			'h'    => array( 'num', 0, 0, 4000 ),
			'fs'   => array( 'num', 32, 4, 400 ),
			'ax'   => array( 'enum', 'center', array( 'left', 'center', 'right' ) ),
			'ay'   => array( 'enum', 'middle', array( 'top', 'middle', 'bottom' ) ),
			'ta'   => array( 'enum', 'center', array( 'left', 'center', 'right' ) ),
			'hide' => array( 'bool', false ),
			'fit'  => array( 'enum', 'custom', array( 'custom', 'fullw', 'fullh', 'cover', 'contain' ) ),
		);
		$out  = array();
		foreach ( $spec as $key => $def ) {
			if ( ! $full && ! array_key_exists( $key, $r ) ) {
				continue;
			}
			switch ( $def[0] ) {
				case 'num':
					$out[ $key ] = self::num( $r, $key, $def[1], $def[2], $def[3] );
					break;
				case 'enum':
					$out[ $key ] = self::enum( $r, $key, $def[2], $def[1] );
					break;
				case 'bool':
					$out[ $key ] = self::bool( $r, $key, $def[1] );
					break;
			}
		}
		return (object) $out; // Oggetto: in JSON resta {} anche se vuoto.
	}

	/* ---------- Primitive ---------- */

	private static function num( $arr, $key, $default, $min, $max ) {
		if ( ! isset( $arr[ $key ] ) || ! is_numeric( $arr[ $key ] ) ) {
			return $default;
		}
		$v = (float) $arr[ $key ];
		$v = max( $min, min( $max, $v ) );
		return ( floor( $v ) == $v ) ? (int) $v : round( $v, 3 ); // phpcs:ignore Universal.Operators.StrictComparisons
	}

	private static function bool( $arr, $key, $default ) {
		if ( ! isset( $arr[ $key ] ) ) {
			return $default;
		}
		return filter_var( $arr[ $key ], FILTER_VALIDATE_BOOLEAN );
	}

	private static function enum( $arr, $key, $allowed, $default ) {
		if ( isset( $arr[ $key ] ) && in_array( (string) $arr[ $key ], $allowed, true ) ) {
			return (string) $arr[ $key ];
		}
		return $default;
	}

	private static function text( $arr, $key, $default ) {
		return isset( $arr[ $key ] ) && is_string( $arr[ $key ] ) ? sanitize_text_field( $arr[ $key ] ) : $default;
	}

	private static function id( $arr, $key, $default ) {
		if ( isset( $arr[ $key ] ) && is_string( $arr[ $key ] ) && preg_match( '/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/', $arr[ $key ] ) ) {
			return $arr[ $key ];
		}
		return $default;
	}

	private static function url( $arr, $key ) {
		return isset( $arr[ $key ] ) && is_string( $arr[ $key ] ) ? esc_url_raw( trim( $arr[ $key ] ) ) : '';
	}

	/**
	 * Colori CSS: hex, rgb(a), hsl(a), nomi, transparent e variabili (es. colori globali Elementor/Kadence).
	 */
	public static function color( $arr, $key, $default ) {
		if ( ! isset( $arr[ $key ] ) || ! is_string( $arr[ $key ] ) ) {
			return $default;
		}
		$v = trim( $arr[ $key ] );
		if ( '' === $v ) {
			return '';
		}
		if ( preg_match( '/^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%\/]+\)|hsla?\([\d\s.,%\/deg]+\)|[a-zA-Z]{3,20}|var\(--[\w-]+\))$/', $v ) ) {
			return $v;
		}
		return $default;
	}

	/**
	 * "Vernice": un colore oppure un gradiente CSS.
	 */
	public static function paint( $arr, $key, $default ) {
		if ( isset( $arr[ $key ] ) && is_string( $arr[ $key ] ) && self::is_gradient( $arr[ $key ] ) ) {
			$g = self::gradient( $arr[ $key ] );
			return '' !== $g ? $g : $default;
		}
		return self::color( $arr, $key, $default );
	}

	public static function is_gradient( $v ) {
		return is_string( $v ) && false !== stripos( $v, 'gradient(' );
	}

	/**
	 * Gradienti CSS (anche più livelli separati da virgola). Ammessi solo caratteri e funzioni sicuri:
	 * niente url(), punto e virgola, graffe o virgolette, così il valore può finire in <style> e style="".
	 */
	public static function gradient( $v ) {
		$v = trim( preg_replace( '/\s+/', ' ', (string) $v ) );
		if ( '' === $v || strlen( $v ) > 3000 ) {
			return '';
		}
		if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\(/i', $v ) ) {
			return '';
		}
		if ( preg_match( '/[^a-zA-Z0-9#%.,\s()\-\/]/', $v ) ) {
			return '';
		}
		$allowed = array(
			'linear-gradient', 'radial-gradient', 'conic-gradient',
			'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient',
			'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color-mix', 'var', 'calc',
		);
		preg_match_all( '/([a-zA-Z-]+)\s*\(/', $v, $m );
		foreach ( $m[1] as $fn ) {
			if ( ! in_array( strtolower( $fn ), $allowed, true ) ) {
				return '';
			}
		}
		if ( substr_count( $v, '(' ) !== substr_count( $v, ')' ) ) {
			return '';
		}
		return $v;
	}

	private static function font( $arr, $key ) {
		if ( ! isset( $arr[ $key ] ) || ! is_string( $arr[ $key ] ) ) {
			return '';
		}
		$v = trim( $arr[ $key ] );
		// Virgolette sempre chiuse: una stringa CSS aperta "mangerebbe" le regole successive.
		if ( preg_match( '/^(var\(--[\w-]+\)|[\w\s,\'"-]{1,120})$/u', $v ) && 0 === substr_count( $v, '"' ) % 2 && 0 === substr_count( $v, "'" ) % 2 ) {
			return $v;
		}
		return '';
	}

	/**
	 * Forme disponibili per i livelli disegno (da assets/data/draw-shapes.json, usato anche dall'editor).
	 */
	public static function draw_shapes() {
		static $shapes = null;
		if ( null === $shapes ) {
			$shapes = json_decode( (string) file_get_contents( KAOSSLIDER_DIR . 'assets/data/draw-shapes.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( ! is_array( $shapes ) ) {
				$shapes = array( 'underline' => array( 'label' => 'Sottolineatura', 'd' => 'M6 70 C 52 61, 118 79, 194 65' ) );
			}
		}
		return $shapes;
	}

	public static function positions() {
		return array(
			'left top', 'center top', 'right top',
			'left center', 'center center', 'right center',
			'left bottom', 'center bottom', 'right bottom',
		);
	}
}
