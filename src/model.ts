export type Entry = { date: string; score: number; note: string };
export type Experiment = { id: string; title: string; hypothesis: string; a: string; b: string; days: number; start: string; metric: string; unit: string; max: number; category: string; entries: Entry[]; demo?: boolean };
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function offset(date: string, days: number) { const d = new Date(date+'T12:00:00'); d.setDate(d.getDate()+days); return dayKey(d); }
export const dayIndex = (e: Experiment, date = dayKey()) => Math.round((new Date(date+'T12:00:00').getTime()-new Date(e.start+'T12:00:00').getTime())/86400000);
export const condition = (e: Experiment, date: string) => dayIndex(e,date)%2===0?'A':'B';
export const finished = (e: Experiment) => dayIndex(e)>=e.days;
export function mean(e: Experiment, group: string) { const rows=e.entries.filter(r=>condition(e,r.date)===group); return rows.length?rows.reduce((n,r)=>n+r.score,0)/rows.length:0; }
export function examples(): Experiment[] {
 const start=offset(dayKey(),-6);
 return [{id:'demo-focus',title:'음악이 집중에 도움이 될까?',hypothesis:'가사 없는 음악을 들으면 조용할 때보다 더 잘 집중할 수 있을 것 같다.',a:'음악 들으며 공부',b:'조용한 환경에서 공부',days:14,start,metric:'집중도',unit:'점',max:10,category:'공부 · 집중',demo:true,entries:[7,6,8,5,9,7].map((score,i)=>({date:offset(start,i),score,note:['잔잔한 재즈와 함께 시작했다.','주변 소음이 조금 신경 쓰였다.','어제보다 몰입이 잘 됐다.','점심 이후 조금 졸렸다.','시간 가는 줄 모르고 공부했다.','차분하게 하루를 마무리했다.'][i]}))}, {id:'demo-walk',title:'점심 산책, 오후가 달라질까?',hypothesis:'점심 식사 후 15분 산책하면 오후 활력이 높아질 것이다.',a:'15분 산책하기',b:'자리에서 쉬기',days:10,start:offset(dayKey(),-3),metric:'오후 활력',unit:'점',max:10,category:'건강 · 일상',demo:true,entries:[8,5,9].map((score,i)=>({date:offset(dayKey(),i-3),score,note:''}))}];
}
export function load(): Experiment[] { try { const value=JSON.parse(localStorage.getItem('life-lab-v1')||'null'); if(Array.isArray(value)&&value.every(e=>typeof e.id==='string'&&typeof e.title==='string'&&Array.isArray(e.entries)&&Number.isFinite(e.days))) return value; } catch {} return examples(); }
