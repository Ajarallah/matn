# ما يحتاج يدك

كل ما عدا هذا نُشر أو دُمج. الأوامر جاهزة للنسخ.

## 0. دمج جولة الأقسام (#33)، وبه يُنشر الويب والإضافة

إذن الدمج في التكليف كان ليوم 6 نوفمبر، فلم أدمج بعد انتهائه. بعد أن تنجح فحوص CI كلها:

```bash
cd ~/Developer/experiments/matn && gh pr checks 33 --repo Ajarallah/matn && gh pr merge 33 --repo Ajarallah/matn --merge
```

ثم تحقّق من النسخة على الويب: https://ajarallah.github.io/matn/?gh=Ajarallah/matn

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
