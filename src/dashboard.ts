import { type Experiment, dayKey, dayIndex, offset } from './model';

export function dashboardSummary(experiments:Experiment[],today=dayKey()){
 const active=experiments.filter(e=>dayIndex(e,today)>=0&&dayIndex(e,today)<e.days);
 const pending=active.filter(e=>!e.entries.some(row=>row.date===today));
 const monday=offset(today,-((new Date(today+'T12:00:00').getDay()+6)%7));
 const days=Array.from({length:7},(_,index)=>{const date=offset(monday,index);return {date,count:experiments.reduce((n,e)=>n+e.entries.filter(row=>row.date===date).length,0)}});
 return {active,pending,todayCount:active.length-pending.length,totalCount:experiments.reduce((n,e)=>n+e.entries.length,0),finishedCount:experiments.filter(e=>dayIndex(e,today)>=e.days).length,days,weekCount:days.reduce((n,day)=>n+day.count,0)};
}
