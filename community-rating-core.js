/* One account contributes at most one score to each item. */
(() => {
  'use strict';
  const categories = Object.freeze({
    techniques: Object.freeze(Array.from({length:12}, (_, i) => 'tech' + (i + 1))),
    skills: Object.freeze(['boost', 'heal', 'chain', 'cleanse', 'invincible', 'stance'])
  });
  const validScore = value => Number.isInteger(value) && value >= 1 && value <= 10;
  const rank = average => average == null ? 'unrated' : average >= 9 ? 'S' : average >= 8.5 ? 'A' : average >= 7.5 ? 'B' : 'C';
  function ballot(category, value) {
    if (!categories[category] || !value || typeof value !== 'object' || Array.isArray(value)) throw Error('評価を確認してください。');
    const entries = Object.entries(value);
    if (!entries.length || entries.some(([id, score]) => !categories[category].includes(id) || !validScore(score))) throw Error('1つ以上の項目に1〜10点を設定してください。');
    return Object.fromEntries(entries);
  }
  function summarize(category, votes = {}) {
    return Object.fromEntries(categories[category].map(id => {
      const scores = Object.values(votes || {}).map(vote => vote?.[id]).filter(validScore);
      const count = scores.length, sum = scores.reduce((a, b) => a + b, 0);
      const average = count ? sum / count : null;
      return [id, {count, average, rank:rank(average), label:average == null ? '(未評価)' : '(' + average.toFixed(2) + ')'}];
    }));
  }
  const api = Object.freeze({categories, validScore, rank, ballot, summarize});
  if (typeof window !== 'undefined') window.CommunityRatingCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
