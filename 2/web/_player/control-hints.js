// One shared tooltip; touching a control announces its purpose without a hover dependency.
export function setupControlHints({ enabled, feedback }) {
  const hint = document.getElementById('control-hint');
  let active, pressed, touchHint;
  const control = target => target.closest?.('#player button, #player select, #player input, #progress, #player a');
  const label = node => node.getAttribute('aria-label') || (node.id === 'speed' ? 'سرعة التشغيل' : node.labels?.[0]?.textContent || node.textContent.trim());
  function hide() {
    active?.removeAttribute('aria-describedby'); active = null; hint.hidden = true;
  }
  function show(node) {
    hide(); if (!enabled() || !node || node.disabled || node===pressed) return;
    if (document.querySelector('#toast.show') && node.matches('#shuffle,#repeat,#rewind,#forward,#speed,.volume-mute')) return;
    const text = label(node); if (!text) return;
    active = node; hint.textContent = text; hint.hidden = false;
    node.setAttribute('aria-describedby', hint.id);
    const rect = node.getBoundingClientRect(), box = hint.getBoundingClientRect();
    hint.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + rect.width / 2 - box.width / 2))}px`;
    hint.style.top = `${Math.max(8, rect.top - box.height - 8)}px`;
  }
  document.addEventListener('pointerover', event => { if (event.pointerType !== 'touch') show(control(event.target)); });
  document.addEventListener('pointerout',event=>{const node=control(event.target);if(control(event.relatedTarget||{})!==node){if(pressed===node)pressed=null;hide();}});
  document.addEventListener('click', event=>{const node=control(event.target);if(node){pressed=node;hide();if(touchHint?.node===node)window.dispatchEvent(new CustomEvent('diwan-control-hint',{detail:touchHint.text}));}touchHint=null;});
  document.addEventListener('input', event=>{if(control(event.target))hide();});
  document.addEventListener('focusin', event => show(control(event.target)));
  document.addEventListener('focusout',()=>{pressed=null;hide();});
  document.addEventListener('pointerdown', event => {
    hide(); touchHint=null; if (event.pointerType !== 'touch' || !enabled()) return;
    const node = control(event.target); if (!node || node.disabled) return;
    // Mode buttons give their resulting state through action feedback.
    // When that is disabled, a short hint still explains the tapped control.
    if (['shuffle','repeat','rewind','forward','speed'].includes(node.id) && feedback()) return;
    if (node.matches('.copy-link,.download-audio,.volume-range,.volume-mute')) return;
    // Reserve notification space only after the tap has completed. Moving a
    // control on pointerdown can otherwise cancel a touch before click fires.
    const text = label(node); if (text) touchHint={node,text};
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('resize', hide);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('diwan-hints-change', hide);
}
