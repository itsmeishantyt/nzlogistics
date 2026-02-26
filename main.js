/* ══════════════════════════════════════════════════
   N&Z Logistics — main.js
   Theme toggle, mobile nav, scroll effects, active link
   ══════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Theme ───────────────────────────────────────
    const THEME_KEY = 'nz-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcons(theme);
    }

    function updateThemeIcons(theme) {
        document.querySelectorAll('.theme-btn').forEach(function (btn) {
            // Sun icon for dark mode (click to go light), Moon for light mode
            btn.innerHTML = theme === 'dark'
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        });
    }

    function toggleTheme() {
        var current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Apply immediately to prevent flash
    applyTheme(getPreferredTheme());

    // ── DOM Ready ───────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(function (btn) {
            btn.addEventListener('click', toggleTheme);
        });
        updateThemeIcons(getPreferredTheme());

        // ── Mobile menu ─────────────────────────────
        var hamburger = document.getElementById('hamburger');
        var mobileMenu = document.getElementById('mobile-menu');
        if (hamburger && mobileMenu) {
            hamburger.addEventListener('click', function () {
                var isOpen = mobileMenu.classList.toggle('open');
                hamburger.innerHTML = isOpen
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
            });
            // Close menu on link click
            mobileMenu.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', function () {
                    mobileMenu.classList.remove('open');
                    hamburger.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
                });
            });
        }

        // ── Scroll effect on navbar ─────────────────
        var header = document.querySelector('.site-header');
        if (header) {
            window.addEventListener('scroll', function () {
                header.classList.toggle('scrolled', window.scrollY > 20);
            }, { passive: true });
        }

        // ── Active nav link ─────────────────────────
        var currentPath = window.location.pathname;
        // Normalize: remove trailing slash, handle index
        var pageName = currentPath.split('/').pop() || 'index.html';
        if (pageName === '' || pageName === '/') pageName = 'index.html';

        document.querySelectorAll('.nav-link, .mobile-menu a:not(.btn-primary)').forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href) return;
            var linkPage = href.split('/').pop() || 'index.html';
            if (linkPage === pageName) {
                link.classList.add('active');
            }
        });
    });
})();
