(function(){
  "use strict";
  var copy={
    en:{
      skip:"Skip to content",navWhy:"Why Matn?",navFeatures:"Features",navInstall:"Install",github:"GitHub",
      eyebrow:"Local, open source, and built for Arabic",heroLineOne:"Arabic Markdown,",heroLineTwo:"read the right way.",
      heroLead:"A calm reader that turns your files into properly directed Arabic documents while code and English stay exactly where they belong. Runs on your machine, with no account or cloud.",
      tryMatn:"Try Matn",installFromGithub:"Install from GitHub",runtimeDeps:"runtime dependencies",bidi:"correct bidirectionality",localOnly:"local only",
      previewFile:"project-guide.md",contents:"Contents",previewIntro:"Introduction",previewWhy:"Why Matn?",previewInstall:"Install",
      previewKicker:"A correctly directed Arabic document",previewTitle:"Read the idea, not its formatting.",
      previewParagraph:'Matn knows this sentence is <code>RTL</code>, and that <code>const answer = 42;</code> must stay left-to-right.',
      previewQuote:"Your files never leave your device. Everything happens locally.",
      trustOne:"Node.js only",trustTwo:"Works offline",trustThree:"Markdown stays Markdown",trustFour:"Arabic and English UI",
      whyLabel:"The problem it solves",whyTitle:"Arabic is not an edge case.",usualReader:"A typical reader",usualCopy:"One direction is forced on the whole line, colliding Arabic, code, and punctuation.",
      matnReader:"With Matn",correctHeading:"An Arabic heading that starts with API",correctCopy:"Document and block direction are resolved independently, so every language follows its natural flow.",
      featuresLabel:"More than a reader",featuresTitle:"Developer tools, reader calm.",
      featureRtlTitle:"Context-aware RTL",featureRtlCopy:"Document language voting, automatic block direction, and code and tables that never flip.",
      featureLocalTitle:"Private by default",featureLocalCopy:"A local server constrained to the folder you open. No accounts, uploads, or tracking.",
      featureFlowTitle:"Part of your workflow",featureFlowCopy:"Open a file, folder, or stdin and see changes the moment you save.",
      featureNavigateTitle:"Navigate the document",featureNavigateCopy:"Search, heading map, backlinks, and link and image health.",
      featureExportTitle:"Export what you read",featureExportCopy:"PDF, HTML, Word, and EPUB with Arabic direction preserved.",
      featureScaleTitle:"From a note to a book",featureScaleCopy:"Large files render in a Worker, while SUMMARY.md becomes chapters and reading progress.",
      themesLabel:"A reading space for you",themesTitle:"Four tones, one rhythm.",themeLight:"Light",themeSepia:"Sepia",themeDark:"Dark",themeNight:"Night",
      installLabel:"Start in your terminal",installTitle:"One file. One command.",installCopy:"Matn needs Node.js 18 or newer. Install it from GitHub or run it directly, then pass it any Markdown file.",
      installFactOne:"No runtime dependencies",installFactTwo:"macOS, Linux, and Windows",installFactThree:"MIT licensed",terminalTitle:"Terminal",copy:"Copy",
      terminalOutput:"Matn is running at http://127.0.0.1:4711",copied:"Copied",
      finalLabel:"Your files deserve a reader that understands them",finalTitle:"Let the text be the interface.",openDemo:"Open the demo",viewSource:"View source",
      madeBy:"Made by Ali Aljarallah. Matn — the core text of a book."
    }
  };
  var html=document.documentElement;
  var languageButton=document.getElementById("language-toggle");
  var themeButton=document.getElementById("theme-toggle");
  var themeMeta=document.querySelector('meta[name="theme-color"]');
  var currentLanguage="ar";

  function stored(key){try{return localStorage.getItem(key);}catch(_error){return null;}}
  function persist(key,value){try{localStorage.setItem(key,value);}catch(_error){}}
  function setLanguage(language){
    currentLanguage=language==="en"?"en":"ar";
    html.lang=currentLanguage;
    html.dir=currentLanguage==="ar"?"rtl":"ltr";
    document.title=currentLanguage==="ar"?"متن · قارئ ماركداون عربي":"Matn · An Arabic Markdown reader";
    document.querySelectorAll("[data-i18n]").forEach(function(node){
      var key=node.getAttribute("data-i18n");
      var original=node.getAttribute("data-ar");
      if(original===null){original=node.textContent;node.setAttribute("data-ar",original);}
      node.textContent=currentLanguage==="en"&&copy.en[key]?copy.en[key]:original;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function(node){
      var key=node.getAttribute("data-i18n-html");
      var original=node.getAttribute("data-ar-html");
      if(original===null){original=node.innerHTML;node.setAttribute("data-ar-html",original);}
      node.innerHTML=currentLanguage==="en"&&copy.en[key]?copy.en[key]:original;
    });
    languageButton.textContent=currentLanguage==="ar"?"EN":"ع";
    languageButton.setAttribute("aria-label",currentLanguage==="ar"?"Switch to English":"التبديل إلى العربية");
    themeButton.setAttribute("aria-label",html.getAttribute("data-theme")==="dark"?(currentLanguage==="ar"?"استخدام الوضع الفاتح":"Use light mode"):(currentLanguage==="ar"?"استخدام الوضع الداكن":"Use dark mode"));
    document.querySelector(".site-header nav").setAttribute("aria-label",currentLanguage==="ar"?"التنقل الرئيسي":"Main navigation");
    document.querySelector(".hero-facts").setAttribute("aria-label",currentLanguage==="ar"?"حقائق عن متن":"Facts about Matn");
    document.querySelector(".site-logo").setAttribute("aria-label",currentLanguage==="ar"?"متن، الصفحة الرئيسية":"Matn, home");
    document.querySelector(".hero-product").setAttribute("aria-label",currentLanguage==="ar"?"معاينة واجهة متن":"Matn interface preview");
    document.querySelector(".trust-strip").setAttribute("aria-label",currentLanguage==="ar"?"خصائص أساسية":"Core properties");
    document.querySelector('meta[name="description"]').setAttribute("content",currentLanguage==="ar"?"متن — قارئ ماركداون محلي صُمم للعربية، مع اتجاه RTL صحيح، خطوط عربية، تصدير، وبلا تبعيات تشغيل.":"Matn is a local Arabic-first Markdown reader with correct RTL, Arabic fonts, export, and no runtime dependencies.");
    document.querySelector('meta[property="og:description"]').setAttribute("content",currentLanguage==="ar"?"ماركداون عربي، كما يجب أن يُقرأ.":"Arabic Markdown, read the right way.");
    document.querySelector('meta[property="og:image:alt"]').setAttribute("content",currentLanguage==="ar"?"متن — قارئ ماركداون عربي محلي":"Matn — a local Arabic Markdown reader");
    persist("matn.site.language",currentLanguage);
  }
  function setTheme(theme){
    var next=theme==="dark"?"dark":"light";
    html.setAttribute("data-theme",next);
    themeButton.setAttribute("aria-label",next==="dark"?(currentLanguage==="ar"?"استخدام الوضع الفاتح":"Use light mode"):(currentLanguage==="ar"?"استخدام الوضع الداكن":"Use dark mode"));
    themeMeta.setAttribute("content",next==="dark"?"#26352e":"#f3f1e6");
    persist("matn.site.theme",next);
  }
  languageButton.addEventListener("click",function(){setLanguage(currentLanguage==="ar"?"en":"ar");});
  themeButton.addEventListener("click",function(){setTheme(html.getAttribute("data-theme")==="dark"?"light":"dark");});

  var copyButton=document.getElementById("copy-install");
  var status=document.getElementById("copy-status");
  copyButton.addEventListener("click",function(){
    var value=document.getElementById("install-command").textContent;
    var done=function(){status.textContent=currentLanguage==="en"?copy.en.copied:"نُسخ الأمر";setTimeout(function(){status.textContent="";},1800);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).then(done).catch(function(){});
    else{
      var area=document.createElement("textarea");area.value=value;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();done();
    }
  });

  var savedLanguage=stored("matn.site.language");
  var savedTheme=stored("matn.site.theme");
  var systemDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  setLanguage(savedLanguage==="en"?"en":"ar");
  setTheme(savedTheme||(systemDark?"dark":"light"));
})();
