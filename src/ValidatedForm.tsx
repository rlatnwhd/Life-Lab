import { useId, useState, type FormHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert } from 'lucide-react';
import './validation.css';

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Issue = { field: Field; message: string; id: string };
function message(field: Field) {
  const v = field.validity;
  if (v.valueMissing || (field.required && !field.value.trim())) return '필수 항목이에요. 내용을 입력해 주세요.';
  if (v.badInput) return '올바른 숫자를 입력해 주세요.';
  if (v.rangeOverflow || v.rangeUnderflow) {
    const input = field as HTMLInputElement;
    return input.type === 'date' ? '실험 기간 안에서 오늘까지의 날짜를 선택해 주세요.' : `${input.min}~${input.max} 범위로 입력해 주세요. 입력한 값은 저장할 수 없어요.`;
  }
  if (v.stepMismatch) return '소수점 첫째 자리까지 입력해 주세요.';
  if (v.patternMismatch) return '공백만 입력할 수 없어요. 내용을 입력해 주세요.';
  return v.valid ? '' : '입력한 내용을 확인해 주세요.';
}

/** Keep browser constraints while presenting accessible, consistent inline feedback. */
export default function ValidatedForm({ onSubmit, children, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const prefix = useId();
  function inspect(field: Field, index = 0): Issue | undefined {
    const text = message(field);
    const id = `${prefix}-${field.name || field.type}-${index}`;
    field.setAttribute('aria-invalid', String(Boolean(text)));
    if (text) field.setAttribute('aria-describedby', id);
    else field.removeAttribute('aria-describedby');
    return text ? { field, message: text, id } : undefined;
  }
  return <form {...props} noValidate onInput={event => {
    const field = event.target as unknown as Field;
    // Editing dismisses previous feedback; only submitting runs validation.
    if (field.matches('input, textarea, select')) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      setIssues(current => current.filter(issue => issue.field !== field && issue.field.isConnected));
    }
  }} onSubmit={event => {
    event.preventDefault();
    const fields = Array.from(event.currentTarget.elements).filter((field): field is Field => field.matches('input, textarea, select') && !(field as Field).disabled);
    const next = fields.flatMap((field, index) => {
      const issue = inspect(field, index);
      return issue ? [issue] : [];
    });
    setIssues(next);
    if (next.length) { next[0].field.focus(); return; }
    onSubmit?.(event);
  }}>
    {children}
    {issues.filter(issue => issue.field.isConnected).map(issue => {
      const label = issue.field.closest('label');
      return label ? createPortal(<span className="field-error" id={issue.id} role="alert"><CircleAlert size={17}/>{issue.message}</span>, label, issue.id) : null;
    })}
  </form>;
}
