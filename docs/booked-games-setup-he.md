# מדריך הפעלה ואבחון: "משחקים שהוזמנו להיום"

המדריך מסביר איך להפעיל את אזור המשחקים בעמוד הראשי, כולל פריסה של פונקציית Supabase Edge, הגדרת משתני סביבה, ואבחון תקלות 404.

## 1) דרישות מוקדמות

- חשבון Supabase ופרויקט פעיל.
- גישה ל-Project Settings ול-Edge Functions.
- גישה להגדרות משתני הסביבה של סביבת הפריסה (Vercel/Netlify/אחר).

## 2) פריסת פונקציית Edge

הקוד מצפה לאחד משמות הפונקציה הבאים:

1. `get-today-booked-games` (ראשי)
2. `today-booked-games` (fallback)

### עם Supabase CLI

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy get-today-booked-games
```

> אם הפונקציה אצלכם נקראת בשם אחר, עדיף להגדיר ישירות `VITE_BOOKED_GAMES_ENDPOINT` (שלב 3).

## 3) הגדרת משתני סביבה בפרונט

מומלץ להגדיר במפורש:

- `VITE_BOOKED_GAMES_ENDPOINT=https://<PROJECT_REF>.supabase.co/functions/v1/get-today-booked-games`

או לחלופין:

- `VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co`

בנוסף, אם האפליקציה משתמשת ב-Supabase בשאר האזורים:

- `VITE_SUPABASE_ANON_KEY=<ANON_KEY>`

### הערה חשובה

גם אם `VITE_SUPABASE_URL` הוגדר בטעות עם נתיב (למשל `/rest/v1`), הקוד מנרמל אוטומטית ל-origin. עדיין, מומלץ לשמור את הערך נקי.

## 4) בדיקה ידנית מהירה

1. פתחו את העמוד הראשי.
2. גללו לאזור "משחקים שהוזמנו להיום".
3. לחצו "רענון".
4. ודאו שלא מתקבלת הודעת `השרת החזיר שגיאה (404)`.
5. ודאו שמופיע אחד מהבאים:
   - רשימת שעות שהוזמנו.
   - או "לא נמצאו משחקים שהוזמנו להיום" (אם אין הזמנות).

## 5) בדיקת endpoint ישירה

בדפדפן/טרמינל:

```bash
curl -i "https://<PROJECT_REF>.supabase.co/functions/v1/get-today-booked-games"
```

מצופה:

- סטטוס `200`.
- JSON עם שדות: `date`, `timezone`, `status`, `venues`, `lastUpdatedAt`.

## 6) פתרון תקלות

### שגיאת 404

- ודאו שהפונקציה אכן פרוסה.
- ודאו שהשם תואם (`get-today-booked-games` או `today-booked-games`).
- ודאו שהדומיין הוא `https://<PROJECT_REF>.supabase.co`.
- אם הוגדר `VITE_BOOKED_GAMES_ENDPOINT`, ודאו שאין שגיאת כתיב.

### שגיאת 401/403

- בדקו הגדרות אימות של הפונקציה (JWT / public access).
- ודאו שהקריאה מהקליינט מותרת.

### שגיאת CORS

- ודאו שהפונקציה מחזירה כותרות CORS מתאימות.
- ודאו שהדומיין של האתר מותר אם יש whitelist.

### מתקבל JSON לא תקין

- פתחו Supabase Logs לפונקציה ובדקו חריגות בזמן ריצה.

## 7) איפה לבדוק לוגים ב-Supabase

1. Supabase Dashboard → Project → Edge Functions.
2. בחרו את הפונקציה.
3. עברו ללשונית Logs.
4. הריצו רענון מהעמוד הראשי ועקבו אחרי בקשת GET.

## 8) צ'קליסט סופי

- [ ] הפונקציה פרוסה.
- [ ] משתני סביבה מוגדרים בסביבת הפריסה.
- [ ] בוצעה פריסה מחדש לאתר אחרי שינוי env.
- [ ] endpoint ישיר מחזיר 200.
- [ ] בעמוד הראשי הנתונים מוצגים ללא 404.
