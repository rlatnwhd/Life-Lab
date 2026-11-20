import { useState } from 'react';
import { CalendarDays, Check, PenLine } from 'lucide-react';
import { condition, dayIndex, dayKey, type Experiment } from './model';
type Props={anchor:string;dates:string[];experiments:Experiment[];preview:boolean;onRecord:(e:Experiment,date:string)=>void;onCreate:()=>void};
const label=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
export default function MobileExperimentCalendar({anchor,dates,experiments,preview,onRecord,onCreate}:Props){
 const [selectedDate,setSelectedDate]=useState(anchor);
 const today=dayKey();
 const items=experiments.filter(e=>dayIndex(e,selectedDate)>=0&&dayIndex(e,selectedDate)<e.days);
 return <div className="mobile-planner"><div className="mobile-planner-days" role="group" aria-label="기록할 날짜 선택">{dates.map((date,index)=>{
  const hasRecord=experiments.some(e=>e.entries.some(row=>row.date===date));
  return <button key={date} type="button" className={(date===selectedDate?'is-selected ':'')+(date===today?'is-today':'')} aria-pressed={date===selectedDate} aria-current={date===today?'date':undefined} aria-label={`${label(date)}${date===today?', 오늘':''}${hasRecord?', 기록 있음':''}`} onClick={()=>setSelectedDate(date)}><span>{['월','화','수','목','금','토','일'][index]}</span><strong>{Number(date.slice(-2))}</strong><i className={hasRecord?'has-record':''} aria-hidden="true"/></button>
 })}</div><div className="mobile-planner-caption"><h3>{selectedDate===today?'오늘의 실험':label(selectedDate)}</h3><span>{items.length}개 실험</span></div><div className="mobile-planner-cards" aria-live="polite">{items.map(e=>{
  const group=condition(e,selectedDate);const entry=e.entries.find(row=>row.date===selectedDate);const future=selectedDate>today;
  return <article className="mobile-experiment-day" key={e.id}><div className="mobile-experiment-heading"><span>{e.category}</span><span className={entry?'day-status is-done':'day-status'}>{entry?<><Check size={13}/>기록 완료</>:future?'예정':'기록 대기'}</span></div><h4>{e.title}</h4><div className={'mobile-experiment-method method-'+group.toLowerCase()}><b>{group}</b><span>{group==='A'?e.a:e.b}</span></div>{entry&&<p className="mobile-experiment-value">{e.metric}<strong>{entry.score}<small> {e.unit}</small></strong></p>}<button type="button" className="mobile-day-action" disabled={future} onClick={()=>preview?onCreate():onRecord(e,selectedDate)}><PenLine size={15}/>{future?'기록할 날을 기다리고 있어요':preview?'로그인하고 기록하기':entry?'이 기록 수정하기':'이 실험 기록하기'}</button></article>
 })}{!items.length&&<div className="mobile-planner-empty"><CalendarDays size={26}/><strong>이날은 예정된 실험이 없어요.</strong><p>다른 날짜를 선택하거나 새 실험을 만들어 보세요.</p><button type="button" onClick={onCreate}>새 실험 만들기</button></div>}</div></div>
}