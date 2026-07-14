// Pure workspace-search core. UMD: require() in Node, window.MatnSearch in browsers.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MatnSearch = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/;
  function foldChar(ch){
    if(ch==="ـ"||DIACRITICS.test(ch))return "";
    if(ch==="أ"||ch==="إ"||ch==="آ"||ch==="ٱ")return "ا";
    if(ch==="ى")return "ي";
    return ch.toLowerCase();
  }
  function normalizeMapped(input){
    input=String(input==null?"":input).normalize("NFKC");
    var value="",map=[],pendingSpace=false,pendingIndex=0;
    for(var i=0;i<input.length;i++){
      var folded=foldChar(input[i]);
      for(var j=0;j<folded.length;j++){
        var ch=folded[j];
        if(/\s/.test(ch)){if(value){pendingSpace=true;pendingIndex=i;}continue;}
        if(pendingSpace){value+=" ";map.push(pendingIndex);pendingSpace=false;}
        value+=ch;map.push(i);
      }
    }
    return {value:value,map:map};
  }
  function normalizeSearch(input){return normalizeMapped(input).value;}
  function cleanScalar(value){return String(value||"").trim().replace(/^["']|["']$/g,"");}
  function parseMetadata(content){
    var meta={},body=content;
    var blockAliases=[];
    var fm=/^[\s﻿]*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(content);
    if(fm){
      body=content.slice(fm[0].length);
      var lines=fm[1].split(/\r?\n/);
      var activeKey="";
      for(var i=0;i<lines.length;i++){
        var pair=/^([A-Za-z0-9_.\- ]{1,40}):[ \t]*(.*)$/.exec(lines[i]);
        if(pair){activeKey=pair[1].trim().toLowerCase();meta[activeKey]=pair[2].trim();continue;}
        var listItem=/^[ \t]+-[ \t]+(.+)$/.exec(lines[i]);
        if(listItem&&(activeKey==="aliases"||activeKey==="alias"))blockAliases.push(cleanScalar(listItem[1]));
      }
    }
    var aliases=[],raw=meta.aliases||meta.alias||"";
    if(raw){
      raw=raw.replace(/^\[|\]$/g,"");
      aliases=raw.split(",").map(cleanScalar).filter(Boolean);
    }
    aliases=aliases.concat(blockAliases).filter(function(value,index,all){return value&&all.indexOf(value)===index;});
    return {title:cleanScalar(meta.title),aliases:aliases,body:body};
  }
  function createRecord(input){
    var content=String(input.content||""),rel=String(input.rel||""),meta=parseMetadata(content);
    var fileName=(rel.split("/").pop()||"مستند").replace(/\.(?:md|markdown|mdown|mkd)$/i,"");
    var heading=/^[ \t]{0,3}#[ \t]+(.+?)\s*#*[ \t]*$/m.exec(meta.body);
    var title=meta.title||(heading&&heading[1].trim())||fileName;
    var mapped=normalizeMapped(content);
    return {
      path:String(input.path||""),rel:rel,title:title,aliases:meta.aliases,
      mtimeMs:Number(input.mtimeMs)||0,content:content,
      bodyStart:content.length-meta.body.length,
      titleNorm:normalizeSearch(title),aliasNorm:normalizeSearch(meta.aliases.join(" ")),
      pathNorm:normalizeSearch(rel),contentNorm:mapped.value,contentMap:mapped.map
    };
  }
  function snippetFor(record,term){
    var at=term?record.contentNorm.indexOf(term):-1;
    var originalAt=at>=0?(record.contentMap[at]||0):0;
    if(originalAt<record.bodyStart)originalAt=record.bodyStart;
    var start=Math.max(0,originalAt-70),end=Math.min(record.content.length,originalAt+140);
    if(start<record.bodyStart)start=record.bodyStart;
    var text=record.content.slice(start,end).replace(/\s+/g," ").trim();
    return (start?"…":"")+text+(end<record.content.length?"…":"");
  }
  function searchRecords(records,query,options){
    options=options||{};var mode=options.mode==="files"?"files":"all";
    var limit=Math.max(1,Math.min(100,Number(options.limit)||30));
    var normalized=normalizeSearch(query),terms=normalized?normalized.split(" ").filter(Boolean):[];
    var found=[];
    for(var i=0;i<records.length;i++){
      var r=records[i],score=0,matched=true;
      for(var j=0;j<terms.length;j++){
        var term=terms[j],termScore=0;
        if(r.titleNorm===term)termScore=220;
        else if(r.titleNorm.indexOf(term)===0)termScore=150;
        else if(r.titleNorm.indexOf(term)>=0)termScore=110;
        if(r.aliasNorm.indexOf(term)>=0)termScore=Math.max(termScore,130);
        if(r.pathNorm.indexOf(term)>=0)termScore=Math.max(termScore,70);
        if(mode==="all"&&r.contentNorm.indexOf(term)>=0)termScore=Math.max(termScore,20);
        if(!termScore){matched=false;break;}score+=termScore;
      }
      if(!matched)continue;
      if(!terms.length)score=Math.min(50,Math.floor(r.mtimeMs/100000000));
      var firstContentTerm=terms.find(function(term){return r.contentNorm.indexOf(term)>=0;})||"";
      found.push({path:r.path,rel:r.rel,title:r.title,aliases:r.aliases,snippet:mode==="all"?snippetFor(r,firstContentTerm):r.rel,score:score,mtimeMs:r.mtimeMs});
    }
    found.sort(function(a,b){return b.score-a.score||b.mtimeMs-a.mtimeMs||a.title.localeCompare(b.title,"ar");});
    return found.slice(0,limit).map(function(r){delete r.mtimeMs;return r;});
  }

  return {normalizeSearch:normalizeSearch,createRecord:createRecord,searchRecords:searchRecords};
});
