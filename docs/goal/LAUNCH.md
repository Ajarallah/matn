# ما يحتاج يدك

دُمج #33 في 7 نوفمبر، فنُشرت النسخة على الويب والإضافة. وكل ما عدا هذا نُشر. الأوامر جاهزة للنسخ.

## 1. نشر npm (بعد الدمج)

لم يكن على الجهاز تسجيل دخول لـ npm (`npm whoami` أعاد 401).

```bash
npm login
```

```bash
cd ~/Developer/experiments/matn && git switch main && git pull && npm test && npm publish --access public
```

## 2. تجربة إضافة Claude Code

```text
/plugin install matn --marketplace Ajarallah/matn
```

## 3. فحص EPUB بأداة epubcheck (اختياري)

الأداة تحتاج Java، وهي غير مثبّتة على جهازك. صدّر أي ملف إلى EPUB من قائمة «حفظ»، ثم:

```bash
brew install epubcheck && epubcheck ~/Downloads/PLAN.epub
```
