// Pure render-pipeline core. UMD: require() in Node, window.MatnCore in browsers.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MatnCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function safeHref(h,kind){
    h=String(h||"").trim().replace(/[\u0000-\u001f\u007f\s]+/g,"");
    if(!h)return "";
    var low=h.toLowerCase();
    if(low[0]==="#"||low[0]==="/"||low.indexOf("./")===0||low.indexOf("../")===0)return h;
    var m=low.match(/^([a-z][a-z0-9+.-]*):/);
    if(!m)return h;
    if(kind==="img"&&low.indexOf("data:image/")===0&&!/^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(h))return "";
    if(kind==="img"&&low.indexOf("data:image/")===0)return h;
    return /^(https?|mailto|tel)$/.test(m[1])?h:"";
  }
  function slug(t,i){return (t||"").trim().replace(/\s+/g,"-").replace(/[^\p{L}\p{N}-]/gu,"").slice(0,60)+"-"+i;}
  function safeRenderer(marked){
    var r=new marked.Renderer();
    r.html=function(html){return esc(html);};
    r.link=function(href,title,text){var u=safeHref(href,"link");if(!u)return text;return '<a href="'+esc(u)+'"'+(title?' title="'+esc(title)+'"':"")+">"+text+"</a>";};
    r.image=function(href,title,text){var u=safeHref(href,"img");if(!u)return esc(text);return '<img src="'+esc(u)+'" alt="'+esc(text)+'"'+(title?' title="'+esc(title)+'"':"")+">";};
    return r;
  }
  function extractMath(src,store){
    store=store||[];
    src=src.replace(/\$\$([\s\S]+?)\$\$/g,function(_,tex){store.push({d:true,t:tex});return ""+(store.length-1)+"";});
    src=src.replace(/(^|[^\\$])\$([^\s$][^$\n]*?)\$(?![0-9])/g,function(m0,pre,tex){if(!/[\\a-zA-Z]/.test(tex))return m0;store.push({d:false,t:tex});return pre+""+(store.length-1)+"";});
    return {src:src,store:store};
  }
  function preprocess(body){
    var store=[];
    function prose(seg){
      seg=seg.replace(/^[ \t]*<\/?div\b[^>]*>[ \t]*$/gim,"");
      return extractMath(seg,store).src;
    }
    function inlineAware(seg){
      var out="",last=0,i=0;
      while(i<seg.length){
        if(seg[i]!=="`"){i++;continue;}
        var open=i;while(i<seg.length&&seg[i]==="`")i++;
        var width=i-open,close=-1,j=i;
        while(j<seg.length){
          j=seg.indexOf("`",j);if(j<0)break;
          var end=j;while(end<seg.length&&seg[end]==="`")end++;
          if(end-j===width){close=end;break;}
          j=end;
        }
        if(close<0)continue;
        out+=prose(seg.slice(last,open))+seg.slice(open,close);last=close;i=close;
      }
      return out+prose(seg.slice(last));
    }
    var out="",buffer="",fence=null;
    function flush(){if(buffer){out+=inlineAware(buffer);buffer="";}}
    var lines=body.match(/[^\n]*(?:\n|$)/g)||[];
    for(var n=0;n<lines.length;n++){
      var line=lines[n];if(!line)continue;
      if(fence){
        out+=line;
        var closing=/^[ \t]{0,3}(`+|~+)[ \t]*(?:\n|$)/.exec(line);
        if(closing&&closing[1][0]===fence.ch&&closing[1].length>=fence.width)fence=null;
        continue;
      }
      var opening=/^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
      if(opening){flush();fence={ch:opening[1][0],width:opening[1].length};out+=line;continue;}
      if(/^(?: {4}|\t)/.test(line)){flush();out+=line;continue;}
      buffer+=line;
    }
    flush();
    return {src:out,store:store};
  }
  function restoreMath(html,store){return html.replace(/(\d+)/g,function(_,i){var m=store[+i];if(!m)return "";return '<span class="'+(m.d?"katex-block":"katex-inline")+'" data-tex="'+esc(m.t)+'"></span>';});}
  function voteDir(texts){
    var ar=0,lat=0;
    for(var i=0;i<texts.length;i++){var t=texts[i]||"";
      ar+=(t.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g)||[]).length;
      lat+=(t.match(/[A-Za-z]/g)||[]).length;}
    if(!ar&&!lat)return "rtl";
    return ar*2>=lat?"rtl":"ltr";
  }
  function parseFrontmatter(md){
    var m=/^[\s﻿]*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(md);
    if(!m)return {body:md,pairs:[]};
    var body=md.slice(m[0].length),lines=m[1].split(/\r?\n/),pairs=[];
    for(var i=0;i<lines.length;i++){var mm=/^([A-Za-z0-9_.\- ]{1,40}):[ \t]*(.*)$/.exec(lines[i]);
      if(mm){var k=mm[1].trim(),v=mm[2].trim().replace(/^["']|["']$/g,"");if(k)pairs.push([k,v]);}}
    return {body:body,pairs:pairs};
  }

  return {esc:esc,safeHref:safeHref,slug:slug,safeRenderer:safeRenderer,
    extractMath:extractMath,preprocess:preprocess,restoreMath:restoreMath,voteDir:voteDir,parseFrontmatter:parseFrontmatter};
});
