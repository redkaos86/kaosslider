<?php
/**
 * Plugin Name:       KaosSlider
 * Description:       Animated sliders, carousels and hero sections with a visual layer editor. Works with Gutenberg/Kadence, Elementor and Divi.
 * Version:           1.1.1
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            DrKaos
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       kaosslider
 * Update URI:        https://github.com/redkaos86/kaosslider
 */

defined( 'ABSPATH' ) || exit;

define( 'KAOSSLIDER_VERSION', '1.1.1' );
define( 'KAOSSLIDER_FILE', __FILE__ );
define( 'KAOSSLIDER_DIR', plugin_dir_path( __FILE__ ) );
define( 'KAOSSLIDER_URL', plugin_dir_url( __FILE__ ) );

require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-store.php';
require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-sanitizer.php';
require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-fonts.php';
require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-render.php';
require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-rest.php';
require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-admin.php';
require_once KAOSSLIDER_DIR . 'includes/integrations/block.php';
require_once KAOSSLIDER_DIR . 'includes/integrations/elementor.php';
require_once KAOSSLIDER_DIR . 'includes/integrations/divi.php';

// Aggiornamenti firmati da GitHub (file facoltativo: assente nelle build senza aggiornamenti propri).
if ( file_exists( KAOSSLIDER_DIR . 'includes/class-kaosslider-updater.php' ) ) {
	require_once KAOSSLIDER_DIR . 'includes/class-kaosslider-updater.php';
	KaosSlider_Updater::init();
}

/**
 * Capability necessaria per gestire gli slider.
 *
 * @return string
 */
function kaosslider_capability() {
	return apply_filters( 'kaosslider_capability', 'manage_options' );
}

/**
 * Versione di un asset: cambia quando il file viene modificato (niente cache vecchia dopo un aggiornamento).
 *
 * @param string $rel Percorso relativo alla cartella del plugin.
 * @return string
 */
function kaosslider_asset_ver( $rel ) {
	$file = KAOSSLIDER_DIR . $rel;
	return KAOSSLIDER_VERSION . ( file_exists( $file ) ? '.' . filemtime( $file ) : '' );
}

/**
 * Stampa/ritorna uno slider. Utilizzabile anche nei template del tema:
 * <?php echo kaosslider( 12 ); ?>
 *
 * @param int|string $id_or_alias ID o alias dello slider.
 * @return string
 */
function kaosslider( $id_or_alias ) {
	return KaosSlider_Render::render( $id_or_alias );
}

add_action(
	'init',
	function () {
		load_plugin_textdomain( 'kaosslider', false, dirname( plugin_basename( KAOSSLIDER_FILE ) ) . '/languages' );
	},
	0
);
add_action( 'init', array( 'KaosSlider_Store', 'register_post_type' ) );
add_action( 'init', array( 'KaosSlider_Render', 'init' ) );
add_action( 'rest_api_init', array( 'KaosSlider_REST', 'register_routes' ) );

if ( is_admin() ) {
	KaosSlider_Admin::init();
}
