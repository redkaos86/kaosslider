<?php
/**
 * Salvataggio e lettura degli slider (custom post type + JSON in post meta).
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Store {

	const POST_TYPE = 'kaos_slider';
	const META_KEY  = '_kaosslider_data';

	public static function register_post_type() {
		register_post_type(
			self::POST_TYPE,
			array(
				'label'           => 'KaosSlider',
				'public'          => false,
				'show_ui'         => false,
				'show_in_rest'    => false,
				'rewrite'         => false,
				'query_var'       => false,
				'supports'        => array( 'title' ),
				// Gli slider si gestiscono solo da KaosSlider: anche le API del core richiedono la stessa capability.
				'capabilities'    => array_fill_keys(
					array( 'edit_post', 'read_post', 'delete_post', 'edit_posts', 'edit_others_posts', 'delete_posts', 'publish_posts', 'read_private_posts', 'create_posts' ),
					kaosslider_capability()
				),
				'map_meta_cap'    => false,
			)
		);
	}

	/**
	 * Impostazioni di default di uno slider.
	 */
	public static function default_settings() {
		return array(
			'type'           => 'slider',   // slider | carousel
			'height'         => 'fullscreen', // fullscreen | fixed
			'offset'         => 0,          // px da sottrarre a 100vh (es. header)
			'fullWidth'      => true,       // esce dal contenitore del tema
			'grid'           => array(
				'desktop' => array( 'w' => 1240, 'h' => 700 ),
				'tablet'  => array( 'w' => 1024, 'h' => 700 ),
				'mobile'  => array( 'w' => 480, 'h' => 720 ),
			),
			'transition'     => 'fade',     // vedi KaosSlider_Sanitizer::TRANSITIONS
			'responsive'     => true,
			'parallax'       => false,
			'parallaxStrength' => 30,
			'scrollParallax' => false,
			'speed'          => 900,
			'autoplay'       => true,
			'delay'          => 7000,
			'pauseOnHover'   => true,
			'loop'           => true,
			'arrows'         => true,
			'bullets'        => true,
			'progress'       => false,
			'navColor'       => '#ffffff',
			'swipe'          => true,
			'keyboard'       => true,
			'perView'        => array( 'desktop' => 3, 'tablet' => 2, 'mobile' => 1 ),
			'gap'            => 24,
			'carouselStyle'  => 'flat',
			'scrollVideo'    => false,
			'scrollLength'   => 300,
			'bgColor'        => '#111111',
		);
	}

	public static function default_slide() {
		return array(
			'id'       => 's' . wp_generate_password( 6, false, false ),
			'name'     => __( 'Slide', 'kaosslider' ),
			'hidden'   => false,
			'duration' => 0,
			'transition' => array(
				'effect'   => 'default',
				'duration' => 0,
				'easing'   => 'default',
				'slices'   => 0,
			),
			'bg'       => array(
				'type'           => 'color',
				'color'          => '#1d1d1f',
				'image'          => '',
				'size'           => 'cover',
				'repeat'         => 'no-repeat',
				'position'       => 'center center',
				'kenburns'       => 'none',
				'videoSource'    => 'mp4',
				'video'          => '',
				'videoAlt'       => '',
				'poster'         => '',
				'overlayColor'   => '#000000',
				'overlayOpacity' => 0,
				'parallax'       => 0,
			),
			'layers'   => array(),
		);
	}

	public static function default_data() {
		$slide          = self::default_slide();
		$slide['name']  = sprintf( /* translators: %d: slide number. */ __( 'Slide %d', 'kaosslider' ), 1 );
		return array(
			'version'  => 1,
			'settings' => self::default_settings(),
			'slides'   => array( $slide ),
		);
	}

	/**
	 * @param int|string $id_or_alias
	 * @return WP_Post|null
	 */
	public static function find_post( $id_or_alias ) {
		if ( is_numeric( $id_or_alias ) ) {
			$post = get_post( (int) $id_or_alias );
		} else {
			$posts = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'name'           => sanitize_title( $id_or_alias ),
					'posts_per_page' => 1,
					'post_status'    => 'any',
				)
			);
			$post  = $posts ? $posts[0] : null;
		}
		if ( ! $post || self::POST_TYPE !== $post->post_type || 'trash' === $post->post_status ) {
			return null;
		}
		return $post;
	}

	/**
	 * Dati completi dello slider, con i default applicati.
	 */
	public static function get_data( $post_id ) {
		$raw  = get_post_meta( $post_id, self::META_KEY, true );
		$data = $raw ? json_decode( $raw, true ) : null;
		if ( ! is_array( $data ) ) {
			$data = self::default_data();
		}
		return KaosSlider_Sanitizer::slider( $data );
	}

	public static function to_array( WP_Post $post, $with_data = false ) {
		$out = array(
			'id'       => $post->ID,
			'title'    => $post->post_title,
			'alias'    => $post->post_name,
			'modified' => mysql_to_rfc3339( $post->post_modified ),
		);
		if ( $with_data ) {
			$out['data'] = self::get_data( $post->ID );
		} else {
			$data              = self::get_data( $post->ID );
			$out['slideCount'] = count( $data['slides'] );
			$out['type']       = $data['settings']['type'];
		}
		return $out;
	}

	/**
	 * Dati per la griglia della bacheca: anteprima della prima slide e link di anteprima.
	 */
	public static function to_card( WP_Post $post ) {
		$out               = self::to_array( $post );
		$data              = self::get_data( $post->ID );
		$preview           = KaosSlider_Render::preview( $post->ID, $data );
		$out['preview']    = $preview['html'];
		$out['previewCss'] = $preview['css'];
		$out['previewUrl'] = KaosSlider_Render::preview_url( $post->ID );
		$out['fontCss']    = KaosSlider_Fonts::stylesheet_url( $data, true );
		return $out;
	}

	public static function all() {
		$posts = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => -1,
				'post_status'    => 'publish',
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		return array_map( array( __CLASS__, 'to_array' ), $posts );
	}

	/**
	 * Crea o aggiorna uno slider.
	 *
	 * @return int|WP_Error
	 */
	public static function save( $id, $title, $alias, $data ) {
		$title = sanitize_text_field( $title );
		if ( '' === $title ) {
			$title = __( 'Untitled slider', 'kaosslider' );
		}
		$postarr = array(
			'post_type'   => self::POST_TYPE,
			'post_title'  => $title,
			'post_status' => 'publish',
		);
		if ( $alias ) {
			$postarr['post_name'] = sanitize_title( $alias );
		}
		if ( $id ) {
			$postarr['ID'] = (int) $id;
			$result        = wp_update_post( wp_slash( $postarr ), true );
		} else {
			$result = wp_insert_post( wp_slash( $postarr ), true );
		}
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$clean = KaosSlider_Sanitizer::slider( is_array( $data ) ? $data : self::default_data() );
		update_post_meta( $result, self::META_KEY, wp_slash( wp_json_encode( $clean ) ) );

		// Font in modalità locale: si scaricano adesso, così i visitatori trovano già i file sul sito.
		if ( 'local' === KaosSlider_Fonts::settings()['fontMode'] ) {
			KaosSlider_Fonts::prepare_local( KaosSlider_Fonts::collect( $clean ) );
		}
		return (int) $result;
	}

	public static function duplicate( $id ) {
		$post = self::find_post( $id );
		if ( ! $post ) {
			return new WP_Error( 'kaosslider_not_found', __( 'Slider not found', 'kaosslider' ), array( 'status' => 404 ) );
		}
		/* translators: %s: name of the duplicated slider. */
		return self::save( 0, sprintf( __( '%s (copy)', 'kaosslider' ), $post->post_title ), '', self::get_data( $post->ID ) );
	}

	public static function delete( $id ) {
		$post = self::find_post( $id );
		if ( ! $post ) {
			return false;
		}
		return (bool) wp_trash_post( $post->ID );
	}
}
