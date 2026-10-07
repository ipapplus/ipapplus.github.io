(function () {
const sections = ['home', 'search', 'history', 'settings'];
function show() {
 const section = sections.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
 document.querySelectorAll('[data-panel]').forEach(el => el.hidden = el.dataset.panel !== section);
 document.querySelectorAll('[data-section]').forEach(el => { if (el.dataset.section === section) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
}
window.addEventListener('hashchange', () => {
 if (!sections.includes(location.hash.slice(1))) return;
 show();
 document.querySelector('[data-panel]:not([hidden]) h2').focus();
});
show();
})();
