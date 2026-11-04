import {serveSoloAsset} from './solo-assets.mjs';
import {createSoloService} from './solo-core.mjs';
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/engine/combat-v4.js
var combat_v4_exports = {};
var init_combat_v4 = __esm({
  "server/engine/combat-v4.js"() {
    (() => {
      const ACTIONS3 = [
        { cost: 0, type: "charge", skill: "", power: 0, pierce: false },
        { cost: 1, type: "attack", skill: "", power: 1, pierce: false },
        { cost: 0, type: "block", skill: "", power: 0, pierce: false },
        { cost: 4, type: "attack", skill: "tech1", power: 2, pierce: true },
        { cost: 2, type: "reflect", skill: "tech2", power: 0, pierce: false },
        { cost: 5, type: "attack", skill: "tech3", power: 2, pierce: false },
        { cost: 2, type: "heal", skill: "tech4", power: 0, pierce: false },
        { cost: 1, type: "block", skill: "tech5", power: 0, pierce: false },
        { cost: 2, type: "attack", skill: "tech6", power: 1, pierce: false },
        { cost: 0, type: "special", skill: "tech7", power: 0, pierce: false },
        { cost: 0, type: "seal", skill: "tech8", power: 0, pierce: false },
        { cost: 2, type: "enhance", skill: "tech9", power: 0, pierce: false },
        { cost: 3, type: "siphon", skill: "tech10", power: 0, pierce: false },
        { cost: 1, type: "ruin", skill: "tech11", power: 0, pierce: false },
        { cost: 2, type: "mirror", skill: "tech12", power: 0, pierce: false }
      ];
      const S_COSTS2 = [12, 8, 8, 12, 12, 8, 12, 12, 16, 8, 6, 6];
      ACTIONS3.push(...ACTIONS3.slice(3).map((a, i) => ({ ...a, special: true, specialCost: S_COSTS2[i] })));
      const clamp3 = (n, min, max) => Math.max(min, Math.min(max, n));
      const chosen3 = (s, moves, p, maxGauge) => Number.isInteger(moves?.[p]) ? moves[p] : s["gauge" + p] >= maxGauge ? 1 : 0;
      function core(s, moves, rulesVersion = 2, roomRules = {}, powerBonus = {}, foresightShield = false, actionCatalog = ACTIONS3) {
        const maxHp = roomRules.hp ?? 10, maxGauge = roomRules.maxGauge ?? 10;
        const out = {}, modern = rulesVersion === 3;
        out.action1 = chosen3(s, moves, 1, maxGauge);
        out.misses1 = Number.isInteger(moves?.[1]) ? 0 : s.misses1 + 1;
        out.action2 = chosen3(s, moves, 2, maxGauge);
        out.misses2 = Number.isInteger(moves?.[2]) ? 0 : s.misses2 + 1;
        const raw1 = actionCatalog[out.action1] || actionCatalog[0], raw2 = actionCatalog[out.action2] || actionCatalog[0];
        const none = { cost: 0, type: "", skill: "", power: 0, pierce: false };
        const e1 = raw1.skill === "tech12" ? raw2.skill === "tech12" ? none : raw2 : raw1;
        const e2 = raw2.skill === "tech12" ? raw1.skill === "tech12" ? none : raw1 : raw2;
        if (modern) for (const p of [1, 2]) {
          const raw = p === 1 ? raw1 : raw2, e = p === 1 ? e1 : e2, other = p === 1 ? raw2 : raw1;
          for (const k of ["gauge", "hp", "seal", "ruin", "last", "specialSeal", "specialRuin"]) out["input" + k[0].toUpperCase() + k.slice(1) + p] = s[k + p];
          out["stance" + p] = powerBonus[p] === 1 ? 1 : 0;
          out["effective" + p] = raw.skill === "tech12" ? other.skill === "tech12" ? -1 : out["action" + (3 - p)] : out["action" + p];
          out["baseAction" + p] = out["action" + p] >= 15 ? out["action" + p] - 12 : out["action" + p];
          out["effectBase" + p] = out["effective" + p] >= 15 ? out["effective" + p] - 12 : out["effective" + p];
          out["specialCost" + p] = raw.special ? raw.specialCost : 0;
          out["specialGain" + p] = e.special && e.skill === "tech7" ? 15 : 0;
        }
        out.cost1 = raw1.cost;
        out.cost2 = raw2.cost;
        out.type1 = e1.type;
        out.type2 = e2.type;
        out.skill1 = e1.skill;
        out.skill2 = e2.skill;
        out.attack1 = e1.type === "attack";
        out.attack2 = e2.type === "attack";
        out.reflect1 = e1.type === "reflect";
        out.reflect2 = e2.type === "reflect";
        out.paid1 = clamp3(s.gauge1 - raw1.cost, 0, maxGauge);
        out.paid2 = clamp3(s.gauge2 - raw2.cost, 0, maxGauge);
        out.sealed1 = s.seal1 === true || e2.skill === "tech8" && s.gauge1 < 7;
        out.sealed2 = s.seal2 === true || e1.skill === "tech8" && s.gauge2 < 7;
        out.reflect1 = out.reflect1 && !out.sealed1;
        out.reflect2 = out.reflect2 && !out.sealed2;
        out.blocking1 = e1.type === "block" && !out.sealed1;
        out.blocking2 = e2.type === "block" && !out.sealed2;
        out.charged1 = e1.type === "charge" ? clamp3(out.paid1 + 2, 0, maxGauge) : out.paid1;
        out.charged2 = e2.type === "charge" ? clamp3(out.paid2 + 2, 0, maxGauge) : out.paid2;
        out.foresight1 = e1.skill === "tech5" && e2.type === "charge" ? clamp3(out.charged1 + 3, 0, maxGauge) : out.charged1;
        if (modern && e1.special && e1.skill === "tech5") out.foresight1 = clamp3(out.foresight1 + 3, 0, maxGauge);
        out.foresight2 = e2.skill === "tech5" && e1.type === "charge" ? clamp3(out.charged2 + 3, 0, maxGauge) : out.charged2;
        if (modern && e2.special && e2.skill === "tech5") out.foresight2 = clamp3(out.foresight2 + 3, 0, maxGauge);
        out.healed1 = e1.skill === "tech4" ? clamp3(s.hp1 + (modern && e1.special ? 2 : 1), 0, maxHp) : s.hp1;
        out.healed2 = e2.skill === "tech4" ? clamp3(s.hp2 + (modern && e2.special ? 2 : 1), 0, maxHp) : s.hp2;
        out.basePower1 = e1.power;
        out.basePower2 = e2.power;
        out.power1 = out.attack1 ? Math.max(0, (e1.skill === "tech6" ? (s.momentum1 ? 2 : 1) + (modern ? s.specialMomentum1 || 0 : 0) : modern && e1.special && e1.skill === "tech3" ? 3 : e1.power) + (s.enhance1 > 0 ? 1 : 0) + (powerBonus[1] === 1 ? 1 : 0) - (roomRules.specialVersion >= 4 && s.weaken1 > 0 ? 1 : 0)) : 0;
        out.power2 = out.attack2 ? Math.max(0, (e2.skill === "tech6" ? (s.momentum2 ? 2 : 1) + (modern ? s.specialMomentum2 || 0 : 0) : modern && e2.special && e2.skill === "tech3" ? 3 : e2.power) + (s.enhance2 > 0 ? 1 : 0) + (powerBonus[2] === 1 ? 1 : 0) - (roomRules.specialVersion >= 4 && s.weaken2 > 0 ? 1 : 0)) : 0;
        out.pierce1 = !!e1.pierce;
        out.pierce2 = !!e2.pierce;
        let d1 = s.ruin1 > 0 && e1.type === "charge" ? 1 : 0, d2 = s.ruin2 > 0 && e2.type === "charge" ? 1 : 0;
        if (out.reflect1 && out.attack2) d2 += modern && e1.special ? 2 : 1;
        if (out.reflect2 && out.attack1) d1 += modern && e2.special ? 2 : 1;
        if (out.attack1 && out.attack2) {
          const win1 = modern && e1.special && e1.skill === "tech1", win2 = modern && e2.special && e2.skill === "tech1";
          d1 += win1 && !win2 ? 0 : win2 && !win1 ? out.power2 : Math.max(0, out.power2 - out.power1);
          d2 += win2 && !win1 ? 0 : win1 && !win2 ? out.power1 : Math.max(0, out.power1 - out.power2);
        } else {
          if (out.attack2 && !out.reflect1 && (!out.blocking1 || out.pierce2 && !(foresightShield && e1.skill === "tech5"))) d1 += out.power2;
          if (out.attack1 && !out.reflect2 && (!out.blocking2 || out.pierce1 && !(foresightShield && e2.skill === "tech5"))) d2 += out.power1;
        }
        if (e2.skill === "tech3" && !(modern && e2.special) && e1.type === "charge" && !out.blocking1 && !out.reflect1) d1 += roomRules.classic ? 2 : rulesVersion >= 2 ? 1 : 2;
        if (e1.skill === "tech3" && !(modern && e1.special) && e2.type === "charge" && !out.blocking2 && !out.reflect2) d2 += roomRules.classic ? 2 : rulesVersion >= 2 ? 1 : 2;
        if (e1.skill === "tech7") d1 += 2;
        if (e2.skill === "tech7") d2 += 2;
        out.damage1 = d1;
        out.damage2 = d2;
        out.rampage1 = e1.skill === "tech7" ? clamp3(out.foresight1 + 8, 0, maxGauge) : out.foresight1;
        out.rampage2 = e2.skill === "tech7" ? clamp3(out.foresight2 + 8, 0, maxGauge) : out.foresight2;
        out.stolen1 = e1.skill === "tech10" ? Math.min(modern && e1.special ? 3 : 2, out.rampage2) : 0;
        out.stolen2 = e2.skill === "tech10" ? Math.min(modern && e2.special ? 3 : 2, out.rampage1) : 0;
        out.gauge1 = clamp3(out.rampage1 + out.stolen1 - out.stolen2, 0, maxGauge);
        out.gauge2 = clamp3(out.rampage2 + out.stolen2 - out.stolen1, 0, maxGauge);
        if (rulesVersion >= 2 && !roomRules.classic) {
          out.gauge1 = Math.max(0, out.gauge1 - (e2.skill === "tech3" ? 1 : 0));
          out.gauge2 = Math.max(0, out.gauge2 - (e1.skill === "tech3" ? 1 : 0));
        }
        if (modern) {
          out.normalGauge1 = out.gauge1;
          out.normalGauge2 = out.gauge2;
        }
        if (modern) for (const p of [1, 2]) {
          const raw = p === 1 ? raw1 : raw2, e = p === 1 ? e1 : e2, enemy = p === 1 ? e2 : e1, other = p === 1 ? raw2 : raw1;
          if (raw.special && raw.skill === "tech12" && (roomRules.specialVersion >= 6 || ["charge", "attack", "block"].includes(other.type) && !other.skill)) out["gauge" + p] = clamp3(out["gauge" + p] + 2, 0, maxGauge);
          if (s["specialRuin" + p] > 0 && e.type === "charge") out["gauge" + p] = Math.max(0, out["gauge" + p] - 1);
          out["specialSeal" + p] = enemy.special && enemy.skill === "tech8" ? 2 : Math.max(0, s["specialSeal" + p] - 1);
          out["specialRuin" + p] = enemy.skill === "tech11" ? enemy.special ? 3 : 0 : Math.max(0, s["specialRuin" + p] - 1);
          out["specialMomentum" + p] = e.skill === "tech6" ? e.special ? 1 : 0 : s["specialMomentum" + p];
        }
        out.hp1 = out.misses1 >= 2 ? 0 : clamp3(out.healed1 - d1, 0, maxHp);
        out.hp2 = out.misses2 >= 2 ? 0 : clamp3(out.healed2 - d2, 0, maxHp);
        out.seal1 = out.sealed1 && out.gauge1 < 7;
        out.seal2 = out.sealed2 && out.gauge2 < 7;
        out.enhance1 = e1.skill === "tech9" ? modern && e1.special ? 4 : 2 : Math.max(0, s.enhance1 - 1);
        out.enhance2 = e2.skill === "tech9" ? modern && e2.special ? 4 : 2 : Math.max(0, s.enhance2 - 1);
        out.momentum1 = e1.skill === "tech6" ? !s.momentum1 : false;
        out.momentum2 = e2.skill === "tech6" ? !s.momentum2 : false;
        out.ruin1 = e2.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin1 || 0) - 1);
        out.ruin2 = e1.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin2 || 0) - 1);
        out.last1 = e1.type;
        out.last2 = e2.type;
        out.turn = s.turn + 1;
        return out;
      }
      const additions = [
        ["\u30D5\u30A9\u30FC\u30AB\u30B9", 0, 0, "focus", "\u653B\u6483\u30C0\u30E1\u30FC\u30B8\u3092\u53D7\u3051\u306A\u3051\u308C\u3070\u30B2\u30FC\u30B8\uFF0B3"],
        ["\u30B3\u30F3\u30D0\u30FC\u30C8", 1, 0, "convert", "\u653B\u6483\u30C0\u30E1\u30FC\u30B8\u3092\u53D7\u3051\u308B\u3068\u30B2\u30FC\u30B8\uFF0B5"],
        ["\u30D6\u30E9\u30B9\u30C8", 6, 3, "blast", "3\u30C0\u30E1\u30FC\u30B8"],
        ["\u30D5\u30EA\u30FC\u30BA", 2, 0, "freeze", "\u6B21\u306E\u30BF\u30FC\u30F3\u3001\u76F8\u624B\u306F\u884C\u52D5\u4E0D\u80FD"],
        ["\u30EA\u30D5\u30A1\u30F3\u30C9", 3, 1, "refund", "\u30D6\u30ED\u30C3\u30AF\u8CAB\u901A\u306E1\u30C0\u30E1\u30FC\u30B8\u3002\u547D\u4E2D\u3059\u308B\u3068\u30B2\u30FC\u30B8\uFF0B3"],
        ["\u30F4\u30A7\u30CE\u30E0", 5, 0, "venom", "\u6B21\u306E2\u30BF\u30FC\u30F3\u3001\u30BF\u30FC\u30F3\u3054\u3068\u306B\u76F8\u624B\u306B\u6BD2\u306E1\u30C0\u30E1\u30FC\u30B8"],
        ["\u30C9\u30EC\u30A4\u30F3", 2, 1, "drain", "1\u30C0\u30E1\u30FC\u30B8\u3002\u547D\u4E2D\u3059\u308B\u3068\u76F8\u624B\u306E\u30B2\u30FC\u30B8\u3092\u6700\u59271\u596A\u3046"]
      ].map(([name, cost, power, kind, description], i) => ({ name, cost, power, kind, description: "\u30B2\u30FC\u30B8" + cost + "\u6D88\u8CBB / " + description, skill: "tech" + (i + 13), type: power ? "attack" : kind, pierce: kind === "refund" }));
      const normalId2 = (i) => i < 12 ? i + 3 : i + 15, specialId2 = (i) => i < 12 ? i + 15 : i + 22, indexOf = (id) => id >= 34 ? id - 22 : id >= 27 ? id - 15 : id >= 15 ? id - 15 : id - 3;
      const fields2 = ["frozen1", "frozen2", "poison1", "poison2"];
      const specialFields = ["weaken1", "weaken2"];
      ACTIONS3.push(...additions, ...additions.map((a) => ({ ...a, special: true, specialCost: 0 })));
      ACTIONS3[-1] = { cost: 0, power: 0, type: "", skill: "", pierce: false };
      const expansionCosts = { 17: 10, 20: 10, 36: 10, 37: 16, 38: 4, 39: 12, 40: 8 };
      const expandedActions = ACTIONS3.map((a, id) => ({ ...a, ...expansionCosts[id] != null ? { specialCost: expansionCosts[id] } : {}, ...id === 36 ? { power: 4 } : {} }));
      expandedActions[-1] = ACTIONS3[-1];
      const completedActions = expandedActions.map((a, id) => ({ ...a, ...id === 34 ? { specialCost: 6 } : id === 35 ? { specialCost: 8 } : {} }));
      completedActions[-1] = ACTIONS3[-1];
      const balancedActions = completedActions.map((a, id) => ({ ...a, ...id === 40 ? { specialCost: 10 } : {} }));
      balancedActions[-1] = ACTIONS3[-1];
      function calculate4(state, moves, rulesVersion = 4, rules = {}, bonus = {}, shield = true, catalog = null) {
        const expanded = rules.specialVersion >= 4;
        const completed = rules.specialVersion >= 5;
        catalog ||= rules.specialVersion >= 6 ? balancedActions : completed ? completedActions : expanded ? expandedActions : ACTIONS3;
        const picked = { ...moves };
        for (const p of [1, 2]) if (state["frozen" + p] > 0) picked[p] = -1;
        const out = core(state, picked, 3, rules, bonus, shield, catalog), raw = {}, eff = {};
        for (const p of [1, 2]) raw[p] = catalog[out["action" + p]] || ACTIONS3[-1];
        for (const p of [1, 2]) eff[p] = raw[p].skill === "tech12" ? raw[3 - p].skill === "tech12" ? ACTIONS3[-1] : raw[3 - p] : raw[p];
        for (const p of [1, 2]) {
          const q = 3 - p, e = eff[p];
          out["baseAction" + p] = out["action" + p] >= 34 ? out["action" + p] - 7 : out["action" + p] >= 27 ? out["action" + p] : out["action" + p] >= 15 ? out["action" + p] - 12 : out["action" + p];
          out["effectBase" + p] = out["effective" + p] >= 34 ? out["effective" + p] - 7 : out["effective" + p] >= 27 ? out["effective" + p] : out["effective" + p] >= 15 ? out["effective" + p] - 12 : out["effective" + p];
          out["inputFrozen" + p] = state["frozen" + p] || 0;
          out["inputPoison" + p] = state["poison" + p] || 0;
          if (expanded) out["inputWeaken" + p] = state["weaken" + p] || 0;
          if (!rules.classic && eff[q].skill === "tech1" && !eff[q].special && out["blocking" + p] && !(shield && e.skill === "tech5")) out["damage" + p] = Math.max(0, out["damage" + p] - 1);
          out["hit" + p] = !!(out["attack" + p] && out["power" + p] > 0 && !out["reflect" + q] && (out["attack" + q] ? eff[p].special && eff[p].skill === "tech1" && !(eff[q].special && eff[q].skill === "tech1") || (!(eff[q].special && eff[q].skill === "tech1") || eff[p].special && eff[p].skill === "tech1") && out["power" + p] > out["power" + q] : !out["blocking" + q] || out["pierce" + p] && !(shield && eff[q].skill === "tech5")));
        }
        for (const p of [1, 2]) if (bonus["invincible" + (3 - p)]) out["hit" + p] = false;
        for (const p of [1, 2]) {
          const q = 3 - p, e = eff[p], enemy = eff[q];
          if (state["poison" + p] > 0) out["damage" + p]++;
          if (bonus["invincible" + p]) out["damage" + p] = e.skill === "tech7" ? 2 : 0;
          out["poison" + p] = enemy.kind === "venom" ? 2 : Math.max(0, (state["poison" + p] || 0) - 1);
          out["frozen" + p] = enemy.kind === "freeze" ? expanded && enemy.special ? 2 : 1 : Math.max(0, (state["frozen" + p] || 0) - 1);
          if (expanded) {
            out["weaken" + p] = enemy.kind === "venom" ? enemy.special ? 2 : 0 : Math.max(0, (state["weaken" + p] || 0) - 1);
            out["specialDrain" + p] = e.special && e.kind === "drain" ? 2 : 0;
          }
          out["gain" + p] = e.kind === "focus" && !out["hit" + q] ? completed && e.special ? 5 : 3 : e.kind === "convert" && out["hit" + q] ? 5 : e.kind === "refund" && out["hit" + p] ? 3 : 0;
          if (completed) out["recoveredAttack" + p] = e.special && e.kind === "convert" && out["hit" + q] ? out["power" + q] : 0;
          out["drained" + p] = e.kind === "drain" && out["hit" + p] ? Math.min(1, out["gauge" + q]) : 0;
        }
        const gauges = { 1: out.gauge1, 2: out.gauge2 };
        if (expanded) out.specialRefund = [1, 2].reduce((sum, p) => sum + (eff[p].special && eff[p].kind === "refund" ? 3 : 0), 0);
        for (const p of [1, 2]) {
          out["normalGauge" + p] = gauges[p];
          out["gauge" + p] = clamp3(gauges[p] + out["gain" + p] + out["drained" + p] - out["drained" + (3 - p)] + (expanded ? out.specialRefund - out["specialDrain" + (3 - p)] : 0), 0, rules.maxGauge ?? 10);
          out["hp" + p] = out["misses" + p] >= 2 ? 0 : clamp3(out["healed" + p] - out["damage" + p] + (completed ? out["recoveredAttack" + p] : 0), 0, rules.hp ?? 10);
          out["seal" + p] = out["sealed" + p] && out["gauge" + p] < 7;
        }
        return out;
      }
      const api2 = { additions, normalId: normalId2, specialId: specialId2, indexOf, fields: fields2, specialFields, extraState: () => Object.fromEntries(fields2.map((k) => [k, 0])), extraSpecialState: () => Object.fromEntries(specialFields.map((k) => [k, 0])), calculate: calculate4 };
      if (typeof window !== "undefined") window.BattleV4 = api2;
      if (false) (void 0).exports = api2;
      else globalThis.BattleV4 = api2;
    })();
  }
});

// server/engine/advanced/rules.js
var rules_exports = {};
var init_rules = __esm({
  "server/engine/advanced/rules.js"() {
    (() => {
      const SKILLS = Object.freeze([
        { id: "boost", name: "\u30B2\u30FC\u30B8\u88DC\u7D66", limit: 3, description: "\u30B2\u30FC\u30B8\uFF0B2" },
        { id: "heal", name: "\u5FDC\u6025\u56DE\u5FA9", limit: 2, description: "HP\u30921\u56DE\u5FA9" },
        { id: "chain", name: "\u9023\u7D9A\u4F7F\u7528\u89E3\u9664", limit: 7, description: "\u3053\u306E\u30BF\u30FC\u30F3\u306E\u307F\u3001\u30D6\u30ED\u30C3\u30AF\u30FB\u30AB\u30A6\u30F3\u30BF\u30FC\u306A\u3069\u306E\u9023\u7D9A\u4F7F\u7528\u7981\u6B62\u3092\u89E3\u9664\u3002\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9\u306E\u5C01\u5370\u306F\u89E3\u9664\u3057\u306A\u3044" },
        { id: "cleanse", name: "\u30EA\u30D5\u30EC\u30C3\u30B7\u30E5", limit: 1, description: "\u30B2\u30FC\u30B8\uFF0B4\u3001\u30EB\u30A4\u30F3\u3068\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9\u3092\u89E3\u9664" },
        { id: "invincible", name: "\u7121\u6575", limit: 3, description: "\u3053\u306E\u30BF\u30FC\u30F3\u306E\u76F8\u624B\u304B\u3089\u306EHP\u30C0\u30E1\u30FC\u30B8\u3068\u30EB\u30A4\u30F3\u3092\u7121\u52B9\u5316\u3002\u81EA\u50B7\u30C0\u30E1\u30FC\u30B8\u306F\u53D7\u3051\u308B" },
        { id: "stance", name: "\u653B\u6483\u614B\u52E2", limit: 3, description: "\u3053\u306E\u30BF\u30FC\u30F3\u306E\u307F\u3001\u653B\u6483\u529B\uFF0B1\uFF08\u30A8\u30F3\u30CF\u30F3\u30B9\u3068\u91CD\u8907\u53EF\u80FD\uFF09" }
      ].map(Object.freeze));
      const byId = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
      const isAdvanced = (rules) => rules?.mode === "advanced" || rules?.mode === "custom" && (rules.skills === true || rules.special === true);
      const hasSkills2 = (rules) => rules?.mode === "advanced" && rules.skills !== false || rules?.mode === "custom" && rules.skills === true;
      const exhausted = (advanced, rules) => isAdvanced(rules) && !hasSkills2(rules) || [1, 2].every((p) => {
        const skill = byId[advanced?.selected?.[p]];
        return !!skill && (advanced?.current?.[p]?.used || 0) >= skill.limit;
      });
      const windowMs = (state) => state?.skillsExhausted === true ? 0 : 3e3;
      const active = (selected, turn, p, id) => selected?.[p] === id && turn?.[p]?.id === id;
      function forTurn(advanced, turn) {
        if (!Number.isInteger(turn) || turn < 1) return {};
        const out = {};
        for (const p of [1, 2]) {
          const latest = advanced?.current?.[p];
          if (latest?.turn === turn) out[p] = latest;
          else for (const receipt of Object.values(advanced?.uses?.[p] || {})) if (receipt?.turn === turn) out[p] = receipt;
        }
        return out;
      }
      function preview(state, selected, turn, rules = {}) {
        if (!state) return state;
        const s = { ...state };
        if (isAdvanced(rules) && !hasSkills2(rules)) return s;
        for (const p of [1, 2]) {
          if (active(selected, turn, p, "boost")) s["gauge" + p] = Math.min(rules.maxGauge ?? 10, s["gauge" + p] + 2);
          if (active(selected, turn, p, "heal")) s["hp" + p] = Math.min(rules.hp ?? 10, s["hp" + p] + 1);
          if (active(selected, turn, p, "chain")) s["last" + p] = "";
          if (active(selected, turn, p, "cleanse")) {
            s["gauge" + p] = Math.min(rules.maxGauge ?? 10, s["gauge" + p] + 4);
            s["seal" + p] = false;
            s["ruin" + p] = 0;
            if ("specialSeal" + p in s) {
              s["specialSeal" + p] = 0;
              s["specialRuin" + p] = 0;
            }
          }
        }
        return s;
      }
      function resolve(state, moves, selected, turn, calculate4, rules = {}) {
        if (isAdvanced(rules) && !hasSkills2(rules)) return calculate4(state, moves, state.frozen1 != null ? 4 : state.specialSeal1 != null ? 3 : 2, rules);
        const s = preview(state, selected, turn, rules), powerBonus = { 1: active(selected, turn, 1, "stance") ? 1 : 0, 2: active(selected, turn, 2, "stance") ? 1 : 0, invincible1: active(selected, turn, 1, "invincible"), invincible2: active(selected, turn, 2, "invincible") };
        const out = calculate4(s, moves, s.frozen1 != null ? 4 : s.specialSeal1 != null ? 3 : 2, rules, powerBonus);
        for (const p of [1, 2]) if (active(selected, turn, p, "invincible")) {
          out["damage" + p] = out["skill" + p] === "tech7" ? 2 : 0;
          out["hp" + p] = out["misses" + p] >= 2 ? 0 : Math.max(0, out["healed" + p] - out["damage" + p]);
        }
        return out;
      }
      const CUTIN_MS = 1900, EFFECT_MS = 1200;
      const presentationMs = (advanced, turn) => Object.keys(forTurn(advanced, turn)).length ? CUTIN_MS + EFFECT_MS : 0;
      function presentationComplete(m, now) {
        if (m.closed) return true;
        if (!m.skillWindow) return false;
        const start = m.skillWindow.confirmAt ?? m.skillWindow.endAt;
        return m.serverNow >= start && now >= start + presentationMs(m.advanced, m.state?.turn);
      }
      function visibleUses(m, player, now) {
        const count = Number(m.advanced?.current?.[player]?.used || 0);
        return Math.max(0, count - (!presentationComplete(m, now) && forTurn(m.advanced, m.state?.turn)[player] ? 1 : 0));
      }
      function skillWindowForState(s) {
        const startAt = Number.isFinite(s.previousDeadline) ? Math.max(s.startedAt, Math.min(s.startedAt + 3e3, s.previousDeadline)) + 3100 : s.startedAt + (s.turn > 1 ? 7500 : 5600);
        const duration = windowMs(s), endAt = startAt + duration;
        return { startAt, endAt, confirmAt: endAt + (duration ? 500 : 0) };
      }
      const api2 = { SKILLS, byId, isAdvanced, hasSkills: hasSkills2, active, forTurn, preview, resolve, presentationMs, presentationComplete, visibleUses, skillWindowForState, exhausted, windowMs, WINDOW_MS: 3e3, GRACE_MS: 500, CUTIN_MS, EFFECT_MS };
      if (typeof window !== "undefined") window.AdvancedRules = api2;
      if (false) (void 0).exports = api2;
    })();
  }
});

// server/engine/advanced/special-rules.js
var special_rules_exports = {};
var init_special_rules = __esm({
  "server/engine/advanced/special-rules.js"() {
    (() => {
      const MAX = 30, VERSION2 = 1, MOVE_VERSION = 6;
      const definitions = [
        [12, "\u653B\u6483\u540C\u58EB\u306E\u76F8\u6BBA\u306B\u3001\u4E00\u65B9\u7684\u306B\u6253\u3061\u52DD\u3064"],
        [8, "\u53CD\u5C04\u30C0\u30E1\u30FC\u30B8\uFF0B1"],
        [10, "\u76F8\u624B\u304C\u30C1\u30E3\u30FC\u30B8\u4EE5\u5916\u3067\u3082\u57FA\u672C\u653B\u6483\u529B3\uFF08\u30C1\u30E3\u30FC\u30B8\u6642\u30823\uFF09"],
        [12, "\u56DE\u5FA9\u91CF\uFF0B1"],
        [12, "\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u8FFD\u52A0\u3067\uFF0B3"],
        [10, "\u6B21\u306B\u4F7F\u7528\u3059\u308B\u901A\u5E38\uFF0FS\u30E2\u30FC\u30E1\u30F3\u30BF\u30E0\u306E\u653B\u6483\u529B\uFF0B1\uFF08\u4F7F\u7528\u307E\u3067\u4FDD\u6301\uFF09"],
        [12, "S\u30B2\u30FC\u30B8\uFF0B15"],
        [12, "\u6B21\u306E2\u30BF\u30FC\u30F3\u3001\u76F8\u624B\u306E\u88C5\u5099\u62803\u3064\u3068\u30D6\u30ED\u30C3\u30AF\u3092\u30B2\u30FC\u30B8\u306B\u95A2\u4FC2\u306A\u304F\u5C01\u5370"],
        [16, "\u653B\u6483\u529B\uFF0B1\u306E\u6301\u7D9A\u3092\u6B21\u306E4\u30BF\u30FC\u30F3\u306B\u3059\u308B"],
        [8, "\u596A\u3046\u30B2\u30FC\u30B8\u306E\u91CF+1"],
        [6, "\u6B21\u306E3\u30BF\u30FC\u30F3\u3001\u30C1\u30E3\u30FC\u30B8\u3057\u305F\u76F8\u624B\u306E\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u8FFD\u52A0\u3067\u22121\uFF08S\u30EB\u30A4\u30F3\uFF09"],
        [6, "\u307E\u306D\u308B\u6280\u306B\u304B\u304B\u308F\u3089\u305A\u3001\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u8FFD\u52A0\u3067\uFF0B2"],
        [6, "\u6210\u529F\u6642\u3001\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u3055\u3089\u306B\uFF0B2\uFF08\u5408\u8A08\uFF0B5\uFF09"],
        [8, "\u4F7F\u7528\u4E2D\u306B\u53D7\u3051\u305F\u653B\u6483\u30C0\u30E1\u30FC\u30B8\u3092\u5373\u6642\u306B\u5168\u56DE\u5FA9\uFF08\u5143\u304B\u3089\u6E1B\u3063\u3066\u3044\u305FHP\u306F\u56DE\u5FA9\u3057\u306A\u3044\uFF09"],
        [10, "\u653B\u6483\u529B\uFF0B1"],
        [16, "\u76F8\u624B\u3092\u6B21\u306E2\u30BF\u30FC\u30F3\u51CD\u7D50\u3055\u305B\u308B"],
        [4, "\u4E21\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u901A\u5E38\u30B2\u30FC\u30B8\uFF0B3"],
        [12, "\u6BD2\u306E\u52B9\u679C\u4E2D\u3001\u76F8\u624B\u306E\u653B\u6483\u529B\u22121\uFF08\u6700\u4F4E0\uFF09"],
        [10, "\u76F8\u624B\u306E\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u8FFD\u52A0\u3067\u22122"]
      ].map((d, i) => d ? Object.freeze({ id: "s-tech" + (i + 1), index: i, action: i < 12 ? i + 15 : i + 22, cost: d[0], description: d[1] }) : null);
      const fields2 = ["specialSeal1", "specialSeal2", "specialRuin1", "specialRuin2", "specialMomentum1", "specialMomentum2"];
      const initial = (version = VERSION2) => ({ max: MAX, version, gauge: { 1: 0, 2: 0 } });
      const extraState = () => Object.fromEntries(fields2.map((k) => [k, 0]));
      const definition = (id, version = MOVE_VERSION) => {
        const d = definitions[id >= 34 ? id - 22 : id - 15];
        if (!d) return null;
        if (version < 6 && id === 26) return { ...d, description: "\u30C1\u30E3\u30FC\u30B8\u30FB\u30A2\u30BF\u30C3\u30AF\u30FB\u30D6\u30ED\u30C3\u30AF\u3092\u307E\u306D\u305F\u5834\u5408\u3001\u901A\u5E38\u30B2\u30FC\u30B8\u3092\u8FFD\u52A0\u3067\uFF0B2" };
        if (version >= 4 && version < 6 && id === 40) return { ...d, cost: 8 };
        if (version < 5 && (id === 34 || id === 35)) return { ...d, cost: 0, description: "\u8FFD\u52A0\u52B9\u679C\u306A\u3057\uFF08\u901A\u5E38\u6280\u3068\u540C\u3058\u52B9\u679C\uFF09" };
        if (version < 4) {
          if (id >= 36) return { ...d, cost: 0, description: "\u8FFD\u52A0\u52B9\u679C\u306A\u3057\uFF08\u901A\u5E38\u6280\u3068\u540C\u3058\u52B9\u679C\uFF09" };
          if (id === 17 || id === 20 || version === 2 && id === 15) return { ...d, cost: 8 };
        }
        return d;
      };
      function actionData2(id, pool, basic, version = MOVE_VERSION) {
        if (id < 15 || id >= 27 && id <= 33) return id < 3 ? basic?.[["charge", "attack", "block"][id]] : pool?.[id >= 27 ? id - 15 : id - 3];
        const d = definition(id, version), base = pool?.[id >= 34 ? id - 22 : id - 15];
        return d && base ? { ...base, ...version >= 4 && id === 36 ? { power: base.power + 1 } : {}, name: "S" + base.name, special: true, specialCost: d.cost, description: d.description } : null;
      }
      function advance(special, result) {
        if (![VERSION2, 2, 3, 4, 5, MOVE_VERSION].includes(special?.version)) return special;
        const gauge = {};
        for (const p of [1, 2]) gauge[p] = Math.min(MAX, special.gauge[p] - (special.version >= 2 ? result["specialCost" + p] || 0 : 0) + 1 + result["damage" + p] + (result["type" + p] === "charge" ? 1 : 0) + (special.version >= 2 ? result["specialGain" + p] || 0 : 0));
        return { ...special, gauge };
      }
      function adjustCosts(special, result) {
        if (special?.version === 2) {
          for (const p of [1, 2]) if (result["action" + p] === 15) result["specialCost" + p] = 8;
        }
        return result;
      }
      const api2 = { adjustCosts, MAX, VERSION: VERSION2, MOVE_VERSION, definitions, fields: fields2, definition, extraState, actionData: actionData2, initial, advance };
      if (typeof window !== "undefined") window.SpecialRules = api2;
      if (false) (void 0).exports = api2;
    })();
  }
});

// server/engine/match-modes.js
var match_modes_exports = {};
var init_match_modes = __esm({
  "server/engine/match-modes.js"() {
    (() => {
      "use strict";
      const CLASSIC = Object.freeze([
        Object.freeze({ name: "c\u30D6\u30EA\u30FC\u30C1", cost: 4, power: 2, type: "attack", skill: "tech1", pierce: true, description: "\u30B2\u30FC\u30B84\u6D88\u8CBB / 2\u30C0\u30E1\u30FC\u30B8 / \u30D6\u30ED\u30C3\u30AF\u8CAB\u901A" }),
        Object.freeze({ name: "c\u30AB\u30A6\u30F3\u30BF\u30FC", cost: 2, power: 0, type: "reflect", skill: "tech2", pierce: false, repeatable: true, description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / \u653B\u6483\u3092\u9632\u304E1\u30C0\u30E1\u30FC\u30B8\u3092\u53CD\u5C04 / \u9023\u7D9A\u4F7F\u7528\u53EF\u80FD" }),
        Object.freeze({ name: "c\u30D1\u30CB\u30C3\u30B7\u30E5", cost: 5, power: 2, type: "attack", skill: "tech3", pierce: false, description: "\u30B2\u30FC\u30B85\u6D88\u8CBB / 2\u30C0\u30E1\u30FC\u30B8 / \u76F8\u624B\u304C\u30C1\u30E3\u30FC\u30B8\u306A\u3089\u8FFD\u52A02\u30C0\u30E1\u30FC\u30B8" })
      ]);
      const ordered = (d) => Object.entries(d?.picks || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([, v]) => v);
      const order = (first) => [first, 3 - first, 3 - first, first, first, 3 - first];
      function view(d, now = Date.now()) {
        const picks = ordered(d), count = picks.length, first = d?.first === 2 ? 2 : 1, sequence = order(first), deadline = (picks.at(-1)?.at ?? d?.startedAt ?? now) + 15e3;
        return { picks, count, first, sequence, complete: count === 6, player: sequence[count] || 0, deadline, remaining: Math.max(0, Math.ceil((deadline - now) / 1e3)), taken: picks.map((p) => p.tech), loadouts: { 1: picks.filter((_, i) => sequence[i] === 1).map((p) => p.tech), 2: picks.filter((_, i) => sequence[i] === 2).map((p) => p.tech) } };
      }
      const action = (rules, index, pool) => rules?.classic ? CLASSIC[index] : pool[index];
      const api2 = { CLASSIC, order, view, action };
      if (typeof window !== "undefined") window.MatchModes = api2;
      if (false) (void 0).exports = api2;
    })();
  }
});

// server/engine/bot-engine.js
var bot_engine_exports = {};
var init_bot_engine = __esm({
  "server/engine/bot-engine.js"() {
    (() => {
      const basicActions = {
        charge: {
          name: "\u30C1\u30E3\u30FC\u30B8",
          power: 0,
          cost: 0,
          type: "charge",
          description: "\u30B2\u30FC\u30B8+2"
        },
        attack: {
          name: "\u30A2\u30BF\u30C3\u30AF",
          power: 1,
          cost: 1,
          type: "attack",
          pierce: false,
          description: "\u30B2\u30FC\u30B81\u6D88\u8CBB / 1\u30C0\u30E1\u30FC\u30B8"
        },
        block: {
          name: "\u30D6\u30ED\u30C3\u30AF",
          power: 0,
          cost: 0,
          type: "block",
          description: "\u30D6\u30ED\u30C3\u30AF\u72B6\u614B\u306B\u306A\u308B"
        }
      };
      const techniquePool = [
        {
          name: "\u30D6\u30EA\u30FC\u30C1",
          cost: 4,
          power: 2,
          pierce: true,
          type: "attack",
          skill: "tech1",
          description: "\u30B2\u30FC\u30B84\u6D88\u8CBB / 2\u30C0\u30E1\u30FC\u30B8 / \u30D6\u30ED\u30C3\u30AF\u8CAB\u901A\u6642\u306F1\u30C0\u30E1\u30FC\u30B8"
        },
        {
          name: "\u30AB\u30A6\u30F3\u30BF\u30FC",
          cost: 2,
          power: 0,
          pierce: false,
          type: "reflect",
          skill: "tech2",
          description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / \u76F8\u624B\u306E\u653B\u6483\u3092\u7121\u52B9\u5316\u3057\u3001\u5A01\u529B\u306B\u95A2\u4FC2\u306A\u304F1\u30C0\u30E1\u30FC\u30B8\u3060\u3051\u76F8\u624B\u306B\u8FD4\u3059"
        },
        {
          name: "\u30D1\u30CB\u30C3\u30B7\u30E5",
          cost: 5,
          power: 2,
          pierce: false,
          type: "attack",
          skill: "tech3",
          description: "\u30B2\u30FC\u30B85\u6D88\u8CBB / 2\u30C0\u30E1\u30FC\u30B8\u3001\u76F8\u624B\u306E\u30B2\u30FC\u30B8-1 / \u76F8\u624B\u304C\u30C1\u30E3\u30FC\u30B8\u4E2D\u306A\u3089\u8FFD\u52A01\u30C0\u30E1\u30FC\u30B8"
        },
        {
          name: "\u30D2\u30FC\u30EB",
          cost: 2,
          power: 0,
          pierce: false,
          type: "heal",
          skill: "tech4",
          description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / \u81EA\u5206\u306EHP\u30921\u56DE\u5FA9"
        },
        { name: "\u30D5\u30A9\u30FC\u30B5\u30A4\u30C8", cost: 1, power: 0, pierce: false, type: "block", skill: "tech5", description: "\u30B2\u30FC\u30B81\u6D88\u8CBB / \u8CAB\u901A\u653B\u6483\u3082\u9632\u3050\u30B7\u30FC\u30EB\u30C9 / \u76F8\u624B\u304C\u30C1\u30E3\u30FC\u30B8\u306A\u3089\u30B2\u30FC\u30B8+3" },
        { name: "\u30E2\u30FC\u30E1\u30F3\u30BF\u30E0", cost: 2, power: 1, pierce: false, type: "attack", skill: "tech6", description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / 1\u30C0\u30E1\u30FC\u30B8 / 2\u9023\u7D9A\u4F7F\u7528\u306A\u3089\u3055\u3089\u306B+1" },
        { name: "\u30E9\u30F3\u30DA\u30FC\u30B8", cost: 0, power: 0, pierce: false, type: "special", skill: "tech7", description: "\u30B2\u30FC\u30B8+8 / HP-2" },
        { name: "\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9", cost: 0, power: 0, pierce: false, type: "seal", skill: "tech8", description: "\u76F8\u624B\u306E\u30D6\u30ED\u30C3\u30AF\u7CFB\u6280\u3092\u5C01\u5370 / \u76F8\u624B\u306E\u30B2\u30FC\u30B8\u304C7\u306B\u9054\u3059\u308B\u3068\u89E3\u9664" },
        { name: "\u30A8\u30F3\u30CF\u30F3\u30B9", cost: 2, power: 0, pierce: false, type: "enhance", skill: "tech9", description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / \u6B21\u306E2\u30BF\u30FC\u30F3\u3001\u653B\u6483\u529B+1 / \u518D\u4F7F\u7528\u3067\u6B8B\u308A2\u30BF\u30FC\u30F3\u306B\u66F4\u65B0" },
        { name: "\u30B5\u30A4\u30D5\u30A9\u30F3", cost: 3, power: 0, pierce: false, type: "siphon", skill: "tech10", description: "\u30B2\u30FC\u30B83\u6D88\u8CBB / \u76F8\u624B\u306E\u30B2\u30FC\u30B8\u3092\u6700\u59272\u596A\u3044\u3001\u596A\u3063\u305F\u5206\u3060\u3051\u81EA\u5206\u306B\u52A0\u3048\u308B" },
        { name: "\u30EB\u30A4\u30F3", cost: 1, power: 0, pierce: false, type: "ruin", skill: "tech11", description: "\u30B2\u30FC\u30B81\u6D88\u8CBB / \u6B21\u306E\u30BF\u30FC\u30F3\u304B\u30893\u30BF\u30FC\u30F3\u3001\u76F8\u624B\u304C\u30C1\u30E3\u30FC\u30B8\u3059\u308B\u305F\u30731\u30C0\u30E1\u30FC\u30B8" },
        { name: "\u30DF\u30E9\u30FC", cost: 2, power: 0, pierce: false, type: "mirror", skill: "tech12", description: "\u30B2\u30FC\u30B82\u6D88\u8CBB / \u76F8\u624B\u3068\u540C\u3058\u884C\u52D5\u3092\u3059\u308B\uFF08\u8868\u793A\u540D\u3068\u6D88\u8CBB\u30B3\u30B9\u30C8\u306F\u30DF\u30E9\u30FC\u306E\u307E\u307E\uFF09" }
      ];
      function resolveLegacy(s, a1, a2) {
        const hp = s.hp.slice(), gauge = s.gauge.slice(), blockSeal = s.seal.slice(), enhanceTurns = s.enhance.slice(), momentumBonus = s.momentum.slice(), ruinTurns = (s.ruin || [0, 0, 0]).slice();
        const raw1 = a1, raw2 = a2, noEffect = { name: "\u30DF\u30E9\u30FC", cost: 0, power: 0, pierce: false, type: "", skill: "" };
        a1 = raw1.skill === "tech12" ? raw2.skill === "tech12" ? noEffect : raw2 : raw1;
        a2 = raw2.skill === "tech12" ? raw1.skill === "tech12" ? noEffect : raw1 : raw2;
        let damageTo1 = ruinTurns[1] > 0 && a1.type === "charge" ? 1 : 0;
        let damageTo2 = ruinTurns[2] > 0 && a2.type === "charge" ? 1 : 0;
        const gaugeBeforeCost = {
          1: Number(gauge[1] || 0),
          2: Number(gauge[2] || 0)
        };
        gauge[1] = Math.max(0, gauge[1] - Number(raw1.cost || 0));
        gauge[2] = Math.max(0, gauge[2] - Number(raw2.cost || 0));
        const attack1 = a1.type === "attack";
        const attack2 = a2.type === "attack";
        if (a1.skill === "tech8" && gaugeBeforeCost[2] < 7) blockSeal[2] = true;
        if (a2.skill === "tech8" && gaugeBeforeCost[1] < 7) blockSeal[1] = true;
        const reflect1 = a1.type === "reflect" && !blockSeal[1];
        const reflect2 = a2.type === "reflect" && !blockSeal[2];
        const block1 = a1.type === "block" && !blockSeal[1];
        const block2 = a2.type === "block" && !blockSeal[2];
        if (a1.type === "charge") gauge[1] = Math.min(10, gauge[1] + 2);
        if (a2.type === "charge") gauge[2] = Math.min(10, gauge[2] + 2);
        if (a1.skill === "tech5" && a2.type === "charge") gauge[1] = Math.min(10, gauge[1] + 3);
        if (a2.skill === "tech5" && a1.type === "charge") gauge[2] = Math.min(10, gauge[2] + 3);
        if (a1.skill === "tech4") hp[1] = Math.min(10, hp[1] + 1);
        if (a2.skill === "tech4") hp[2] = Math.min(10, hp[2] + 1);
        const power1 = attack1 ? (a1.skill === "tech6" ? momentumBonus[1] ? 2 : 1 : Number(a1.power || 0)) + (enhanceTurns[1] > 0 ? 1 : 0) : 0;
        const power2 = attack2 ? (a2.skill === "tech6" ? momentumBonus[2] ? 2 : 1 : Number(a2.power || 0)) + (enhanceTurns[2] > 0 ? 1 : 0) : 0;
        if (reflect1 && attack2) damageTo2 += 1;
        if (reflect2 && attack1) damageTo1 += 1;
        if (attack1 && attack2) {
          if (power1 > power2) damageTo2 += power1 - power2;
          else if (power2 > power1) damageTo1 += power2 - power1;
        } else {
          if (attack1 && !reflect2 && (!block2 || a1.pierce && a2.skill !== "tech5")) damageTo2 += power1;
          if (attack2 && !reflect1 && (!block1 || a2.pierce && a1.skill !== "tech5")) damageTo1 += power2;
        }
        if (a1.skill === "tech3" && a2.type === "charge" && !block2 && !reflect2) damageTo2 += 1;
        if (a2.skill === "tech3" && a1.type === "charge" && !block1 && !reflect1) damageTo1 += 1;
        if (a1.skill === "tech7") {
          gauge[1] = Math.min(10, gauge[1] + 8);
        }
        if (a2.skill === "tech7") {
          gauge[2] = Math.min(10, gauge[2] + 8);
        }
        const siphonGauge = { 1: gauge[1], 2: gauge[2] };
        const stolenBy1 = a1.skill === "tech10" ? Math.min(2, siphonGauge[2]) : 0;
        const stolenBy2 = a2.skill === "tech10" ? Math.min(2, siphonGauge[1]) : 0;
        gauge[1] = Math.min(10, Math.max(0, siphonGauge[1] + stolenBy1 - stolenBy2));
        gauge[2] = Math.min(10, Math.max(0, siphonGauge[2] + stolenBy2 - stolenBy1));
        if (a1.skill === "tech3") gauge[2] = Math.max(0, gauge[2] - 1);
        if (a2.skill === "tech3") gauge[1] = Math.max(0, gauge[1] - 1);
        enhanceTurns[1] = a1.skill === "tech9" ? 2 : Math.max(0, enhanceTurns[1] - 1);
        enhanceTurns[2] = a2.skill === "tech9" ? 2 : Math.max(0, enhanceTurns[2] - 1);
        ruinTurns[1] = a2.skill === "tech11" ? 3 : Math.max(0, ruinTurns[1] - 1);
        ruinTurns[2] = a1.skill === "tech11" ? 3 : Math.max(0, ruinTurns[2] - 1);
        if (a1.skill === "tech7") damageTo1 += 2;
        if (a2.skill === "tech7") damageTo2 += 2;
        if (blockSeal[2] && Number(gauge[2]) >= 7) {
          blockSeal[2] = false;
        }
        if (blockSeal[1] && Number(gauge[1]) >= 7) {
          blockSeal[1] = false;
        }
        hp[1] = Math.max(0, hp[1] - damageTo1);
        hp[2] = Math.max(0, hp[2] - damageTo2);
        return {
          hp,
          gauge,
          seal: blockSeal,
          enhance: enhanceTurns,
          ruin: ruinTurns,
          momentum: [false, a1.skill === "tech6" ? !s.momentum[1] : false, a2.skill === "tech6" ? !s.momentum[2] : false],
          last: ["", a1.type, a2.type],
          loadouts: s.loadouts,
          turn: s.turn + 1
        };
      }
      const V42 = false ? null : globalThis.BattleV4;
      techniquePool.push(...V42.additions);
      function resolve(s, a, b) {
        const state = { turn: s.turn, misses1: 0, misses2: 0, ...V42.extraState() };
        for (const p of [1, 2]) for (const k of ["hp", "gauge", "seal", "enhance", "momentum", "ruin", "last", "frozen", "poison"]) state[k + p] = s[k]?.[p] ?? (k === "last" ? "" : 0);
        for (const p of [1, 2]) for (const k of ["specialSeal", "specialRuin", "specialMomentum"]) state[k + p] = 0;
        const result = V42.calculate(state, { 1: 0, 2: 1 }, 4, {}, {}, true, { 0: a, 1: b, [-1]: { cost: 0, power: 0, type: "", skill: "", pierce: false } });
        const next = { ...s, turn: s.turn + 1 };
        for (const k of ["hp", "gauge", "seal", "enhance", "momentum", "ruin", "last", "frozen", "poison"]) next[k] = [null, result[k + "1"], result[k + "2"]];
        return next;
      }
      const ACTIONS3 = [basicActions.charge, basicActions.attack, basicActions.block, ...techniquePool];
      ACTIONS3[-1] = { name: "\u51CD\u7D50", type: "", skill: "", cost: 0, power: 0 };
      const combinations = [];
      for (let a = 0; a < techniquePool.length; a++) for (let b = a + 1; b < techniquePool.length; b++) for (let c = b + 1; c < techniquePool.length; c++) combinations.push([a, b, c]);
      function initial(a = [0, 1, 2], b = [0, 1, 2]) {
        for (const x of [a, b]) if (x.length !== 3 || new Set(x).size !== 3 || x.some((i) => !Number.isInteger(i) || i < 0 || i >= techniquePool.length)) throw Error("\u6280\u306F\u7570\u306A\u308B3\u3064\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044");
        return { hp: [0, 10, 10], gauge: [0, 8, 8], seal: [false, false, false], enhance: [0, 0, 0], momentum: [false, false, false], ruin: [0, 0, 0], last: ["", "", ""], loadouts: [null, a.slice(), b.slice()], turn: 1 };
      }
      function terminal2(s) {
        return s.hp[1] <= 0 ? s.hp[2] <= 0 ? 0 : -1 : s.hp[2] <= 0 ? 1 : null;
      }
      function legal2(s, p) {
        if (terminal2(s) !== null) return [];
        if (s.frozen?.[p] > 0) return [-1];
        return [0, 1, 2, ...s.loadouts[p].map((i) => i + 3)].filter((id) => {
          const a = ACTIONS3[id], o = 3 - p;
          return a.cost <= s.gauge[p] && !(s.seal[p] && (id === 2 || a.skill === "tech5" || a.skill === "tech2")) && !(a.type === "block" && s.last[p] === "block") && !(a.skill === "tech2" && s.last[p] === "reflect") && !(id === 0 && s.gauge[p] >= 10) && !(a.skill === "tech8" && s.gauge[o] >= 7);
        });
      }
      function step(s, a, b) {
        if (!legal2(s, 1).includes(a) || !legal2(s, 2).includes(b)) throw Error("Illegal action");
        return resolve(s, ACTIONS3[a], ACTIONS3[b]);
      }
      function evaluate2(s) {
        const end = terminal2(s);
        if (end !== null) return end;
        const side = (p) => s.hp[p] + 0.3 * s.gauge[p] + 0.2 * s.enhance[p] + 0.12 * Number(s.momentum[p]) - 0.22 * Number(s.seal[p]);
        return Math.tanh((side(1) - side(2)) / 5) * 0.94;
      }
      function matrixSolve(M, iterations = 160) {
        const m = M.length, n = M[0].length, r = Array(m).fill(0), c = Array(n).fill(0), ps = Array(m).fill(0), qs = Array(n).fill(0);
        const strategy = (reg) => {
          const z = reg.reduce((s, x) => s + Math.max(0, x), 0);
          return reg.map((x) => z ? Math.max(0, x) / z : 1 / reg.length);
        };
        for (let t = 0; t < iterations; t++) {
          const p2 = strategy(r), q2 = strategy(c), u = Array(m).fill(0), v = Array(n).fill(0);
          for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
            u[i] += M[i][j] * q2[j];
            v[j] += M[i][j] * p2[i];
          }
          let value = 0;
          for (let i = 0; i < m; i++) value += p2[i] * u[i];
          for (let i = 0; i < m; i++) {
            r[i] += u[i] - value;
            ps[i] += p2[i];
          }
          for (let j = 0; j < n; j++) {
            c[j] += value - v[j];
            qs[j] += q2[j];
          }
        }
        const p = ps.map((x) => x / iterations), q = qs.map((x) => x / iterations);
        const lo = Math.min(...Array.from({ length: n }, (_, j) => M.reduce((z, row, i) => z + p[i] * row[j], 0)));
        const hi = Math.max(...M.map((row) => row.reduce((z, x, j) => z + x * q[j], 0)));
        return { p, q, value: (lo + hi) / 2, lower: lo, upper: hi, gap: hi - lo };
      }
      function key(s) {
        return [s.hp[1], s.hp[2], s.gauge[1], s.gauge[2], +s.seal[1], +s.seal[2], s.enhance[1], s.enhance[2], +s.momentum[1], +s.momentum[2], s.ruin?.[1] || 0, s.ruin?.[2] || 0, s.last[1], s.last[2], s.frozen?.[1] || 0, s.frozen?.[2] || 0, s.poison?.[1] || 0, s.poison?.[2] || 0].join(",");
      }
      function analyze2(s, { depth = 2, iterations = 160, maxNodes = 1e5, model = null } = {}) {
        if (terminal2(s) !== null) return { terminal: terminal2(s) };
        let nodes = 0, completed = null;
        const cache = /* @__PURE__ */ new Map(), budget = /* @__PURE__ */ Symbol("budget");
        function search(s2, d) {
          if (++nodes > maxNodes) throw budget;
          if (terminal2(s2) !== null || d === 0) return { value: model ? modelValue(s2, model) : evaluate2(s2) };
          const k = d + ":" + key(s2);
          if (cache.has(k)) return cache.get(k);
          const a = legal2(s2, 1), b = legal2(s2, 2);
          const M = a.map((x) => b.map((y) => search(resolve(s2, ACTIONS3[x], ACTIONS3[y]), d - 1).value));
          const out = { ...matrixSolve(M, iterations), actions1: a, actions2: b, matrix: M };
          cache.set(k, out);
          return out;
        }
        for (let d = 1; d <= depth; d++) try {
          completed = { ...search(s, d), depth: d };
        } catch (e) {
          if (e !== budget) throw e;
          break;
        }
        if (!completed) throw Error("Search budget too small");
        return { ...completed, nodes, requestedDepth: depth };
      }
      function rng(seed = 1) {
        return () => {
          seed |= 0;
          seed = seed + 1831565813 | 0;
          let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }
      function sample2(actions, prob, random = Math.random) {
        let r = random();
        for (let i = 0; i < actions.length; i++) {
          r -= prob[i];
          if (r < 0) return actions[i];
        }
        return actions.at(-1);
      }
      const MODEL_SCHEMA = "psy-value-v1-75";
      function features2(s) {
        const side = (p) => {
          const h = s.hp[p] / 10, g = s.gauge[p] / 10;
          const v = [h, g, s.enhance[p] / 2, +s.momentum[p], +s.seal[p], h * g, h * h, g * g, +(s.last[p] === "charge"), +(s.last[p] === "block"), h * (s.enhance[p] / 2), g * +s.seal[p], +(s.hp[p] <= 2), +(s.gauge[p] >= 7), +(s.gauge[p] === 0)];
          for (let i = 0; i < 10; i++) {
            const owns = s.loadouts[p].includes(i), cost = techniquePool[i].cost;
            v.push(owns ? 1 : 0, owns ? h : 0, owns ? g : 0, owns ? +(s.gauge[p] >= cost) : 0, owns ? +(s.hp[p] <= 3) : 0, owns ? +(s.last[p] === "charge") : 0);
          }
          return v;
        };
        const x = side(1), y = side(2);
        return x.map((v, i) => v - y[i]);
      }
      function newModel() {
        const weights = Array(75).fill(0);
        weights.splice(0, 5, 2, 0.6, 0.08, 0.024, -0.044);
        return { schema: MODEL_SCHEMA, weights, updates: 0 };
      }
      function validModel(m) {
        return m?.schema === MODEL_SCHEMA && Array.isArray(m.weights) && m.weights.length === 75 && m.weights.every((x) => Number.isFinite(x) && Math.abs(x) <= 10) && Number.isSafeInteger(m.updates) && m.updates >= 0;
      }
      function modelValue(s, m) {
        const t = terminal2(s);
        if (t !== null) return t;
        const x = features2(s);
        let v = 0;
        for (let i = 0; i < x.length; i++) v += x[i] * m.weights[i];
        return 0.94 * Math.tanh(v);
      }
      function learn(m, s, target, rate = 0.03) {
        if (terminal2(s) !== null) return;
        const x = features2(s);
        let z = 0, norm = 1;
        for (let i = 0; i < x.length; i++) {
          z += x[i] * m.weights[i];
          norm += x[i] * x[i];
        }
        const t = Math.tanh(z), error = Math.max(-1, Math.min(1, target)) - 0.94 * t, gradient = 0.94 * (1 - t * t);
        for (let i = 0; i < x.length; i++) m.weights[i] = Math.max(-10, Math.min(10, m.weights[i] + rate * error * gradient * x[i] / Math.sqrt(norm)));
        m.updates++;
        return error;
      }
      const API = { ACTIONS: ACTIONS3, techniques: techniquePool, combinations, initial, terminal: terminal2, legal: legal2, step, resolve, evaluate: evaluate2, matrixSolve, key, analyze: analyze2, rng, sample: sample2, features: features2, newModel, validModel, modelValue, learn, MODEL_SCHEMA };
      if (false) (void 0).exports = API;
      else globalThis.BattleAI = API;
    })();
  }
});

// server/engine/history-calculator-v1.js
var history_calculator_v1_exports = {};
__export(history_calculator_v1_exports, {
  calculate: () => calculate,
  stateFields: () => stateFields
});
function calculate(s, moves) {
  const out = {};
  out.action1 = chosen(s, moves, 1);
  out.misses1 = Number.isInteger(moves?.[1]) ? 0 : s.misses1 + 1;
  out.action2 = chosen(s, moves, 2);
  out.misses2 = Number.isInteger(moves?.[2]) ? 0 : s.misses2 + 1;
  const raw1 = ACTIONS[out.action1] || ACTIONS[0], raw2 = ACTIONS[out.action2] || ACTIONS[0];
  const none = { cost: 0, type: "", skill: "", power: 0, pierce: false };
  const e1 = raw1.skill === "tech12" ? raw2.skill === "tech12" ? none : raw2 : raw1;
  const e2 = raw2.skill === "tech12" ? raw1.skill === "tech12" ? none : raw1 : raw2;
  out.cost1 = raw1.cost;
  out.cost2 = raw2.cost;
  out.type1 = e1.type;
  out.type2 = e2.type;
  out.skill1 = e1.skill;
  out.skill2 = e2.skill;
  out.attack1 = e1.type === "attack";
  out.attack2 = e2.type === "attack";
  out.reflect1 = e1.type === "reflect";
  out.reflect2 = e2.type === "reflect";
  out.paid1 = clamp(s.gauge1 - raw1.cost, 0, 10);
  out.paid2 = clamp(s.gauge2 - raw2.cost, 0, 10);
  out.sealed1 = s.seal1 === true || e2.skill === "tech8" && s.gauge1 < 7;
  out.sealed2 = s.seal2 === true || e1.skill === "tech8" && s.gauge2 < 7;
  out.reflect1 = out.reflect1 && !out.sealed1;
  out.reflect2 = out.reflect2 && !out.sealed2;
  out.blocking1 = e1.type === "block" && !out.sealed1;
  out.blocking2 = e2.type === "block" && !out.sealed2;
  out.charged1 = e1.type === "charge" ? clamp(out.paid1 + 2, 0, 10) : out.paid1;
  out.charged2 = e2.type === "charge" ? clamp(out.paid2 + 2, 0, 10) : out.paid2;
  out.foresight1 = e1.skill === "tech5" && e2.type === "charge" ? clamp(out.charged1 + 3, 0, 10) : out.charged1;
  out.foresight2 = e2.skill === "tech5" && e1.type === "charge" ? clamp(out.charged2 + 3, 0, 10) : out.charged2;
  out.healed1 = e1.skill === "tech4" ? clamp(s.hp1 + 1, 0, 10) : s.hp1;
  out.healed2 = e2.skill === "tech4" ? clamp(s.hp2 + 1, 0, 10) : s.hp2;
  out.basePower1 = e1.power;
  out.basePower2 = e2.power;
  out.power1 = out.attack1 ? (e1.skill === "tech6" ? s.momentum1 ? 2 : 1 : e1.power) + (s.enhance1 > 0 ? 1 : 0) : 0;
  out.power2 = out.attack2 ? (e2.skill === "tech6" ? s.momentum2 ? 2 : 1 : e2.power) + (s.enhance2 > 0 ? 1 : 0) : 0;
  out.pierce1 = !!e1.pierce;
  out.pierce2 = !!e2.pierce;
  let d1 = s.ruin1 > 0 && e1.type === "charge" ? 1 : 0, d2 = s.ruin2 > 0 && e2.type === "charge" ? 1 : 0;
  if (out.reflect1 && out.attack2) d2++;
  if (out.reflect2 && out.attack1) d1++;
  if (out.attack1 && out.attack2) {
    d1 += Math.max(0, out.power2 - out.power1);
    d2 += Math.max(0, out.power1 - out.power2);
  } else {
    if (out.attack2 && !out.reflect1 && (!out.blocking1 || out.pierce2)) d1 += out.power2;
    if (out.attack1 && !out.reflect2 && (!out.blocking2 || out.pierce1)) d2 += out.power1;
  }
  if (e2.skill === "tech3" && e1.type === "charge" && !out.blocking1 && !out.reflect1) d1 += 2;
  if (e1.skill === "tech3" && e2.type === "charge" && !out.blocking2 && !out.reflect2) d2 += 2;
  if (e1.skill === "tech7") d1 += 2;
  if (e2.skill === "tech7") d2 += 2;
  out.damage1 = d1;
  out.damage2 = d2;
  out.rampage1 = e1.skill === "tech7" ? clamp(out.foresight1 + 8, 0, 10) : out.foresight1;
  out.rampage2 = e2.skill === "tech7" ? clamp(out.foresight2 + 8, 0, 10) : out.foresight2;
  out.stolen1 = e1.skill === "tech10" ? Math.min(2, out.rampage2) : 0;
  out.stolen2 = e2.skill === "tech10" ? Math.min(2, out.rampage1) : 0;
  out.gauge1 = clamp(out.rampage1 + out.stolen1 - out.stolen2, 0, 10);
  out.gauge2 = clamp(out.rampage2 + out.stolen2 - out.stolen1, 0, 10);
  out.hp1 = out.misses1 >= 2 ? 0 : clamp(out.healed1 - d1, 0, 10);
  out.hp2 = out.misses2 >= 2 ? 0 : clamp(out.healed2 - d2, 0, 10);
  out.seal1 = out.sealed1 && out.gauge1 < 7;
  out.seal2 = out.sealed2 && out.gauge2 < 7;
  out.enhance1 = e1.skill === "tech9" ? 2 : Math.max(0, s.enhance1 - 1);
  out.enhance2 = e2.skill === "tech9" ? 2 : Math.max(0, s.enhance2 - 1);
  out.momentum1 = e1.skill === "tech6" ? !s.momentum1 : false;
  out.momentum2 = e2.skill === "tech6" ? !s.momentum2 : false;
  out.ruin1 = e2.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin1 || 0) - 1);
  out.ruin2 = e1.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin2 || 0) - 1);
  out.last1 = e1.type;
  out.last2 = e2.type;
  out.turn = s.turn + 1;
  return out;
}
var ACTIONS, clamp, chosen, stateFields;
var init_history_calculator_v1 = __esm({
  "server/engine/history-calculator-v1.js"() {
    ACTIONS = [
      { cost: 0, type: "charge", skill: "", power: 0, pierce: false },
      { cost: 1, type: "attack", skill: "", power: 1, pierce: false },
      { cost: 0, type: "block", skill: "", power: 0, pierce: false },
      { cost: 4, type: "attack", skill: "tech1", power: 2, pierce: true },
      { cost: 2, type: "reflect", skill: "tech2", power: 0, pierce: false },
      { cost: 5, type: "attack", skill: "tech3", power: 2, pierce: false },
      { cost: 2, type: "heal", skill: "tech4", power: 0, pierce: false },
      { cost: 1, type: "block", skill: "tech5", power: 0, pierce: false },
      { cost: 2, type: "attack", skill: "tech6", power: 1, pierce: false },
      { cost: 0, type: "special", skill: "tech7", power: 0, pierce: false },
      { cost: 0, type: "seal", skill: "tech8", power: 0, pierce: false },
      { cost: 2, type: "enhance", skill: "tech9", power: 0, pierce: false },
      { cost: 3, type: "siphon", skill: "tech10", power: 0, pierce: false },
      { cost: 1, type: "ruin", skill: "tech11", power: 0, pierce: false },
      { cost: 2, type: "mirror", skill: "tech12", power: 0, pierce: false }
    ];
    clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    chosen = (s, moves, p) => Number.isInteger(moves?.[p]) ? moves[p] : s["gauge" + p] >= 10 ? 1 : 0;
    stateFields = ["turn", "startedAt", "hp1", "hp2", "gauge1", "gauge2", "seal1", "seal2", "enhance1", "enhance2", "momentum1", "momentum2", "ruin1", "ruin2", "last1", "last2", "misses1", "misses2"];
  }
});

// server/engine/free-calculator.js
var free_calculator_exports = {};
__export(free_calculator_exports, {
  calculate: () => calculate2,
  stateFields: () => stateFields2
});
function calculate2(s, moves, rulesVersion = 2, roomRules = {}, powerBonus = {}, foresightShield = false, actionCatalog = ACTIONS2) {
  if (rulesVersion >= 4) return window.BattleV4.calculate(s, moves, rulesVersion, roomRules, powerBonus, foresightShield);
  const maxHp = roomRules.hp ?? 10, maxGauge = roomRules.maxGauge ?? 10;
  const out = {}, modern = rulesVersion === 3;
  out.action1 = chosen2(s, moves, 1, maxGauge);
  out.misses1 = Number.isInteger(moves?.[1]) ? 0 : s.misses1 + 1;
  out.action2 = chosen2(s, moves, 2, maxGauge);
  out.misses2 = Number.isInteger(moves?.[2]) ? 0 : s.misses2 + 1;
  const raw1 = actionCatalog[out.action1] || actionCatalog[0], raw2 = actionCatalog[out.action2] || actionCatalog[0];
  const none = { cost: 0, type: "", skill: "", power: 0, pierce: false };
  const e1 = raw1.skill === "tech12" ? raw2.skill === "tech12" ? none : raw2 : raw1;
  const e2 = raw2.skill === "tech12" ? raw1.skill === "tech12" ? none : raw1 : raw2;
  if (modern) for (const p of [1, 2]) {
    const raw = p === 1 ? raw1 : raw2, e = p === 1 ? e1 : e2, other = p === 1 ? raw2 : raw1;
    for (const k of ["gauge", "hp", "seal", "ruin", "last", "specialSeal", "specialRuin"]) out["input" + k[0].toUpperCase() + k.slice(1) + p] = s[k + p];
    out["stance" + p] = powerBonus[p] === 1 ? 1 : 0;
    out["effective" + p] = raw.skill === "tech12" ? other.skill === "tech12" ? -1 : out["action" + (3 - p)] : out["action" + p];
    out["baseAction" + p] = out["action" + p] >= 15 ? out["action" + p] - 12 : out["action" + p];
    out["effectBase" + p] = out["effective" + p] >= 15 ? out["effective" + p] - 12 : out["effective" + p];
    out["specialCost" + p] = raw.special ? raw.specialCost : 0;
    out["specialGain" + p] = e.special && e.skill === "tech7" ? 15 : 0;
  }
  out.cost1 = raw1.cost;
  out.cost2 = raw2.cost;
  out.type1 = e1.type;
  out.type2 = e2.type;
  out.skill1 = e1.skill;
  out.skill2 = e2.skill;
  out.attack1 = e1.type === "attack";
  out.attack2 = e2.type === "attack";
  out.reflect1 = e1.type === "reflect";
  out.reflect2 = e2.type === "reflect";
  out.paid1 = clamp2(s.gauge1 - raw1.cost, 0, maxGauge);
  out.paid2 = clamp2(s.gauge2 - raw2.cost, 0, maxGauge);
  out.sealed1 = s.seal1 === true || e2.skill === "tech8" && s.gauge1 < 7;
  out.sealed2 = s.seal2 === true || e1.skill === "tech8" && s.gauge2 < 7;
  out.reflect1 = out.reflect1 && !out.sealed1;
  out.reflect2 = out.reflect2 && !out.sealed2;
  out.blocking1 = e1.type === "block" && !out.sealed1;
  out.blocking2 = e2.type === "block" && !out.sealed2;
  out.charged1 = e1.type === "charge" ? clamp2(out.paid1 + 2, 0, maxGauge) : out.paid1;
  out.charged2 = e2.type === "charge" ? clamp2(out.paid2 + 2, 0, maxGauge) : out.paid2;
  out.foresight1 = e1.skill === "tech5" && e2.type === "charge" ? clamp2(out.charged1 + 3, 0, maxGauge) : out.charged1;
  if (modern && e1.special && e1.skill === "tech5") out.foresight1 = clamp2(out.foresight1 + 3, 0, maxGauge);
  out.foresight2 = e2.skill === "tech5" && e1.type === "charge" ? clamp2(out.charged2 + 3, 0, maxGauge) : out.charged2;
  if (modern && e2.special && e2.skill === "tech5") out.foresight2 = clamp2(out.foresight2 + 3, 0, maxGauge);
  out.healed1 = e1.skill === "tech4" ? clamp2(s.hp1 + (modern && e1.special ? 2 : 1), 0, maxHp) : s.hp1;
  out.healed2 = e2.skill === "tech4" ? clamp2(s.hp2 + (modern && e2.special ? 2 : 1), 0, maxHp) : s.hp2;
  out.basePower1 = e1.power;
  out.basePower2 = e2.power;
  out.power1 = out.attack1 ? (e1.skill === "tech6" ? (s.momentum1 ? 2 : 1) + (modern ? s.specialMomentum1 || 0 : 0) : modern && e1.special && e1.skill === "tech3" ? 3 : e1.power) + (s.enhance1 > 0 ? 1 : 0) + (powerBonus[1] === 1 ? 1 : 0) : 0;
  out.power2 = out.attack2 ? (e2.skill === "tech6" ? (s.momentum2 ? 2 : 1) + (modern ? s.specialMomentum2 || 0 : 0) : modern && e2.special && e2.skill === "tech3" ? 3 : e2.power) + (s.enhance2 > 0 ? 1 : 0) + (powerBonus[2] === 1 ? 1 : 0) : 0;
  out.pierce1 = !!e1.pierce;
  out.pierce2 = !!e2.pierce;
  let d1 = s.ruin1 > 0 && e1.type === "charge" ? 1 : 0, d2 = s.ruin2 > 0 && e2.type === "charge" ? 1 : 0;
  if (out.reflect1 && out.attack2) d2 += modern && e1.special ? 2 : 1;
  if (out.reflect2 && out.attack1) d1 += modern && e2.special ? 2 : 1;
  if (out.attack1 && out.attack2) {
    const win1 = modern && e1.special && e1.skill === "tech1", win2 = modern && e2.special && e2.skill === "tech1";
    d1 += win1 && !win2 ? 0 : win2 && !win1 ? out.power2 : Math.max(0, out.power2 - out.power1);
    d2 += win2 && !win1 ? 0 : win1 && !win2 ? out.power1 : Math.max(0, out.power1 - out.power2);
  } else {
    if (out.attack2 && !out.reflect1 && (!out.blocking1 || out.pierce2 && !(foresightShield && e1.skill === "tech5"))) d1 += out.power2;
    if (out.attack1 && !out.reflect2 && (!out.blocking2 || out.pierce1 && !(foresightShield && e2.skill === "tech5"))) d2 += out.power1;
  }
  if (e2.skill === "tech3" && !(modern && e2.special) && e1.type === "charge" && !out.blocking1 && !out.reflect1) d1 += rulesVersion >= 2 ? 1 : 2;
  if (e1.skill === "tech3" && !(modern && e1.special) && e2.type === "charge" && !out.blocking2 && !out.reflect2) d2 += rulesVersion >= 2 ? 1 : 2;
  if (e1.skill === "tech7") d1 += 2;
  if (e2.skill === "tech7") d2 += 2;
  out.damage1 = d1;
  out.damage2 = d2;
  out.rampage1 = e1.skill === "tech7" ? clamp2(out.foresight1 + 8, 0, maxGauge) : out.foresight1;
  out.rampage2 = e2.skill === "tech7" ? clamp2(out.foresight2 + 8, 0, maxGauge) : out.foresight2;
  out.stolen1 = e1.skill === "tech10" ? Math.min(modern && e1.special ? 3 : 2, out.rampage2) : 0;
  out.stolen2 = e2.skill === "tech10" ? Math.min(modern && e2.special ? 3 : 2, out.rampage1) : 0;
  out.gauge1 = clamp2(out.rampage1 + out.stolen1 - out.stolen2, 0, maxGauge);
  out.gauge2 = clamp2(out.rampage2 + out.stolen2 - out.stolen1, 0, maxGauge);
  if (rulesVersion >= 2) {
    out.gauge1 = Math.max(0, out.gauge1 - (e2.skill === "tech3" ? 1 : 0));
    out.gauge2 = Math.max(0, out.gauge2 - (e1.skill === "tech3" ? 1 : 0));
  }
  if (modern) {
    out.normalGauge1 = out.gauge1;
    out.normalGauge2 = out.gauge2;
  }
  if (modern) for (const p of [1, 2]) {
    const raw = p === 1 ? raw1 : raw2, e = p === 1 ? e1 : e2, enemy = p === 1 ? e2 : e1, other = p === 1 ? raw2 : raw1;
    if (raw.special && raw.skill === "tech12" && ["charge", "attack", "block"].includes(other.type) && !other.skill) out["gauge" + p] = clamp2(out["gauge" + p] + 2, 0, maxGauge);
    if (s["specialRuin" + p] > 0 && e.type === "charge") out["gauge" + p] = Math.max(0, out["gauge" + p] - 1);
    out["specialSeal" + p] = enemy.special && enemy.skill === "tech8" ? 2 : Math.max(0, s["specialSeal" + p] - 1);
    out["specialRuin" + p] = enemy.skill === "tech11" ? enemy.special ? 3 : 0 : Math.max(0, s["specialRuin" + p] - 1);
    out["specialMomentum" + p] = e.skill === "tech6" ? e.special ? 1 : 0 : s["specialMomentum" + p];
  }
  out.hp1 = out.misses1 >= 2 ? 0 : clamp2(out.healed1 - d1, 0, maxHp);
  out.hp2 = out.misses2 >= 2 ? 0 : clamp2(out.healed2 - d2, 0, maxHp);
  out.seal1 = out.sealed1 && out.gauge1 < 7;
  out.seal2 = out.sealed2 && out.gauge2 < 7;
  out.enhance1 = e1.skill === "tech9" ? modern && e1.special ? 4 : 2 : Math.max(0, s.enhance1 - 1);
  out.enhance2 = e2.skill === "tech9" ? modern && e2.special ? 4 : 2 : Math.max(0, s.enhance2 - 1);
  out.momentum1 = e1.skill === "tech6" ? !s.momentum1 : false;
  out.momentum2 = e2.skill === "tech6" ? !s.momentum2 : false;
  out.ruin1 = e2.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin1 || 0) - 1);
  out.ruin2 = e1.skill === "tech11" ? 3 : Math.max(0, Number(s.ruin2 || 0) - 1);
  out.last1 = e1.type;
  out.last2 = e2.type;
  out.turn = s.turn + 1;
  if (!modern) for (const p of [1, 2]) {
    const raw = p === 1 ? raw1 : raw2;
    for (const k of ["gauge", "hp", "seal", "ruin", "last"]) out["input" + k[0].toUpperCase() + k.slice(1) + p] = s[k + p];
    out["inputSpecialSeal" + p] = 0;
    out["inputSpecialRuin" + p] = 0;
    out["stance" + p] = powerBonus[p] === 1 ? 1 : 0;
    out["effective" + p] = raw.skill === "tech12" ? (p === 1 ? raw2 : raw1).skill === "tech12" ? -1 : out["action" + (3 - p)] : out["action" + p];
    out["baseAction" + p] = out["action" + p];
    out["effectBase" + p] = out["effective" + p];
    out["specialCost" + p] = 0;
    out["specialGain" + p] = 0;
    out["normalGauge" + p] = out["gauge" + p];
    out["specialSeal" + p] = 0;
    out["specialRuin" + p] = 0;
    out["specialMomentum" + p] = 0;
  }
  return out;
}
var ACTIONS2, S_COSTS, clamp2, chosen2, stateFields2;
var init_free_calculator = __esm({
  "server/engine/free-calculator.js"() {
    ACTIONS2 = [
      { cost: 0, type: "charge", skill: "", power: 0, pierce: false },
      { cost: 1, type: "attack", skill: "", power: 1, pierce: false },
      { cost: 0, type: "block", skill: "", power: 0, pierce: false },
      { cost: 4, type: "attack", skill: "tech1", power: 2, pierce: true },
      { cost: 2, type: "reflect", skill: "tech2", power: 0, pierce: false },
      { cost: 5, type: "attack", skill: "tech3", power: 2, pierce: false },
      { cost: 2, type: "heal", skill: "tech4", power: 0, pierce: false },
      { cost: 1, type: "block", skill: "tech5", power: 0, pierce: false },
      { cost: 2, type: "attack", skill: "tech6", power: 1, pierce: false },
      { cost: 0, type: "special", skill: "tech7", power: 0, pierce: false },
      { cost: 0, type: "seal", skill: "tech8", power: 0, pierce: false },
      { cost: 2, type: "enhance", skill: "tech9", power: 0, pierce: false },
      { cost: 3, type: "siphon", skill: "tech10", power: 0, pierce: false },
      { cost: 1, type: "ruin", skill: "tech11", power: 0, pierce: false },
      { cost: 2, type: "mirror", skill: "tech12", power: 0, pierce: false }
    ];
    S_COSTS = [12, 8, 8, 12, 12, 8, 12, 12, 16, 8, 6, 6];
    ACTIONS2.push(...ACTIONS2.slice(3).map((a, i) => ({ ...a, special: true, specialCost: S_COSTS[i] })));
    clamp2 = (n, min, max) => Math.max(min, Math.min(max, n));
    chosen2 = (s, moves, p, maxGauge) => Number.isInteger(moves?.[p]) ? moves[p] : s["gauge" + p] >= maxGauge ? 1 : 0;
    stateFields2 = ["turn", "startedAt", "hp1", "hp2", "gauge1", "gauge2", "seal1", "seal2", "enhance1", "enhance2", "momentum1", "momentum2", "ruin1", "ruin2", "last1", "last2", "misses1", "misses2"];
  }
});

// server/engine/linked-ai.mjs
var linked_ai_exports = {};
__export(linked_ai_exports, {
  DEFAULT_SEARCH: () => DEFAULT_SEARCH,
  ENGINE_VERSION: () => ENGINE_VERSION,
  THRESHOLD: () => THRESHOLD,
  actionData: () => actionData,
  actionName: () => actionName,
  activate: () => activate,
  analyze: () => analyze,
  analyzeHistory: () => analyzeHistory,
  baseId: () => baseId,
  digest: () => digest,
  evaluate: () => evaluate,
  features: () => features,
  fromCPU: () => fromCPU,
  initialPosition: () => initialPosition,
  legal: () => legal,
  normalId: () => normalId,
  play: () => play,
  reconstructHistory: () => reconstructHistory,
  rulesAPIs: () => rulesAPIs,
  sample: () => sample,
  skillChoices: () => skillChoices,
  specialId: () => specialId,
  swingCounts: () => swingCounts,
  terminal: () => terminal,
  validatePack: () => validatePack,
  verifyPack: () => verifyPack
});
if (!globalThis.window) globalThis.window = globalThis;
var modules = [...await Promise.all([Promise.resolve().then(() => (init_combat_v4(), combat_v4_exports)), Promise.resolve().then(() => (init_rules(), rules_exports)), Promise.resolve().then(() => (init_special_rules(), special_rules_exports)), Promise.resolve().then(() => (init_match_modes(), match_modes_exports))]), await Promise.resolve().then(() => (init_bot_engine(), bot_engine_exports))];
var api = (i, name) => modules[i].default || globalThis[name] || window[name];
var V4 = api(0, "BattleV4");
var A = api(1, "AdvancedRules");
var S = api(2, "SpecialRules");
var Modes = api(3, "MatchModes");
var B = api(4, "BattleAI");
Object.assign(window, { BattleV4: V4, AdvancedRules: A, SpecialRules: S });
var { calculate: oldCalculate, stateFields: stateFields3 } = await Promise.resolve().then(() => (init_history_calculator_v1(), history_calculator_v1_exports));
var { calculate: calculate3 } = await Promise.resolve().then(() => (init_free_calculator(), free_calculator_exports));
var ENGINE_VERSION = "linked-ai-20261029-v1";
var DEFAULT_SEARCH = Object.freeze({ depth: 2, iterations: 160, maxNodes: 1e5 });
var THRESHOLD = 200;
var swingCounts = (delta, eligible, threshold = THRESHOLD) => ({ 1: eligible && delta >= threshold, 2: eligible && delta <= -threshold });
var copy = (v) => structuredClone(v);
var baseFields = [...stateFields3, ...S.fields, ...V4.fields, ...V4.specialFields];
var normalId = (i) => i < 12 ? i + 3 : i + 15;
var specialId = (i) => i < 12 ? i + 15 : i + 22;
var baseId = (id) => id >= 34 ? id - 7 : id >= 15 && id <= 26 ? id - 12 : id;
var actionName = (id) => id === -1 ? "\u51CD\u7D50" : id < 3 ? ["\u30C1\u30E3\u30FC\u30B8", "\u30A2\u30BF\u30C3\u30AF", "\u30D6\u30ED\u30C3\u30AF"][id] : (id >= 15 && id <= 26 || id >= 34 ? "S" : "") + B.techniques[V4.indexOf(id)]?.name;
var hasSkills = (p) => A.hasSkills(p.rules);
var fields = (p) => [...stateFields3, ...p.version >= 3 ? S.fields : [], ...p.version >= 4 ? V4.fields : [], ...p.special?.version >= 4 ? V4.specialFields : []];
var pickState = (p, r) => Object.fromEntries(fields(p).map((k) => [k, k === "startedAt" ? 0 : r[k]]));
var terminal = (p) => p.state.hp1 <= 0 ? p.state.hp2 <= 0 ? 0 : -1 : p.state.hp2 <= 0 ? 1 : null;
function initialPosition({ rules = {}, version = 4, loadouts = { 1: [0, 1, 2], 2: [0, 1, 2] }, selected = {}, specialVersion = 6, foresightShield = true } = {}) {
  const state = Object.fromEntries(stateFields3.map((k) => [k, k === "turn" ? 1 : k === "startedAt" ? 0 : k.startsWith("hp") ? rules.hp ?? 10 : k.startsWith("gauge") ? rules.initialGauge ?? 8 : k.startsWith("seal") || k.startsWith("momentum") ? false : k.startsWith("last") ? "" : 0]));
  if (version >= 3) Object.assign(state, S.extraState());
  if (version >= 4) Object.assign(state, V4.extraState());
  if (rules.special === true && specialVersion >= 4) Object.assign(state, V4.extraSpecialState());
  const p = { version, rules: copy(rules), loadouts: copy(loadouts), state, selected: copy(selected), remaining: {}, active: {}, special: rules.special === true ? S.initial(specialVersion) : null, foresightShield };
  for (const side of [1, 2]) p.remaining[side] = A.byId[selected[side]]?.limit || 0;
  p.phase = hasSkills(p) ? "skills" : "actions";
  return p;
}
function fromCPU(s) {
  const p = initialPosition({ loadouts: { 1: s.loadouts[1], 2: s.loadouts[2] } });
  for (const side of [1, 2]) for (const k of ["hp", "gauge", "seal", "enhance", "momentum", "ruin", "last", "frozen", "poison"]) if (s[k]?.[side] != null) p.state[k + side] = s[k][side];
  p.state.turn = s.turn;
  return p;
}
function skillChoices(p, side) {
  return hasSkills(p) && p.remaining[side] > 0 && A.byId[p.selected[side]] ? [false, true] : [false];
}
function activate(p, uses) {
  const next = { ...p, phase: "actions", remaining: { ...p.remaining }, active: {} };
  for (const side of [1, 2]) if (uses[side]) {
    if (!skillChoices(p, side).includes(true)) throw Error("\u4F7F\u7528\u3067\u304D\u306A\u3044\u30B9\u30AD\u30EB\u3067\u3059");
    next.remaining[side]--;
    next.active[side] = { id: p.selected[side], turn: p.state.turn };
  }
  return next;
}
function actionData(p, id) {
  if (id === -1) return { cost: 0, type: "", skill: "", power: 0 };
  if (p.rules.classic && id >= 3 && id <= 5) return Modes.CLASSIC[id - 3];
  if (id < 3) return B.ACTIONS[id];
  return S.actionData(id, B.techniques, { charge: B.ACTIONS[0], attack: B.ACTIONS[1], block: B.ACTIONS[2] }, p.special?.version || 5);
}
function legal(p, side) {
  if (terminal(p) !== null) return [];
  const s = A.preview(p.state, p.selected, p.active, p.rules), other = 3 - side;
  if (s["frozen" + side] > 0) return [-1];
  const ids = [0, 1, 2, ...(p.loadouts[side] || []).map((i) => p.rules.classic ? i + 3 : normalId(i))];
  if (p.version >= 3 && p.special?.version >= 2) ids.push(...(p.loadouts[side] || []).map(specialId));
  return [...new Set(ids)].filter((id) => {
    if (p.version < 4 && id >= 27) return false;
    const a = actionData(p, id);
    if (!a || a.cost > s["gauge" + side]) return false;
    if (a.special && a.specialCost > (p.special?.gauge[side] || 0)) return false;
    if (s["specialSeal" + side] > 0 && (id >= 3 || id === 2)) return false;
    if (s["seal" + side] && (a.type === "block" || a.skill === "tech2")) return false;
    if (a.type === "block" && s["last" + side] === "block") return false;
    if (a.skill === "tech2" && !a.repeatable && s["last" + side] === "reflect") return false;
    if (a.skill === "tech8" && !a.special && s["gauge" + other] >= 7) return false;
    return !(a.type === "charge" && s["gauge" + side] >= (p.rules.maxGauge ?? 10));
  });
}
function play(p, a, b, { validate = true } = {}) {
  if (p.phase === "skills") throw Error("\u30B9\u30AD\u30EB\u9078\u629E\u3092\u5148\u306B\u89E3\u6C7A\u3057\u3066\u304F\u3060\u3055\u3044");
  if (validate && (!legal(p, 1).includes(a) || !legal(p, 2).includes(b))) throw Error("\u4F7F\u7528\u3067\u304D\u306A\u3044\u884C\u52D5\u3067\u3059");
  const moves = { 1: a, 2: b }, rules = { ...p.rules, specialVersion: p.special?.version || 0 };
  const resolver = (state, m, version, r = rules, bonus = {}) => p.version === 1 ? oldCalculate(state, m) : calculate3(state, m, p.version, { ...r, specialVersion: p.special?.version || 0 }, bonus, p.foresightShield);
  const result = hasSkills(p) ? A.resolve(p.state, moves, p.selected, p.active, resolver, rules) : resolver(p.state, moves, p.version, rules);
  if (p.special) S.adjustCosts(p.special, result);
  const next = { ...p, state: pickState(p, result), special: p.special ? S.advance(p.special, result) : null, active: {}, phase: hasSkills(p) ? "skills" : "actions" };
  return { position: next, result };
}
async function digest(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((n) => n.toString(16).padStart(2, "0")).join("");
}
var modelSizes = { "psy-value-v1-75": 75, "psy-lab-19skills-v1-134": 134, "psy-lab-19skills-special-v5-140": 140, "psy-lab-19skills-advanced-v1-146": 146 };
function validatePack(pack, rulesFingerprint) {
  if (pack?.schema !== "psy-linked-ai-pack-v1" || pack.rulesFingerprint !== rulesFingerprint) throw Error("\u3053\u306E\u30B2\u30FC\u30E0\u306E\u30EB\u30FC\u30EB\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044AI\u30D1\u30C3\u30AF\u3067\u3059");
  for (const mode of ["standard", "special", "advanced"]) {
    const d = pack.models?.[mode], m = d?.model;
    if (!m || m.weights?.length !== modelSizes[m.schema] || !m.weights.every((w) => Number.isFinite(w) && Math.abs(w) <= 10) || !Number.isSafeInteger(m.updates) || m.updates < 0) throw Error("AI\u306E\u8A55\u4FA1\u30E2\u30C7\u30EB\u304C\u4E0D\u6B63\u3067\u3059: " + mode);
    if (d.catalog?.length !== 19 || new Set(d.catalog.map((x) => x.name)).size !== 19 || d.catalog.some((x) => !B.techniques.some((t) => t.name === x.name && t.cost === x.cost))) throw Error("AI\u306E\u6280\u5B9A\u7FA9\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
  }
  return pack;
}
async function verifyPack(pack, fingerprint) {
  validatePack(pack, fingerprint);
  const { id, ...payload } = pack;
  if (id !== await digest(payload)) throw Error("AI\u30D1\u30C3\u30AF\u306E\u691C\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
  return pack;
}
function modelDescriptor(p, pack) {
  return pack.models[p.special ? "special" : hasSkills(p) ? "advanced" : "standard"];
}
function features(p, descriptor) {
  const { model, catalog } = descriptor, s = p.state, maxHP = p.rules.hp ?? 10, maxGauge = p.rules.maxGauge ?? 10;
  const side = (side2) => {
    const hp = s["hp" + side2] * 10 / maxHP, gauge = s["gauge" + side2] * 10 / maxGauge, h = hp / 10, g = gauge / 10, last = s["last" + side2], enhance = s["enhance" + side2] / 2, seal = Number(s["seal" + side2]);
    const v = [h, g, enhance, Number(s["momentum" + side2]), seal, h * g, h * h, g * g, +(last === "charge"), +(last === "block"), h * enhance, g * seal, +(hp <= 2), +(gauge >= 7), +(gauge === 0)];
    const ownNames = (p.loadouts[side2] || []).map((i) => B.techniques[i]?.name);
    for (const t of catalog.slice(0, model.schema === "psy-value-v1-75" ? 10 : 19)) {
      const own = ownNames.includes(t.name);
      v.push(+own, own ? h : 0, own ? g : 0, own ? +(s["gauge" + side2] >= t.cost) : 0, own ? +(hp <= 3) : 0, own ? +(last === "charge") : 0);
    }
    if (model.schema !== "psy-value-v1-75") {
      const ruin = (s["ruin" + side2] || 0) / 3;
      v.push(ruin, ruin * (1 - g), ruin * +(last === "charge"), (s["poison" + side2] || 0) / 2, +(s["frozen" + side2] || 0));
    }
    if (model.schema.includes("advanced")) for (const skill of A.SKILLS) v.push(p.selected[side2] === skill.id ? p.remaining[side2] / skill.limit : 0, Number(A.active(p.selected, p.active, side2, skill.id)));
    if (model.schema.includes("special")) v.push((p.special?.gauge[side2] || 0) / 30, (s["specialSeal" + side2] || 0) / 2, (s["specialRuin" + side2] || 0) / 3, Number(s["specialMomentum" + side2] || 0), (s["weaken" + side2] || 0) / 2, (p.loadouts[side2] || []).filter((i) => (S.definition(specialId(i), p.special?.version)?.cost ?? Infinity) <= (p.special?.gauge[side2] || 0)).length / 3);
    return v;
  };
  const x = side(1), y = side(2);
  return x.map((v, i) => v - y[i]);
}
function evaluate(p, pack) {
  const end = terminal(p);
  if (end !== null) return end;
  const d = modelDescriptor(p, pack), x = features(p, d);
  let v = 0;
  for (let i = 0; i < x.length; i++) v += x[i] * d.model.weights[i];
  if (p.special && hasSkills(p)) for (const side of [1, 2]) {
    const sign = side === 1 ? 1 : -1;
    v += sign * (p.remaining[side] || 0) * 0.025;
  }
  return 0.94 * Math.tanh(v);
}
function analyze(position, pack, options = {}) {
  const cfg = { ...DEFAULT_SEARCH, ...options };
  if (!Number.isInteger(cfg.depth) || cfg.depth < 1 || cfg.depth > 3 || !Number.isInteger(cfg.iterations) || cfg.iterations < 20 || cfg.iterations > 2e3 || !Number.isInteger(cfg.maxNodes) || cfg.maxNodes < 100 || cfg.maxNodes > 1e6) throw Error("\u63A2\u7D22\u6761\u4EF6\u304C\u4E0D\u6B63\u3067\u3059");
  let nodes = 0, completed = null;
  const budget = /* @__PURE__ */ Symbol(), cache = /* @__PURE__ */ new Map();
  function search(p, depth) {
    if (++nodes > cfg.maxNodes) throw budget;
    const t = terminal(p);
    if (t !== null) return { value: t, lower: t, upper: t, gap: 0 };
    if (depth === 0) {
      const value = evaluate(p, pack);
      return { value, lower: value, upper: value, gap: 0 };
    }
    const key = JSON.stringify([depth, p.phase, p.state, p.special, p.remaining, p.active]);
    if (cache.has(key)) return cache.get(key);
    const skill = p.phase === "skills", a = skill ? skillChoices(p, 1) : legal(p, 1), b = skill ? skillChoices(p, 2) : legal(p, 2);
    if (!a.length || !b.length) throw Error("\u6709\u52B9\u306A\u884C\u52D5\u3092\u751F\u6210\u3067\u304D\u307E\u305B\u3093");
    const matrix = a.map((x) => b.map((y) => search(skill ? activate(p, { 1: x, 2: y }) : play(p, x, y, { validate: false }).position, skill ? depth : depth - 1).value));
    const out = { ...B.matrixSolve(matrix, cfg.iterations), actions1: a, actions2: b, matrix, phase: p.phase };
    cache.set(key, out);
    return out;
  }
  for (let depth = 1; depth <= cfg.depth; depth++) try {
    completed = { ...search(position, depth), depth };
  } catch (e) {
    if (e !== budget) throw e;
    break;
  }
  if (!completed) throw Error("\u63A2\u7D22\u4E88\u7B97\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059");
  return { ...completed, nodes, requestedDepth: cfg.depth, complete: completed.depth === cfg.depth, engineVersion: ENGINE_VERSION, modelId: pack.id };
}
function sample(actions, prob, random = Math.random) {
  let r = random();
  for (let i = 0; i < actions.length; i++) {
    r -= prob[i];
    if (r < 0) return actions[i];
  }
  return actions.at(-1);
}
function reconstructHistory(h) {
  if (h.version !== 1 || ![1, 2, 3, 4].includes(h.rulesVersion ?? 1) || !Number.isInteger(h.turnCount) || h.turnCount < 0 || h.turnCount > 300) throw Error("\u672A\u5BFE\u5FDC\u307E\u305F\u306F\u4E0D\u6B63\u306A\u5C65\u6B74\u3067\u3059");
  const slots = (side) => [0, 1, 2].map((i) => h.players[side].loadout?.[i]).filter(Number.isInteger);
  let p = initialPosition({ rules: h.roomRules || {}, version: h.rulesVersion ?? 1, loadouts: { 1: slots(1), 2: slots(2) }, selected: h.advanced?.selected || {}, specialVersion: h.special?.version || 1, foresightShield: h.foresightShield === true });
  const positions = [p], turns = [];
  for (let turn = 1; turn <= h.turnCount; turn++) {
    const m = h.moves?.[turn];
    if (!m || ![1, 2].every((side) => Number.isInteger(m[side]) && m[side] >= (h.rulesVersion === 4 ? -1 : 0) && m[side] <= (h.rulesVersion === 4 ? 40 : h.rulesVersion === 3 ? 26 : 14))) throw Error("\u884C\u52D5\u30C7\u30FC\u30BF\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059: T" + turn);
    const receipts = A.forTurn(h.advanced, turn), uses = { 1: !!receipts[1], 2: !!receipts[2] };
    const actual = p.phase === "skills" ? activate(p, uses) : p;
    const { position: next, result } = play(actual, m[1], m[2], { validate: false });
    turns.push({ turn, moves: { 1: m[1], 2: m[2] }, skills: copy(receipts), before: p.state, after: next.state, result });
    p = next;
    positions.push(p);
  }
  if (h.finalState && fields(p).some((k) => k !== "startedAt" && p.state[k] !== h.finalState[k])) throw Error("\u4FDD\u5B58\u3055\u308C\u305F\u6700\u7D42\u72B6\u614B\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093");
  if (p.special && [1, 2].some((side) => p.special.gauge[side] !== h.special?.gauge?.[side])) throw Error("\u4FDD\u5B58\u3055\u308C\u305FS\u30B2\u30FC\u30B8\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093");
  return { positions, turns };
}
async function analyzeHistory(h, pack, options = {}, onProgress = () => {
}) {
  const threshold = options.threshold ?? THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 2e3) throw Error("\u5224\u5B9A\u3057\u304D\u3044\u5024\u304C\u4E0D\u6B63\u3067\u3059");
  const cfg = { ...DEFAULT_SEARCH, ...options };
  delete cfg.threshold;
  const { positions, turns } = reconstructHistory(h), evaluations = [];
  for (let i = 0; i < positions.length; i++) {
    evaluations.push(analyze(positions[i], pack, cfg));
    onProgress({ completed: i + 1, total: positions.length });
  }
  const points = evaluations.map((e, i) => ({ turn: i, value: e.value * 1e3, lower: e.lower * 1e3, upper: e.upper * 1e3, depth: e.depth, complete: e.complete, nodes: e.nodes, gap: e.gap * 1e3 }));
  const records = turns.map((t, i) => {
    const before = points[i], after = points[i + 1], delta = after.value - before.value;
    const reliable = before.complete && after.complete;
    return { turn: t.turn, moves: t.moves, skills: t.skills, before: before.value, after: after.value, delta, eligible: reliable, counts: swingCounts(delta, reliable, threshold), uncertain: { 1: reliable && delta >= threshold && after.lower - before.upper < threshold, 2: reliable && delta <= -threshold && before.lower - after.upper < threshold }, beforeHP: { 1: t.before.hp1, 2: t.before.hp2 }, afterHP: { 1: t.after.hp1, 2: t.after.hp2 } };
  });
  return { schema: "psy-linked-analysis-v1", engineVersion: ENGINE_VERSION, modelId: pack.id, rulesFingerprint: pack.rulesFingerprint, rules: { version: h.rulesVersion ?? 1, room: h.roomRules || {}, specialVersion: h.special?.version || 0 }, modelCoverage: h.roomRules?.special && A.hasSkills(h.roomRules) ? "special-model-with-skill-correction" : "mode-model", historyHash: await digest(h), historyId: h.id || "", settings: { ...cfg, threshold }, names: { 1: h.players[1].name, 2: h.players[2].name }, points, turns: records, summary: Object.fromEntries([1, 2].map((side) => [side, { successes: records.filter((t) => t.counts[side]).length, eligibleTurns: records.filter((t) => t.eligible).length, uncertain: records.filter((t) => t.uncertain[side]).length }])) };
}
var rulesAPIs = { V4, A, S, Modes, B };

// server/engine/stats.mjs
var attacks = /* @__PURE__ */ new Set([1, 3, 5, 8, 29, 31, 33]);
var defenses = /* @__PURE__ */ new Set([2, 4, 7]);
var percentage = (n, d) => d ? 100 * n / d : null;
function hit(r, side, h, turn) {
  if (typeof r["hit" + side] === "boolean") return r["hit" + side];
  const q = 3 - side;
  if (!r["attack" + side] || r["power" + side] <= 0 || r["reflect" + q]) return false;
  if (rulesAPIs.A.active(h.advanced?.selected, rulesAPIs.A.forTurn(h.advanced, turn), q, "invincible")) return false;
  if (r["attack" + q]) {
    const mine = h.rulesVersion === 3 && r["effective" + side] >= 15 && r["skill" + side] === "tech1", other = h.rulesVersion === 3 && r["effective" + q] >= 15 && r["skill" + q] === "tech1";
    return mine && !other || (!other || mine) && r["power" + side] > r["power" + q];
  }
  return !r["blocking" + q] || r["pierce" + side] && !(h.foresightShield && r["skill" + q] === "tech5");
}
function playerStatistics(histories, uid, reports = {}) {
  const raw = { speed: { turns: 0, wins: 0 }, hp: { remaining: 0, matches: 0 }, attack: { successes: 0, uses: 0 }, defense: { successes: 0, uses: 0 }, read: { successes: 0, turns: 0, uncertain: 0 } }, counts = {};
  let analyzedMatches = 0, modelId = null, settings = null;
  const eligible = histories.filter((h) => h.reason === "battle" && (h.roomRules?.hp ?? 10) === 10 && [1, 2].some((side) => h.players[side].uid === uid));
  for (const h of eligible) {
    const side = h.players[1].uid === uid ? 1 : 2, q = 3 - side, report = reports[h.id], replay = reconstructHistory(h);
    raw.hp.matches++;
    raw.hp.remaining += h.finalState["hp" + side];
    if (h.settled.winner === side) {
      raw.speed.wins++;
      raw.speed.turns += h.turnCount;
    }
    if (report) {
      if (modelId && modelId !== report.modelId || settings && JSON.stringify(settings) !== JSON.stringify(report.settings)) throw Error("\u7570\u306A\u308BAI\u30FB\u63A2\u7D22\u6761\u4EF6\u306E\u7D50\u679C\u306F\u307E\u3068\u3081\u3089\u308C\u307E\u305B\u3093");
      modelId = report.modelId;
      settings = report.settings;
      analyzedMatches++;
      raw.read.successes += report.summary[side].successes;
      raw.read.turns += report.summary[side].eligibleTurns;
      raw.read.uncertain += report.summary[side].uncertain;
    }
    for (const t of replay.turns) {
      const a = baseId(t.moves[side]), r = t.result;
      if (a < 0) continue;
      counts[a] = (counts[a] || 0) + 1;
      if (attacks.has(a)) {
        raw.attack.uses++;
        if (hit(r, side, h, t.turn)) raw.attack.successes++;
      }
      if (defenses.has(a)) {
        raw.defense.uses++;
        const shield = h.rulesVersion >= 4 || h.foresightShield === true;
        if (r["attack" + q] && (r["reflect" + side] || r["blocking" + side] && (!r["pierce" + q] || shield && r["skill" + side] === "tech5"))) raw.defense.successes++;
      }
    }
  }
  return { matches: eligible.length, analyzedMatches, modelId, settings, raw, scores: { read: percentage(raw.read.successes, raw.read.turns), attack: percentage(raw.attack.successes, raw.attack.uses), defense: percentage(raw.defense.successes, raw.defense.uses), hp: percentage(raw.hp.remaining, raw.hp.matches * 10), speed: raw.speed.wins ? 1e3 / (raw.speed.turns / raw.speed.wins + 9) : null }, top: Object.entries(counts).filter(([id]) => +id >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, count]) => ({ name: actionName(+id), count })) };
}

// server/model.json
var model_default = { schema: "psy-linked-ai-pack-v1", rulesFingerprint: "578e5759d013513ece6bb112cafd7f46e73c483d268c4135145799394daa546d", createdAt: "2026-10-28T07:50:14.426Z", name: "\u89E3\u6790\u30E9\u30DC\u5171\u6709\u30E2\u30C7\u30EB 2026-10-28", models: { standard: { model: { schema: "psy-lab-19skills-v1-134", weights: [5.031461988721709, 1.629466436283775, 1.2409311556072373, 0.7874814413072128, -0.654472009824401, 0.48988858539615937, -0.016443931080438717, -0.5120194705715251, 0.013906745200009457, -0.20347194249957348, -0.5257718292334559, 0.6521074634396534, -0.14782797306804277, -0.026719334252935312, -0.4465854606846153, 0.10863546535707004, 0.3846195623327584, 0.32608194647948685, 0.24909636595284546, 0.06562813730572178, 0.02117391346734036, -0.04532760888229969, 0.4992325525344334, 0.2474442647480257, 0.13878353957105152, 0.08037232613210481, -0.0575807341689729, 0.09611241814059003, 0.37709534144410817, 0.4372386511054838, 0.18638446252551213, -0.026002594630341803, -0.05426444352147434, -0.2060029868086075, 0.2958517835943811, 0.16927009877038116, 0.003927054096986558, 0.07061699786305992, -0.0047600399645743845, -0.1426843293041639, 0.3560550013554613, 0.07666330390846927, -0.0173926276468037, 0.07525613172499895, 0.006067382133050399, -0.05365278892228283, 1.1814892186639583, 0.1747717893263867, 0.18193021317150251, -0.20441177193881005, 0.05245325718230517, -0.08709122646153879, 0.4258282171688017, -0.0623419761859073, -0.08709122646153879, 0.026665507011949332, -0.003036770684882165, -0.0935187188459501, 0.3753087137192281, 0.043495501047206606, -0.0935187188459501, 0.0782540014621131, 0.012952645925624375, -0.03423370722272704, 0.46119299955120663, 0.15172291892139333, 0.025978277527337515, -0.00227957677299281, 0.009005197729786387, -0.21272806948735665, 0.30684681846335393, 0.08614944627606622, -0.012896482788135016, 0.058105914264223193, 0.0037037396153337208, -0.16623272576358444, 0.3791580464924077, 0.14686042722112622, 0.05263104933009787, 0.016979355162884773, -0.009552592898267608, -0.1794791915367056, 0.3140039566647592, 0.02542604697794131, 0.05593305220869095, 0.016496408470484974, 0.006903716305442211, 0.09500027392847342, 0.3017315059165571, -0.20690277168429588, 0.09500027392847342, -0.0368231312009837, 0.026353122279333927, -0.010906487223362326, 0.46077480709526153, -0.2149521809007754, -0.024979676847217466, -0.054849344018147304, 0.028443955537302244, 0.16300645904743088, 0.11280945099268787, 0.44410060391339007, 0.21724565013826966, -0.008185597035138773, -0.08149004508749436, 0.0740838800181914, 1.1820106584797803, 0.3571459415437567, -0.04550870022036331, -0.3569959073460992, 0.02608132005397981, 0.02748902055843746, 0.37350403719417025, 0.14610684074010905, -3339845612431793e-20, -0.0464048787442333, 0.005024047176100236, 0.09095062586512404, 0.38500215880901356, -0.017272634200185075, 0.13353821652870088, -0.005735024203027705, 0.041191622239632214, 0.2467110616472788, 0.2034157687111706, 0.2526863886833601, 0.034137641195130575, -0.11050481391742326, -0.0014086496912822726, 0.03147294795548911, -0.9907942091138986, 0.07576080967451647, -2.2397689322585483, -1.637504890547876], updates: 5302833 }, catalog: [{ name: "\u30D6\u30EA\u30FC\u30C1", cost: 4 }, { name: "\u30AB\u30A6\u30F3\u30BF\u30FC", cost: 2 }, { name: "\u30D1\u30CB\u30C3\u30B7\u30E5", cost: 5 }, { name: "\u30D2\u30FC\u30EB", cost: 2 }, { name: "\u30D5\u30A9\u30FC\u30B5\u30A4\u30C8", cost: 1 }, { name: "\u30E2\u30FC\u30E1\u30F3\u30BF\u30E0", cost: 2 }, { name: "\u30E9\u30F3\u30DA\u30FC\u30B8", cost: 0 }, { name: "\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9", cost: 0 }, { name: "\u30A8\u30F3\u30CF\u30F3\u30B9", cost: 2 }, { name: "\u30B5\u30A4\u30D5\u30A9\u30F3", cost: 3 }, { name: "\u30DF\u30E9\u30FC", cost: 2 }, { name: "\u30EB\u30A4\u30F3", cost: 1 }, { name: "\u30D5\u30A9\u30FC\u30AB\u30B9", cost: 0 }, { name: "\u30B3\u30F3\u30D0\u30FC\u30C8", cost: 1 }, { name: "\u30D6\u30E9\u30B9\u30C8", cost: 6 }, { name: "\u30D5\u30EA\u30FC\u30BA", cost: 2 }, { name: "\u30EA\u30D5\u30A1\u30F3\u30C9", cost: 3 }, { name: "\u30F4\u30A7\u30CE\u30E0", cost: 5 }, { name: "\u30C9\u30EC\u30A4\u30F3", cost: 2 }], source: { schema: "psy-lab-training-v10", rules: "psy-lab-training-19skills-v1", generation: 12721, trainGames: 13450, savedAt: "2026-10-27T22:47:10.488Z" } }, special: { model: { schema: "psy-lab-19skills-special-v5-140", weights: [2.467345174816481, 0.7881553365108441, 0.31435927769546573, 0.19169640105266292, -0.2909135341046706, 0.09552892727972914, 0.32277200605726103, -0.08049785441433419, -4957641138319294e-19, -0.13965130693320732, 0.02888812047741221, 0.002646139545940235, -0.3040268105948789, -0.013144871112317444, -0.356042361303719, -0.01579939367386995, -0.010321145935545853, 0.11916219198684759, 0.3471045378905905, 0.04722524366914812, 0.001356996558367506, 0.043236971461853665, 0.11022334110013676, -998065776498643e-18, 0.07815880602121555, -0.08160373741772019, -0.010702965037159343, 0.05486785669539232, 0.02501396068552886, 0.14180541238111385, 0.18614714055208045, -0.009471708014395933, -0.021146668051047545, 0.06693698144474125, -0.009386890625796868, 0.1036698464319538, 0.050830205283868994, 0.031435048902108215, -0.002502243840297484, -0.012967358468488703, 0.007158295252717024, -0.0638531856479449, 0.02625804458541187, -0.058600164295917655, 0.02204252784158008, -0.08668691094911547, 0.11754939120449907, 0.028817231283181505, 0.1855900097764214, -0.07233977351569264, 0.008359656777217141, -0.04141578089866625, 0.09184047485610539, 0.03357016885214609, -0.04141578089866625, -0.11347363968982214, 0.005065500966655106, -0.033678381247045516, 0.04396344441056736, 0.04400242692748503, -0.033678381247045516, -0.03540683094974977, -0.018672093472144043, -0.08268572548868201, 0.00995957795271915, 0.013860479948055423, -0.006287598890601642, -0.0655672546130306, 6351314628093892e-19, -0.06556369390258544, 0.07045268950301023, -0.01788509901546261, 0.06826363830318871, -0.07789287533480992, 0.017139246191283288, -0.021746369503241582, 0.030078860293688274, -0.01868127514513424, 0.10108820102459662, -0.030011969838178394, -0.0069802099952631985, -0.014783313614703267, 0.083498998369404, 0.05057379118014439, -0.05660674181708796, -0.07675232122772072, -0.007415046294285982, 0.01739560908187132, 0.14108792856951421, -0.15558763670376421, 0.01739560908187132, -0.08259359139075972, -0.0019949724534973757, -0.0026838555566445414, 0.07758637096022461, -0.001373933983470033, 0.03162438428327243, -0.11007567807400517, 0.013409523253330023, 0.00115862239779549, 0.01985308864216017, 0.1792131093946207, 0.252957996924691, 0.013057049306414655, -0.04684722150119682, 0.04386907054668535, 0.2932605701287654, 0.14601729822572926, 0.05123118115898545, -0.22502546456822248, 0.02202790067752971, 0.013885645083091992, 0.0958506547989705, -0.023279644922709748, 0.07146113796285275, -0.10464078319897718, -0.0014774129450720473, 0.02438862656497319, 0.11496587138970818, -0.0428878730861249, 0.07533161299309592, -0.0858157025261538, 0.005159082648678393, 0.11227140002663892, 0.08940004289290211, 0.02832076720233427, 0.09223277100602724, -0.031178996824561465, 0.021055974871016857, -0.10278222291019024, -0.20676921795579747, 0.011734954229390297, -0.697584374191728, -0.5359830477394428, 0.25516251511227606, -0.3985329190257141, -0.12462279062457682, 0.2776085015988042, -0.3539478416936456, 0.13356457034030697], updates: 390059 }, catalog: [{ name: "\u30D6\u30EA\u30FC\u30C1", cost: 4 }, { name: "\u30AB\u30A6\u30F3\u30BF\u30FC", cost: 2 }, { name: "\u30D1\u30CB\u30C3\u30B7\u30E5", cost: 5 }, { name: "\u30D2\u30FC\u30EB", cost: 2 }, { name: "\u30D5\u30A9\u30FC\u30B5\u30A4\u30C8", cost: 1 }, { name: "\u30E2\u30FC\u30E1\u30F3\u30BF\u30E0", cost: 2 }, { name: "\u30E9\u30F3\u30DA\u30FC\u30B8", cost: 0 }, { name: "\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9", cost: 0 }, { name: "\u30A8\u30F3\u30CF\u30F3\u30B9", cost: 2 }, { name: "\u30B5\u30A4\u30D5\u30A9\u30F3", cost: 3 }, { name: "\u30DF\u30E9\u30FC", cost: 2 }, { name: "\u30EB\u30A4\u30F3", cost: 1 }, { name: "\u30D5\u30A9\u30FC\u30AB\u30B9", cost: 0 }, { name: "\u30B3\u30F3\u30D0\u30FC\u30C8", cost: 1 }, { name: "\u30D6\u30E9\u30B9\u30C8", cost: 6 }, { name: "\u30D5\u30EA\u30FC\u30BA", cost: 2 }, { name: "\u30EA\u30D5\u30A1\u30F3\u30C9", cost: 3 }, { name: "\u30F4\u30A7\u30CE\u30E0", cost: 5 }, { name: "\u30C9\u30EC\u30A4\u30F3", cost: 2 }], source: { schema: "psy-lab-training-v10", rules: "psy-lab-training-19skills-v1-special-v5", generation: 1013, trainGames: 1013, savedAt: "2026-10-28T07:50:14.426Z" } }, advanced: { model: { schema: "psy-lab-19skills-advanced-v1-146", weights: [4.3725568213645625, 1.5534831893201089, 1.0970863885573867, 0.6636478490997051, -0.5767623643283223, -0.4342644252423824, -0.04549621630026999, -0.2633975309503354, 5270008932243834e-19, -0.10234695259167349, -0.6760199237059773, 0.6133143357004701, -0.16245472992450702, 0.038044791052913904, -0.4904263728364638, 0.19501164278575953, 0.7151049948639592, 0.4444614584666124, 0.21287001797090996, -0.08370128471683051, 0.007074228391583236, -0.017587097991208743, 0.5561711048482053, 0.30356121799493085, 0.0977278997789938, 0.0024126548188751823, -0.019121696816710373, 0.1028779251840441, 0.4884574284866109, 0.45661394685863105, 0.1648218019854529, -0.06323266140840819, -0.015314164430313066, -0.03598390513200369, 0.30511744134131186, 0.12316670240297148, -0.032824924446759884, 0.005268716633544502, -7537045574509784e-19, -0.07132593846445077, 0.3574289035001045, 0.07909873628519419, 0.05220682080593604, 0.04466517138693772, 0.014032823062120274, 0.03212067974469274, 1.3154391314849645, 0.3357479724419809, 0.14635781345344342, -0.3482961971756348, -8042143958009253e-19, -0.04404956316644086, 0.5002715222815782, -0.05269146285539538, -0.04404956316644086, -0.0733199721089538, -0.01461097658388923, -0.06607458532206271, 0.3533029786119275, 0.08474929114257673, -0.06607458532206271, 0.061339814624272314, -0.0017871247195707493, -0.01440059736324794, 0.46420105512822507, 0.16183599101058518, -0.06120533642598888, 0.029021639293130435, 0.01710191835278245, -0.1371710395972379, 0.4999461937589223, 0.16492296698137882, -0.01045122123123333, -0.004886312423472251, 0.002968735971556944, -0.10910663457195278, 0.41992552786392773, 0.14562372588419792, 0.0317548287455461, -0.03316585203528838, -0.010244177001376222, -0.16417952200189329, 0.42384881494251525, 0.10865431918636571, 0.04857577028096831, -0.046271143285933125, 0.008579763434996966, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0048798227320122805, -0.9044762460751783, 0.04176923746943789, -0.3, -0.2, 0.5432351172824973, -0.02254994544621873, 0.6905408845408876, -0.020008098309905548, -0.10792823058812023, -0.018415957552641072, 0.5385252333584808, -0.06273550121510509, 0.3386210542431246, 0.16182867896363326, 0.49173139886125095, 0.23143542193684052], updates: 3793966 }, catalog: [{ name: "\u30D6\u30EA\u30FC\u30C1", cost: 4 }, { name: "\u30AB\u30A6\u30F3\u30BF\u30FC", cost: 2 }, { name: "\u30D1\u30CB\u30C3\u30B7\u30E5", cost: 5 }, { name: "\u30D2\u30FC\u30EB", cost: 2 }, { name: "\u30D5\u30A9\u30FC\u30B5\u30A4\u30C8", cost: 1 }, { name: "\u30E2\u30FC\u30E1\u30F3\u30BF\u30E0", cost: 2 }, { name: "\u30E9\u30F3\u30DA\u30FC\u30B8", cost: 0 }, { name: "\u30A2\u30F3\u30C1\u30AC\u30FC\u30C9", cost: 0 }, { name: "\u30A8\u30F3\u30CF\u30F3\u30B9", cost: 2 }, { name: "\u30B5\u30A4\u30D5\u30A9\u30F3", cost: 3 }, { name: "\u30DF\u30E9\u30FC", cost: 2 }, { name: "\u30EB\u30A4\u30F3", cost: 1 }, { name: "\u30D5\u30A9\u30FC\u30AB\u30B9", cost: 0 }, { name: "\u30B3\u30F3\u30D0\u30FC\u30C8", cost: 1 }, { name: "\u30D6\u30E9\u30B9\u30C8", cost: 6 }, { name: "\u30D5\u30EA\u30FC\u30BA", cost: 2 }, { name: "\u30EA\u30D5\u30A1\u30F3\u30C9", cost: 3 }, { name: "\u30F4\u30A7\u30CE\u30E0", cost: 5 }, { name: "\u30C9\u30EC\u30A4\u30F3", cost: 2 }], source: { schema: "psy-lab-training-v10", rules: "psy-lab-training-19skills-advanced-v1", generation: 2439, trainGames: 2439, savedAt: "2026-10-22T11:33:39.697Z" } } }, id: "2f5f01a0abbdf48d26700835d15a1533d1d0bfbe2ee78379280771b05bd61d9e" };

// server/core.mjs
var SETTINGS = Object.freeze({ ...DEFAULT_SEARCH, threshold: 200 });
var VERSION = ENGINE_VERSION + ":" + model_default.id;
var copy2 = (x) => structuredClone(x);
var validId = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(x);
var ServiceError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function requireThat(ok, status, message) {
  if (!ok) throw new ServiceError(status, message);
}
function strictBody(body, keys) {
  requireThat(body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).every((k) => keys.includes(k)), 400, "\u9001\u4FE1\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
}
function loadout(x) {
  requireThat(Array.isArray(x) && x.length === 3 && new Set(x).size === 3 && x.every((i) => Number.isInteger(i) && i >= 0 && i < 19), 400, "\u6280\u30923\u3064\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044");
  return x.slice();
}
const soloService=createSoloService({...linked_ai_exports,pack:model_default,version:VERSION,ErrorType:ServiceError});
function makeCPU(body) {
  strictBody(body, ["loadouts", "difficulty"]);
  requireThat(["easy", "normal", "hard"].includes(body.difficulty), 400, "\u96E3\u6613\u5EA6\u304C\u4E0D\u6B63\u3067\u3059");
  requireThat(body.loadouts && Object.keys(body.loadouts).length === 2, 400, "\u88C5\u5099\u304C\u4E0D\u6B63\u3067\u3059");
  return { id: crypto.randomUUID(), difficulty: body.difficulty, position: initialPosition({ loadouts: { 1: loadout(body.loadouts[1]), 2: loadout(body.loadouts[2]) } }), createdAt: Date.now(), version: VERSION };
}
function commitCPU(session) {
  const p = session.position;
  requireThat(terminal(p) === null, 409, "\u5BFE\u6226\u306F\u7D42\u4E86\u3057\u3066\u3044\u307E\u3059");
  const result = session.difficulty === "easy" ? null : analyze(p, model_default, { depth: session.difficulty === "hard" ? 2 : 1 });
  session.pending = result ? sample(result.actions2, result.q) : sample(legal(p, 2), legal(p, 2).map(() => 1 / legal(p, 2).length));
  return cpuView(session);
}
function cpuView(s) {
  return { session: s.id, turn: s.position.state.turn, action: s.pending >= 27 ? s.pending - 12 : s.pending, modelId: model_default.id, engineVersion: ENGINE_VERSION, finished: terminal(s.position) !== null };
}
function advanceCPU(session, body) {
  strictBody(body, ["session", "turn", "action"]);
  requireThat(session && session.version === VERSION && body.session === session.id, 409, "CPU\u6226\u3092\u958B\u59CB\u3057\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
  const p = session.position;
  if (session.lastRequest?.turn === body.turn) {
    requireThat(session.lastRequest.action === body.action, 409, "\u78BA\u5B9A\u6E08\u307F\u306E\u884C\u52D5\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093");
    return session.lastResponse;
  }
  requireThat(body.turn === p.state.turn && Number.isInteger(body.action), 409, "CPU\u6226\u306E\u30BF\u30FC\u30F3\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
  requireThat(legal(p, 1).includes(body.action), 400, "\u4F7F\u7528\u3067\u304D\u306A\u3044\u884C\u52D5\u3067\u3059");
  session.position = play(p, body.action, session.pending).position;
  session.lastRequest = { turn: body.turn, action: body.action };
  session.lastResponse = terminal(session.position) === null ? commitCPU(session) : cpuView(session);
  return session.lastResponse;
}
function livePosition(g) {
  requireThat(g?.state && g.loadouts && [1, 2].every((s) => g.loadouts[s]), 409, "\u5BFE\u6226\u306E\u958B\u59CB\u3092\u5F85\u3063\u3066\u3044\u307E\u3059");
  const rules = g.roomRules || {}, version = g.rulesVersion ?? 1;
  const p = initialPosition({ rules, version, loadouts: g.loadouts, selected: g.advanced?.selected || {}, specialVersion: g.special?.version || 1, foresightShield: g.foresightShield === true });
  for (const key of Object.keys(p.state)) if (g.state[key] != null) p.state[key] = g.state[key];
  p.state.startedAt = 0;
  if (p.special) p.special = copy2(g.special);
  if (rulesAPIs.A.hasSkills(rules)) for (const side of [1, 2]) {
    const used = Object.values(g.advanced?.uses?.[side] || {}).filter((receipt) => Number.isInteger(receipt?.turn) && receipt.turn < g.state.turn).length;
    p.remaining[side] = Math.max(0, (rulesAPIs.A.byId[p.selected[side]]?.limit || 0) - used);
  }
  return p;
}
function publicEvaluation(position) {
  const r = analyze(position, model_default, SETTINGS);
  return { value: Math.round(r.value * 1e3), lower: r.lower * 1e3, upper: r.upper * 1e3, depth: r.depth, complete: r.complete, engineVersion: ENGINE_VERSION, modelId: model_default.id, coverage: position.special && rulesAPIs.A.hasSkills(position.rules) ? "special-model-with-skill-correction" : "mode-model" };
}
function historyJob(history) {
  const replay = reconstructHistory(history);
  return { history, points: [], total: replay.positions.length, version: VERSION, settings: SETTINGS };
}
function advanceHistoryJob(job, batch = 4) {
  const { positions } = reconstructHistory(job.history);
  const start = job.points.length;
  for (let i = start; i < Math.min(positions.length, start + batch); i++) {
    const r = analyze(positions[i], model_default, SETTINGS);
    job.points.push({ value: r.value * 1e3, lower: r.lower * 1e3, upper: r.upper * 1e3, complete: r.complete, depth: r.depth });
  }
  return job.points.length === positions.length;
}
function contributions(job) {
  requireThat(job.points.length === job.total, 409, "\u89E3\u6790\u4E2D\u3067\u3059");
  const summary = { 1: { successes: 0, eligibleTurns: 0, uncertain: 0 }, 2: { successes: 0, eligibleTurns: 0, uncertain: 0 } };
  for (let i = 1; i < job.points.length; i++) {
    const a = job.points[i - 1], b = job.points[i];
    if (!a.complete || !b.complete) continue;
    const delta = b.value - a.value;
    for (const side of [1, 2]) {
      summary[side].eligibleTurns++;
      if ((side === 1 ? delta : -delta) >= 200) {
        summary[side].successes++;
        if ((side === 1 ? b.lower - a.upper : a.lower - b.upper) < 200) summary[side].uncertain++;
      }
    }
  }
  const report = { summary, modelId: model_default.id, settings: SETTINGS }, h = job.history;
  return [1, 2].map((side) => ({ uid: h.players[side].uid, id: h.id, version: VERSION, status: playerStatistics([h], h.players[side].uid, { [h.id]: report }), endedAt: h.endedAt }));
}
function emptyAggregate() {
  return { version: VERSION, matches: 0, analyzedMatches: 0, raw: { speed: { turns: 0, wins: 0 }, hp: { remaining: 0, matches: 0 }, attack: { successes: 0, uses: 0 }, defense: { successes: 0, uses: 0 }, read: { successes: 0, turns: 0, uncertain: 0 } }, updatedAt: 0 };
}
function addContribution(aggregate, contribution, sign = 1) {
  requireThat(contribution.version === VERSION, 409, "\u89E3\u6790\u30E2\u30C7\u30EB\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
  const s = contribution.status;
  aggregate.matches += sign * s.matches;
  aggregate.analyzedMatches += sign * s.analyzedMatches;
  for (const [axis, values] of Object.entries(aggregate.raw)) for (const key of Object.keys(values)) values[key] += sign * s.raw[axis][key];
  aggregate.updatedAt = Date.now();
  return aggregate;
}
function aggregateView(a) {
  const percent = (n, d) => d ? 100 * n / d : null, r = a.raw;
  return { ...a, scores: { read: percent(r.read.successes, r.read.turns), attack: percent(r.attack.successes, r.attack.uses), defense: percent(r.defense.successes, r.defense.uses), hp: percent(r.hp.remaining, r.hp.matches * 10), speed: r.speed.wins ? 1e3 / (r.speed.turns / r.speed.wins + 9) : null }, modelId: model_default.id, settings: SETTINGS };
}

// server/worker.mjs
var PREFIX = "/api/game-ai/";
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
var failure = (e) => json({ error: e instanceof ServiceError ? e.message : "AI\u306E\u51E6\u7406\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044" }, e.status || 503);
async function bodyOf(request) {
  requireThat(Number(request.headers.get("content-length") || 0) <= 4096, 413, "\u9001\u4FE1\u30C7\u30FC\u30BF\u304C\u5927\u304D\u3059\u304E\u307E\u3059");
  const reader = request.body?.getReader();
  requireThat(reader, 400, "\u9001\u4FE1\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
  let length = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) {
        await reader.cancel();
        throw new ServiceError(413, "\u9001\u4FE1\u30C7\u30FC\u30BF\u304C\u5927\u304D\u3059\u304E\u307E\u3059");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ServiceError(400, "\u9001\u4FE1\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
  }
}
function tokenOf(request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([A-Za-z0-9._-]{20,8192})$/)?.[1];
  requireThat(token, 401, "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044");
  return token;
}
function untrustedUid(token) {
  try {
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    requireThat(validId(p.sub), 401, "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059");
    return p.sub;
  } catch {
    throw new ServiceError(401, "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059");
  }
}
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url), path = url.pathname;
      if (path.startsWith(PREFIX)) {
        requireThat(env.GAME_AI, 503, "AI\u30B5\u30FC\u30D0\u30FC\u306E\u8A2D\u5B9A\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093");
        requireThat(["GET", "POST"].includes(request.method), 405, "\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u64CD\u4F5C\u3067\u3059");
        requireThat(!request.headers.get("Origin") || request.headers.get("Origin") === url.origin, 403, "\u3053\u306E\u63A5\u7D9A\u5143\u304B\u3089\u306F\u5229\u7528\u3067\u304D\u307E\u305B\u3093");
        const route = path.slice(PREFIX.length), token = tokenOf(request);
        let object;
        if (["cpu/start","cpu/turn","cpu/open","cpu/command"].includes(route)) object = "cpu:" + untrustedUid(token);
        else if (/^(live|history)\/[A-Za-z0-9_-]{1,128}$/.test(route)) object = "match:" + route.split("/")[1];
        else if (/^profile\/[A-Za-z0-9_-]{1,128}$/.test(route)) object = "profile:" + route.split("/")[1];
        else if (route === "status") object = "auth:" + untrustedUid(token);
        else throw new ServiceError(404, "\u30DA\u30FC\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
        requireThat(!url.search, 400, "\u6307\u5B9A\u3067\u304D\u306A\u3044\u6761\u4EF6\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059");
        const stub = env.GAME_AI.get(env.GAME_AI.idFromName(object));
        return stub.fetch(request);
      }
      requireThat(!/(?:^|\/)(?:server|tests|node_modules|scripts|\.git)(?:\/|$)|(?:bot-engine|bot-model|bot-worker|linked-ai|ai-linked-preview|FILE_MANIFEST)/i.test(decodeURIComponent(path)), 404, "\u30DA\u30FC\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      const patchedAsset=serveSoloAsset(request);if(patchedAsset)return patchedAsset;
      return env.ASSETS.fetch(request);
    } catch (e) {
      return failure(e);
    }
  }
};
var GameAI = class {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.authCache = /* @__PURE__ */ new Map();
    this.queue = Promise.resolve();
    this.mergeQueue = Promise.resolve();
  }
  serial(task) {
    const job = this.queue.catch(() => {
    }).then(task);
    this.queue = job;
    return job;
  }
  async authenticate(request) {
    const token = tokenOf(request), key = await linked_ai_exports.digest(token), cached = this.authCache.get(key);
    if (cached && cached.until > Date.now()) return { uid: cached.uid, token };
    requireThat(this.env.FIREBASE_API_KEY && this.env.FIREBASE_DATABASE_URL, 503, "Firebase\u306E\u63A5\u7D9A\u8A2D\u5B9A\u304C\u3042\u308A\u307E\u305B\u3093");
    const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(this.env.FIREBASE_API_KEY), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(8e3) });
    requireThat(response.ok, 401, "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u304C\u7121\u52B9\u3067\u3059\u3002\u30ED\u30B0\u30A4\u30F3\u3057\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
    const data = await response.json(), uid = data.users?.[0]?.localId;
    requireThat(validId(uid) && !data.users[0].disabled, 401, "\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u304C\u7121\u52B9\u3067\u3059");
    let exp = 0;
    try {
      exp = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1e3;
    } catch {
    }
    this.authCache.set(key, { uid, until: Math.min(Date.now() + 6e4, exp) });
    if (this.authCache.size > 100) this.authCache.delete(this.authCache.keys().next().value);
    return { uid, token };
  }
  async database(path, token, query = {}) {
    const base = new URL(this.env.FIREBASE_DATABASE_URL);
    requireThat(base.protocol === "https:" && /\.(?:firebasedatabase\.app|firebaseio\.com)$/.test(base.hostname), 503, "Firebase\u63A5\u7D9A\u5148\u304C\u4E0D\u6B63\u3067\u3059");
    const url = new URL(path + ".json", base.href.replace(/\/?$/, "/"));
    url.searchParams.set("auth", token);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
    const r = await fetch(url, { signal: AbortSignal.timeout(8e3) });
    requireThat(r.ok, r.status === 401 || r.status === 403 ? 403 : 503, "\u5BFE\u6226\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093");
    const text = await r.text();
    requireThat(text.length < 2 * 1024 * 1024, 413, "\u5BFE\u6226\u30C7\u30FC\u30BF\u304C\u5927\u304D\u3059\u304E\u307E\u3059");
    return JSON.parse(text);
  }
  async quota(key, limit, windowMs) {
    const now = Date.now(), slot = Math.floor(now / windowMs), storageKey = "limit:" + key, old = await this.ctx.storage.get(storageKey), next = old?.slot === slot ? { slot, count: old.count + 1 } : { slot, count: 1 };
    requireThat(next.count <= limit, 429, "\u5229\u7528\u56DE\u6570\u306E\u4E0A\u9650\u3067\u3059\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044");
    await this.ctx.storage.put(storageKey, next);
  }
  internal(name, path, data) {
    return this.env.GAME_AI.get(this.env.GAME_AI.idFromName(name)).fetch(new Request("https://game-ai-internal/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
  }
  fetch(request) {
    const internalURL = new URL(request.url);
    if (internalURL.hostname === "game-ai-internal" && ["/contribution", "/failure"].includes(internalURL.pathname)) {
      const job = this.mergeQueue.catch(() => {
      }).then(async () => {
        try {
          return await this.internalRequest(internalURL.pathname, await request.json());
        } catch (e) {
          return failure(e);
        }
      });
      this.mergeQueue = job;
      return job;
    }
    return this.serial(async () => {
      try {
        const url = new URL(request.url);
        if (url.hostname === "game-ai-internal") return await this.internalRequest(url.pathname, await request.json());
        const auth = await this.authenticate(request), route = url.pathname.slice(PREFIX.length);
        await this.quota("request:" + auth.uid, 120, 6e4);
        if (route === "status") return json({ ready: true, engineVersion: VERSION.split(":")[0], modelId: VERSION.split(":")[1] });
        if(route==='cpu/open'||route==='cpu/command'){
          requireThat(request.method==='POST',405,'POSTで送信してください');
          const active=await this.database('freeAccounts/'+auth.uid+'/active',auth.token);requireThat(!active,409,'オンライン対戦の終了後にCPU戦を開始してください');
          const body=await bodyOf(request);let solo;
          if(route==='cpu/open'){
            await this.quota('cpu-start:'+auth.uid,30,864e5);await this.quota('cpu-start-short:'+auth.uid,2,1e4);
            solo=soloService.open(body,auth.uid);
          }else{
            solo=await this.ctx.storage.get('solo');requireThat(solo?.uid===auth.uid&&Date.now()-solo.createdAt<72e5,409,'CPU戦の有効期限が切れました');
            if(body.op!=='status')await this.quota('cpu-turn:'+auth.uid,2000,864e5);
            try{soloService.command(solo,body);}catch(error){await this.ctx.storage.put('solo',solo);throw error;}
          }
          await this.ctx.storage.put('solo',solo);return json({match:soloService.view(solo)});
        }
        if (route === "cpu/start") {
          requireThat(request.method === "POST", 405, "POST\u3067\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044");
          await this.quota("cpu-start:" + auth.uid, 30, 864e5);
          await this.quota("cpu-start-short:" + auth.uid, 2, 1e4);
          const active = await this.database("freeAccounts/" + auth.uid + "/active", auth.token);
          requireThat(!active, 409, "\u30AA\u30F3\u30E9\u30A4\u30F3\u5BFE\u6226\u306E\u7D42\u4E86\u5F8C\u306BCPU\u6226\u3092\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044");
          const session = makeCPU(await bodyOf(request)), view = commitCPU(session);
          session.uid = auth.uid;
          await this.ctx.storage.put("cpu", session);
          return json(view);
        }
        if (route === "cpu/turn") {
          requireThat(request.method === "POST", 405, "POST\u3067\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044");
          const session = await this.ctx.storage.get("cpu");
          requireThat(session?.uid === auth.uid && Date.now() - session.createdAt < 72e5, 409, "CPU\u6226\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3057\u305F");
          const active = await this.database("freeAccounts/" + auth.uid + "/active", auth.token);
          requireThat(!active, 409, "\u30AA\u30F3\u30E9\u30A4\u30F3\u5BFE\u6226\u4E2D\u306FCPU\u6226\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093");
          await this.quota("cpu-turn:" + auth.uid, 2e3, 864e5);
          const result = advanceCPU(session, await bodyOf(request));
          await this.ctx.storage.put("cpu", session);
          return json(result);
        }
        if (route.startsWith("live/")) {
          requireThat(request.method === "GET", 405, "GET\u3067\u53D6\u5F97\u3057\u3066\u304F\u3060\u3055\u3044");
          return json(await this.live(route.split("/")[1], auth));
        }
        if (route.startsWith("history/")) {
          requireThat(request.method === "POST", 405, "POST\u3067\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044");
          strictBody(await bodyOf(request), []);
          return json(await this.enqueue(route.split("/")[1], auth));
        }
        if (route.startsWith("profile/")) {
          let retry = false;
          if (request.method === "POST") {
            const body = await bodyOf(request);
            strictBody(body, ["retry"]);
            requireThat(body.retry === true, 400, "\u518D\u53D6\u5F97\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
            retry = true;
          }
          return json(await this.profile(route.split("/")[1], auth, retry));
        }
        throw new ServiceError(404, "\u30DA\u30FC\u30B8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      } catch (e) {
        return failure(e);
      }
    });
  }
  async live(id, auth) {
    if (this.liveCache?.until > Date.now()) {
      requireThat(!this.liveCache.players.includes(auth.uid), 403, "\u5BFE\u6226\u4E2D\u306E\u8A55\u4FA1\u5024\u306F\u89B3\u6226\u8005\u5411\u3051\u3067\u3059");
      return this.liveCache.value;
    }
    const path = "freeGames/" + id;
    const players = await this.database(path + "/players", auth.token);
    requireThat(!players || ![players[1], players[2]].includes(auth.uid), 403, "\u5BFE\u6226\u4E2D\u306E\u8A55\u4FA1\u5024\u306F\u89B3\u6226\u8005\u5411\u3051\u3067\u3059");
    const state = await this.database(path + "/state", auth.token);
    if (!state) {
      const h = await this.database("battleHistory/" + id, auth.token);
      requireThat(h?.finalState, 404, "\u5BFE\u6226\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      const p = linked_ai_exports.reconstructHistory({ ...h, id }).positions.at(-1);
      return { ...publicEvaluation(p), matchId: id, stateTurn: p.state.turn, turn: p.state.turn - 1, updatedAt: Date.now() };
    }
    requireThat(players, 409, "\u5BFE\u6226\u60C5\u5831\u306E\u66F4\u65B0\u3092\u5F85\u3063\u3066\u3044\u307E\u3059");
    const [rulesVersion, roomRules, loadouts, foresightShield] = await Promise.all(["rulesVersion", "roomRules", "loadouts", "foresightShield"].map((k) => this.database(path + "/" + k, auth.token)));
    const advanced = linked_ai_exports.rulesAPIs.A.hasSkills(roomRules) ? await this.database(path + "/advanced", auth.token) : null;
    const special = roomRules?.special ? await this.database(path + "/special", auth.token) : null;
    const check = await this.database(path + "/state", auth.token);
    requireThat(check?.turn === state.turn && check?.startedAt === state.startedAt, 409, "\u5C40\u9762\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F\u3002\u518D\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059");
    const position = livePosition({ state, rulesVersion, roomRules, loadouts, foresightShield, advanced, special }), key = VERSION + ":" + await linked_ai_exports.digest(position);
    const previous = await this.ctx.storage.get("live");
    let value;
    if (previous?.key === key) value = previous.value;
    else {
      await this.quota("evaluations", 1e3, 864e5);
      value = { ...publicEvaluation(position), matchId: id, stateTurn: state.turn, turn: state.turn - 1, updatedAt: Date.now() };
      await this.ctx.storage.put("live", { key, value });
    }
    this.liveCache = { until: Date.now() + 1500, value, players: players ? [players[1], players[2]] : [] };
    return value;
  }
  async enqueue(id, auth) {
    const old = await this.ctx.storage.get("job");
    if (old?.version === VERSION && old.delivered) return { state: "ready" };
    const h = await this.database("battleHistory/" + id, auth.token);
    requireThat(h && h.settled && h.endedAt && [1, 2].every((p) => validId(h.players?.[p]?.uid)), 404, "\u78BA\u5B9A\u3057\u305F\u5BFE\u6226\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093");
    const hash = await linked_ai_exports.digest(h);
    if (!old || old.version !== VERSION || old.hash !== hash) {
      const job = historyJob({ ...h, id });
      job.hash = hash;
      await this.ctx.storage.put("job", job);
      await this.ctx.storage.setAlarm(Date.now() + 50);
    } else if (!old.delivered) {
      if (old.failed) {
        old.failed = false;
        old.failures = 0;
        await this.ctx.storage.put("job", old);
      }
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
    return { state: old?.version === VERSION && old.hash === hash && old.delivered ? "ready" : "pending" };
  }
  async profile(uid, auth, retry = false) {
    const account = await this.database("freeAccounts/" + uid, auth.token);
    requireThat(account, 404, "\u30D7\u30EC\u30A4\u30E4\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
    let scan = retry ? null : await this.ctx.storage.get("scan");
    if (!scan || scan.version !== VERSION || scan.done && scan.signature !== account.lastSettled) scan = { version: VERSION, cursor: null, seen: {}, done: false, signature: account.lastSettled || "", total: 0 };
    if (!scan.done) {
      const query = { orderBy: '"$value"', limitToLast: 10 };
      if (scan.cursor) query.endAt = JSON.stringify(scan.cursor[1]) + "," + JSON.stringify(scan.cursor[0]);
      const entries = Object.entries(await this.database("playerHistory/" + uid, auth.token, query) || {}).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
      const fresh = entries.filter(([id]) => !scan.seen[id]);
      for (const [id] of fresh) {
        requireThat(validId(id), 400, "\u5C65\u6B74ID\u304C\u4E0D\u6B63\u3067\u3059");
        const r = await this.internal("match:" + id, "enqueue", { id, token: auth.token, uid: auth.uid });
        requireThat(r.ok, 503, "\u5C65\u6B74\u306E\u96C6\u8A08\u3092\u958B\u59CB\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F");
        scan.seen[id] = true;
        scan.total++;
      }
      if (entries.length < 10 || !fresh.length) scan.done = true;
      else scan.cursor = entries[0];
      requireThat(scan.total <= 1e4, 413, "\u5C65\u6B74\u4EF6\u6570\u304C\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F");
      await this.ctx.storage.put("scan", scan);
    }
    const aggregate = await this.ctx.storage.get("aggregate:" + VERSION) || emptyAggregate();
    const finished = await this.ctx.storage.get("finished:" + VERSION) || 0, failed = await this.ctx.storage.get("failed:" + VERSION) || 0;
    return { schema: "psy-public-stats-v1", uid, status: aggregateView(aggregate), pending: !scan.done || finished + failed < scan.total, processed: finished, failed, total: scan.total, indexComplete: scan.done, updatedAt: aggregate.updatedAt };
  }
  async internalRequest(path, data) {
    if (path === "/enqueue") {
      requireThat(validId(data.id) && validId(data.uid) && typeof data.token === "string", 400, "\u5185\u90E8\u51E6\u7406\u306E\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
      return json(await this.enqueue(data.id, { uid: data.uid, token: data.token }));
    }
    if (path === "/contribution") {
      requireThat(validId(data.id) && validId(data.uid) && data.version === VERSION, 400, "\u96C6\u8A08\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
      const key = "contribution:" + VERSION + ":" + data.id, old = await this.ctx.storage.get(key), a = await this.ctx.storage.get("aggregate:" + VERSION) || emptyAggregate();
      if (old) addContribution(a, old, -1);
      addContribution(a, data);
      const failedKey = "error:" + VERSION + ":" + data.id, wasFailed = await this.ctx.storage.get(failedKey);
      await this.ctx.storage.put({ [key]: data, ["aggregate:" + VERSION]: a, ["finished:" + VERSION]: (await this.ctx.storage.get("finished:" + VERSION) || 0) + (old ? 0 : 1), ["failed:" + VERSION]: Math.max(0, (await this.ctx.storage.get("failed:" + VERSION) || 0) - (wasFailed ? 1 : 0)) });
      if (wasFailed) await this.ctx.storage.delete(failedKey);
      return json({ ok: true });
    }
    if (path === "/failure") {
      requireThat(validId(data.id) && data.version === VERSION, 400, "\u96C6\u8A08\u5F62\u5F0F\u304C\u4E0D\u6B63\u3067\u3059");
      const key = "error:" + VERSION + ":" + data.id;
      if (!await this.ctx.storage.get(key)) await this.ctx.storage.put({ [key]: true, ["failed:" + VERSION]: (await this.ctx.storage.get("failed:" + VERSION) || 0) + 1 });
      return json({ ok: true });
    }
    throw new ServiceError(404, "\u5185\u90E8\u51E6\u7406\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
  }
  alarm() {
    return this.serial(async () => {
      const job = await this.ctx.storage.get("job");
      if (!job || job.delivered || job.failed) return;
      if (job.version !== VERSION) {
        await this.ctx.storage.delete("job");
        return;
      }
      try {
        const complete = advanceHistoryJob(job, 4);
        await this.ctx.storage.put("job", job);
        if (complete) {
          for (const c of contributions(job)) {
            const r = await this.internal("profile:" + c.uid, "contribution", c);
            requireThat(r.ok, 503, "\u96C6\u8A08\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
          }
          job.delivered = true;
          await this.ctx.storage.put("job", job);
        } else await this.ctx.storage.setAlarm(Date.now() + 100);
      } catch {
        job.failures = (job.failures || 0) + 1;
        if (job.failures >= 5) job.failed = true;
        await this.ctx.storage.put("job", job);
        if (!job.failed) await this.ctx.storage.setAlarm(Date.now() + 1e4);
        else for (const side of [1, 2]) await this.internal("profile:" + job.history.players[side].uid, "failure", { id: job.history.id, version: VERSION });
      }
    });
  }
};
export {
  GameAI,
  worker_default as default
};



