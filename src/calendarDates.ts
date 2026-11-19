import { dayKey, offset } from './model';
export const calendarMinYear=1900;
export const calendarMaxYear=2100;
export const parts=(date:string)=>({year:Number(date.slice(0,4)),month:Number(date.slice(5,7))-1,day:Number(date.slice(8,10))});
export function weekStart(date:string){return offset(date,-((new Date(date+'T12:00:00').getDay()+6)%7))}
export function monthDate(year:number,month:number,day=1){
 const d=new Date(year,month,1,12);
 const last=new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate();
 d.setDate(Math.min(Math.max(day,1),last));return dayKey(d);
}
export function shiftMonth(date:string,amount:number){const p=parts(date);return monthDate(p.year,p.month+amount,p.day)}
export function monthCells(year:number,month:number){const start=weekStart(monthDate(year,month));return Array.from({length:42},(_,i)=>offset(start,i))}
export function calendarDateAllowed(date:string){const p=parts(date);return p.year>=calendarMinYear&&p.year<=calendarMaxYear}
