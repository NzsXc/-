/* The guide shares live game definitions and illustrations with the battle UI. */
(() => {
  'use strict';
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const basics = Object.entries(basicActions).map(([id, action]) => ({...action, id}));
  const techniques = techniquePool.map(action => ({...action, id: action.skill}));
  const skills = window.AdvancedRules.SKILLS;

  function illustration(item, skill = false) {
    const art = node('span', 'guideArt' + (skill ? ' advancedSkillOrb' : ''));
    art.setAttribute('aria-hidden', 'true');
    if (skill) {
      art.append(node('span', 'advancedSkillArt'));
      window.AdvancedSkills.paintArt(art, item.id);
    } else {
      const img = node('img');
      img.src = 'assets/actions/' + window.BattleActionArt.kindOf(item) + '.png';
      img.alt = '';
      img.draggable = false;
      art.append(img);
    }
    return art;
  }

  function card(item, skill = false) {
    const article = node('article', 'guideCard');
    article.dataset.guideId = item.id;
    const copy = node('div', 'guideCardCopy');
    copy.append(node('h3', '', item.name));
    copy.append(node('span', 'guideBadge', skill ? `1試合 ${item.limit}回` : `消費ゲージ ${item.cost}`));
    copy.append(node('p', '', item.description));
    article.append(illustration(item, skill), copy);
    return article;
  }

  for (const [id, items, skill] of [
    ['guideBasicPreview', basics, false],
    ['guideBasicActions', basics, false],
    ['guideTechniques', techniques, false],
    ['guideSkills', skills, true]
  ]) {
    document.getElementById(id).replaceChildren(...items.map(item => card(item, skill)));
  }

  // Placeholder tiers, intentionally independent of mechanics and community votes.
  const techniqueTiers = {
    S: ['tech1', 'tech5', 'tech6', 'tech9'],
    A: ['charge', 'block', 'tech2', 'tech3', 'tech10'],
    B: ['attack', 'tech4', 'tech7', 'tech11'],
    C: ['tech8', 'tech12']
  };
  const skillTiers = {S: ['cleanse', 'invincible'], A: ['boost', 'stance'], B: ['heal'], C: ['chain']};

  function tierTable(id, ranks, items, skill = false) {
    const table = document.getElementById(id);
    const byId = new Map(items.map(item => [item.id, item]));
    for (const [rank, ids] of Object.entries(ranks)) {
      const row = node('div', 'guideTierRow');
      row.dataset.rank = rank;
      row.setAttribute('role', 'row');
      const label = node('div', 'guideTierRank', rank);
      label.setAttribute('role', 'rowheader');
      label.setAttribute('aria-label', rank + 'ランク');
      const cell = node('div', 'guideTierItems');
      cell.setAttribute('role', 'cell');
      for (const itemId of ids) {
        const item = byId.get(itemId);
        const tile = node('figure', 'guideTierTile');
        tile.dataset.guideId = item.id;
        tile.title = item.name + '：' + item.description;
        tile.append(illustration(item, skill), node('figcaption', '', item.name));
        cell.append(tile);
      }
      row.append(label, cell);
      table.append(row);
    }
  }
  tierTable('guideTechniqueTiers', techniqueTiers, [...basics, ...techniques]);
  tierTable('guideSkillTiers', skillTiers, skills, true);
})();
