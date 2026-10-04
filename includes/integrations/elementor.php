<?php
/**
 * Widget Elementor "KaosSlider".
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'elementor/widgets/register',
	function ( $widgets_manager ) {
		require_once __DIR__ . '/class-kaosslider-elementor-widget.php';
		$widgets_manager->register( new KaosSlider_Elementor_Widget() );
	}
);

// Icona del widget nel pannello di Elementor: il marchio KaosSlider come maschera, così prende il colore del tema dell'editor.
add_action(
	'elementor/editor/after_enqueue_styles',
	function () {
		$url = esc_url_raw( KAOSSLIDER_URL . 'assets/img/mark-mono.svg?v=' . kaosslider_asset_ver( 'assets/img/mark-mono.svg' ) );
		wp_register_style( 'kaosslider-elementor-icon', false, array(), KAOSSLIDER_VERSION );
		wp_enqueue_style( 'kaosslider-elementor-icon' );
		wp_add_inline_style(
			'kaosslider-elementor-icon',
			'.kaosslider-eicon{display:inline-block;width:1em;height:1em;background-color:currentColor;-webkit-mask:url("' . $url . '") center/contain no-repeat;mask:url("' . $url . '") center/contain no-repeat}'
		);
	}
);
