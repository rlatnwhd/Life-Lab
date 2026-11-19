import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dayKey, offset } from './model';
import { calendarDateAllowed, calendarMaxYear, calendarMinYear, monthCells, monthDate, parts, shiftMonth, weekStart } from './calendarDates';

export default function PlannerDatePicker({value,onChange,recordDates}:{value:string;onChange:(date:string)=>void;recordDates:Set<string>}){
 const [open,setOpen]=useState(false);
 const [view,setView]=useState(()=>parts(value));
 const [focused,setFocused]=useState(value);
 const [position,setPosition]=useState({top:0,left:0});
 const trigger=useRef<HTMLButtonElement>(null);
 const panel=useRef<HTMLDivElement>(null);
 const yearSelect=useRef<HTMLSelectElement>(null);
 const keyboardFocus=useRef(false);
 const selected=parts(value);
 const today=dayKey();
 const cells=monthCells(view.year,view.month);
 const selectedMonday=weekStart(value);
 const close=()=>{setOpen(false);trigger.current?.focus()};
 function choose(date:string){if(!calendarDateAllowed(date))return;onChange(date);close()}
 function show(){setView(parts(value));setFocused(value);setOpen(!open)}
 function changeMonth(year:number,month:number){const date=monthDate(year,month);if(!calendarDateAllowed(date))return;setView(parts(date));setFocused(date)}
 useLayoutEffect(()=>{
  if(!open)return;
  const update=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(350,window.innerWidth-24);const height=panel.current?.offsetHeight||460;const below=window.innerHeight-rect.bottom-12;const top=below>=height?rect.bottom+10:rect.top-height>=12?rect.top-height-10:Math.max(12,window.innerHeight-height-12);setPosition({top,left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12))})};
  update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true)};
 },[open,view.year,view.month]);
 useEffect(()=>{if(open)yearSelect.current?.focus()},[open]);
 useEffect(()=>{if(open&&keyboardFocus.current){keyboardFocus.current=false;panel.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()}},[focused,open]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);trigger.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}},[open]);
 function dayKeyDown(event:React.KeyboardEvent<HTMLButtonElement>,date:string){
  let next:string|undefined;
  if(event.key==='ArrowLeft')next=offset(date,-1);if(event.key==='ArrowRight')next=offset(date,1);if(event.key==='ArrowUp')next=offset(date,-7);if(event.key==='ArrowDown')next=offset(date,7);if(event.key==='Home')next=weekStart(date);if(event.key==='End')next=offset(weekStart(date),6);if(event.key==='PageUp')next=shiftMonth(date,-1);if(event.key==='PageDown')next=shiftMonth(date,1);
  if(next){event.preventDefault();if(!calendarDateAllowed(next))return;keyboardFocus.current=true;setFocused(next);const p=parts(next);if(p.year!==view.year||p.month!==view.month)setView(p)}
 }
 return <><button className="planner-month-trigger" ref={trigger} aria-label={`${selected.year}년 ${selected.month+1}월, 연도와 월 선택`} aria-haspopup="dialog" aria-expanded={open} aria-controls="planner-date-picker" onClick={show}><span>{selected.year}년 {selected.month+1}월</span><ChevronDown size={17}/></button>{open&&createPortal(<div className="planner-date-picker" id="planner-date-picker" ref={panel} role="dialog" aria-label="캘린더 날짜 선택" style={position}><div className="date-picker-heading"><span><CalendarDays size={17}/>어느 날짜로 이동할까요?</span><button aria-label="날짜 선택 닫기" onClick={close}><X size={18}/></button></div><div className="date-picker-controls"><button aria-label="이전 달" disabled={view.year===calendarMinYear&&view.month===0} onClick={()=>changeMonth(view.year,view.month-1)}><ChevronLeft size={18}/></button><label><span className="date-picker-label">연도</span><select ref={yearSelect} aria-label="연도 선택" value={view.year} onChange={e=>changeMonth(Number(e.target.value),view.month)}>{Array.from({length:calendarMaxYear-calendarMinYear+1},(_,i)=>calendarMinYear+i).map(year=><option value={year} key={year}>{year}년</option>)}</select></label><label><span className="date-picker-label">월</span><select aria-label="월 선택" value={view.month} onChange={e=>changeMonth(view.year,Number(e.target.value))}>{Array.from({length:12},(_,month)=><option value={month} key={month}>{month+1}월</option>)}</select></label><button aria-label="다음 달" disabled={view.year===calendarMaxYear&&view.month===11} onClick={()=>changeMonth(view.year,view.month+1)}><ChevronRight size={18}/></button></div><div className="date-picker-calendar" role="grid" aria-label={`${view.year}년 ${view.month+1}월`}><div className="date-picker-weekdays" role="row">{['월','화','수','목','금','토','일'].map(day=><span key={day} role="columnheader">{day}</span>)}</div>{Array.from({length:6},(_,row)=><div role="row" className="date-picker-week" key={row}>{cells.slice(row*7,row*7+7).map(date=>{const p=parts(date);const current=p.month===view.month&&p.year===view.year;const inWeek=date>=selectedMonday&&date<=offset(selectedMonday,6);return <button role="gridcell" key={date} data-date={date} tabIndex={date===focused?0:-1} aria-selected={date===value} aria-current={date===today?'date':undefined} aria-label={`${p.year}년 ${p.month+1}월 ${p.day}일${recordDates.has(date)?', 기록 있음':''}`} disabled={!calendarDateAllowed(date)} className={(current?'':'outside-month ')+(inWeek?'in-selected-week ':'')+(date===today?'is-today ':'')+(date===value?'is-selected':'')} onClick={()=>choose(date)} onKeyDown={e=>dayKeyDown(e,date)}><span>{p.day}</span>{recordDates.has(date)&&<i className="date-picker-record" aria-hidden="true"/>}</button>})}</div>)}</div><div className="date-picker-help"><span><i/> 기록이 있는 날</span><span>날짜를 누르면 해당 주로 이동해요.</span></div><div className="date-picker-actions"><button onClick={()=>choose(today)}>오늘로 이동</button><button onClick={()=>choose(monthDate(view.year,view.month))}>{view.month+1}월로 이동 <ChevronRight size={14}/></button></div></div>,document.body)}</>
}
