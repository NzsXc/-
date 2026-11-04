// Fixed display benchmarks: these are calibration choices, not population averages.
// The API's measured rates remain unchanged. All axes share 0 / benchmark / 100
// anchors mapped to 0 / 60 / 100, preserving order and headroom above the benchmark.
export const RADAR_METRICS=Object.freeze([
 Object.freeze({key:'read',label:'読みかみ合い',benchmark:20,reference:'評価改善200以上が20%'}),
 Object.freeze({key:'attack',label:'攻撃通し',benchmark:60,reference:'攻撃成功率60%'}),
 Object.freeze({key:'defense',label:'防御通し',benchmark:30,reference:'防御成功率30%'}),
 Object.freeze({key:'hp',label:'HP維持',benchmark:30,reference:'終了時の残りHPが初期値の30%'}),
 Object.freeze({key:'speed',label:'速攻',benchmark:1000/29,reference:'勝利まで平均20ターン'})
]);
export function normalizeRadarScore(value,benchmark){
 if(!Number.isFinite(value)||!Number.isFinite(benchmark)||benchmark<=0||benchmark>=100)return null;
 const x=Math.max(0,Math.min(100,value));
 return x<=benchmark?60*x/benchmark:60+40*(x-benchmark)/(100-benchmark);
}
export function radarScores(status){return Object.fromEntries(RADAR_METRICS.map(({key,benchmark})=>[key,normalizeRadarScore(status?.scores?.[key],benchmark)]));}
export function measuredRadarValue(status,key){
 const value=status?.scores?.[key];if(!Number.isFinite(value))return '—';
 if(key==='speed'){const speed=status?.raw?.speed;return speed?.wins>0&&Number.isFinite(speed.turns)?(speed.turns/speed.wins).toFixed(1)+'T':'—';}
 return Math.max(0,Math.min(100,value)).toFixed(1)+'%';
}
