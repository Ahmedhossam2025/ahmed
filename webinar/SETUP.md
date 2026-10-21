# Reclaim Your Power: registration pages and free automation

Webinar: **Sunday, October 25, 2026, 7:00–8:00 PM Cairo time, live online via Zoom.** Everything here runs on free tools: Google Sheets and Apps Script for the backend, your WhatsApp group for the messages, and your own hosting for the pages.

## 1. The workflow

```
Ad / post ──► Registration page (English or Arabic)
                name · email · WhatsApp number · consent tick
                        │  the form posts to your Google Apps Script
                        ▼
            Google Sheet "Registrations"   (every lead, UTM source, language, status)
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
 Confirmation EMAIL (instant,   Thank-you page
 English or Arabic) with the    ① Join the WhatsApp group  ← you send the Zoom link,
 Zoom link and group link         ② Add to calendar          reminders and updates here
          │
          ▼
 The script checks the schedule every 5 minutes:
   Oct 24, 7:00 PM   email   "Tomorrow"
   Oct 25, 4:00 PM   (group) "3 hours": you post it in the group (email is off by default)
   Oct 25, 6:45 PM   email   "15 minutes" + Zoom button
   Oct 25, 7:00 PM   (group) "Live now": you post it in the group
   Oct 25, 8:30 PM   email   thank you + Personal Power Retreat invitation
   Oct 26–29, 10 AM  email   the 4-message retreat follow-up from your campaign file
```

Phone numbers are collected and saved in the sheet, and every registrant is invited to the group; you send the Zoom link and reminders to them in the group, as you planned. The Zoom link is also in the confirmation email and the reminder emails, so people who skip the group still get it.

## 2. What's in the folder

| File | What it is |
|---|---|
| `index.html` | English registration page |
| `ar/index.html` | Arabic registration page (right-to-left) |
| `thanks/index.html`, `ar/thanks/index.html` | Thank-you pages: group invite, calendar buttons, reflection question |
| `config.js` | Website settings: your Apps Script URL and the WhatsApp group link (already filled in) |
| `apps-script/Code.gs` | The free backend: saves registrations, sends emails, runs the reminders. The Zoom link and group link are already filled in |
| `assets/` | Logos and photos |

The Zoom link lives only in `Code.gs`, **not** in `config.js` or the pages. The website files are public, so anyone could read a link placed there without registering.

## 3. Setup, about 15 minutes

1. **Google Sheet.** Create a new Google Sheet, for example "Reclaim Your Power registrations".
2. **Script.** In the sheet: Extensions → Apps Script. Delete the sample code and paste all of `apps-script/Code.gs`.
3. **Run `setup`** (choose it in the function dropdown, press Run, approve Google's permission screen). It creates the two tabs and installs the 5-minute reminder timer.
4. **Run `sendTestToMe`** and read the emails that arrive in your inbox (one per message, English and Arabic) to proof them.
5. **Deploy.** Deploy → New deployment → type *Web app* → Execute as **Me**, Who has access **Anyone** → Deploy. Copy the web-app URL.
6. **Website.** Open `config.js` and paste that URL into `APPS_SCRIPT_URL`. Upload the whole folder to your hosting, for example as `/webinar/` (English page at `/webinar/`, Arabic at `/webinar/ar/`).
7. **Test end to end** on your phone with your own details. You should land on the thank-you page, get the email within a minute, and see a row in the sheet.
8. **Ads.** Send English ads to `/webinar/?utm_source=facebook&utm_medium=paid&utm_campaign=reclaim&utm_content=A` and Arabic ads to `/webinar/ar/?...`. The UTM values are saved in the sheet so you can compare English and Arabic, and Versions A/B/C.

If you change `Code.gs` later: Deploy → Manage deployments → Edit → New version (the URL stays the same).

## 4. Zoom: two things to check before Sunday

* **Time limit.** A free Zoom account ends group meetings after **40 minutes**. Your webinar is 60 minutes, so use a paid Zoom plan for this meeting (or the host has a plan that allows it), or it will cut off during the retreat invitation.
* **Capacity.** A standard meeting has a participant cap that depends on your plan. Check it against your expected registrations. Turn on the waiting room or mute participants on entry if you want control.

## 5. Group messages to post (copy and paste)

Welcome (post when people join, from your toolkit):

> Welcome to the **Reclaim Your Power** webinar group! On **Sunday, October 25, 7:00–8:00 PM Cairo time**, we'll explore three shifts: Release, Reconnect, Reinvent. Your Zoom link will be shared here. To start: *If fear were less influential in your life, what is one thing you'd love to do differently?* Share if you're comfortable, or keep it private. Please respect everyone's privacy.

Oct 25, 4:00 PM: **We're live in 3 hours!** Reclaim Your Power starts today at 7:00 PM Cairo time. One question to bring: *What's one thing you feel ready to change?* Zoom: https://us06web.zoom.us/j/83748929379?pwd=7FwzEjgEb4apaI7TLbXIE0c3lakoCc.1

Oct 25, 6:45 PM: **We start in 15 minutes!** Find a comfortable place and join: (Zoom link)

Oct 25, 7:00 PM: **We're live now!** Join us here: (Zoom link)

The Arabic versions of all of these are in your toolkit file `02-thank-you-page-and-webinar-group.md`.

## 6. Limits to know (free tiers)

| Limit | Value | What to do |
|---|---|---|
| Emails per day from a normal Gmail | 100 | Fine for about 30 registrants per day; the 3-hour and live-now emails are off to save quota because the group covers them |
| Emails per day from Google Workspace | 1,500 | Set `email: true` on those two schedule lines to email them too |
| More than ~100 registrants | | Move the emails to Brevo or MailerLite (300 a day free) or use a Workspace account |
| Script run time | 6 min per run | The reminder engine stops at 4.5 min and continues on the next 5-minute run |
| WhatsApp group size | 1,024 members | If you expect more, add a second group and a second link, or use a Channel |

## 7. Tracking (Meta Pixel is already in the pages)

| Moment | Event |
|---|---|
| Page opens | `PageView` |
| Form submitted | `Lead` |
| Thank-you page | `CompleteRegistration` |
| Taps Join group | `JoinWebinarGroup` (custom) |

For the registration campaign choose a **Leads / Sales objective with `CompleteRegistration` or `Lead` as the conversion event**, not Messages, so Meta optimizes for people who actually register. In the sheet, mark who attended (column P) so you can follow registration → attendance → retreat booking.

## 8. Optional later: fully automatic WhatsApp

If you want a WhatsApp message sent by itself the moment someone registers, the script already supports the **WhatsApp Cloud API** (`CFG.WA_CLOUD`, switched off). Meta charges per template message, and business verification plus template approval can take days, so it won't be ready for Oct 25. Create five *Utility* templates (names in `Code.gs`) such as: "Hi {{1}}, you're registered for Reclaim Your Power on Sunday, October 25 at 7:00 PM Cairo time on Zoom. Your link: {{2}}. Webinar group: {{3}}". Save the access token as the script property `WA_TOKEN`, set `PHONE_NUMBER_ID`, then `ENABLED: true`. Check the current Egypt rate in WhatsApp Manager first.

## 9. Before you publish

- [ ] Webinar is on a Zoom plan that allows 60 minutes
- [ ] Apps Script deployed and its URL pasted in `config.js`; test registration works in English **and** Arabic
- [ ] Group is ready; welcome message pinned; group rules posted (respectful, no pressure to share, no constant selling)
- [ ] The replay FAQ answer is true for you (it says you'll confirm replay availability by email and in the group)
- [ ] Presenter bio approved (taken from your retreat page; the Arabic is my translation)
- [ ] Checkbox asks permission for email and WhatsApp; the unsubscribe link in every email works (it marks the row "unsubscribed")

## 10. Choices I made for you (change any of them)

* Registration asks for **first name, email and WhatsApp number** (your toolkit listed name and email; the number lets you follow up).
* The retreat follow-up emails link to the existing Personal Power Retreat page, and the last one goes to the package section because booking there happens on WhatsApp, not through an application form.
* The Oct 25, 7 PM time is stored as UTC+3 (Egypt summer time) so calendar invites show the right hour worldwide.
