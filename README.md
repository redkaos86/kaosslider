# KaosSlider

WordPress plugin for creating stunning sliders, carousels, and hero sections. Fully customizable and packed with effects.

Slider a schermo intero, caroselli e hero con testo animato, con editor visuale a livelli e integrazione con Gutenberg/Kadence, Elementor e Divi.

## Requisiti

- WordPress 6.2 o successivo
- PHP 7.4 o successivo

## Sviluppo

I controlli automatici (GitHub Actions) girano a ogni push e ogni settimana:

- sintassi PHP su tutte le versioni supportate, da 7.4 all'ultima;
- standard di codice e sicurezza WordPress (PHPCS) e compatibilità PHP;
- analisi statica (PHPStan);
- prova del plugin su WordPress stabile e nightly;
- Plugin Check (le linee guida di WordPress.org), a titolo informativo.

Per eseguirli in locale:

```bash
composer install
composer lint
```

Lo zip di rilascio si crea con `git archive`, che esclude i file di sviluppo indicati in `.gitattributes`.

## Traduzioni

I testi del codice sono in inglese; la traduzione italiana è in `languages/`. Dopo aver aggiunto o cambiato dei testi:

```bash
wp i18n make-pot . languages/kaosslider.pot --slug=kaosslider --exclude=vendor,node_modules,tests,bin,dist
wp i18n update-po languages/kaosslider.pot languages/
# tradurre le nuove voci in languages/kaosslider-it_IT.po, poi:
wp i18n make-mo languages
wp i18n make-json languages --no-purge
```

Il controllo automatico «Traduzione italiana completa» fallisce se una frase non è tradotta.

## Licenza

GPL-2.0-or-later
