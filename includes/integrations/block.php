<?php
/**
 * Blocco Gutenberg "KaosSlider" (funziona anche con Kadence Blocks, che si basa su Gutenberg).
 */

defined( 'ABSPATH' ) || exit;

/**
 * Elenco id => titolo, usato dai page builder.
 */
function kaosslider_options( $placeholder = null ) {
	$options = array( '' => null === $placeholder ? __( '— Choose a slider —', 'kaosslider' ) : $placeholder );
	foreach ( KaosSlider_Store::all() as $s ) {
		$options[ (string) $s['id'] ] = $s['title'] . ' (#' . $s['id'] . ')';
	}
	return $options;
}

add_action(
	'init',
	function () {
		wp_register_script(
			'kaosslider-block',
			KAOSSLIDER_URL . 'assets/js/block.js',
			array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-api-fetch', 'wp-i18n' ),
			kaosslider_asset_ver( 'assets/js/block.js' ),
			true
		);
		wp_set_script_translations( 'kaosslider-block', 'kaosslider', KAOSSLIDER_DIR . 'languages' );
		wp_add_inline_script(
			'kaosslider-block',
			'window.KaosSliderBlock = ' . wp_json_encode( array( 'adminUrl' => admin_url( 'admin.php?page=kaosslider' ) ) ) . ';',
			'before'
		);

		register_block_type(
			'kaosslider/slider',
			array(
				'api_version'           => 3,
				'title'                 => 'KaosSlider',
				'category'              => 'media',
				'editor_script_handles' => array( 'kaosslider-block' ),
				'attributes'            => array(
					'sliderId' => array(
						'type'    => 'integer',
						'default' => 0,
					),
					'align'    => array(
						'type'    => 'string',
						'default' => 'full',
					),
				),
				'supports'              => array(
					'align' => array( 'wide', 'full' ),
					'html'  => false,
				),
				'render_callback'       => function ( $attributes ) {
					if ( empty( $attributes['sliderId'] ) ) {
						return '';
					}
					$html = KaosSlider_Render::render( (int) $attributes['sliderId'] );
					if ( '' === $html ) {
						return '';
					}
					return '<div ' . get_block_wrapper_attributes() . '>' . $html . '</div>';
				},
			)
		);
	}
);
