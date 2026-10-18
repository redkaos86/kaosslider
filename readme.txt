=== KaosSlider ===
Contributors: drkaos86
Tags: slider, carousel, hero, animation, video background
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress plugin for creating stunning sliders, carousels, and hero sections. Fully customizable and packed with effects.

== Description ==

Build fullscreen sliders, carousels and animated hero sections with a visual, layer-based editor.

* Text, button, image, shape, hand-drawn and filmstrip layers, with entrance, exit and loop animations.
* Backgrounds with colors, gradients, images (with Ken Burns effect) or video (file, YouTube, Vimeo).
* Slide transitions, parallax, animated canvas and WebGL effects, scroll-driven video.
* Customisable scroll-down button that takes visitors to the content below the slider.
* Glass effect, custom shadows, borders, text outlines and gradient text.
* Responsive, with separate values for desktop, tablet and mobile.
* Works with the block editor (including Kadence Blocks), Elementor and Divi, plus the `[kaosslider id="…"]` shortcode.

== External services ==

The plugin connects to external services only for the features that need them:

* **Google Fonts** (fonts.googleapis.com, fonts.gstatic.com): with the default "local" font mode, the selected font files are downloaded once to the site's server when a slider is saved, and visitors never contact Google. With the "Google" mode the stylesheet is loaded directly from Google. Privacy policy: https://policies.google.com/privacy
* **Bunny Fonts** (fonts.bunny.net): only when selected in the settings, and for previewing fonts in the editor. Privacy policy: https://bunny.net/privacy
* **YouTube** (youtube-nocookie.com, youtube.com, i.ytimg.com) and **Vimeo** (player.vimeo.com, vimeo.com, i.vimeocdn.com): only for slides with a background video from these platforms, and to check from the editor that a video can be embedded. Privacy policies: https://policies.google.com/privacy and https://vimeo.com/privacy
* **GitHub** (api.github.com and its download servers): to check for and download signed plugin updates, at most every few hours. No site data is sent. Privacy policy: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement

== Installation ==

1. Upload the `kaosslider` folder to `/wp-content/plugins/`, or install the zip from Plugins → Add New.
2. Activate the plugin.
3. Create your first slider from the KaosSlider menu.

== Screenshots ==

1. The visual editor: layers on a responsive canvas, live styling (here the frosted glass settings) and the animation timeline.
2. Layer animations: entrance, exit and loop effects, split text, delays and easing.
3. Right-click menu on any layer, with quick access to every panel.
4. The dashboard: live thumbnails, shortcode copy, duplicate, export and import.
5. A hero with a frosted glass panel, snow particles and a hand-drawn signature.
6. A 3D coverflow carousel.
7. WebGL light rays behind the slide content.

== Changelog ==

= 1.1.5 =
* New: scroll-down button. Turn it on in Slider settings to show a button at the bottom of the slider that takes visitors to the content right below it, with a smooth scroll. Choose an icon (chevron, double chevron, arrow, long arrow, mouse, triangle) or your own GIF, PNG or SVG, a shape (circle, rounded, square or none), colours, border, glass effect, size, up-and-down or pulse animation, position and an optional text. Twelve ready-made styles to start from. It leaves room for a fixed header and can be hidden on phones.

= 1.1.4 =
* Fixed "Unable to load the sliders: No route was found matching the URL and request method" on sites with "Plain" permalinks (or where /wp-json/ is not available): the dashboard and the editor now build the REST API address correctly.

= 1.1.3 =
* Mask animations (from below, from the left) no longer cut off italic letters, letters with descenders (g, p, q) and the text shadow once the animation ends.
* Hand-drawn lines no longer show a small dot before they start drawing.
* Editor: every panel section (and sub-group such as Glass effect or Shadow) can now be folded with the arrow next to its title, so the panels are much shorter. The editor remembers which sections you open, and two new buttons collapse or expand them all.
* Editor: removed a stray "null" label in the animated effect settings.

= 1.1.2 =
* Faster pages: the slider stylesheet is loaded only on pages that show a slider, and the background of the first slide starts loading right away.
* Images in the first slide are no longer lazy-loaded, so they appear sooner.
* Animations stop completely while the slider is off screen or the browser tab is hidden, saving battery on phones.

= 1.1.1 =
* Slider styles and fonts are now loaded through the WordPress style queue: sliders placed in the page content get their CSS in the page head. Nothing changes in how sliders look.

= 1.1.0 =
* The interface is now in English with a complete Italian translation, and it can be translated into other languages.
* The admin bar menu and all messages follow the site language.

= 1.0.1 =
* Updates now work without any configuration: no GitHub token is needed.

= 1.0.0 =
* First release.
