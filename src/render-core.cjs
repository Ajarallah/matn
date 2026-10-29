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
      // HTML comments are authoring notes (editor remarks, prettier-ignore, TOC
      // markers). Raw HTML is escaped for safety, which would otherwise print them
      // to the reader verbatim — so drop them here, outside code blocks and spans.
      seg=seg.replace(/<!--[\s\S]*?-->/g,"");
      // Obsidian's %%comments%% are the same thing in that dialect, and hidden there too.
      seg=seg.replace(/%%[\s\S]*?%%/g,"");
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

  // ---- Obsidian-flavoured syntax ------------------------------------------------
  // One definition for the page and the large-file worker, so both read a vault alike.
  var IMAGE_RE=/\.(?:png|jpe?g|gif|webp|avif|svg)$/i;
  var WIKI_RE="([^\\]|\\n]+)(?:\\|([^\\]\\n]+))?\\]\\]";
  function embedHTML(target,alias,inline){
    if(IMAGE_RE.test(target.split("#")[0])){
      var width=/^\d{1,4}$/.test(alias)?' width="'+alias+'"':"";
      return '<img class="md-embed-img" data-embed-src="'+esc(target)+'" alt="'+esc(/^\d+$/.test(alias)?target:(alias||target))+'"'+width+">";
    }
    if(inline)return '<a class="wikilink internal-link" href="#" data-wiki="'+esc(target)+'" title="'+esc(target)+'">'+esc(alias||target)+"</a>";
    var parts=target.split("#"),label=alias||(parts[0]+(parts[1]&&parts[1][0]!=="^"?" › "+parts[1]:""));
    return '<div class="md-embed" data-embed="'+esc(target)+'"><a class="md-embed-src wikilink internal-link" href="#" data-wiki="'+esc(target)+'">'+esc(label)+'</a><div class="md-embed-body"></div></div>';
  }
  function obsidianExtensions(){
    return [
      {name:"embed",level:"block",
        start:function(s){var m=/(?:^|\n)!\[\[/.exec(s);return m?m.index+(s[m.index]==="\n"?1:0):undefined;},
        tokenizer:function(s){var m=new RegExp("^!\\[\\["+WIKI_RE+"[ \\t]*(?:\\n+|$)").exec(s);if(m)return{type:"embed",raw:m[0],target:m[1].trim(),alias:(m[2]||"").trim()};},
        renderer:function(t){return embedHTML(t.target,t.alias,false)+"\n";}},
      {name:"embedInline",level:"inline",
        start:function(s){var i=s.indexOf("![[");return i<0?undefined:i;},
        tokenizer:function(s){var m=new RegExp("^!\\[\\["+WIKI_RE).exec(s);if(m)return{type:"embedInline",raw:m[0],target:m[1].trim(),alias:(m[2]||"").trim()};},
        renderer:function(t){return embedHTML(t.target,t.alias,true);}},
      {name:"wikilink",level:"inline",
        start:function(s){var i=s.indexOf("[[");return i<0?undefined:i;},
        tokenizer:function(s){var m=new RegExp("^\\[\\["+WIKI_RE).exec(s);if(m)return{type:"wikilink",raw:m[0],target:m[1].trim(),text:(m[2]||m[1]).trim()};},
        renderer:function(t){return '<a class="wikilink internal-link" href="#" data-wiki="'+esc(t.target)+'" title="'+esc(t.target)+'">'+esc(t.text)+"</a>";}},
      {name:"mdmark",level:"inline",
        start:function(s){var i=s.indexOf("==");return i<0?undefined:i;},
        tokenizer:function(s){var m=/^==(?=[^\s=])([^\n]*?[^\s=])==(?!=)/.exec(s);if(m)return{type:"mdmark",raw:m[0],tokens:this.lexer.inlineTokens(m[1])};},
        renderer:function(t){return '<mark class="md-mark">'+this.parser.parseInline(t.tokens)+"</mark>";}},
      {name:"blockId",level:"inline",
        start:function(s){var m=/[ \t]\^[A-Za-z0-9-]+[ \t]*(?:\n|$)/.exec(s);return m?m.index:undefined;},
        tokenizer:function(s){var m=/^[ \t]+\^([A-Za-z0-9-]+)[ \t]*(?=\n|$)/.exec(s);if(m)return{type:"blockId",raw:m[0],id:m[1]};},
        renderer:function(t){return '<span class="block-id" id="^'+esc(t.id)+'"></span>';}},
      {name:"tag",level:"inline",
        start:function(s){var m=/(?:^|[\s(])#(?=[\p{L}_])/u.exec(s);return m?m.index+(s[m.index]==="#"?0:1):undefined;},
        tokenizer:function(s){var m=/^#([\p{L}_][\p{L}\p{M}\p{N}_\/-]*)/u.exec(s);if(m)return{type:"tag",raw:m[0],name:m[1]};},
        renderer:function(t){return '<a class="md-tag" href="#" data-tag="'+esc(t.name)+'">#'+esc(t.name)+"</a>";}}
    ];
  }
  // The part of a note that ![[note#Heading]] or ![[note#^id]] points at; null when it is gone.
  function sliceSection(md,ref){
    var body=parseFrontmatter(String(md==null?"":md)).body,lines=body.split(/\r?\n/),fence=null,i;
    ref=String(ref||"").trim().replace(/^#/,"");
    if(!ref)return body;
    function inFence(line){var m=/^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);if(m){if(!fence)fence=m[1][0];else if(m[1][0]===fence)fence=null;return true;}return !!fence;}
    if(ref[0]==="^"){
      var idRe=new RegExp("[ \\t]\\^"+ref.slice(1).replace(/[^A-Za-z0-9-]/g,"")+"[ \\t]*$");
      for(i=0;i<lines.length;i++){
        if(inFence(lines[i])||!idRe.test(lines[i]))continue;
        var start=i;
        if(!/^[ \t]*(?:[-*+]|\d+[.)])[ \t]/.test(lines[i]))while(start>0&&lines[start-1].trim()&&!/^[ \t]{0,3}#/.test(lines[start-1]))start--;
        return lines.slice(start,i+1).join("\n").replace(idRe,"");
      }
      return null;
    }
    function norm(t){return t.toLowerCase().replace(/[-\s]+/g," ").trim();}
    var wanted=norm(ref),level=0,from=-1;
    for(i=0;i<lines.length;i++){
      if(inFence(lines[i]))continue;
      var h=/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(lines[i]);
      if(!h)continue;
      if(from<0){if(norm(h[2])===wanted){from=i;level=h[1].length;}}
      else if(h[1].length<=level)return lines.slice(from,i).join("\n");
    }
    return from<0?null:lines.slice(from).join("\n");
  }

  // ---- What changed since you last read --------------------------------------------
  // Blocks are what a reader sees as one unit: a paragraph, one list item, a heading,
  // a whole fence, a whole table. Rewrapping a paragraph is not a change.
  function splitBlocks(md){
    var lines=parseFrontmatter(String(md==null?"":md)).body.split(/\r?\n/),out=[],buf=[],fence=null;
    function flush(){if(buf.length){out.push(buf.join("\n"));buf=[];}}
    for(var i=0;i<lines.length;i++){
      var line=lines[i],marker=/^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
      if(fence){buf.push(line);if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length){fence=null;flush();}continue;}
      if(marker){flush();fence=marker[1];buf.push(line);continue;}
      if(!line.trim()){flush();continue;}
      if(/^[ \t]{0,3}#{1,6}[ \t]/.test(line)){flush();out.push(line);continue;}
      if(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]/.test(line)&&!/^[ \t]*(?:[-*_][ \t]*){3,}$/.test(line))flush();
      buf.push(line);
    }
    flush();
    return out;
  }
  function blockKey(src){return src.replace(/\s+/g," ").trim();}
  function similar(x,y){var a=x.split(" "),b=y.split(" "),seen={},common=0,i;for(i=0;i<a.length;i++)seen[a[i]]=(seen[a[i]]||0)+1;for(i=0;i<b.length;i++)if(seen[b[i]]>0){seen[b[i]]--;common++;}return common*2>=Math.max(a.length,b.length);}
  function blockDiff(before,after){
    var a=splitBlocks(before),b=splitBlocks(after),ak=a.map(blockKey),bk=b.map(blockKey),n=a.length,m=b.length,pairs=[],i,j;
    if(n*m<=4000000){
      var dp=new Array(n+1);for(i=0;i<=n;i++)dp[i]=new Uint32Array(m+1);
      for(i=n-1;i>=0;i--)for(j=m-1;j>=0;j--)dp[i][j]=ak[i]===bk[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
      for(i=0,j=0;i<n&&j<m;){if(ak[i]===bk[j]){pairs.push([i,j]);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
    }else{
      // ponytail: too big for LCS — match the unchanged head and tail only
      for(i=0;i<n&&i<m&&ak[i]===bk[i];i++)pairs.push([i,i]);
      var tail=[];for(var k=1;k<=n-i&&k<=m-i&&ak[n-k]===bk[m-k];k++)tail.unshift([n-k,m-k]);pairs=pairs.concat(tail);
    }
    pairs.push([n,m]);
    var blocks=b.map(function(src){return {src:src,status:"same"};}),removed=[],count=0,pi=0,pj=0;
    for(var p=0;p<pairs.length;p++){
      var del=[],ins=[];for(i=pi;i<pairs[p][0];i++)del.push(i);for(j=pj;j<pairs[p][1];j++)ins.push(j);
      // A removal and an addition count as one edit only when they share most of their words.
      for(var di=0,ii=0;di<del.length||ii<ins.length;count++){
        if(di<del.length&&ii<ins.length&&similar(ak[del[di]],bk[ins[ii]])){blocks[ins[ii]].status="changed";blocks[ins[ii]].old=a[del[di]];di++;ii++;}
        else if(di<del.length&&(ii>=ins.length||!del.slice(di).some(function(d){return similar(ak[d],bk[ins[ii]]);}))){removed.push({src:a[del[di]],at:ii<ins.length?ins[ii]:pairs[p][1]});di++;}
        else{blocks[ins[ii]].status="added";ii++;}
      }
      pi=pairs[p][0]+1;pj=pairs[p][1]+1;
    }
    return {blocks:blocks,removed:removed,count:count};
  }

  return {esc:esc,splitBlocks:splitBlocks,blockDiff:blockDiff,safeHref:safeHref,slug:slug,safeRenderer:safeRenderer,obsidianExtensions:obsidianExtensions,sliceSection:sliceSection,isImage:function(p){return IMAGE_RE.test(String(p||""));},
    extractMath:extractMath,preprocess:preprocess,restoreMath:restoreMath,voteDir:voteDir,parseFrontmatter:parseFrontmatter};
});
