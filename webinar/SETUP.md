# Reclaim Your Power: registration pages and free automation

Webinar: **Sunday, October 25, 2026, 7:00–8:00 PM Cairo time**. Everything here runs on free tools (Google Sheets and Apps Script, WhatsApp Business app, your own hosting). The only optional paid part is fully automatic WhatsApp (section 3, Option B).

## 1. The workflow

```
Ad / post  ──►  Registration page (EN or AR)
                  name · email · WhatsApp number · consent tick
                          │  (form posts to your Google Apps Script)
                          ▼
              Google Sheet "Registrations"  ◄── every lead, with UTM source, language, status
                          │
        ┌─────────────────┼──────────────────────────┐
        ▼                 ▼                          ▼
 Confirmation EMAIL   Thank-you page               (Option B only)
 (instant, EN/AR)     ① Tap "Confirm on WhatsApp"  Confirmation WhatsApp
                         → pre-written message     sent by itself
                         arrives on YOUR number
                         → WhatsApp Business app
                           greeting auto-replies
                         ② Join the webinar group
                         ③ Add to calendar
        │
        ▼
 Reminders every 5 minutes check the schedule:
   Oct 24 7 PM   email (+ WhatsApp in option B)    "Tomorrow"
   Oct 25 4 PM   WhatsApp group / option B          "3 hours"
   Oct 25 6:45   email (+ WhatsApp)                 "15 minutes"
   Oct 25 7 PM   WhatsApp group / option B          "Live now"
   Oct 25 8:30   email                              thanks + retreat invitation
   Oct 26 to 29  email                              4-message retreat follow-up (from your campaign file)
```

The pages and emails follow your toolkit: same copy, Release / Reconnect / Reinvent, no retreat price on the registration page, no guaranteed-outcome claims.

## 2. Files

| File | What it is |
|---|---|
| `index.html` | English registration page |
| `ar/index.html` | Arabic registration page (right-to-left) |
| `thanks/index.html`, `ar/thanks/index.html` | Thank-you pages (name, WhatsApp confirm, group, calendar, reflection question) |
| `config.js` | The only file you edit on the website side: Apps Script URL, WhatsApp number, group link, webinar link |
| `apps-script/Code.gs` | The free backend: saves registrations, sends emails, runs the reminders |
| `assets/` | Logos, photos |

## 3. The WhatsApp message: two options

WhatsApp does not allow any tool to message a stranger by itself for free. A business can only message someone first with a pre-approved *template*, and Meta charges for those. So there are two honest routes.

### Option A: free, one tap (recommended for launch)

1. After registering, the person lands on the thank-you page and taps **Confirm on WhatsApp**.
2. WhatsApp opens with a ready message to your number, for example *"Hi, I registered for the Reclaim Your Power webinar (ref K7M2X)…"*, and they press send.
3. Your **WhatsApp Business app greeting message** answers them automatically (text below).
4. Because *they* messaged *you*, WhatsApp opens a 24-hour window in which your replies are free, so you can send the link, group invite and anything else.

Set it up in the WhatsApp Business app: **Settings → Business tools → Greeting message** (turn on, send to "Everyone not in your address book"), paste the text below, and also set an **Away message** for outside your working hours.

Greeting message (bilingual, edit the two links before launch):

```
Hi 👋 Thank you for registering for *Reclaim Your Power*!
🗓 Sunday, October 25, 2026
⏰ 7:00–8:00 PM Cairo time · Live online
🔗 Your joining link: [WEBINAR LINK]
👥 Webinar group (optional): [GROUP LINK]
One question to think about before we meet: what is one fear or belief you want to stop letting control your choices?

أهلًا بيك 👋 تم تأكيد تسجيلك في ويبينار *استعد قوتك*!
🗓 الأحد ٢٥ أكتوبر ٢٠٢٦
⏰ من ٧ إلى ٨ مساءً بتوقيت القاهرة · أونلاين مباشر
🔗 رابط الحضور: [WEBINAR LINK]
👥 مجموعة الويبينار (اختياري): [GROUP LINK]
سؤال للتفكير قبل لقائنا: ما الخوف أو المعتقد اللي نفسك ما يتحكمش في قراراتك بعد النهارده؟
```

Reminders on 3 hours and "live now" go out free in the **webinar group / WhatsApp Community / Channel** (a Channel has no member limit and nobody sees each other's numbers). Email carries the Oct 24 and 15-minute reminders.

Trade-off: it needs one tap from the person, and not everyone will tap. Those who do are your most engaged leads, and email plus the group cover everyone else.

### Option B: fully automatic (sent by itself the moment someone registers)

Uses the **WhatsApp Cloud API**. Meta charges per delivered template message (the price depends on country and message category, so check the current Egypt rate in WhatsApp Manager before turning it on). Setup takes longer: Meta business verification and template approval can take days, so it will probably not be ready for Oct 25. If you want it for the retreat funnel later:

1. In Meta Business Suite, create a WhatsApp Business Account and add a number for the API. A number already on the WhatsApp Business app needs Meta's *coexistence* option, or use a new number.
2. In WhatsApp Manager create these five templates, category **Utility**, in English and Arabic. Names must match `CFG.WA_CLOUD.TEMPLATES` in `Code.gs`.

| Template name | Body (English; make an Arabic version too) |
|---|---|
| `webinar_confirmation` | Hi {{1}}, you're registered for Reclaim Your Power on Sunday, October 25 at 7:00 PM Cairo time. Your joining link: {{2}}. Webinar group for reminders (optional): {{3}} |
| `webinar_reminder_1d` | Hi {{1}}, a reminder that Reclaim Your Power is tomorrow, October 25, at 7:00 PM Cairo time. Your joining link: {{2}} |
| `webinar_reminder_3h` | Hi {{1}}, Reclaim Your Power starts in 3 hours, at 7:00 PM Cairo time. Your joining link: {{2}} |
| `webinar_reminder_15m` | Hi {{1}}, we start in 15 minutes. Join Reclaim Your Power here: {{2}} |
| `webinar_live_now` | Hi {{1}}, we are live now. Join Reclaim Your Power here: {{2}} |

3. Create a System User token and paste it in Apps Script: **Project Settings → Script properties → `WA_TOKEN`**. Put your Phone Number ID in `CFG.WA_CLOUD.PHONE_NUMBER_ID` and set `ENABLED: true`.
4. Test with your own number first. While the app is in test mode you can message only a handful of verified numbers, for free.

## 4. Setup, about 15 minutes

1. **Google Sheet.** Create a new Google Sheet named "Reclaim Your Power registrations".
2. **Script.** In the sheet: Extensions → Apps Script. Delete the sample code and paste all of `apps-script/Code.gs`.
3. **Fill the `CFG` block** at the top: `WEBINAR_URL`, `GROUP_URL`, and optionally `REPLY_TO`. Reminders stay paused until `WEBINAR_URL` is set, so nothing can go out with a missing link.
4. **Run `setup`** (pick it in the function dropdown, press Run, approve the Google permission screen). It creates the two tabs and installs the 5-minute reminder timer.
5. **Run `sendTestToMe`** and read the emails in your inbox (10 messages in English and Arabic, one per template) to proof them.
6. **Deploy.** Deploy → New deployment → type *Web app* → Execute as **Me**, Who has access **Anyone** → Deploy. Copy the web-app URL.
7. **Website.** Open `config.js` and paste the web-app URL into `APPS_SCRIPT_URL`, your group link into `GROUP_URL` and the live link into `WEBINAR_URL`. Upload the whole folder to your hosting (for example as `/webinar/`; the English page is `/webinar/`, Arabic is `/webinar/ar/`).
8. **Test end to end** on your phone with your own details: you should land on the thank-you page, get the email within a minute, see a row in the sheet, and the WhatsApp button should open a chat with the pre-written message.
9. **Ads.** Send English ads to `/webinar/?utm_source=facebook&utm_medium=paid&utm_campaign=reclaim&utm_content=A` and Arabic ads to `/webinar/ar/?...`. The UTM values are saved in the sheet so you can compare English vs Arabic and Version A/B/C.

If you change the Apps Script code later, use Deploy → Manage deployments → Edit → New version (the URL stays the same).

## 5. Limits to know (all free tiers)

| Limit | Value | What to do |
|---|---|---|
| Emails per day from a normal Gmail | 100 | Fine for about 30 registrants; the 3-hour and live-now messages are set to WhatsApp only to save quota |
| Emails per day from Google Workspace | 1,500 | Set `email: true` on those two schedule lines to also email them |
| More than ~100 registrants | | Move the emails to Brevo or MailerLite free plans (300/day), or use a Workspace account |
| Script run time | 6 min per run | The reminder engine stops at 4.5 min and continues on the next 5-minute run |
| WhatsApp group size | 1,024 (Community and Channel have no practical cap) | Use a Channel if you expect more |

## 6. The live webinar link (free options)

* **YouTube Live (unlisted):** free, no time limit, handles any audience, chat and Q&A built in. Best fit for a 60-minute talk with 100+ people. Participants cannot speak, they type.
* **Google Meet / Zoom free plans:** limited call length and participants, risky for a 60-minute session that may run over. Use only if you have a paid plan.

## 7. Tracking (Meta Pixel is already in the pages)

| Moment | Event |
|---|---|
| Page opens | `PageView` |
| Form submitted | `Lead` |
| Thank-you page | `CompleteRegistration` |
| Taps Confirm on WhatsApp | `Contact` |
| Taps Join group | `JoinWebinarGroup` (custom) |

For the registration campaign, choose the **Leads / Sales objective with `CompleteRegistration` or `Lead` as the conversion event**, not Messages, so Meta optimizes for people who actually register. In the sheet, mark who tapped the WhatsApp confirm (column O) and who attended (column P) so you can see registration → attendance → retreat bookings.

## 8. Before you publish

- [ ] `config.js` filled in and uploaded
- [ ] Apps Script deployed, test registration works in English **and** Arabic
- [ ] Greeting message saved in the WhatsApp Business app with both links
- [ ] Webinar link tested; group created and its link added
- [ ] Replay answer in the FAQ is true for you (it currently says you will confirm replay availability by email and in the group)
- [ ] Presenter bio approved (taken from your retreat page; the Arabic is a translation)
- [ ] Privacy: the checkbox asks for permission to send email and WhatsApp; the unsubscribe link in every email works (it marks the row "unsubscribed")
- [ ] Group rules posted (respectful, no pressure to share, no constant selling), per your toolkit

## 9. Choices I made for you (change any of them)

* Registration asks for **first name, email and WhatsApp number** (your toolkit listed name and email; the WhatsApp number is needed for the WhatsApp message).
* The retreat follow-up emails link to the existing Personal Power Retreat page (`personal-power-retreat.vercel.app`) and the final one goes to the package section, because booking is done on WhatsApp there, not through an application form.
* The Oct 25, 7 PM time is saved as UTC+3 (Egypt summer time, which ends later that week), so calendar invites show the right hour worldwide.
