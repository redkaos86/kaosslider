<?php
/**
 * Widget Elementor: mostra uno slider KaosSlider.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Elementor_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'kaosslider';
	}

	public function get_title() {
		return 'KaosSlider';
	}

	public function get_icon() {
		return 'kaosslider-eicon';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( 'slider', 'carosello', 'carousel', 'hero', 'kaos' );
	}

	public function get_script_depends() {
		return array( 'kaosslider' );
	}

	public function get_style_depends() {
		return array( 'kaosslider' );
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_slider',
			array( 'label' => 'KaosSlider' )
		);

		$this->add_control(
			'slider_id',
			array(
				'label'   => 'Slider',
				'type'    => \Elementor\Controls_Manager::SELECT,
				'options' => kaosslider_options(),
				'default' => '',
			)
		);

		$this->add_control(
			'kaosslider_note',
			array(
				'type'            => \Elementor\Controls_Manager::RAW_HTML,
				'raw'             => 'Crea e modifica gli slider da <a href="' . esc_url( admin_url( 'admin.php?page=kaosslider' ) ) . '" target="_blank">KaosSlider</a>. Per un hero a tutta larghezza, metti il widget in un contenitore "Larghezza piena" senza padding.',
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-info',
			)
		);

		$this->end_controls_section();
	}

	protected function render() {
		$id = (int) $this->get_settings_for_display( 'slider_id' );
		if ( ! $id ) {
			if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
				echo '<div style="padding:40px;text-align:center;background:#f3f3f3;border:2px dashed #ccc;font-family:sans-serif">KaosSlider: scegli uno slider nel pannello a sinistra.</div>';
			}
			return;
		}
		echo KaosSlider_Render::render( $id ); // phpcs:ignore WordPress.Security.EscapeOutput -- markup già escapato dal renderer.
	}
}
