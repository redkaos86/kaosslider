<?php
/**
 * Pagine di amministrazione: elenco slider ed editor visuale.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Admin {

	const SLUG = 'kaosslider';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( KAOSSLIDER_FILE ), array( __CLASS__, 'action_links' ) );
		add_filter( 'admin_body_class', array( __CLASS__, 'body_class' ) );
	}

	public static function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && 'toplevel_page_' . self::SLUG === $screen->id ) {
			$classes .= ' kaosslider-dark';
		}
		return $classes;
	}

	public static function menu() {
		$icon = 'data:image/svg+xml;base64,' . base64_encode( (string) file_get_contents( KAOSSLIDER_DIR . 'assets/img/menu-icon.svg' ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		add_menu_page( 'KaosSlider', 'KaosSlider', kaosslider_capability(), self::SLUG, array( __CLASS__, 'page' ), $icon, 58 );
	}

	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ) . '">Slider</a>' );
		return $links;
	}

	private static function is_editor() {
		return isset( $_GET['edit'] ) && absint( $_GET['edit'] ) > 0; // phpcs:ignore WordPress.Security.NonceVerification
	}

	public static function enqueue( $hook ) {
		if ( 'toplevel_page_' . self::SLUG !== $hook ) {
			return;
		}
		KaosSlider_Render::register_assets();

		$config = array(
			'restUrl'  => esc_url_raw( rest_url( KaosSlider_REST::NS ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'adminUrl' => admin_url( 'admin.php?page=' . self::SLUG ),
			'version'  => KAOSSLIDER_VERSION,
			'logoUrl'  => KAOSSLIDER_URL . 'assets/img/logo-white.svg?v=' . kaosslider_asset_ver( 'assets/img/logo-white.svg' ),
			'markUrl'  => KAOSSLIDER_URL . 'assets/img/mark-white.svg?v=' . kaosslider_asset_ver( 'assets/img/mark-white.svg' ),
			'fontsUrl' => KAOSSLIDER_URL . 'assets/data/google-fonts.json?v=' . KAOSSLIDER_VERSION,
			'drawShapesUrl' => KAOSSLIDER_URL . 'assets/data/draw-shapes.json?v=' . kaosslider_asset_ver( 'assets/data/draw-shapes.json' ),
		);

		wp_enqueue_style( 'kaosslider-admin', KAOSSLIDER_URL . 'assets/css/admin.css', array(), kaosslider_asset_ver( 'assets/css/admin.css' ) );

		if ( self::is_editor() ) {
			wp_enqueue_media();
			wp_enqueue_style( 'kaosslider' );
			wp_enqueue_script( 'kaosslider' );
			wp_enqueue_script( 'kaosslider-gl' );
			wp_enqueue_script( 'kaosslider-editor', KAOSSLIDER_URL . 'assets/js/editor.js', array( 'kaosslider' ), kaosslider_asset_ver( 'assets/js/editor.js' ), true );
			$config['sliderId']   = isset( $_GET['edit'] ) ? absint( $_GET['edit'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification
			$config['positions']  = KaosSlider_Sanitizer::positions();
			$config['newSlide']   = KaosSlider_Store::default_slide();
			$config['bp']         = array(
				'tablet' => KaosSlider_Render::BP_TABLET,
				'mobile' => KaosSlider_Render::BP_MOBILE,
			);
			wp_add_inline_script( 'kaosslider-editor', 'window.KaosSliderConfig = ' . wp_json_encode( $config ) . ';', 'before' );
		} else {
			wp_enqueue_style( 'kaosslider' ); // le miniature usano gli stessi stili del sito
			wp_enqueue_script( 'kaosslider-list', KAOSSLIDER_URL . 'assets/js/admin-list.js', array(), kaosslider_asset_ver( 'assets/js/admin-list.js' ), true );
			wp_add_inline_script( 'kaosslider-list', 'window.KaosSliderConfig = ' . wp_json_encode( $config ) . ';', 'before' );
		}
	}

	public static function page() {
		if ( ! current_user_can( kaosslider_capability() ) ) {
			wp_die( esc_html__( 'Permessi insufficienti.', 'kaosslider' ) );
		}
		if ( self::is_editor() ) {
			echo '<div id="kaosslider-editor" class="kse-root"><div class="kse-loading">Caricamento editor…</div></div>';
			return;
		}
		?>
		<div class="ksl-wrap">
			<h1 class="screen-reader-text">KaosSlider</h1>
			<div id="ksl-app"><div class="ksl-loading">Caricamento…</div></div>
			<input type="file" id="ksl-import-file" accept="application/json,.json" hidden>
		</div>
		<?php
	}
}
