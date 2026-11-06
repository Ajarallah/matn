# ما يحتاج يدك

دُمج #33 في 7 نوفمبر، فنُشرت النسخة على الويب والإضافة. وكل ما عدا هذا نُشر. الأوامر جاهزة للنسخ.

## 0. دمج جولة القراءة (#34)

بعد أن تنجح فحوص CI:

```bash
gh pr checks 34 --repo Ajarallah/matn && gh pr merge 34 --repo Ajarallah/matn --merge
```

## 1. نشر npm

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

## 4. فحوص تحتاج جهازك (اختيارية)

- **إغلاق تبويب المراجعة في Chrome الحقيقي:** شغّل `matn review PLAN.md`، ثم أغلق التبويب. المتوقع أن يخرج الأمر خلال نحو 10 ثوانٍ برسالة «the review page was closed». في المحاكاة الخفية لا يصل حدث الإغلاق، فيخرج بعد 5 دقائق.
- **«افتح في المحرر» بلا إعداد:** من قائمة الملف في متن. المتوقع أن يفتح الملف في محرر النصوص الافتراضي (`open -t`).
