<?php
/**
 * Web font del catalogo Google Fonts (open source), serviti in modo rispettoso della privacy:
 * - local  (predefinito): i file vengono scaricati una volta sul server del sito, i visitatori non contattano terzi;
 * - bunny: CDN europea senza tracciamento (fonts.bunny.net), stesso catalogo;
 * - google: collegamento diretto a Google Fonts (sconsigliato in UE).
 */

defined( 'ABSPATH' ) || exit;

class KaosSlider_Fonts {

	const OPTION = 'kaosslider_settings';
	const DIR    = 'kaosslider-fonts';

	private static $catalog = null;

	public static function settings() {
		$s = get_option( self::OPTION, array() );
		return array(
			'fontMode' => isset( $s['fontMode'] ) && in_array( $s['fontMode'], array( 'local', 'bunny', 'google' ), true ) ? $s['fontMode'] : 'local',
		);
	}

	public static function save_settings( $input ) {
		$mode = isset( $input['fontMode'] ) && in_array( $input['fontMode'], array( 'local', 'bunny', 'google' ), true ) ? $input['fontMode'] : 'local';
		update_option( self::OPTION, array( 'fontMode' => $mode ), false );
		return self::settings();
	}

	/**
	 * Catalogo: family => array( pesi disponibili, corsivo disponibile ).
	 */
	private static function catalog() {
		if ( null === self::$catalog ) {
			self::$catalog = array();
			$raw           = file_get_contents( KAOSSLIDER_DIR . 'assets/data/google-fonts.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			foreach ( (array) json_decode( $raw, true ) as $f ) {
				self::$catalog[ $f[0] ] = array( array_map( 'intval', explode( ',', $f[2] ) ), ! empty( $f[3] ) );
			}
		}
		return self::$catalog;
	}

	private static function nearest( $weights, $w ) {
		$best = $weights[0];
		foreach ( $weights as $x ) {
			if ( abs( $x - $w ) < abs( $best - $w ) ) {
				$best = $x;
			}
		}
		return $best;
	}

	/**
	 * Font usati da uno slider: family => array( 'w' => pesi, 'i' => pesi in corsivo ).
	 */
	public static function collect( $data ) {
		$cat  = self::catalog();
		$used = array();
		foreach ( $data['slides'] as $slide ) {
			foreach ( $slide['layers'] as $layer ) {
				$fam = isset( $layer['style']['gfont'] ) ? $layer['style']['gfont'] : '';
				if ( ! $fam || ! isset( $cat[ $fam ] ) ) {
					continue;
				}
				list( $avail, $has_italic ) = $cat[ $fam ];
				$w     = $layer['style']['fontWeight'] ? (int) $layer['style']['fontWeight'] : 400;
				$need  = array( $w );
				$c     = (string) $layer['content'];
				$bold  = (bool) preg_match( '/<(strong|b)[\s>]/i', $c );
				$ital  = $layer['style']['italic'] || preg_match( '/<(em|i)[\s>]/i', $c );
				if ( $bold ) {
					$need[] = 700;
				}
				if ( ! isset( $used[ $fam ] ) ) {
					$used[ $fam ] = array(
						'w' => array(),
						'i' => array(),
					);
				}
				foreach ( $need as $n ) {
					$nw                   = self::nearest( $avail, $n );
					$used[ $fam ]['w'][ $nw ] = $nw;
					if ( $ital && $has_italic ) {
						$used[ $fam ]['i'][ $nw ] = $nw;
					}
				}
			}
		}
		foreach ( $used as &$u ) {
			sort( $u['w'] );
			sort( $u['i'] );
		}
		ksort( $used );
		return $used;
	}

	public static function google_url( $fonts ) {
		$parts = array();
		foreach ( $fonts as $fam => $u ) {
			$name = str_replace( ' ', '+', $fam );
			if ( $u['i'] ) {
				$tuples = array();
				foreach ( $u['w'] as $w ) {
					$tuples[] = '0,' . $w;
				}
				foreach ( $u['i'] as $w ) {
					$tuples[] = '1,' . $w;
				}
				$parts[] = 'family=' . $name . ':ital,wght@' . implode( ';', $tuples );
			} else {
				$parts[] = 'family=' . $name . ':wght@' . implode( ';', $u['w'] );
			}
		}
		return 'https://fonts.googleapis.com/css2?' . implode( '&', $parts ) . '&display=swap';
	}

	public static function bunny_url( $fonts ) {
		$parts = array();
		foreach ( $fonts as $fam => $u ) {
			$vars = array_map( 'strval', $u['w'] );
			foreach ( $u['i'] as $w ) {
				$vars[] = $w . 'i';
			}
			$parts[] = strtolower( str_replace( ' ', '-', $fam ) ) . ':' . implode( ',', $vars );
		}
		return 'https://fonts.bunny.net/css?family=' . implode( '|', $parts ) . '&display=swap';
	}

	private static function paths( $fonts ) {
		$up  = wp_upload_dir( null, false );
		$key = substr( md5( wp_json_encode( $fonts ) ), 0, 12 );
		return array(
			'dir'     => trailingslashit( $up['basedir'] ) . self::DIR,
			'url'     => trailingslashit( $up['baseurl'] ) . self::DIR,
			'css'     => trailingslashit( $up['basedir'] ) . self::DIR . '/fonts-' . $key . '.css',
			'css_url' => trailingslashit( $up['baseurl'] ) . self::DIR . '/fonts-' . $key . '.css',
		);
	}

	/**
	 * Scarica i font sul server (una volta sola) e crea un CSS che punta ai file locali.
	 *
	 * @return string URL del CSS locale, '' se il download non è riuscito.
	 */
	public static function prepare_local( $fonts ) {
		if ( ! $fonts ) {
			return '';
		}
		$p = self::paths( $fonts );
		if ( file_exists( $p['css'] ) ) {
			return $p['css_url'];
		}
		// Con uno user agent moderno Google restituisce i file woff2, i più leggeri.
		$res = wp_safe_remote_get(
			self::google_url( $fonts ),
			array(
				'timeout'    => 15,
				'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
			)
		);
		if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
			return '';
		}
		$css = wp_remote_retrieve_body( $res );

		// Solo gli alfabeti latini (italiano e lingue europee): file più piccoli.
		$blocks = preg_split( '~(?=/\*\s*[\w-]+\s*\*/)~', $css );
		$keep   = '';
		foreach ( $blocks as $b ) {
			if ( preg_match( '~^/\*\s*(latin|latin-ext)\s*\*/~', trim( $b ) ) ) {
				$keep .= $b;
			}
		}
		if ( '' === trim( $keep ) ) {
			$keep = $css;
		}

		if ( ! wp_mkdir_p( $p['dir'] . '/files' ) ) {
			return '';
		}
		$ok  = true;
		$out = preg_replace_callback(
			'~url\((https://fonts\.gstatic\.com/[^)\s]+\.woff2)\)~',
			function ( $m ) use ( $p, &$ok ) {
				$name = substr( md5( $m[1] ), 0, 16 ) . '.woff2';
				$file = $p['dir'] . '/files/' . $name;
				if ( ! file_exists( $file ) ) {
					$r    = wp_safe_remote_get( $m[1], array( 'timeout' => 20 ) );
					$font = is_wp_error( $r ) ? '' : wp_remote_retrieve_body( $r );
					// Si salva solo un vero file WOFF2 (firma "wOF2") di dimensioni ragionevoli.
					if ( 200 !== (int) wp_remote_retrieve_response_code( $r ) || 'wOF2' !== substr( $font, 0, 4 ) || strlen( $font ) > 2 * MB_IN_BYTES ) {
						$ok = false;
						return $m[0];
					}
					file_put_contents( $file, $font ); // phpcs:ignore WordPress.WP.AlternativeFunctions
				}
				return 'url(' . $p['url'] . '/files/' . $name . ')';
			},
			$keep
		);
		if ( ! $ok || false !== strpos( $out, 'fonts.gstatic.com' ) ) {
			return ''; // mai collegare il visitatore a Google per errore: si riproverà al prossimo salvataggio
		}
		// Ogni url() deve puntare ai file appena salvati e il CSS non deve contenere altro che regole @font-face.
		preg_match_all( '~url\(([^)]*)\)~', $out, $urls );
		foreach ( $urls[1] as $u ) {
			if ( 0 !== strpos( $u, $p['url'] . '/files/' ) ) {
				return '';
			}
		}
		if ( preg_match( '~@import|<|expression\(~i', $out ) ) {
			return '';
		}
		file_put_contents( $p['css'], "/* KaosSlider: font ospitati localmente */\n" . $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		return $p['css_url'];
	}

	/**
	 * Foglio di stile dei font per uno slider, secondo la modalità scelta.
	 *
	 * @param array $data  Dati dello slider.
	 * @param bool  $admin In bacheca: se i file locali non ci sono ancora, si usa Bunny per l'anteprima invece di scaricare.
	 */
	public static function stylesheet_url( $data, $admin = false ) {
		$fonts = self::collect( $data );
		if ( ! $fonts ) {
			return '';
		}
		$mode = self::settings()['fontMode'];
		if ( 'google' === $mode ) {
			return self::google_url( $fonts );
		}
		if ( 'bunny' === $mode ) {
			return self::bunny_url( $fonts );
		}
		$p = self::paths( $fonts );
		if ( file_exists( $p['css'] ) ) {
			return $p['css_url'];
		}
		return $admin ? self::bunny_url( $fonts ) : self::prepare_local( $fonts );
	}
}
