<?php
/**
 * Aggiornamenti dal repository GitHub privato, con pacchetti firmati (Ed25519).
 *
 * Si attiva solo se nel wp-config.php del sito c'è il token di lettura:
 *     define( 'KAOSSLIDER_GITHUB_TOKEN', 'github_pat_…' );
 * (token "fine-grained" con accesso al solo repository e permesso Contents: Read-only).
 *
 * Ogni pacchetto viene installato solo se la sua firma corrisponde a PUBLIC_KEY: anche chi riuscisse
 * a pubblicare una release falsa non potrebbe farla installare senza la chiave privata, che resta sul
 * computer di chi rilascia (vedi bin/release.js).
 * Questo file è indipendente dal resto del plugin e può essere tolto da una build per WordPress.org.
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Updater {

	const REPO       = 'redkaos86/kaosslider';
	const PUBLIC_KEY = 'f5z3e2IbWTEdqqPB2vWR40lH4vtwU15svW6i2dBiEIY=';
	const CACHE      = 'kaosslider_release';
	const ERROR      = 'kaosslider_update_error';
	const API        = 'https://api.github.com/repos/';

	public static function init() {
		if ( ! self::token() || self::is_dev_copy() ) {
			return;
		}
		// Header "Update URI: https://github.com/…" del plugin: WordPress chiede a questo filtro e non a WordPress.org.
		add_filter( 'update_plugins_github.com', array( __CLASS__, 'check' ), 10, 3 );
		add_filter( 'plugins_api', array( __CLASS__, 'info' ), 20, 3 );
		add_filter( 'upgrader_pre_download', array( __CLASS__, 'download' ), 10, 3 );
		add_action( 'upgrader_process_complete', array( __CLASS__, 'flush' ) );
		add_filter( 'plugin_row_meta', array( __CLASS__, 'row_meta' ), 10, 2 );
		add_action( 'admin_init', array( __CLASS__, 'manual_check' ) );
	}

	/**
	 * Copia di sviluppo (cartella collegata o con il repository git): un aggiornamento cancellerebbe i sorgenti originali.
	 */
	public static function is_dev_copy() {
		$dir = untrailingslashit( KAOSSLIDER_DIR );
		return is_link( $dir ) || file_exists( $dir . '/.git' );
	}

	private static function token() {
		return defined( 'KAOSSLIDER_GITHUB_TOKEN' ) ? trim( (string) KAOSSLIDER_GITHUB_TOKEN ) : '';
	}

	private static function request( $url, $accept, $args = array() ) {
		return wp_safe_remote_get(
			$url,
			array_merge(
				array(
					'timeout' => 15,
					'headers' => array(
						'Authorization'        => 'Bearer ' . self::token(),
						'Accept'               => $accept,
						'X-GitHub-Api-Version' => '2022-11-28',
						'User-Agent'           => 'KaosSlider/' . KAOSSLIDER_VERSION,
					),
				),
				$args
			)
		);
	}

	/**
	 * Ultima release pubblicata: versione, id degli allegati (zip e firma), note, data.
	 * Resta in cache 6 ore (30 minuti in caso di errore, per non insistere con GitHub).
	 *
	 * @return array|null
	 */
	public static function release( $force = false ) {
		$cached = get_site_transient( self::CACHE );
		if ( ! $force && is_array( $cached ) ) {
			return ! empty( $cached['ok'] ) ? $cached : null;
		}
		$rel   = null;
		$error = '';
		$res   = self::request( self::API . self::REPO . '/releases/latest', 'application/vnd.github+json' );
		$code  = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		if ( 200 === $code ) {
			$body    = json_decode( wp_remote_retrieve_body( $res ), true );
			$version = isset( $body['tag_name'] ) ? ltrim( (string) $body['tag_name'], 'v' ) : '';
			$assets  = array();
			foreach ( isset( $body['assets'] ) && is_array( $body['assets'] ) ? $body['assets'] : array() as $a ) {
				if ( isset( $a['name'], $a['id'] ) ) {
					$assets[ (string) $a['name'] ] = (int) $a['id'];
				}
			}
			$zip = 'kaosslider-' . $version . '.zip';
			if ( preg_match( '/^\d+\.\d+\.\d+$/', $version ) && isset( $assets[ $zip ], $assets[ $zip . '.sig' ] ) ) {
				$rel = array(
					'ok'      => true,
					'version' => $version,
					'zip'     => $assets[ $zip ],
					'sig'     => $assets[ $zip . '.sig' ],
					'notes'   => isset( $body['body'] ) ? (string) $body['body'] : '',
					'date'    => isset( $body['published_at'] ) ? (string) $body['published_at'] : '',
				);
			} else {
				$error = 'l\'ultima release su GitHub non contiene lo zip firmato.';
			}
		} elseif ( 401 === $code ) {
			$error = 'il token GitHub non è valido o è scaduto.';
		} elseif ( 403 === $code || 404 === $code ) {
			$error = 'il token GitHub non ha accesso al repository (o non c\'è ancora nessuna release).';
		} else {
			$error = is_wp_error( $res ) ? $res->get_error_message() : 'risposta inattesa da GitHub (' . $code . ').';
		}

		set_site_transient( self::CACHE, $rel ? $rel : array( 'ok' => false ), $rel ? 6 * HOUR_IN_SECONDS : 30 * MINUTE_IN_SECONDS );
		if ( $error ) {
			set_site_transient( self::ERROR, $error, DAY_IN_SECONDS );
		} else {
			delete_site_transient( self::ERROR );
		}
		return $rel;
	}

	/**
	 * Indirizzo del pacchetto: l'API di GitHub per lo zip, riconosciuta poi da download().
	 */
	private static function package_url( $rel ) {
		return self::API . self::REPO . '/releases/assets/' . $rel['zip'];
	}

	public static function check( $update, $plugin_data, $plugin_file ) {
		if ( plugin_basename( KAOSSLIDER_FILE ) !== $plugin_file ) {
			return $update;
		}
		$rel = self::release();
		if ( ! $rel ) {
			return $update;
		}
		return array(
			'slug'         => 'kaosslider',
			'version'      => $rel['version'],
			'url'          => 'https://github.com/' . self::REPO,
			'package'      => self::package_url( $rel ),
			'requires_php' => '7.4',
			'icons'        => array(
				'1x' => KAOSSLIDER_URL . 'assets/img/icon-128x128.png',
				'2x' => KAOSSLIDER_URL . 'assets/img/icon-256x256.png',
			),
		);
	}

	/**
	 * Finestra "Visualizza i dettagli" con le note della release.
	 */
	public static function info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'kaosslider' !== $args->slug ) {
			return $result;
		}
		$rel = self::release();
		if ( ! $rel ) {
			return $result;
		}
		return (object) array(
			'name'          => 'KaosSlider',
			'slug'          => 'kaosslider',
			'version'       => $rel['version'],
			'author'        => 'DrKaos',
			'requires'      => '6.2',
			'requires_php'  => '7.4',
			'last_updated'  => $rel['date'],
			'download_link' => self::package_url( $rel ),
			'sections'      => array(
				'changelog' => wpautop( esc_html( $rel['notes'] ) ),
			),
		);
	}

	/**
	 * Scarica un allegato privato: GitHub risponde con un reindirizzamento a un indirizzo temporaneo,
	 * che si segue senza inviargli il token.
	 *
	 * @return string|WP_Error Contenuto (o percorso del file se $file è indicato).
	 */
	private static function fetch_asset( $id, $file = '' ) {
		$res = self::request( self::API . self::REPO . '/releases/assets/' . (int) $id, 'application/octet-stream', array( 'redirection' => 0 ) );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( in_array( $code, array( 301, 302, 303, 307, 308 ), true ) ) {
			$location = wp_remote_retrieve_header( $res, 'location' );
			if ( ! is_string( $location ) || 0 !== strpos( $location, 'https://' ) ) {
				return new WP_Error( 'kaosslider_download', 'Indirizzo di download non valido.' );
			}
			$args = array( 'timeout' => 300 );
			if ( $file ) {
				$args['stream']   = true;
				$args['filename'] = $file;
			}
			$res  = wp_safe_remote_get( $location, $args );
			$code = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		} elseif ( 200 === $code && $file ) {
			file_put_contents( $file, wp_remote_retrieve_body( $res ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		if ( 200 !== $code ) {
			return new WP_Error( 'kaosslider_download', 'Download da GitHub non riuscito (' . $code . ').' );
		}
		return $file ? $file : wp_remote_retrieve_body( $res );
	}

	/**
	 * Scarica lo zip della release e lo consegna al programma di aggiornamento solo se la firma è valida.
	 */
	public static function download( $reply, $package, $upgrader ) {
		$prefix = self::API . self::REPO . '/releases/assets/';
		if ( false !== $reply || ! is_string( $package ) || 0 !== strpos( $package, $prefix ) ) {
			return $reply;
		}
		$rel = self::release();
		if ( ! $rel || (int) substr( $package, strlen( $prefix ) ) !== $rel['zip'] ) {
			$rel = self::release( true ); // la release potrebbe essere cambiata nel frattempo
		}
		if ( ! $rel || (int) substr( $package, strlen( $prefix ) ) !== $rel['zip'] ) {
			return new WP_Error( 'kaosslider_download', 'Pacchetto di aggiornamento sconosciuto.' );
		}

		if ( $upgrader && isset( $upgrader->skin ) ) {
			$upgrader->skin->feedback( 'Download dell\'aggiornamento da GitHub…' );
		}
		$sig = self::fetch_asset( $rel['sig'] );
		if ( is_wp_error( $sig ) ) {
			return $sig;
		}
		$tmp = wp_tempnam( 'kaosslider-' . $rel['version'] . '.zip' );
		$zip = self::fetch_asset( $rel['zip'], $tmp );
		if ( is_wp_error( $zip ) ) {
			wp_delete_file( $tmp );
			return $zip;
		}

		if ( ! self::verify( (string) file_get_contents( $tmp ), $sig ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions
			wp_delete_file( $tmp );
			return new WP_Error( 'kaosslider_signature', 'La firma del pacchetto non è valida: aggiornamento annullato per sicurezza.' );
		}
		if ( $upgrader && isset( $upgrader->skin ) ) {
			$upgrader->skin->feedback( 'Firma del pacchetto verificata.' );
		}
		return $tmp;
	}

	/**
	 * Firma Ed25519 (libsodium, o la sua versione PHP inclusa in WordPress).
	 */
	public static function verify( $data, $signature_b64 ) {
		$sig = base64_decode( trim( (string) $signature_b64 ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		$key = base64_decode( self::PUBLIC_KEY, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions
		if ( ! function_exists( 'sodium_crypto_sign_verify_detached' ) || 64 !== strlen( (string) $sig ) || 32 !== strlen( (string) $key ) ) {
			return false;
		}
		try {
			return sodium_crypto_sign_verify_detached( $sig, $data, $key );
		} catch ( Exception $e ) {
			return false;
		}
	}

	public static function flush() {
		delete_site_transient( self::CACHE );
	}

	/**
	 * Nella pagina Plugin: link "Controlla aggiornamenti" ed eventuale problema con GitHub.
	 */
	public static function row_meta( $links, $file ) {
		if ( plugin_basename( KAOSSLIDER_FILE ) !== $file || ! current_user_can( 'update_plugins' ) ) {
			return $links;
		}
		$links[] = '<a href="' . esc_url( wp_nonce_url( admin_url( 'plugins.php?kaosslider_check=1' ), 'kaosslider_check' ) ) . '">' . esc_html__( 'Controlla aggiornamenti', 'kaosslider' ) . '</a>';
		$error   = get_site_transient( self::ERROR );
		if ( $error ) {
			$links[] = '<span style="color:#b32d2e">' . esc_html( 'Aggiornamenti: ' . $error ) . '</span>';
		}
		return $links;
	}

	public static function manual_check() {
		if ( empty( $_GET['kaosslider_check'] ) || ! current_user_can( 'update_plugins' ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		check_admin_referer( 'kaosslider_check' );
		self::release( true );
		delete_site_transient( 'update_plugins' );
		wp_update_plugins();
		wp_safe_redirect( admin_url( 'plugins.php' ) );
		exit;
	}
}
