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
  const specialTechniques = techniques.map((item,index) => ({...window.SpecialRules.actionData(BattleV4.specialId(index),techniquePool), id:'s-' + item.id}));
  const skills = window.AdvancedRules.SKILLS;

  function illustration(item, skill = false) {
    const art = node('span', 'guideArt' + (skill ? ' advancedSkillOrb' : ''));
    if (item.special) art.classList.add('guideSpecialArt');
    art.setAttribute('aria-hidden', 'true');
    if (skill) {
      art.append(node('span', 'advancedSkillArt'));
      window.AdvancedSkills.paintArt(art, item.id);
    } else {
      const img = node('img');
      img.src = window.BattleActionArt.imageSource(window.BattleActionArt.kindOf(item));
      img.alt = '';
      img.draggable = false;
      art.append(img);
    }
    return art;
  }

  function card(item, skill = false) {
    const article = node('article', 'guideCard' + (item.special ? ' guideSpecialCard' : ''));
    article.dataset.guideId = item.id;
    const copy = node('div', 'guideCardCopy');
    copy.append(node('h3', '', item.name));
    copy.append(node('span', 'guideBadge', item.special ? `Sゲージ追加消費+${item.specialCost}` : skill ? `1試合 ${item.limit}回` : `消費ゲージ ${item.cost}`));
    copy.append(node('p', '', item.description));
    const more=node('button','guideTextLink','詳しく見る');more.type='button';more.dataset.detail=item.id;more.addEventListener('click',()=>{});copy.append(more);article.append(illustration(item, skill), copy);
    return article;
  }

  for (const [id, items, skill] of [
    ['guideBasicPreview', basics, false],
    ['guideBasicActions', basics, false],
    ['guideTechniques', techniques, false],
    ['guideSpecialTechniques', specialTechniques, false],
    ['guideSkills', skills, true]
  ]) {
    document.getElementById(id).replaceChildren(...items.map(item => card(item, skill)));
  }

  const core = window.CommunityRatingCore;
  const lists = {techniques, skills, specialTechniques};
  const tables = {techniques:'guideTechniqueTiers', skills:'guideSkillTiers', specialTechniques:'guideSpecialTechniqueTiers'};
  let current = {uid:null, canVote:false, connected:false, ballots:{techniques:{},skills:{},specialTechniques:{}}, loaded:{techniques:false,skills:false,specialTechniques:false}, errors:{}};
  let watching = false, requested = false, saving = false, formUid = null;
  const status = document.getElementById('guideRatingsStatus');

  function tierTable(category) {
    const table = document.getElementById(tables[category]);
    const summary = core.summarize(category, current.ballots[category]);
    const rows = [];
    for (const rank of ['S', 'A', 'B', 'C', 'unrated']) {
      const items = lists[category].filter(item => summary[item.id].rank === rank);
      if (rank === 'unrated' && !items.length) continue;
      const row = node('div', 'guideTierRow');
      row.dataset.rank = rank;
      row.setAttribute('role', 'row');
      const label = node('div', 'guideTierRank', rank === 'unrated' ? '未評価' : rank);
      label.setAttribute('role', 'rowheader');
      label.setAttribute('aria-label', rank === 'unrated' ? '未評価' : rank + 'ランク');
      const cell = node('div', 'guideTierItems');
      cell.setAttribute('role', 'cell');
      for (const item of items) {
        const rating = summary[item.id];
        const tile = node('figure', 'guideTierTile');
        tile.dataset.guideId = item.id;
        tile.title = item.name + '：' + rating.count + '票 / ' + item.description;
        tile.append(illustration(item, category === 'skills'), node('figcaption', '', item.name), node('span', 'guideTierScore', rating.label));
        cell.append(tile);
      }
      if (!items.length) cell.append(node('span', 'guideTierEmpty', '該当なし'));
      row.append(label, cell); rows.push(row);
    }
    table.replaceChildren(...rows);
  }

  const dialog = node('dialog', 'guideVoteDialog');
  dialog.id = 'guideVoteDialog';
  dialog.setAttribute('aria-labelledby', 'guideVoteTitle');
  dialog.setAttribute('aria-describedby', 'guideVoteHelp');
  const header = node('div', 'guideVoteHeader');
  const title = node('h2'); title.id = 'guideVoteTitle';
  const close = node('button', 'guideVoteClose', '×');
  close.type = 'button'; close.setAttribute('aria-label', '投票画面を閉じる');
  close.onclick = () => dialog.close();
  header.append(title, close);
  const help = node('p', 'guideNote', '評価したい項目に1〜10点を設定してください。再投票は前の点数に上書きされます。');
  help.id = 'guideVoteHelp';
  const form = node('form', 'guideVoteForm');
  const fields = node('div', 'guideVoteFields');
  const message = node('p', 'guideVoteMessage'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  const actions = node('div', 'guideVoteActions');
  const cancel = node('button', 'guideVoteCancel', 'キャンセル'); cancel.type = 'button'; cancel.onclick = () => dialog.close();
  const submit = node('button', 'guideVoteButton', '保存する'); submit.type = 'submit';
  const login = node('button', 'guideVoteButton', 'ログイン'); login.type = 'button';
  login.onclick = () => { dialog.close(); window.openPlayerLogin?.(); };
  actions.append(cancel, login, submit); form.append(fields, message, actions); dialog.append(header, help, form);
  document.getElementById('tipScreen').append(dialog);

  const draft = () => Object.fromEntries([...fields.querySelectorAll('select')].filter(input => input.value).map(input => [input.name, Number(input.value)]));
  function updateForm() {
    if (!dialog.open) return;
    const category = dialog.dataset.category;
    const available = current.canVote && current.loaded[category] && !current.errors[category];
    login.hidden = current.canVote;
    submit.hidden = !current.canVote;
    submit.disabled = saving || !available || !current.connected || !Object.keys(draft()).length;
    close.disabled = cancel.disabled = saving;
    submit.textContent = saving ? '保存中…' : '保存する';
    form.setAttribute('aria-busy', String(saving));
    for (const input of fields.querySelectorAll('select')) input.disabled = saving || !available;
    if (!current.canVote) message.textContent = '投票するにはアカウントでログインしてください。ゲストでは投票できません。';
    else if (current.errors[category]) message.textContent = current.errors[category];
    else if (!current.loaded[category]) message.textContent = 'あなたの投票を読み込んでいます…';
    else if (!current.connected) message.textContent = '通信が切れています。接続後に保存してください。';
  }
  function fillForm() {
    const category = dialog.dataset.category;
    formUid = current.uid;
    fields.replaceChildren(...lists[category].map(item => {
      const label = node('label', 'guideVoteField');
      const copy = node('span', 'guideVoteItemName', item.name);
      const input = node('select'); input.name = item.id; input.setAttribute('aria-label', item.name + 'の評価');
      const score = current.ballots[category]?.[current.uid]?.[item.id];
      for (const [value, text] of [['', '未評価'], ...Array.from({length:10}, (_, i) => [String(i + 1), (i + 1) + '点'])]) {
        const option = node('option', '', text); option.value = value; input.append(option);
      }
      input.value = core.validScore(score) ? String(score) : '';
      input.addEventListener('change', () => { message.textContent = ''; updateForm(); });
      label.append(illustration(item, category === 'skills'), copy, input);
      return label;
    }));
    updateForm();
  }
  function receive(value) {
    const category = dialog.dataset.category;
    const changedUser = current.uid !== value.uid;
    const justLoaded = category && !current.loaded[category] && value.loaded[category];
    current = value;
    for (const category of Object.keys(lists)) tierTable(category);
    const errors = Object.entries(current.errors).filter(([,text]) => text);
    status.replaceChildren();
    if (errors.length) {
      status.append(node('span', '', '評価を読み込めません。'));
      const retry = node('button', 'guideTextLink', '再試行'); retry.type = 'button';
      retry.onclick = () => { window.communityRatings?.retry(); };
      status.append(retry);
    } else if (!Object.values(current.loaded).every(Boolean)) status.textContent = '評価を読み込んでいます…';
    else if (!current.connected) status.textContent = '通信が切れています。表示は最後に取得した評価です。';
    else status.textContent = '';
    if (dialog.open && (changedUser || justLoaded) && !saving) { message.textContent = ''; fillForm(); }
    else if (dialog.open && !saving && current.canVote && current.loaded[category] && current.connected && !current.errors[category] && /^(あなたの投票を読み込んでいます|通信が切れています)/.test(message.textContent)) message.textContent = '';
    updateForm();
  }
  function loadRatings() {
    requested = true;
    if (watching) return;
    if (!window.communityRatings) { status.textContent = '評価を読み込んでいます…'; return; }
    watching = true;
    window.communityRatings.watch(receive);
  }
  function openVote(category) {
    loadRatings();
    dialog.dataset.category = category;
    title.textContent = category === 'specialTechniques' ? 'S技に投票' : category === 'techniques' ? '技に投票' : 'スキルに投票';
    message.textContent = '';
    dialog.showModal(); fillForm();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || submit.disabled) return;
    const category = dialog.dataset.category, uid = formUid;
    if (uid !== current.uid) { fillForm(); return; }
    saving = true; message.textContent = '保存中…'; updateForm();
    try {
      await window.communityRatings.save(category, draft());
      if (uid === current.uid) { dialog.close(); status.textContent = '投票を保存しました。'; }
    } catch (error) {
      message.textContent = error.code ? '保存できませんでした。ログイン状態と通信を確認して再度保存してください。' : error.message;
    } finally {
      saving = false;
      if (uid !== current.uid && dialog.open) fillForm();
      updateForm();
    }
  });
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  document.getElementById('guideVoteTechniques').onclick = () => openVote('techniques');
  document.getElementById('guideVoteSpecialTechniques').onclick = () => openVote('specialTechniques');
  document.getElementById('guideVoteSkills').onclick = () => openVote('skills');
  window.addEventListener('community-ratings-ready', () => { if (requested) loadRatings(); });
  window.NoticeGuide = Object.freeze({loadRatings});
  for (const category of Object.keys(lists)) tierTable(category);
})();
