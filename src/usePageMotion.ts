import { useEffect } from 'react';

export function usePageMotion(view: string) {
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches||!('IntersectionObserver' in window))return;
  const animations=new Set<Animation>();
  const observer=new IntersectionObserver(entries=>{
   let stagger=0;
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    observer.unobserve(entry.target);
    const bar=entry.target.matches('.sample-bar > span, .progress > span, .daily-progress-bar > span');
    const animation=entry.target.animate(bar?[{transform:'scaleX(0)'},{transform:'scaleX(1)'}]:[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:bar?720:520,delay:Math.min(stagger++*55,165),easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards'});
    animations.add(animation);
    animation.finished.then(()=>animations.delete(animation)).catch(()=>{});
   }
  },{threshold:.08,rootMargin:'0px 0px -16px 0px'});
  document.querySelectorAll('.home-hero > *, .landing-section-heading, .weekly-board, .landing-steps > article, .result-showcase, .landing-topic-grid > article, .landing-cta, .heading, .experiment-card, .new-card, .result-panel, .guide-grid > article, .sample-bar > span, .progress > span, .daily-progress-bar > span').forEach(el=>observer.observe(el));
  const stop=()=>{if(reduced.matches){observer.disconnect();animations.forEach(animation=>animation.cancel())}};
  reduced.addEventListener('change',stop);
  return()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());reduced.removeEventListener('change',stop)};
 },[view]);
}
