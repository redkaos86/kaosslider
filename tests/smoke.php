<?php
/**
 * Prova del plugin su una installazione WordPress vera (eseguita con: wp eval-file tests/smoke.php).
 * Fallisce se il plugin genera errori, avvisi o deprecazioni PHP, o se una funzione principale non risponde come previsto.
 */

$kaosslider_problems = array();

set_error_handler( // phpcs:ignore WordPress.PHP.DevelopmentFunctions
	function ( $no, $str, $file, $line ) use ( &$kaosslider_problems ) {
		if ( false !== strpos( str_replace( '\\', '/', $file ), '/kaosslider/' ) ) {
			$kaosslider_problems[] = "PHP [$no] $str in " . basename( $file ) . ":$line";
		}
		return false;
	}
);

$kaosslider_check = function ( $ok, $label ) use ( &$kaosslider_problems ) {
	if ( ! $ok ) {
		$kaosslider_problems[] = 'Controllo fallito: ' . $label;
	}
	WP_CLI::log( ( $ok ? 'OK   ' : 'NO   ' ) . $label );
};

$admin = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
	)
);
wp_set_current_user( $admin[0]->ID );

// Uno slider con un livello per ogni tipo e le opzioni più delicate attive.
$data                           = KaosSlider_Store::default_data();
$data['slides'][0]['bg']        = array_merge(
	$data['slides'][0]['bg'],
	array(
		'type'     => 'video',
		'video'    => 'https://example.com/video.webm',
		'videoAlt' => 'https://example.com/video.mp4',
		'poster'   => 'https://example.com/poster.jpg',
	)
);
$data['slides'][0]['fx']        = array( 'type' => 'snow' );
$data['slides'][0]['layers']    = array(
	array(
		'id'      => 'ltext',
		'type'    => 'text',
		'tag'     => 'h2',
		'content' => 'Titolo <strong>prova</strong><script>alert(1)</script>',
		'style'   => array(
			'color'      => 'linear-gradient(90deg,#f00,#00f)',
			'gfont'      => 'Lobster',
			'shadow'     => 'custom',
			'boxShadow'  => 'soft',
			'glass'      => true,
			'fontFamily' => "'Lobster', cursive",
		),
		'resp'    => array(
			'desktop' => array(
				'x' => 30,
				'y' => 40,
				'w' => 500,
			),
			'mobile'  => array( 'fs' => 20 ),
		),
	),
	array(
		'id'      => 'lbtn',
		'type'    => 'button',
		'content' => 'Vai',
		'link'    => 'javascript:alert(1)',
	),
	array(
		'id'    => 'limg',
		'type'  => 'image',
		'image' => 'https://example.com/a.png',
		'style' => array( 'shadow' => 'custom' ),
	),
	array(
		'id'    => 'lshape',
		'type'  => 'shape',
		'style' => array( 'bg' => 'url(evil)' ),
	),
	array(
		'id'      => 'ldraw',
		'type'    => 'draw',
		'content' => 'Ciao',
		'draw'    => array(
			'mode'  => 'text',
			'chalk' => true,
		),
	),
	array(
		'id'   => 'lfilm',
		'type' => 'film',
		'film' => array( 'images' => array( 'https://example.com/1.jpg', 'https://example.com/2.jpg' ) ),
	),
);
$data['slides'][]               = KaosSlider_Store::default_slide();
$data['slides'][1]['fx']        = array( 'type' => 'fluid' );

// Il download dei font non fa parte della prova (in CI non c'è rete garantita).
$kaosslider_prev = get_option( 'kaosslider_settings' );
update_option( 'kaosslider_settings', array( 'fontMode' => 'bunny' ) );

$id = KaosSlider_Store::save( 0, 'Prova automatica', 'prova-automatica', $data );
$kaosslider_check( is_int( $id ) && $id > 0, 'salvataggio dello slider' );

$saved = KaosSlider_Store::get_data( $id );
$kaosslider_check( 6 === count( $saved['slides'][0]['layers'] ), 'tutti i livelli salvati' );
$kaosslider_check( false === strpos( $saved['slides'][0]['layers'][0]['content'], '<script' ), 'script rimosso dal testo' );
$kaosslider_check( '' === $saved['slides'][0]['layers'][1]['link'], 'link javascript: rifiutato' );
$kaosslider_check( 'transparent' === $saved['slides'][0]['layers'][3]['style']['bg'], 'url() rifiutato nei colori' );
$kaosslider_check( 30 === $saved['slides'][0]['layers'][0]['resp']['desktop']->x, 'posizione del livello conservata' );
$kaosslider_check( wp_json_encode( KaosSlider_Sanitizer::slider( $saved ) ) === wp_json_encode( $saved ), 'validazione ripetibile senza perdite' );

$html = KaosSlider_Render::render( $id );
$kaosslider_check( false !== strpos( $html, 'class="kaosslider' ), 'rendering dello slider' );
$kaosslider_check( false !== strpos( $html, 'data-src-alt="https://example.com/video.mp4"' ), 'video con formato alternativo' );
$kaosslider_check( false === strpos( $html, '<script' ), 'nessuno script nel markup' );
$kaosslider_check( wp_script_is( 'kaosslider-gl', 'enqueued' ), 'script WebGL caricato quando serve' );
$kaosslider_check( false !== strpos( do_shortcode( '[kaosslider alias="prova-automatica"]' ), 'kaosslider-' . $id ), 'shortcode con alias' );
$kaosslider_check( '' !== KaosSlider_Render::preview_html( $id, $saved ), 'anteprima della bacheca' );

$copy = KaosSlider_Store::duplicate( $id );
$kaosslider_check( is_int( $copy ) && wp_json_encode( KaosSlider_Store::get_data( $copy )['slides'][0]['layers'][0]['resp'] ) === wp_json_encode( $saved['slides'][0]['layers'][0]['resp'] ), 'duplica mantiene le posizioni' );

$routes = rest_get_server()->get_routes();
$kaosslider_check( isset( $routes['/kaosslider/v1/sliders'] ), 'API REST registrate' );

wp_set_current_user( 0 );
$kaosslider_check( ! current_user_can( 'edit_post', $id ), 'i visitatori non possono modificare gli slider' );
$kaosslider_check( false === strpos( KaosSlider_Render::render( $id ), 'data-ks-edit' ), 'nessun link di modifica per i visitatori' );
$request = new WP_REST_Request( 'POST', '/kaosslider/v1/sliders/' . $id );
$kaosslider_check( 401 === rest_get_server()->dispatch( $request )->get_status(), 'API protetta per i visitatori' );

wp_delete_post( $id, true );
wp_delete_post( $copy, true );
restore_error_handler();
update_option( 'kaosslider_settings', $kaosslider_prev ? $kaosslider_prev : array() );

if ( $kaosslider_problems ) {
	WP_CLI::error( "Problemi trovati:\n" . implode( "\n", $kaosslider_problems ) );
}
WP_CLI::success( 'Prova completata senza problemi.' );
