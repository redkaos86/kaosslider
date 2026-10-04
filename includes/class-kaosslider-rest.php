<?php
/**
 * API REST usate dalla bacheca e dall'editor (namespace kaosslider/v1).
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_REST {

	const NS = 'kaosslider/v1';

	public static function can_manage() {
		return current_user_can( kaosslider_capability() );
	}

	/**
	 * L'elenco (id + titolo) serve anche ai blocchi dei page builder: basta poter modificare contenuti.
	 */
	public static function can_list() {
		return current_user_can( 'edit_posts' );
	}

	public static function register_routes() {
		$id_arg = array(
			'id' => array(
				'type'     => 'integer',
				'required' => true,
			),
		);

		register_rest_route(
			self::NS,
			'/sliders',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'list_sliders' ),
					'permission_callback' => array( __CLASS__, 'can_list' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_slider' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => array(
						'title' => array(
							'type'    => 'string',
							'default' => '',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/sliders/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_slider' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => $id_arg,
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_slider' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => $id_arg,
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'delete_slider' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => $id_arg,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/sliders/(?P<id>\d+)/duplicate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'duplicate_slider' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => $id_arg,
			)
		);

		register_rest_route(
			self::NS,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_settings' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_settings' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/video-info',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'video_info' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'source' => array(
						'type'     => 'string',
						'enum'     => array( 'youtube', 'vimeo' ),
						'required' => true,
					),
					'url'    => array(
						'type'     => 'string',
						'required' => true,
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/import',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'import_slider' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
	}

	public static function list_sliders( WP_REST_Request $req ) {
		// ?cards=1 (bacheca): anche anteprima della prima slide e font. Senza: elenco leggero per i page builder.
		if ( $req->get_param( 'cards' ) && self::can_manage() ) {
			$posts = get_posts(
				array(
					'post_type'      => KaosSlider_Store::POST_TYPE,
					'posts_per_page' => -1,
					'post_status'    => 'publish',
					'orderby'        => 'modified',
					'order'          => 'DESC',
				)
			);
			return rest_ensure_response( array_map( array( 'KaosSlider_Store', 'to_card' ), $posts ) );
		}
		return rest_ensure_response( KaosSlider_Store::all() );
	}

	public static function get_settings() {
		return rest_ensure_response( KaosSlider_Fonts::settings() );
	}

	public static function update_settings( WP_REST_Request $req ) {
		return rest_ensure_response( KaosSlider_Fonts::save_settings( (array) $req->get_json_params() ) );
	}

	public static function create_slider( WP_REST_Request $req ) {
		$id = KaosSlider_Store::save( 0, $req['title'], '', KaosSlider_Store::default_data() );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( KaosSlider_Store::to_array( get_post( $id ), true ) );
	}

	public static function get_slider( WP_REST_Request $req ) {
		$post = KaosSlider_Store::find_post( (int) $req['id'] );
		if ( ! $post ) {
			return new WP_Error( 'kaosslider_not_found', __( 'Slider not found', 'kaosslider' ), array( 'status' => 404 ) );
		}
		$out                = KaosSlider_Store::to_array( $post, true );
		$out['previewUrl']  = KaosSlider_Render::preview_url( $post->ID );
		return rest_ensure_response( $out );
	}

	public static function update_slider( WP_REST_Request $req ) {
		$post = KaosSlider_Store::find_post( (int) $req['id'] );
		if ( ! $post ) {
			return new WP_Error( 'kaosslider_not_found', __( 'Slider not found', 'kaosslider' ), array( 'status' => 404 ) );
		}
		$body  = (array) $req->get_json_params();
		$title = isset( $body['title'] ) && is_string( $body['title'] ) ? $body['title'] : $post->post_title;
		$alias = isset( $body['alias'] ) && is_string( $body['alias'] ) ? $body['alias'] : $post->post_name;
		$data  = isset( $body['data'] ) && is_array( $body['data'] ) ? $body['data'] : KaosSlider_Store::get_data( $post->ID );

		$id = KaosSlider_Store::save( $post->ID, $title, $alias, $data );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( KaosSlider_Store::to_array( get_post( $id ), true ) );
	}

	public static function delete_slider( WP_REST_Request $req ) {
		if ( ! KaosSlider_Store::delete( (int) $req['id'] ) ) {
			return new WP_Error( 'kaosslider_not_found', __( 'Slider not found', 'kaosslider' ), array( 'status' => 404 ) );
		}
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	public static function duplicate_slider( WP_REST_Request $req ) {
		$id = KaosSlider_Store::duplicate( (int) $req['id'] );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( KaosSlider_Store::to_array( get_post( $id ) ) );
	}

	/**
	 * Verifica che un video YouTube/Vimeo esista e sia incorporabile (oEmbed) e ne restituisce titolo e miniatura.
	 */
	public static function video_info( WP_REST_Request $req ) {
		$source = $req['source'];
		$url    = (string) $req['url'];
		$id     = '';

		if ( 'youtube' === $source && preg_match( '~(?:youtu\.be/|v=|embed/|shorts/|live/)([\w-]{11})~', $url, $m ) ) {
			$id       = $m[1];
			$endpoint = 'https://www.youtube.com/oembed?format=json&url=' . rawurlencode( 'https://www.youtube.com/watch?v=' . $id );
		} elseif ( 'vimeo' === $source && preg_match( '~vimeo\.com/(?:video/)?(\d+)~', $url, $m ) ) {
			$id       = $m[1];
			$endpoint = 'https://vimeo.com/api/oembed.json?url=' . rawurlencode( 'https://vimeo.com/' . $id );
		}
		if ( ! $id ) {
			return rest_ensure_response(
				array(
					'ok'      => false,
					'message' => 'youtube' === $source ? __( 'YouTube link not recognised.', 'kaosslider' ) : __( 'Vimeo link not recognised.', 'kaosslider' ),
				)
			);
		}

		$cache_key = 'kaosslider_video_' . md5( $source . $id );
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return rest_ensure_response( $cached );
		}

		$res = wp_safe_remote_get( $endpoint, array( 'timeout' => 8 ) );
		if ( is_wp_error( $res ) ) {
			// Errore di rete del server: non è un verdetto sul video, quindi niente cache.
			return rest_ensure_response(
				array(
					'ok'      => null,
					/* translators: %s: network error message. */
					'message' => sprintf( __( 'Unable to check the video right now (%s).', 'kaosslider' ), $res->get_error_message() ),
				)
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $res );
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( 200 === $code && is_array( $body ) ) {
			$thumb = isset( $body['thumbnail_url'] ) ? (string) $body['thumbnail_url'] : '';
			if ( 'youtube' === $source ) {
				$max = 'https://i.ytimg.com/vi/' . $id . '/maxresdefault.jpg';
				$h   = wp_safe_remote_head( $max, array( 'timeout' => 5 ) );
				if ( ! is_wp_error( $h ) && 200 === (int) wp_remote_retrieve_response_code( $h ) ) {
					$thumb = $max;
				}
			} elseif ( $thumb && 'i.vimeocdn.com' === wp_parse_url( $thumb, PHP_URL_HOST ) ) {
				// L'indirizzo arriva dalla risposta di Vimeo: si contatta solo il suo CDN delle immagini.
				$big = preg_replace( '/_\d+(x\d+)?(?=\?|$)/', '_1920', $thumb ); // miniatura Vimeo in alta risoluzione
				$h   = wp_safe_remote_head( $big, array( 'timeout' => 5 ) );
				if ( ! is_wp_error( $h ) && 200 === (int) wp_remote_retrieve_response_code( $h ) ) {
					$thumb = $big;
				}
			}
			$out = array(
				'ok'        => true,
				'title'     => isset( $body['title'] ) ? sanitize_text_field( $body['title'] ) : '',
				'thumbnail' => esc_url_raw( $thumb ),
			);
		} else {
			$messages = array(
				401 => __( 'The video owner does not allow embedding it on other sites.', 'kaosslider' ),
				403 => __( 'The video can only be embedded on domains authorised by its owner.', 'kaosslider' ),
				404 => __( 'Video not found: it was removed, it is private or the link is wrong.', 'kaosslider' ),
			);
			$out      = array(
				'ok'      => false,
				/* translators: %d: HTTP status code. */
				'message' => isset( $messages[ $code ] ) ? $messages[ $code ] : sprintf( __( 'Video not available (error %d).', 'kaosslider' ), $code ),
			);
		}
		set_transient( $cache_key, $out, 6 * HOUR_IN_SECONDS );
		return rest_ensure_response( $out );
	}

	/**
	 * Importa un file JSON esportato da KaosSlider.
	 */
	public static function import_slider( WP_REST_Request $req ) {
		$body = $req->get_json_params();
		if ( ! is_array( $body ) || empty( $body['kaosslider'] ) || ! isset( $body['data'] ) || ! is_array( $body['data'] ) ) {
			return new WP_Error( 'kaosslider_bad_import', __( 'Invalid file: it does not look like a KaosSlider export.', 'kaosslider' ), array( 'status' => 400 ) );
		}
		$title = isset( $body['title'] ) && is_string( $body['title'] ) ? $body['title'] : __( 'Imported slider', 'kaosslider' );
		$id    = KaosSlider_Store::save( 0, $title, '', $body['data'] );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( KaosSlider_Store::to_array( get_post( $id ) ) );
	}
}
