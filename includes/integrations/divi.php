<?php
/**
 * Modulo Divi "KaosSlider" (Divi 4; in Divi 5 funziona tramite la compatibilità con i moduli Divi 4,
 * in alternativa usa lo shortcode in un modulo Testo/Codice).
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'et_builder_ready',
	function () {
		if ( class_exists( 'ET_Builder_Module' ) ) {
			require_once __DIR__ . '/class-kaosslider-divi-module.php';
			new KaosSlider_Divi_Module();
		}
	}
);

/* Nel Visual Builder i moduli vengono renderizzati via AJAX: lo script deve essere già presente nella pagina. */
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( function_exists( 'et_core_is_fb_enabled' ) && et_core_is_fb_enabled() ) {
			KaosSlider_Render::register_assets();
			wp_enqueue_style( 'kaosslider' );
			wp_enqueue_script( 'kaosslider' );
		}
	},
	20
);
