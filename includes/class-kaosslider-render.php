<?php
/**
 * Rendering frontend: markup HTML dello slider, CSS dei livelli, shortcode e anteprima.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Render {

	const BP_TABLET = 1024;
	const BP_MOBILE = 767;

	const GL_FX = array( 'fluid', 'rays', 'morph', 'panorama', 'liquid' );

	private static $instance_count = 0;
	private static $printed_fonts  = array();

	public static function init() {
		add_shortcode( 'kaosslider', array( __CLASS__, 'shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ), 5 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register_assets' ), 5 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_css' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_preview' ) );
		add_action( 'admin_bar_menu', array( __CLASS__, 'admin_bar' ), 90 );
	}

	/**
	 * Pulsante "KaosSlider" nella barra di amministrazione (solo sul sito, solo per chi può modificare gli slider).
	 * Il menu con gli slider presenti nella pagina viene completato da kaosslider.js: la barra viene stampata
	 * prima del contenuto, quindi qui non si sa ancora quali slider ci saranno.
	 */
	public static function admin_bar( $bar ) {
		if ( is_admin() || ! current_user_can( kaosslider_capability() ) ) {
			return;
		}
		$bar->add_node(
			array(
				'id'    => 'kaosslider',
				// Testi per il menu compilato da kaosslider.js (così sul sito non serve caricare il sistema di traduzione JS).
				'title' => '<span class="ab-icon" aria-hidden="true"></span><span class="ab-label" data-edit="' . esc_attr( /* translators: %s: slider name. */ __( 'Edit: %s', 'kaosslider' ) ) . '" data-untitled="' . esc_attr( /* translators: %d: slider ID. */ __( 'Slider #%d', 'kaosslider' ) ) . '">KaosSlider</span>',
				'href'  => false,
				'meta'  => array(
					'class' => 'kaosslider-ab',
					'title' => __( 'Edit the sliders on this page', 'kaosslider' ),
				),
			)
		);
		$bar->add_node(
			array(
				'parent' => 'kaosslider',
				'id'     => 'kaosslider-all',
				'title'  => __( 'All sliders', 'kaosslider' ),
				'href'   => admin_url( 'admin.php?page=' . KaosSlider_Admin::SLUG ),
				'meta'   => array( 'class' => 'kaosslider-ab-all' ),
			)
		);
	}

	public static function register_assets() {
		if ( wp_style_is( 'kaosslider', 'registered' ) ) {
			return;
		}
		wp_register_style( 'kaosslider', KAOSSLIDER_URL . 'assets/css/kaosslider.css', array(), kaosslider_asset_ver( 'assets/css/kaosslider.css' ) );
		wp_register_script(
			'kaosslider-gl',
			KAOSSLIDER_URL . 'assets/js/kaosslider-gl.js',
			array(),
			kaosslider_asset_ver( 'assets/js/kaosslider-gl.js' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
		wp_register_script(
			'kaosslider',
			KAOSSLIDER_URL . 'assets/js/kaosslider.js',
			array(),
			kaosslider_asset_ver( 'assets/js/kaosslider.js' ),
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}

	/**
	 * Il CSS è piccolo e viene caricato nell'head per evitare il "flash" dello slider non stilizzato
	 * (i page builder non mettono gli shortcode nel post_content, quindi non si può rilevarli in anticipo).
	 */
	public static function enqueue_css() {
		if ( apply_filters( 'kaosslider_always_load_css', true ) ) {
			wp_enqueue_style( 'kaosslider' );
		}
	}

	public static function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'id'    => '',
				'alias' => '',
			),
			$atts,
			'kaosslider'
		);
		$key  = $atts['id'] ? $atts['id'] : $atts['alias'];
		return self::render( $key );
	}

	/**
	 * @param int|string $id_or_alias
	 * @param array|null $data_override Dati da usare al posto di quelli salvati (anteprima).
	 */
	public static function render( $id_or_alias, $data_override = null ) {
		$post = $id_or_alias ? KaosSlider_Store::find_post( $id_or_alias ) : null;
		if ( ! $post ) {
			return current_user_can( kaosslider_capability() )
				? '<p style="padding:1em;border:1px dashed #c00;color:#c00">' . esc_html__( 'KaosSlider: slider not found.', 'kaosslider' ) . '</p>'
				: '';
		}

		self::register_assets();
		wp_enqueue_style( 'kaosslider' );
		wp_enqueue_script( 'kaosslider' );

		$data     = $data_override ? KaosSlider_Sanitizer::slider( $data_override ) : KaosSlider_Store::get_data( $post->ID );
		$settings = $data['settings'];
		$slides   = array_values(
			array_filter(
				$data['slides'],
				function ( $s ) {
					return empty( $s['hidden'] );
				}
			)
		);
		if ( ! $slides ) {
			return '';
		}

		// Gli effetti WebGL hanno un file a parte, caricato solo se lo slider li usa.
		foreach ( $slides as $sl ) {
			if ( in_array( $sl['fx']['type'], self::GL_FX, true ) ) {
				wp_enqueue_script( 'kaosslider-gl' );
				break;
			}
		}

		++self::$instance_count;
		$dom_id = 'kaosslider-' . $post->ID . '-' . self::$instance_count;
		$total  = count( $slides );

		$js_settings = array(
			'type'         => $settings['type'],
			'height'       => $settings['height'],
			'fullWidth'    => $settings['fullWidth'],
			'grid'         => $settings['grid'],
			'perView'      => $settings['perView'],
			'gap'          => $settings['gap'],
			'transition'   => $settings['transition'],
			'responsive'   => $settings['responsive'],
			'parallax'     => $settings['parallax'],
			'parallaxStrength' => $settings['parallaxStrength'],
			'scrollParallax' => $settings['scrollParallax'],
			'carouselStyle' => $settings['carouselStyle'],
			'scrollVideo'  => $settings['scrollVideo'] && 'slider' === $settings['type'],
			'scrollLength' => $settings['scrollLength'],
			'speed'        => $settings['speed'],
			'autoplay'     => $settings['autoplay'],
			'delay'        => $settings['delay'],
			'pauseOnHover' => $settings['pauseOnHover'],
			'loop'         => $settings['loop'],
			'swipe'        => $settings['swipe'],
			'keyboard'     => $settings['keyboard'],
			'bp'           => array(
				'tablet' => self::BP_TABLET,
				'mobile' => self::BP_MOBILE,
			),
		);

		$classes = array(
			'kaosslider',
			'ks-type-' . $settings['type'],
			'ks-h-' . $settings['height'],
			'ks-tr-' . $settings['transition'],
		);
		if ( $settings['fullWidth'] ) {
			$classes[] = 'ks-fullwidth';
		}
		if ( 'carousel' === $settings['type'] && 'flat' !== $settings['carouselStyle'] ) {
			$classes[] = 'ks-cs-' . $settings['carouselStyle'];
		}
		if ( $settings['scrollVideo'] && 'slider' === $settings['type'] ) {
			$classes[] = 'ks-scrollvideo';
			$slides    = array_slice( $slides, 0, 1 ); // il video su scroll usa una sola slide
			$total     = 1;
		}

		ob_start();
		?>
		<section id="<?php echo esc_attr( $dom_id ); ?>" class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" aria-roledescription="carousel" aria-label="<?php echo esc_attr( $post->post_title ); ?>" data-ks="<?php echo esc_attr( wp_json_encode( $js_settings ) ); ?>"<?php echo current_user_can( kaosslider_capability() ) ? ' data-ks-edit="' . esc_url( admin_url( 'admin.php?page=' . KaosSlider_Admin::SLUG . '&edit=' . $post->ID ) ) . '" data-ks-id="' . esc_attr( (string) $post->ID ) . '"' : ''; ?>>
			<?php
			$font_css = KaosSlider_Fonts::stylesheet_url( $data );
			if ( $font_css && ! isset( self::$printed_fonts[ $font_css ] ) ) {
				self::$printed_fonts[ $font_css ] = true;
				// Stampato accanto allo slider e non con wp_enqueue_style(): gli shortcode vengono eseguiti dopo l'head
				// e un foglio accodato finirebbe nel footer, con il testo che cambia carattere a pagina già visibile.
				echo '<link rel="stylesheet" href="' . esc_url( $font_css ) . '" media="all">'; // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet
			}
			?>
			<style><?php echo self::css( $dom_id, $data ); // phpcs:ignore WordPress.Security.EscapeOutput -- CSS generato da valori validati. ?></style>
			<noscript><style>#<?php echo esc_attr( $dom_id ); ?> .ks-layers{visibility:visible}</style></noscript>
			<div class="ks-viewport">
				<div class="ks-track">
					<?php foreach ( $slides as $index => $slide ) : ?>
						<?php self::render_slide( $slide, $index, $total ); ?>
					<?php endforeach; ?>
				</div>
			</div>
			<?php if ( $settings['arrows'] && $total > 1 ) : ?>
				<button type="button" class="ks-arrow ks-prev" aria-label="<?php esc_attr_e( 'Previous slide', 'kaosslider' ); ?>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" /></svg></button>
				<button type="button" class="ks-arrow ks-next" aria-label="<?php esc_attr_e( 'Next slide', 'kaosslider' ); ?>"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg></button>
			<?php endif; ?>
			<?php if ( $settings['bullets'] && $total > 1 ) : ?>
				<div class="ks-bullets">
					<?php for ( $i = 0; $i < $total; $i++ ) : ?>
						<button type="button" class="ks-bullet<?php echo 0 === $i ? ' is-active' : ''; ?>" aria-label="<?php /* translators: %d: slide number. */ echo esc_attr( sprintf( __( 'Go to slide %d', 'kaosslider' ), $i + 1 ) ); ?>"></button>
					<?php endfor; ?>
				</div>
			<?php endif; ?>
			<?php if ( $settings['progress'] && $settings['autoplay'] ) : ?>
				<div class="ks-progress"><span></span></div>
			<?php endif; ?>
		</section>
		<?php
		return trim( ob_get_clean() );
	}

	private static function render_slide( $slide, $index, $total ) {
		$bg       = $slide['bg'];
		$duration = $slide['duration'] ? (int) $slide['duration'] : 0;
		$lazy     = $index > 0;
		?>
		<div class="ks-slide<?php echo 0 === $index ? ' is-active' : ''; ?>" role="group" aria-roledescription="slide" aria-label="<?php echo esc_attr( ( $index + 1 ) . ' / ' . $total ); ?>" data-duration="<?php echo esc_attr( (string) $duration ); ?>" data-tr="<?php echo esc_attr( wp_json_encode( $slide['transition'] ) ); ?>"<?php echo $bg['parallax'] ? ' data-bgpar="' . esc_attr( $bg['parallax'] ) . '"' : ''; ?> style="background:<?php echo esc_attr( $bg['color'] ? $bg['color'] : 'transparent' ); ?>">
			<div class="ks-bg">
				<?php
				if ( 'image' === $bg['type'] && $bg['image'] ) {
					$img_style = 'background-size:' . $bg['size'] . ';background-position:' . $bg['position'] . ';background-repeat:' . $bg['repeat'] . ';';
					if ( ! $lazy ) {
						$img_style .= 'background-image:' . self::css_url( $bg['image'] ) . ';';
					}
					printf(
						'<div class="ks-bg-img ks-kb-%1$s" style="%2$s"%3$s></div>',
						esc_attr( $bg['kenburns'] ),
						esc_attr( $img_style ),
						$lazy ? ' data-bg="' . esc_url( $bg['image'] ) . '"' : ''
					);
				} elseif ( 'video' === $bg['type'] && $bg['video'] ) {
					self::render_video_bg( $bg, $lazy );
				}
				?>
			</div>
			<?php if ( $bg['overlayOpacity'] > 0 ) : ?>
				<div class="ks-overlay" style="<?php echo esc_attr( 'background:' . $bg['overlayColor'] . ';opacity:' . $bg['overlayOpacity'] ); ?>"></div>
			<?php endif; ?>
			<?php if ( 'none' !== $slide['fx']['type'] ) : ?>
				<canvas class="ks-fx<?php echo $slide['fx']['front'] ? ' ks-fx-front' : ''; ?>" aria-hidden="true" data-fx="<?php echo esc_attr( wp_json_encode( $slide['fx'] ) ); ?>"></canvas>
			<?php endif; ?>
			<div class="ks-layers">
				<?php
				foreach ( $slide['layers'] as $layer ) {
					if ( empty( $layer['hidden'] ) ) {
						self::render_layer( $layer );
					}
				}
				?>
			</div>
		</div>
		<?php
	}

	private static function render_video_bg( $bg, $lazy ) {
		$poster = $bg['poster'];
		if ( $poster ) {
			printf(
				'<div class="ks-bg-img ks-bg-poster" %s></div>',
				$lazy ? 'data-bg="' . esc_url( $poster ) . '"' : 'style="' . esc_attr( 'background-image:' . self::css_url( $poster ) ) . '"'
			);
		}
		if ( 'mp4' === $bg['videoSource'] ) {
			printf(
				'<video class="ks-bg-video" muted loop playsinline preload="none" data-src="%1$s"%2$s%3$s></video>',
				esc_url( $bg['video'] ),
				$bg['videoAlt'] ? ' data-src-alt="' . esc_url( $bg['videoAlt'] ) . '"' : '',
				$poster ? ' poster="' . esc_url( $poster ) . '"' : ''
			);
			return;
		}
		$embed = self::embed_url( $bg['videoSource'], $bg['video'] );
		if ( $embed ) {
			printf( '<div class="ks-bg-embed" data-src="%s"></div>', esc_url( $embed ) );
		}
	}

	/**
	 * URL di embed "da sfondo" (muto, in loop, senza controlli) per YouTube e Vimeo.
	 */
	public static function embed_url( $source, $url ) {
		if ( 'youtube' === $source && preg_match( '~(?:youtu\.be/|v=|embed/|shorts/|live/)([\w-]{11})~', $url, $m ) ) {
			// enablejsapi + origin: il runtime ascolta lo stato del player e mostra il video solo quando parte davvero.
			$home   = wp_parse_url( home_url() );
			$origin = $home['scheme'] . '://' . $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
			return 'https://www.youtube-nocookie.com/embed/' . $m[1] . '?autoplay=1&mute=1&controls=0&loop=1&playlist=' . $m[1] . '&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=' . rawurlencode( $origin );
		}
		if ( 'vimeo' === $source && preg_match( '~vimeo\.com/(?:video/)?(\d+)~', $url, $m ) ) {
			return 'https://player.vimeo.com/video/' . $m[1] . '?background=1&autoplay=1&loop=1&muted=1&dnt=1';
		}
		return '';
	}

	private static function render_layer( $layer ) {
		$anim = array(
			'in'   => $layer['anim']['in'],
			'out'  => $layer['anim']['out'],
			'loop' => $layer['anim']['loop'],
		);
		if ( $layer['parallax'] ) {
			$anim['parallax'] = $layer['parallax'];
		}
		printf(
			'<div class="ks-layer ks-ltype-%1$s ks-l-%2$s" data-ks-anim="%3$s"><div class="ks-anim">',
			esc_attr( $layer['type'] ),
			esc_attr( $layer['id'] ),
			esc_attr( wp_json_encode( $anim ) )
		);

		$grad_class = KaosSlider_Sanitizer::is_gradient( $layer['style']['color'] ) ? ' ks-gradtext' : '';

		switch ( $layer['type'] ) {
			case 'text':
				$tag  = $layer['tag'];
				$html = sprintf( '<%1$s class="ks-inner%3$s">%2$s</%1$s>', $tag, $layer['content'], $grad_class ); // content già passato da wp_kses_post.
				if ( $layer['link'] ) {
					$html = sprintf( '<a class="ks-layer-link" href="%s"%s>%s</a>', esc_url( $layer['link'] ), self::target_attr( $layer['target'] ), $html );
				}
				echo $html; // phpcs:ignore WordPress.Security.EscapeOutput
				break;

			case 'button':
				printf(
					'<a class="ks-inner ks-btn%4$s" href="%1$s"%2$s>%3$s</a>',
					esc_url( $layer['link'] ? $layer['link'] : '#' ),
					self::target_attr( $layer['target'] ), // phpcs:ignore WordPress.Security.EscapeOutput
					wp_kses_post( $layer['content'] ),
					esc_attr( $grad_class )
				);
				break;

			case 'image':
				if ( $layer['image'] ) {
					$img = sprintf( '<img class="ks-inner" src="%s" alt="%s" loading="lazy" decoding="async">', esc_url( $layer['image'] ), esc_attr( $layer['alt'] ) );
					if ( $layer['link'] ) {
						$img = sprintf( '<a class="ks-layer-link" href="%s"%s>%s</a>', esc_url( $layer['link'] ), self::target_attr( $layer['target'] ), $img );
					}
					echo $img; // phpcs:ignore WordPress.Security.EscapeOutput
				}
				break;

			case 'shape':
				echo '<div class="ks-inner ks-shape"></div>';
				break;

			case 'draw':
				echo self::draw_svg( $layer ); // phpcs:ignore WordPress.Security.EscapeOutput -- SVG costruito con valori validati ed escapati.
				break;

			case 'film':
				$f   = $layer['film'];
				$cls = 'ks-inner ks-film' . ( $f['perforations'] ? ' ks-film-perf' : '' ) . ( $f['grayscale'] ? ' ks-film-gray' : '' ) . ( $f['pauseHover'] ? ' ks-film-hover' : '' );
				printf( '<div class="%s" data-speed="%s" data-dir="%s"><div class="ks-film-track">', esc_attr( $cls ), esc_attr( $f['speed'] ), esc_attr( $f['direction'] ) );
				for ( $rep = 0; $rep < 2; $rep++ ) { // due copie per un giro continuo senza scatti
					foreach ( $f['images'] as $src ) {
						printf( '<div class="ks-film-item"%s><img src="%s" alt="" loading="lazy" decoding="async" draggable="false"></div>', $rep ? ' aria-hidden="true"' : '', esc_url( $src ) );
					}
				}
				echo '</div></div>';
				break;
		}

		echo '</div></div>';
	}

	/**
	 * SVG del livello disegno: una forma tracciata a mano oppure un testo da disegnare.
	 */
	public static function draw_svg( $layer ) {
		$dr     = $layer['draw'];
		$chalk  = $dr['chalk'] ? ' filter="url(#ks-chalk-' . esc_attr( $layer['id'] ) . ')"' : '';
		$filter = $dr['chalk'] ? '<defs><filter id="ks-chalk-' . esc_attr( $layer['id'] ) . '" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter></defs>' : '';
		if ( 'text' === $dr['mode'] ) {
			$r = (array) $layer['resp']['desktop'];
			$w = $r['w'] > 0 ? $r['w'] : 600;
			$h = $r['h'] > 0 ? $r['h'] : 160;
			return sprintf(
				'<svg class="ks-inner ks-draw ks-draw-text%6$s" viewBox="0 0 %1$s %2$s" preserveAspectRatio="xMidYMid meet" aria-label="%3$s" role="img">%4$s<text x="50%%" y="50%%" text-anchor="middle" dominant-baseline="central" font-size="%5$s"%7$s>%3$s</text></svg>',
				esc_attr( $w ),
				esc_attr( $h ),
				esc_html( wp_strip_all_tags( $layer['content'] ) ),
				$filter,
				esc_attr( $r['fs'] ),
				$dr['fillAfter'] ? ' ks-draw-fill' : '',
				$chalk
			);
		}
		$shapes = KaosSlider_Sanitizer::draw_shapes();
		$d      = isset( $shapes[ $dr['shape'] ] ) ? $shapes[ $dr['shape'] ]['d'] : $shapes['underline']['d'];
		$paths  = '';
		foreach ( preg_split( '/(?=M)/', $d, -1, PREG_SPLIT_NO_EMPTY ) as $part ) { // ogni tratto si disegna dopo il precedente
			$paths .= '<path d="' . esc_attr( trim( $part ) ) . '" pathLength="1" vector-effect="non-scaling-stroke"' . $chalk . '/>';
		}
		return '<svg class="ks-inner ks-draw" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">' . $filter . $paths . '</svg>';
	}

	/**
	 * url("…") sicuro per il CSS: virgolette, parentesi, spazi e barre rovesciate codificati,
	 * così l'indirizzo non può chiudere la funzione e aggiungere altre regole.
	 */
	private static function css_url( $url ) {
		return 'url("' . strtr(
			esc_url_raw( $url ),
			array(
				'"'  => '%22',
				"'"  => '%27',
				'('  => '%28',
				')'  => '%29',
				' '  => '%20',
				'\\' => '%5C',
			)
		) . '")';
	}

	private static function target_attr( $target ) {
		return '_blank' === $target ? ' target="_blank" rel="noopener"' : '';
	}

	/* ---------- CSS ---------- */

	/**
	 * Valori responsive risolti per device (tablet eredita da desktop, mobile da tablet).
	 */
	public static function resolve( $layer, $device ) {
		$out = (array) $layer['resp']['desktop'];
		if ( 'desktop' !== $device ) {
			$out = array_merge( $out, (array) $layer['resp']['tablet'] );
		}
		if ( 'mobile' === $device ) {
			$out = array_merge( $out, (array) $layer['resp']['mobile'] );
		}
		return $out;
	}

	private static function px( $n ) {
		return 'calc(' . ( 0 + $n ) . 'px * var(--s, 1))';
	}

	private static function layer_resp_css( $sel, $layer, $r ) {
		if ( ! empty( $r['hide'] ) ) {
			return $sel . '{display:none}';
		}
		$tx = array(
			'left'   => '0',
			'center' => '-50%',
			'right'  => '-100%',
		);
		$ty = array(
			'top'    => '0',
			'middle' => '-50%',
			'bottom' => '-100%',
		);
		$w   = $r['w'] > 0 ? self::px( $r['w'] ) : 'auto';
		$h   = $r['h'] > 0 ? self::px( $r['h'] ) : 'auto';
		$fit = self::fit( $layer, $r );

		// Modalità di dimensionamento (immagini e forme): personalizzata, larghezza/altezza piena, copri, contieni.
		switch ( $fit ) {
			case 'fullw':
				$box   = array( '0', $r['y'] . '%', '0', $ty[ $r['ay'] ], '100%', $h );
				$inner = array( '100%', $r['h'] > 0 ? '100%' : 'auto' );
				break;
			case 'fullh':
				$box   = array( $r['x'] . '%', '0', $tx[ $r['ax'] ], '0', $w, '100%' );
				$inner = array( $r['w'] > 0 ? '100%' : 'auto', '100%' );
				break;
			case 'cover':
			case 'contain':
				$box   = array( '0', '0', '0', '0', '100%', '100%' );
				$inner = array( '100%', '100%' );
				break;
			default:
				$box   = array( $r['x'] . '%', $r['y'] . '%', $tx[ $r['ax'] ], $ty[ $r['ay'] ], $w, $h );
				$inner = array( '100%', $r['h'] > 0 ? '100%' : 'auto' );
		}

		$css  = $sel . '{display:block;left:' . $box[0] . ';top:' . $box[1] . ';';
		$css .= 'transform:translate(' . $box[2] . ',' . $box[3] . ');';
		$css .= 'width:' . $box[4] . ';height:' . $box[5] . ';';
		$css .= 'white-space:' . ( $r['w'] > 0 ? 'normal' : 'nowrap' ) . ';';
		$css .= 'text-align:' . $r['ta'] . ';}';
		$css .= $sel . ' .ks-inner{font-size:' . self::px( $r['fs'] ) . '}';
		if ( 'image' === $layer['type'] ) {
			$of   = in_array( $fit, array( 'cover', 'contain' ), true ) ? $fit : $layer['style']['objectFit'];
			$css .= $sel . ' .ks-inner{width:' . $inner[0] . ';height:' . $inner[1] . ';object-fit:' . $of . ';object-position:' . $layer['style']['objectPosition'] . '}';
		}
		return $css;
	}

	/**
	 * Modalità di dimensionamento effettiva (solo immagini e forme la usano).
	 */
	public static function fit( $layer, $r ) {
		if ( ! in_array( $layer['type'], array( 'image', 'shape', 'draw', 'film' ), true ) || empty( $r['fit'] ) ) {
			return 'custom';
		}
		return $r['fit'];
	}

	/**
	 * Proprietà per riempire il testo con un gradiente.
	 */
	private static function gradient_text_props( $gradient ) {
		return array(
			'--ks-tg'                 => $gradient,
			'background'              => $gradient,
			'-webkit-background-clip' => 'text',
			'background-clip'         => 'text',
			'-webkit-text-fill-color' => 'transparent',
			'color'                   => 'transparent',
		);
	}

	private static function radius( $s ) {
		if ( ! empty( $s['radiusLinked'] ) ) {
			return self::px( $s['radius'] );
		}
		return self::px( $s['radiusTL'] ) . ' ' . self::px( $s['radiusTR'] ) . ' ' . self::px( $s['radiusBR'] ) . ' ' . self::px( $s['radiusBL'] );
	}

	/**
	 * Colore con opacità (anche per variabili e nomi di colore).
	 */
	private static function alpha( $color, $opacity ) {
		if ( $opacity >= 1 ) {
			return $color;
		}
		return 'color-mix(in srgb, ' . $color . ' ' . round( $opacity * 100 ) . '%, transparent)';
	}

	private static function props_css( $props ) {
		$css = '';
		foreach ( $props as $k => $v ) {
			$css .= $k . ':' . $v . ';';
		}
		return $css;
	}

	/**
	 * Valore CSS di un'ombra. $kind: box (box-shadow), text (text-shadow) o drop (filtro drop-shadow).
	 * La densità allarga l'ombra del riquadro; per le lettere sovrappone più copie dell'ombra.
	 */
	private static function shadow_value( $s, $p, $kind ) {
		$mode = $s[ $p ];
		if ( 'custom' !== $mode ) {
			$presets = array(
				'soft'   => array( '0 2px 14px rgba(0,0,0,.35)', 'drop-shadow(0 2px 10px rgba(0,0,0,.35))' ),
				'strong' => array( '0 3px 6px rgba(0,0,0,.75)', 'drop-shadow(0 3px 4px rgba(0,0,0,.7))' ),
			);
			return isset( $presets[ $mode ] ) ? $presets[ $mode ][ 'drop' === $kind ? 1 : 0 ] : '';
		}
		$angle = deg2rad( $s[ $p . 'Angle' ] );
		$dist  = $s[ $p . 'Distance' ];
		$one   = self::px( round( cos( $angle ) * $dist, 2 ) ) . ' ' . self::px( round( sin( $angle ) * $dist, 2 ) ) . ' ' . self::px( $s[ $p . 'Blur' ] );
		$color = self::alpha( $s[ $p . 'Color' ] ? $s[ $p . 'Color' ] : '#000000', $s[ $p . 'Opacity' ] );
		if ( 'box' === $kind ) {
			return $one . ' ' . self::px( round( $s[ $p . 'Blur' ] * $s[ $p . 'Density' ] / 100, 2 ) ) . ' ' . $color;
		}
		$copies = array_fill( 0, 1 + (int) round( $s[ $p . 'Density' ] / 25 ), $one . ' ' . $color );
		if ( 'drop' === $kind ) {
			return 'drop-shadow(' . implode( ') drop-shadow(', $copies ) . ')';
		}
		return implode( ',', $copies );
	}

	/**
	 * Vetro: sfocatura di ciò che sta dietro, riflesso sui bordi, lucentezza, grana e profondità.
	 */
	private static function glass_props( $s, $props, $grad_text ) {
		$filter  = 'blur(' . self::px( $s['glassBlur'] ) . ') saturate(' . $s['glassSaturate'] . '%) brightness(' . $s['glassBright'] . '%)';
		$out     = array(
			'backdrop-filter'         => $filter,
			'-webkit-backdrop-filter' => $filter,
		);
		$shadows = array();
		if ( $s['glassEdge'] > 0 ) {
			$a         = $s['glassEdge'] / 100;
			$shadows[] = 'inset 0 1px 0 rgba(255,255,255,' . round( $a * 0.9, 3 ) . ')';
			$shadows[] = 'inset 0 0 0 1px rgba(255,255,255,' . round( $a * 0.35, 3 ) . ')';
			$shadows[] = 'inset 0 -1px 0 rgba(255,255,255,' . round( $a * 0.2, 3 ) . ')';
		}
		if ( $s['glassDepth'] > 0 ) {
			$shadows[] = '0 ' . self::px( 10 ) . ' ' . self::px( 40 ) . ' rgba(0,0,0,' . round( $s['glassDepth'] / 100 * 0.45, 3 ) . ')';
		}
		if ( ! empty( $props['box-shadow'] ) ) {
			$shadows[] = $props['box-shadow'];
		}
		if ( $shadows ) {
			$out['box-shadow'] = implode( ',', $shadows );
		}
		if ( ! $grad_text ) {
			// Lucentezza e grana come livelli di sfondo sopra la tinta scelta.
			$layers = array();
			if ( $s['glassGrain'] > 0 ) {
				$layers[] = self::grain( $s['glassGrain'] ) . ' 0 0/160px 160px repeat';
			}
			if ( $s['glassShine'] > 0 ) {
				$a        = $s['glassShine'] / 100;
				$layers[] = 'linear-gradient(135deg,rgba(255,255,255,' . round( $a * 0.6, 3 ) . ') 0%,rgba(255,255,255,' . round( $a * 0.12, 3 ) . ') 38%,rgba(255,255,255,0) 60%)';
			}
			if ( $layers ) {
				$layers[]          = $props['background'];
				$out['background'] = implode( ',', $layers );
			}
		}
		return $out;
	}

	/**
	 * Texture di rumore (SVG in linea) per la grana del vetro.
	 */
	private static function grain( $amount ) {
		$k = round( $amount / 100 * 0.3, 3 );
		return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 " . $k . "'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23g)'/%3E%3C/svg%3E\")";
	}

	private static function layer_style_css( $sel, $layer ) {
		$s         = $layer['style'];
		$is_text   = in_array( $layer['type'], array( 'text', 'button' ), true );
		$grad_text = $is_text && KaosSlider_Sanitizer::is_gradient( $s['color'] );
		$props     = array(
			'color'          => $s['color'] ? $s['color'] : 'inherit',
			'background'     => $s['bg'] ? $s['bg'] : 'transparent',
			'line-height'    => $s['lineHeight'],
			'letter-spacing' => self::px( $s['letterSpacing'] ),
			'padding'        => self::px( $s['padV'] ) . ' ' . self::px( $s['padH'] ),
			'border-radius'  => self::radius( $s ),
			'opacity'        => $s['opacity'],
			'font-style'     => $s['italic'] ? 'italic' : 'normal',
			'text-transform' => $s['uppercase'] ? 'uppercase' : 'none',
		);
		if ( $s['fontFamily'] ) {
			$props['font-family'] = $s['fontFamily'];
		}
		if ( $s['fontWeight'] ) {
			$props['font-weight'] = $s['fontWeight'];
		}
		if ( $s['borderWidth'] > 0 ) {
			$props['border'] = self::px( $s['borderWidth'] ) . ' ' . $s['borderStyle'] . ' ' . self::alpha( $s['borderColor'] ? $s['borderColor'] : 'currentColor', $s['borderOpacity'] );
		}
		if ( $is_text && $s['strokeWidth'] > 0 ) {
			$props['-webkit-text-stroke'] = self::px( $s['strokeWidth'] ) . ' ' . self::alpha( $s['strokeColor'] ? $s['strokeColor'] : '#000', $s['strokeOpacity'] );
			$props['paint-order']         = 'stroke fill';
		}
		if ( $is_text ) {
			// Con il riempimento a gradiente text-shadow traspare dalle lettere: si usa un filtro.
			$letters = self::shadow_value( $s, 'shadow', $grad_text ? 'drop' : 'text' );
			if ( $letters ) {
				$props[ $grad_text ? 'filter' : 'text-shadow' ] = $letters;
			}
			$box = self::shadow_value( $s, 'boxShadow', 'box' );
		} else {
			$box = self::shadow_value( $s, 'shadow', 'box' );
		}
		if ( $box ) {
			$props['box-shadow'] = $box;
		}
		if ( $grad_text ) {
			$props = array_merge( $props, self::gradient_text_props( $s['color'] ) );
		}
		if ( ! empty( $s['glass'] ) ) {
			$props = array_merge( $props, self::glass_props( $s, $props, $grad_text ) );
		}
		if ( $is_text && $s['strokeOnly'] && $s['strokeWidth'] > 0 ) {
			// Solo contorno: lettere vuote all'interno.
			$props['-webkit-text-fill-color'] = 'transparent';
			$props['color']                   = 'transparent';
		}

		$css = $sel . ' .ks-inner{' . self::props_css( $props ) . '}';
		if ( 'draw' === $layer['type'] ) {
			$dr   = $layer['draw'];
			$css .= $sel . ' .ks-draw path,' . $sel . ' .ks-draw text{stroke:' . $dr['stroke'] . ';stroke-width:' . self::px( $dr['width'] ) . '}';
			$css .= $sel . ' .ks-draw text{fill:' . ( $s['color'] && ! KaosSlider_Sanitizer::is_gradient( $s['color'] ) ? $s['color'] : $dr['stroke'] ) . '}';
		}
		if ( 'film' === $layer['type'] ) {
			$css .= $sel . ' .ks-film{--ks-film-gap:' . self::px( $layer['film']['gap'] ) . '}';
		}

		$hover = array();
		$hc    = $s['hoverColor'];
		if ( $hc && KaosSlider_Sanitizer::is_gradient( $hc ) ) {
			$hover = self::gradient_text_props( $hc );
		} else {
			if ( $hc ) {
				$hover['color']                   = $hc;
				$hover['-webkit-text-fill-color'] = $hc;
			}
			if ( $s['hoverBg'] || ( $hc && $grad_text ) ) {
				$hover['background'] = $s['hoverBg'] ? $s['hoverBg'] : ( $s['bg'] ? $s['bg'] : 'transparent' );
				if ( $grad_text && $hc ) {
					$hover['-webkit-background-clip'] = 'border-box';
					$hover['background-clip']         = 'border-box';
				}
			}
		}
		if ( $hover ) {
			$css .= $sel . ' .ks-inner:hover{' . self::props_css( $hover ) . '}';
		}
		return $css;
	}

	/**
	 * Anteprima statica della prima slide visibile (per le miniature della bacheca): niente JS, livelli nello stato finale.
	 */
	public static function preview_html( $post_id, $data ) {
		$slides = array_values(
			array_filter(
				$data['slides'],
				function ( $s ) {
					return empty( $s['hidden'] );
				}
			)
		);
		if ( ! $slides ) {
			$slides = $data['slides'];
		}
		$slide = $slides[0];
		$bg    = $slide['bg'];
		if ( 'video' === $bg['type'] && ! $bg['poster'] && 'youtube' === $bg['videoSource']
			&& preg_match( '~(?:youtu\.be/|v=|embed/|shorts/|live/)([\w-]{11})~', $bg['video'], $m ) ) {
			$slide['bg']['poster'] = 'https://i.ytimg.com/vi/' . $m[1] . '/hqdefault.jpg';
		}
		$g       = $data['settings']['grid']['desktop'];
		$dom_id  = 'ksthumb-' . (int) $post_id;
		$pdata   = $data;
		$pdata['slides'] = array( $slide );

		ob_start();
		self::render_slide( $slide, 0, 1 );
		$slide_html = ob_get_clean();

		return sprintf(
			'<div id="%1$s" class="kaosslider ks-type-slider ks-ready ks-thumb" data-w="%2$d" data-h="%3$d" style="width:%2$dpx;height:%3$dpx;background:%4$s"><style>%5$s</style>%6$s</div>',
			esc_attr( $dom_id ),
			(int) $g['w'],
			(int) $g['h'],
			esc_attr( $data['settings']['bgColor'] ? $data['settings']['bgColor'] : '#111' ),
			self::css( $dom_id, $pdata, true ), // phpcs:ignore WordPress.Security.EscapeOutput
			$slide_html
		);
	}

	public static function css( $dom_id, $data, $desktop_only = false ) {
		$st   = $data['settings'];
		$root = '#' . $dom_id;
		$mq   = array(
			'desktop' => '',
			'tablet'  => '@media (max-width:' . self::BP_TABLET . 'px)',
			'mobile'  => '@media (max-width:' . self::BP_MOBILE . 'px)',
		);

		$base = $root . '{--ks-nav:' . $st['navColor'] . ';--ks-gap:' . $st['gap'] . 'px;--ks-speed:' . $st['speed'] . 'ms;background:' . ( $st['bgColor'] ? $st['bgColor'] : 'transparent' ) . '}';
		if ( 'fullscreen' === $st['height'] && 'slider' === $st['type'] ) {
			$off   = (int) $st['offset'];
			$base .= $root . ' .ks-viewport{height:calc(100vh - ' . $off . 'px);height:calc(100svh - ' . $off . 'px)}';
		}

		$per_device = array(
			'desktop' => '',
			'tablet'  => '',
			'mobile'  => '',
		);
		foreach ( KaosSlider_Sanitizer::DEVICES as $dev ) {
			$g = $st['grid'][ $dev ];
			if ( 'carousel' === $st['type'] ) {
				$per_device[ $dev ] .= $root . '{--ks-pv:' . $st['perView'][ $dev ] . '}';
				$per_device[ $dev ] .= $root . ' .ks-slide{height:' . self::px( $g['h'] ) . '}';
			} elseif ( 'fixed' === $st['height'] ) {
				$per_device[ $dev ] .= $root . ' .ks-viewport{height:' . self::px( $g['h'] ) . '}';
			}
		}

		$common = '';
		foreach ( $data['slides'] as $slide ) {
			foreach ( $slide['layers'] as $layer ) {
				$sel     = $root . ' .ks-l-' . $layer['id'];
				$common .= self::layer_style_css( $sel, $layer );
				foreach ( KaosSlider_Sanitizer::DEVICES as $dev ) {
					$per_device[ $dev ] .= self::layer_resp_css( $sel, $layer, self::resolve( $layer, $dev ) );
				}
			}
		}

		if ( $desktop_only ) {
			return $common . $per_device['desktop'];
		}

		$css = $base . $common . $per_device['desktop'];
		foreach ( array( 'tablet', 'mobile' ) as $dev ) {
			if ( $per_device[ $dev ] ) {
				$css .= $mq[ $dev ] . '{' . $per_device[ $dev ] . '}';
			}
		}
		return $css;
	}

	/* ---------- Anteprima (solo amministratori) ---------- */

	public static function preview_url( $id ) {
		return add_query_arg(
			array(
				'kaosslider_preview' => (int) $id,
				'_ksnonce'           => wp_create_nonce( 'kaosslider_preview_' . (int) $id ),
			),
			home_url( '/' )
		);
	}

	public static function maybe_preview() {
		if ( empty( $_GET['kaosslider_preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$id = absint( $_GET['kaosslider_preview'] ); // phpcs:ignore WordPress.Security.NonceVerification
		if ( ! current_user_can( kaosslider_capability() )
			|| ! isset( $_GET['_ksnonce'] )
			|| ! wp_verify_nonce( sanitize_key( $_GET['_ksnonce'] ), 'kaosslider_preview_' . $id ) ) {
			wp_die( esc_html__( 'You do not have permission to view this preview.', 'kaosslider' ), 403 );
		}
		show_admin_bar( false );
		$html = self::render( $id );
		?>
		<!doctype html>
		<html <?php language_attributes(); ?>>
		<head>
			<meta charset="<?php bloginfo( 'charset' ); ?>">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta name="robots" content="noindex,nofollow">
			<title><?php esc_html_e( 'KaosSlider preview', 'kaosslider' ); ?></title>
			<?php wp_head(); ?>
			<style>html,body{margin:0!important;padding:0!important}.ks-preview-after{padding:60px 24px;font:16px/1.6 system-ui,sans-serif;color:#555;text-align:center}</style>
		</head>
		<body class="kaosslider-preview">
			<?php echo $html; // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<div class="ks-preview-after"><?php esc_html_e( 'Slider preview with the styles of the active theme. The content below is only here to test scrolling.', 'kaosslider' ); ?></div>
			<?php wp_footer(); ?>
		</body>
		</html>
		<?php
		exit;
	}
}
