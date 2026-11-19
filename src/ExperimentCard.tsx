import { Check, Headphones, Footprints, PenLine, ChartNoAxesCombined, ArrowUpRight } from 'lucide-react';
import { type Experiment, condition, dayIndex, dayKey, finished, offset } from './model';

const dateLabel=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('ko-KR',{month:'short',day:'numeric'});
export default function ExperimentCard({e,open}:{e:Experiment;index?:number;open:(e:Experiment,kind:'detail'|'record')=>void}){
 const done=finished(e);
 const recorded=e.entries.some(row=>row.date===dayKey());
 const today=condition(e,dayKey());
 const elapsed=Math.max(1,Math.min(dayIndex(e)+1,e.days));
 const Icon=/건강|휴식/.test(e.category)?Footprints:Headphones;
 return <article className={'experiment-card lab-card'+(done?' lab-card-finished':'')}>
  <div className="lab-card-header"><span className="lab-card-icon"><Icon size={21}/></span><span className="lab-card-category">{e.category}{e.demo?' · 예시':''}</span><span className="lab-card-status"><i/>{done?'완료':'진행 중'}</span></div>
  <button className="card-title lab-card-title" onClick={()=>open(e,'detail')}>{e.title}<ArrowUpRight size={17}/></button>
  <div className="lab-card-conditions" aria-label="비교하는 두 가지 방법">{(['A','B'] as const).map(group=><div className={'lab-card-condition'+(!done&&today===group?' is-today':'')} key={group}><b className={'lab-condition-label '+group.toLowerCase()}>{group}</b><span>{group==='A'?e.a:e.b}</span>{!done&&today===group&&<small>오늘</small>}</div>)}</div>
  <div className="lab-card-progress"><div><span>{done?'실험 종료':<><strong>{elapsed}일차</strong><em> / {e.days}일</em></>}</span><span>기록 <b>{e.entries.length}</b><em> / {e.days}</em></span></div><div className="lab-progress-track" role="progressbar" aria-label="일일 기록 진행률" aria-valuemin={0} aria-valuemax={e.days} aria-valuenow={e.entries.length}><span style={{width:`${e.entries.length/e.days*100}%`}}/></div><p>{dateLabel(e.start)}<span>—</span>{dateLabel(offset(e.start,e.days-1))}</p></div>
  <div className="lab-card-footer"><div><span>{done?'결과를 확인해 보세요':'오늘의 기록'}</span><span className={recorded?'lab-record-done':'lab-record-wait'}>{done?`${e.entries.length}개의 관찰`:recorded?<><Check size={13}/> 기록 완료</>:'아직 기록하지 않았어요'}</span></div><button className={'record-button lab-card-action'+(recorded&&!done?' is-recorded':'')} onClick={()=>open(e,done?'detail':'record')}>{done?<ChartNoAxesCombined size={17}/>:<PenLine size={17}/>}<span>{done?'결과 살펴보기':recorded?'오늘 기록 수정하기':'오늘 기록하기'}</span></button></div>
 </article>
}
