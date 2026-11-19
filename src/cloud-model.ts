import { type Experiment, type Entry, dayIndex, dayKey } from './model';

export const measurementLimit = (_unit: string) => 100;
export function validateNewMeasurement(e: Pick<Experiment, 'max' | 'unit'>) {
  if (!Number.isFinite(e.max) || e.max < 1 || e.max > measurementLimit(e.unit) || Math.abs(e.max * 10 - Math.round(e.max * 10)) > 1e-8) throw new Error('최대값은 1부터 100까지만 입력해 주세요. 소수점 첫째 자리까지 입력할 수 있어요.');
}

export function validateExperiment(e: Experiment) {
  if (!/^[\w-]{1,128}$/.test(e.id)) throw new Error('실험 ID가 올바르지 않습니다.');
  for (const [text, max] of [[e.title,60],[e.a,40],[e.b,40],[e.metric,30],[e.unit,10],[e.category,30]] as const) {
    if(typeof text!=='string'||!text.trim()||text.length>max)throw new Error('실험의 필수 항목과 글자 수를 확인해 주세요.');
  }
  if(typeof e.hypothesis!=='string'||e.hypothesis.length>300)throw new Error('가설은 300자 이내로 입력해 주세요.');
  if(![7,10,14,21,28].includes(e.days)||!Number.isFinite(e.max)||e.max<1||e.max>10000)throw new Error('기간과 측정 범위를 확인해 주세요.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.start)||Number.isNaN(Date.parse(e.start+'T12:00:00')))throw new Error('실험 시작일이 올바르지 않습니다.');
  if(!Array.isArray(e.entries)||e.entries.length>e.days)throw new Error('기록 개수가 실험 기간을 초과합니다.');
  const dates=new Set<string>();
  for(const row of e.entries){validateEntry(e,row);if(dates.has(row.date))throw new Error('같은 날짜의 기록이 중복되었습니다.');dates.add(row.date);}
}
export function validateEntry(e: Experiment, row: Entry) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(dayIndex(e,row.date))||dayIndex(e,row.date)<0||dayIndex(e,row.date)>=e.days||row.date>dayKey())throw new Error('실험 기간 안의 지난 날짜 또는 오늘을 선택해 주세요.');
  if(!Number.isFinite(row.score)||row.score<0||row.score>e.max)throw new Error(`측정값은 0~${e.max}${e.unit} 범위로 입력해 주세요.`);
  if(typeof row.note!=='string'||row.note.length>500)throw new Error('메모는 500자 이내로 입력해 주세요.');
}
export function toCloud(e: Experiment) {
  validateExperiment(e);
  return {title:e.title,hypothesis:e.hypothesis,a:e.a,b:e.b,days:e.days,start:e.start,metric:e.metric,unit:e.unit,max:e.max,category:e.category,entries:Object.fromEntries(e.entries.map(row=>[row.date,{date:row.date,score:row.score,note:row.note}]))};
}
export function fromCloud(id: string, value: Record<string,unknown>): Experiment {
  if(!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries))throw new Error('저장된 기록 형식이 올바르지 않습니다.');
  const entries=Object.entries(value.entries).map(([date,row])=>{
    if(!row||typeof row!=='object'||(row as Entry).date!==date)throw new Error('기록 날짜가 일치하지 않습니다.');
    const r=row as Entry;return {date:r.date,score:r.score,note:r.note};
  }).sort((a,b)=>a.date.localeCompare(b.date));
  const e={...value,id,entries,demo:undefined} as Experiment;
  validateExperiment(e);
  return e;
}
export function firebaseMessage(error: unknown) {
  const code=(error as {code?:string})?.code;
  switch(code){
    case 'auth/popup-closed-by-user': return '로그인 창을 닫았어요. 다시 시도할 수 있습니다.';
    case 'auth/cancelled-popup-request': return '이미 로그인 창이 열려 있어요.';
    case 'auth/popup-blocked': return '브라우저가 로그인 팝업을 차단했습니다. 이 사이트의 팝업을 허용해 주세요.';
    case 'auth/unauthorized-domain': return '지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.';
    case 'auth/operation-not-allowed': return '지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.';
    case 'auth/user-mismatch': return '탈퇴하려는 계정과 다른 Google 계정을 선택했습니다. 현재 로그인한 계정으로 다시 확인해 주세요.';
    case 'auth/requires-recent-login': return '보안을 위해 본인 확인이 다시 필요합니다. Google 계정을 확인한 뒤 다시 시도해 주세요.';
    case 'auth/network-request-failed': case 'unavailable': return '서버에 연결할 수 없어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    case 'permission-denied': return '기록에 접근할 수 없어요. 다시 로그인한 후 시도해 주세요.';
    case 'unauthenticated': case 'auth/user-token-expired': return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    case 'resource-exhausted': return '저장 서비스의 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.';
    default: return error instanceof Error&&!code?error.message:'요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
