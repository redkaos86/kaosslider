<?php
/**
 * Disinstallazione: rimuove impostazioni, cache e font scaricati.
 * Gli slider restano nel database (servono se il plugin viene reinstallato), a meno che nel
 * wp-config.php sia definita la costante KAOSSLIDER_REMOVE_ALL_DATA a true.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

function kaosslider_uninstall_site() {
	global $wpdb;

	delete_option( 'kaosslider_settings' );

	// Cache delle verifiche dei video YouTube/Vimeo.
	$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
			$wpdb->esc_like( '_transient_kaosslider_' ) . '%',
			$wpdb->esc_like( '_transient_timeout_kaosslider_' ) . '%'
		)
	);

	// Font ospitati localmente.
	$up  = wp_upload_dir( null, false );
	$dir = trailingslashit( $up['basedir'] ) . 'kaosslider-fonts';
	if ( is_dir( $dir ) ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		if ( WP_Filesystem() ) {
			global $wp_filesystem;
			$wp_filesystem->rmdir( $dir, true );
		}
	}

	if ( defined( 'KAOSSLIDER_REMOVE_ALL_DATA' ) && KAOSSLIDER_REMOVE_ALL_DATA ) {
		$ids = get_posts(
			array(
				'post_type'   => 'kaos_slider',
				'post_status' => 'any',
				'numberposts' => -1,
				'fields'      => 'ids',
			)
		);
		foreach ( $ids as $id ) {
			wp_delete_post( $id, true );
		}
	}
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids' ) ) as $kaosslider_site ) {
		switch_to_blog( $kaosslider_site );
		kaosslider_uninstall_site();
		restore_current_blog();
	}
} else {
	kaosslider_uninstall_site();
}
