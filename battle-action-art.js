/* Confirmed action art. Match input and remote action privacy stay in index.html. */
(function () {
  'use strict';
  const skills = ['breach', 'counter', 'punish', 'heal', 'foresight', 'momentum', 'rampage', 'seal', 'enhance', 'siphon', 'ruin', 'mirror'];
  const colors = {charge:'#56bcf2',orb:'#ed425d',block:'#a0e6ff',breach:'#f0f4fb',counter:'#b5ccdf',punish:'#c9a75a',heal:'#49d5a1',foresight:'#6a9ae7',momentum:'#d6e3ed',rampage:'#e63f57',seal:'#dfa9ff',enhance:'#bc729a',siphon:'#43b5e1',ruin:'#9d73d8',mirror:'#b5a0d8'};
  const angles = {charge:0,orb:-18,block:90,breach:-30,counter:90,punish:90,heal:0,foresight:0,momentum:-18,rampage:-45,seal:45,enhance:-45,siphon:-40,ruin:0,mirror:90};
  const corners = new Set(['charge', 'heal', 'foresight', 'ruin']);
  const lines = new Set(['breach', 'momentum', 'siphon', 'enhance', 'rampage', 'seal', 'orb']);
  const assetBase = new URL('./assets/actions/', document.currentScript.src);

  function kindOf(action) {
    if (action?.skill) return skills[Number(action.skill.replace('tech', '')) - 1] || null;
    return {charge:'charge', attack:'orb', block:'block'}[action?.type] || null;
  }

  function paint(button, kind) {
    if (!kind || button.dataset.artKind === kind) return;
    button.querySelector('.battleActionArt')?.remove();
    const art = document.createElement('span');
    art.className = 'battleActionArt';
    art.dataset.kind = kind;
    art.setAttribute('aria-hidden', 'true');
    art.style.setProperty('--mp-symbol', colors[kind]);
    const image = document.createElement('img');
    image.src = new URL(kind + '.png', assetBase).href;
    image.alt = '';
    image.draggable = false;
    art.appendChild(image);
    for (const side of ['a', 'b']) {
      const frame = document.createElement('span');
      const angle = angles[kind], cos = Math.abs(Math.cos(angle * Math.PI / 180)), sin = Math.abs(Math.sin(angle * Math.PI / 180));
      frame.className = 'actionFrame mp-frame-' + side;
      frame.classList.toggle('mp-corner', corners.has(kind));
      frame.classList.toggle('mp-vertical', cos < .01);
      frame.classList.toggle('mp-positive', !corners.has(kind) && cos >= .01 && angle > 0);
      frame.classList.toggle('mp-symmetric', ['heal', 'foresight', 'ruin'].includes(kind));
      frame.classList.toggle('mp-lines', lines.has(kind));
      const extent = lines.has(kind) ? 24 : 30;
      frame.style.setProperty('--mp-frame-angle', angle + 'deg');
      frame.style.setProperty('--mp-frame-length', `min(${(extent / Math.max(.01, cos)).toFixed(2)}cqw,${(extent / Math.max(.01, sin)).toFixed(2)}cqh)`);
      frame.style.setProperty('--mp-frame-span-x', `calc(var(--mp-frame-length) * ${cos.toFixed(5)})`);
      frame.style.setProperty('--mp-frame-span-y', `calc(var(--mp-frame-length) * ${sin.toFixed(5)})`);
      art.appendChild(frame);
    }
    button.prepend(art);
    button.dataset.artKind = kind;
  }

  function update({loadouts, selected = {}, localPlayer = 0, spectator = false}) {
    const screen = document.getElementById('battleScreen');
    if (!screen) return;
    for (const button of screen.querySelectorAll('.action')) {
      const player = Number(button.dataset.player), id = button.dataset.action;
      const action = id.startsWith('tech') ? loadouts[player]?.[Number(id.slice(4))] : {type:id};
      paint(button, kindOf(action));
      const privateChoice = !spectator && (!localPlayer || player === localPlayer);
      const chosen = privateChoice && selected[player] === id;
      button.classList.toggle('confirmed-selected', chosen);
      button.setAttribute('aria-pressed', String(chosen));
      button.setAttribute('aria-disabled', String(!privateChoice || button.classList.contains('disabled')));
    }
  }
  window.BattleActionArt = Object.freeze({update, kindOf});
})();
