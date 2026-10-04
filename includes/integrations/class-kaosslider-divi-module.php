<?php
/**
 * Modulo Divi: mostra uno slider KaosSlider.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Divi_Module extends ET_Builder_Module {

	public $slug       = 'kaosslider_divi';
	public $vb_support = 'partial';

	public function init() {
		$this->name                   = 'KaosSlider';
		$this->icon_path              = KAOSSLIDER_DIR . 'assets/img/divi-icon.svg';
		$this->main_css_element       = '%%order_class%%';
		$this->settings_modal_toggles = array(
			'general' => array(
				'toggles' => array(
					'main_content' => __( 'Slider', 'kaosslider' ),
				),
			),
		);
		$this->advanced_fields        = array(
			'background'     => false,
			'borders'        => false,
			'box_shadow'     => false,
			'filters'        => false,
			'fonts'          => false,
			'text'           => false,
			'button'         => false,
			'link_options'   => false,
			'transform'      => false,
			'animation'      => false,
			'margin_padding' => array(
				'css' => array( 'important' => 'all' ),
			),
		);
	}

	public function get_fields() {
		return array(
			'slider_id' => array(
				'label'           => __( 'Slider', 'kaosslider' ),
				'type'            => 'select',
				'option_category' => 'basic_option',
				'options'         => kaosslider_options(),
				'default'         => '',
				'toggle_slug'     => 'main_content',
				'description'     => __( 'Choose the slider to show. For a full-width hero use a full-width section without padding.', 'kaosslider' ),
			),
		);
	}

	public function render( $attrs, $content, $render_slug ) {
		$id = isset( $this->props['slider_id'] ) ? (int) $this->props['slider_id'] : 0;
		if ( ! $id ) {
			return '';
		}
		return KaosSlider_Render::render( $id );
	}
}
