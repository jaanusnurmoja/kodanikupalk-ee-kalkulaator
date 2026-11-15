<?php

/**
 * @package     Joomla.Site
 * @subpackage  Templates.cassiopeia
 *
 * @copyright   (C) 2017 Open Source Matters, Inc. <https://www.joomla.org>
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Uri\Uri;

/** @var Joomla\CMS\Document\HtmlDocument $this */

$app   = Factory::getApplication();
$input = $app->getInput();
$wa    = $this->getWebAssetManager();

$this->addHeadLink(HTMLHelper::_('image', 'kodanikupalga-ikoon.svg', '', [], true, 1), 'icon', 'rel', ['type' => 'image/svg+xml']);
$this->addHeadLink(HTMLHelper::_('image', 'favicon.ico', '', [], true, 1), 'alternate icon', 'rel', ['type' => 'image/vnd.microsoft.icon']);
$this->addHeadLink(HTMLHelper::_('image', 'joomla-favicon-pinned.svg', '', [], true, 1), 'mask-icon', 'rel', ['color' => '#000']);

// Detecting Active Variables
$option   = $input->getCmd('option', '');
$view     = $input->getCmd('view', '');
$layout   = $input->getCmd('layout', '');
$task     = $input->getCmd('task', '');
$itemid   = $input->getCmd('Itemid', '');
$sitename = htmlspecialchars($app->get('sitename'), ENT_QUOTES, 'UTF-8');
$menu     = $app->getMenu()->getActive();
$pageclass = $menu !== null ? $menu->getParams()->get('pageclass_sfx', '') : '';

// Color Theme
$paramsColorName = $this->params->get('colorName', 'colors_standard');
$assetColorName  = 'theme.' . $paramsColorName;
$wa->registerAndUseStyle($assetColorName, 'global/' . $paramsColorName . '.css');

// Use a font scheme if set in the template style options
$paramsFontScheme = $this->params->get('useFontScheme', false);
$fontStyles       = '';

if ($paramsFontScheme) {
    if (stripos($paramsFontScheme, 'https://') === 0) {
        $this->getPreloadManager()->preconnect('https://fonts.googleapis.com/', ['crossorigin' => 'anonymous']);
        $this->getPreloadManager()->preconnect('https://fonts.gstatic.com/', ['crossorigin' => 'anonymous']);
        $this->getPreloadManager()->preload($paramsFontScheme, ['as' => 'style', 'crossorigin' => 'anonymous']);
        $wa->registerAndUseStyle('fontscheme.current', $paramsFontScheme, [], ['media' => 'print', 'rel' => 'lazy-stylesheet', 'onload' => 'this.media=\'all\'', 'crossorigin' => 'anonymous']);

        if (preg_match_all('/family=([^?:]*):/i', $paramsFontScheme, $matches) > 0) {
            $fontStyles = '--cassiopeia-font-family-body: "' . str_replace('+', ' ', $matches[1][0]) . '", sans-serif;
			--cassiopeia-font-family-headings: "' . str_replace('+', ' ', $matches[1][1] ?? $matches[1][0]) . '", sans-serif;
			--cassiopeia-font-weight-normal: 400;
			--cassiopeia-font-weight-headings: 700;';
        }
    } elseif ($paramsFontScheme === 'system') {
        $fontStylesBody    = $this->params->get('systemFontBody', '');
        $fontStylesHeading = $this->params->get('systemFontHeading', '');

        if ($fontStylesBody) {
            $fontStyles = '--cassiopeia-font-family-body: ' . $fontStylesBody . ';
            --cassiopeia-font-weight-normal: 400;';
        }
        if ($fontStylesHeading) {
            $fontStyles .= '--cassiopeia-font-family-headings: ' . $fontStylesHeading . ';
    		--cassiopeia-font-weight-headings: 700;';
        }
    } else {
        $wa->registerAndUseStyle('fontscheme.current', $paramsFontScheme, ['version' => 'auto'], ['media' => 'print', 'rel' => 'lazy-stylesheet', 'onload' => 'this.media=\'all\'']);
        $this->getPreloadManager()->preload($wa->getAsset('style', 'fontscheme.current')->getUri() . '?' . $this->getMediaVersion(), ['as' => 'style']);
    }
}

// Enable assets
$wa->usePreset('template.cassiopeia.' . ($this->direction === 'rtl' ? 'rtl' : 'ltr'))
    ->useStyle('template.active.language')
    ->useStyle('template.user')
    ->useScript('template.user')
    ->addInlineStyle(":root {
		--hue: 214;
		--template-bg-light: #f0f4fb;
		--template-text-dark: #495057;
		--template-text-light: #ffffff;
		--template-link-color: var(--link-color);
		--template-special-color: #001B4C;
		$fontStyles
	}");

// Kalkulaatori kitsa vaate (mobiili) abiskript: vahelehed, lähteandmete ja kärbete peitmise nupud,
// diagrammide suurus. Versiooniks faili muutmisaeg, et brauser toob muudetud faili kohe uuesti.
$calcMobileJs = 'media/templates/site/cassiopeia_kalkulaator/js/calc-mobile.js';
$wa->registerAndUseScript(
    'template.calc-mobile',
    Uri::root(true) . $calcMobileJs,
    ['version' => (string) (@filemtime(JPATH_ROOT . $calcMobileJs) ?: 'auto')],
    ['defer' => true]
);

// Override 'template.active' asset to set correct ltr/rtl dependency
$wa->registerStyle('template.active', '', [], [], ['template.cassiopeia.' . ($this->direction === 'rtl' ? 'rtl' : 'ltr')]);

// Logo file or site title param
$logo = HTMLHelper::_('image', 'logo.svg', $sitename, ['class' => 'logo d-inline-block', 'loading' => 'eager', 'decoding' => 'async'], true, 0);

if ($this->params->get('logoFile')) {
    $logo = HTMLHelper::_('image', Uri::root(false) . htmlspecialchars($this->params->get('logoFile'), ENT_QUOTES), $sitename, ['class' => 'logo', 'loading' => 'eager', 'decoding' => 'async'], false, 0);
} 
if ($this->params->get('siteTitle')) {
    $logo .= '<div class="d-inline" title="' . $sitename . '"><h2>' . htmlspecialchars($this->params->get('siteTitle'), ENT_COMPAT, 'UTF-8') . '</h2>';
    if ($this->params->get('siteDescription')) {
       $logo .= '<h2 class="site-description">' . htmlspecialchars($this->params->get('siteDescription')) . '</h2>';
    }
  
  $logo .='</div>';
} 

$hasClass = '';

if ($this->countModules('sidebar-left', true)) {
    $hasClass .= ' has-sidebar-left';
}

if ($this->countModules('sidebar-right', true)) {
    $hasClass .= ' has-sidebar-right';
}

// Container
$wrapper = $this->params->get('fluidContainer') ? 'wrapper-fluid' : 'wrapper-static';

$this->setMetaData('viewport', 'width=device-width, initial-scale=1');

$stickyHeader = $this->params->get('stickyHeader') ? 'position-sticky sticky-top' : '';

// Defer fontawesome for increased performance. Once the page is loaded javascript changes it to a stylesheet.
$wa->getAsset('style', 'fontawesome')->setAttribute('rel', 'lazy-stylesheet');
?>
<!DOCTYPE html>
<html lang="<?php echo $this->language; ?>" dir="<?php echo $this->direction; ?>">

<head>
    <jdoc:include type="metas" />
    <jdoc:include type="styles" />
    <jdoc:include type="scripts" />
</head>

<body class="site <?php echo $option
    . ' ' . $wrapper
    . ' view-' . $view
    . ($layout ? ' layout-' . $layout : ' no-layout')
    . ($task ? ' task-' . $task : ' no-task')
    . ($itemid ? ' itemid-' . $itemid : '')
    . ($pageclass ? ' ' . $pageclass : '')
    . $hasClass
    . ($this->direction == 'rtl' ? ' rtl' : '');
?>">
    <header class="header container-header full-width<?php echo $stickyHeader ? ' ' . $stickyHeader : ''; ?>">

        <?php if ($this->countModules('topbar')) : ?>
            <div class="container-topbar">
                <jdoc:include type="modules" name="topbar" style="none" />
            </div>
        <?php endif; ?>

        <?php if ($this->countModules('below-top')) : ?>
            <div class="grid-child container-below-top">
                <jdoc:include type="modules" name="below-top" style="none" />
            </div>
        <?php endif; ?>

        <?php if ($this->params->get('brand', 1)) : ?>
            <div class="grid-child">
                <div class="navbar-brand">
                    <a class="brand-logo" href="<?php echo $this->baseurl; ?>/">
                        <?php echo $logo; ?>
                    </a>
                </div>
                <?php if ($this->countModules('language', true)) : ?>
                    <div class="container-search">
                        <jdoc:include type="modules" name="language" style="none" />
                    </div>
                <?php endif; ?>
            </div>

        <?php endif; ?>

    </header>
        <?php if ($this->countModules('menu', true) || $this->countModules('search', true)) : ?>
  <div class="header-menu container-header full-width position-sticky sticky-top">
            <div class="grid-child container-nav">
                <?php if ($this->countModules('menu', true)) : ?>
                    <jdoc:include type="modules" name="menu" style="none" />
                <?php endif; ?>
                <?php if ($this->countModules('search', true)) : ?>
                    <div class="container-search">
                        <jdoc:include type="modules" name="search" style="none" />
                    </div>
                <?php endif; ?>
            </div>
  </div>
        <?php endif; ?>
  <?php
    // Kaks veergu: lähteandmed (komponent) ja kalkulaatorimoodulid (positsioon "calc").
    // Arvutivaates (alates lg, 992 px) nagu varem: kõrvuti, 5 + 7 veergu.
    // Kitsas vaates (alla lg) saavad veergudest vahelehed (vt css/user.css ja js/calc-mobile.js).
    // Algselt avatud vaheleht: kalkulaator, kui on avatud aasta lähteandmed (details); muidu lähteandmed.
    $hasCalc  = $this->countModules('calc', true);
    $calcPane = ($hasCalc && $view === 'details') ? 'calc' : 'data';
  ?>
  <div class="container calc-layout" data-calc-pane="<?php echo $calcPane; ?>">
    <?php if ($hasCalc) : ?>
        <div class="calc-tabs" role="tablist" aria-label="Kalkulaator ja lähteandmed">
            <button type="button" class="calc-tab" role="tab" id="calc-tab-calc" aria-controls="calc-pane-calc" aria-selected="<?php echo $calcPane === 'calc' ? 'true' : 'false'; ?>" data-calc-tab="calc">Kalkulaator</button>
            <button type="button" class="calc-tab" role="tab" id="calc-tab-data" aria-controls="calc-pane-data" aria-selected="<?php echo $calcPane === 'data' ? 'true' : 'false'; ?>" data-calc-tab="data">Lähteandmed</button>
        </div>
    <?php endif; ?>
    <div class="row">
      <div class="col-12 col-lg-5 calc-pane calc-pane-data" id="calc-pane-data">
        <jdoc:include type="modules" name="main-top" style="card" />
        <jdoc:include type="component" />
      </div>
        <?php if ($hasCalc) : ?>
            <div class="col-12 col-lg-7 calc-pane calc-pane-calc" id="calc-pane-calc">
                <jdoc:include type="modules" name="calc" style="card" />
            </div>
        <?php endif; ?>
      </div>
    </div>
  
   <div class="site-grid">
         <?php if ($this->countModules('banner', true)) : ?>
            <div class="container-banner full-width">
                <jdoc:include type="modules" name="banner" style="none" />
            </div>
        <?php endif; ?>
        <?php if ($this->countModules('top-a', true)) : ?>

            <div class="grid-child container-top-a">
                <jdoc:include type="modules" name="top-a" style="card" />
            </div>
        <?php endif; ?>

        <?php if ($this->countModules('top-b', true)) : ?>
            <div class="grid-child container-top-b">
                <jdoc:include type="modules" name="top-b" style="card" />
            </div>
        <?php endif; ?>

        <?php if ($this->countModules('sidebar-left', true)) : ?>
            <div class="grid-child container-sidebar-left">
                <jdoc:include type="modules" name="sidebar-left" style="card" />
            </div>
        <?php endif; ?>

        <div class="grid-child container-component">
            <jdoc:include type="modules" name="breadcrumbs" style="none" />
            <jdoc:include type="modules" name="main-bottom" style="card" />
        </div>

        <?php if ($this->countModules('sidebar-right', true)) : ?>
            <div class="grid-child container-sidebar-right">
                <jdoc:include type="modules" name="sidebar-right" style="card" />
            </div>
        <?php endif; ?>

        <?php if ($this->countModules('bottom-a', true)) : ?>
            <div class="grid-child container-bottom-a">
                <jdoc:include type="modules" name="bottom-a" style="card" />
            </div>
        <?php endif; ?>

        <?php if ($this->countModules('bottom-b', true)) : ?>
            <div class="grid-child container-bottom-b">
                <jdoc:include type="modules" name="bottom-b" style="card" />
            </div>
        <?php endif; ?>
    </div>

    <?php if ($this->countModules('footer', true)) : ?>
        <footer class="container-footer footer full-width">
            <div class="grid-child">
                <jdoc:include type="modules" name="footer" style="none" />
            </div>
        </footer>
    <?php endif; ?>

    <?php if ($this->params->get('backTop') == 1) : ?>
        <a href="#top" id="back-top" class="back-to-top-link" aria-label="<?php echo Text::_('TPL_CASSIOPEIA_BACKTOTOP'); ?>">
            <span class="icon-arrow-up icon-fw" aria-hidden="true"></span>
        </a>
    <?php endif; ?>

    <jdoc:include type="modules" name="debug" style="none" />
</body>

</html>
