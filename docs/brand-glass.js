(function(){
  "use strict";
  var root=document.documentElement;
  var memory=Number(navigator.deviceMemory||8);
  var cores=Number(navigator.hardwareConcurrency||8);
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(memory<=4||cores<=4||reduce)root.classList.add("matn-low-power");

  var host=document.createElementNS("http://www.w3.org/2000/svg","svg");
  host.setAttribute("class","matn-glass-defs");
  host.setAttribute("aria-hidden","true");
  host.setAttribute("focusable","false");
  host.setAttribute("width","0");
  host.setAttribute("height","0");
  host.innerHTML='<defs><filter id="matn-liquid-displacement" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .026" numOctaves="2" seed="8" result="noise"/><feGaussianBlur in="noise" stdDeviation=".55" result="softNoise"/><feDisplacementMap in="SourceGraphic" in2="softNoise" scale="11" xChannelSelector="R" yChannelSelector="B" result="bent"/><feOffset in="bent" dx=".45" result="redShift"/><feColorMatrix in="redShift" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .14 0" result="redEdge"/><feOffset in="bent" dx="-.45" result="blueShift"/><feColorMatrix in="blueShift" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 .12 0" result="blueEdge"/><feBlend in="bent" in2="redEdge" mode="screen" result="redBlend"/><feBlend in="redBlend" in2="blueEdge" mode="screen" result="fringed"/><feGaussianBlur in="fringed" stdDeviation=".18"/></filter></defs>';
  (document.body||document.documentElement).insertBefore(host,(document.body||document.documentElement).firstChild);

  if(reduce)return;
  var frame=0,target=null,x=50,y=20;
  function paint(){
    frame=0;
    if(!target)return;
    target.style.setProperty("--glass-x",x+"%");
    target.style.setProperty("--glass-y",y+"%");
  }
  document.addEventListener("pointermove",function(event){
    var next=event.target&&event.target.closest&&event.target.closest("[data-glass]");
    if(!next)return;
    var rect=next.getBoundingClientRect();
    target=next;
    x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
    y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100));
    if(!frame)frame=requestAnimationFrame(paint);
  },{passive:true});
  document.addEventListener("pointerout",function(event){
    var glass=event.target&&event.target.closest&&event.target.closest("[data-glass]");
    if(!glass||glass.contains(event.relatedTarget))return;
    glass.style.removeProperty("--glass-x");
    glass.style.removeProperty("--glass-y");
    if(target===glass)target=null;
  },{passive:true});
})();
