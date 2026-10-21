/**
 * Reclaim Your Power — free registration backend (Google Apps Script + Google Sheets).
 *
 * What it does, all inside your free Google account:
 *   1. Receives each registration from the landing page and saves it as a row in the Google Sheet.
 *   2. Emails the confirmation straight away (EN or AR, matching the page language).
 *   3. Optional: sends the same confirmation as a WhatsApp message by itself (WhatsApp Cloud API, see SETUP.md).
 *   4. Every 5 minutes checks the schedule and sends the reminders (1 day, 3 hours, 15 minutes, live now)
 *      and the post-webinar retreat follow-ups (Oct 25 to Oct 29).
 *   5. Gives every email an unsubscribe link and honours it.
 *
 * Setup: follow SETUP.md (about 15 minutes). Edit only the CFG block below.
 */

const CFG = {
  BRAND: 'Retrive',
  FROM_NAME: 'Retrive | Personal Power',
  REPLY_TO: '',                                   // e.g. 'hello@retrive.com' (optional)
  SUPPORT_WA: '201006511606',                     // support / booking number, digits only

  // ---- Fill these before launch ----
  WEBINAR_URL: 'https://us06web.zoom.us/j/83748929379?pwd=7FwzEjgEb4apaI7TLbXIE0c3lakoCc.1',   // Zoom meeting link (private: only emailed to registrants)
  GROUP_URL: 'https://chat.whatsapp.com/G1noDQlRY0wKFZJZcdcc9L?mode=gi_t',   // WhatsApp group invite link
  RETREAT_URL: 'https://personal-power-retreat.vercel.app',

  // ---- Webinar time (Cairo, UTC+3 on Oct 25 2026) ----
  WEBINAR_DATE_EN: 'Sunday, October 25, 2026',
  WEBINAR_DATE_AR: 'الأحد ٢٥ أكتوبر ٢٠٢٦',
  WEBINAR_TIME_EN: '7:00–8:00 PM Cairo time',
  WEBINAR_TIME_AR: 'من ٧:٠٠ إلى ٨:٠٠ مساءً بتوقيت القاهرة',

  // ---- WhatsApp Cloud API (optional, paid per message by Meta). Keep ENABLED:false to stay 100% free. ----
  WA_CLOUD: {
    ENABLED: false,
    PHONE_NUMBER_ID: '',                          // from Meta > WhatsApp > API setup
    API_VERSION: 'v21.0',
    // The access token is NOT stored here. Put it in Project Settings > Script properties as WA_TOKEN.
    TEMPLATES: {                                  // names you create & get approved in WhatsApp Manager (see SETUP.md)
      confirm:    'webinar_confirmation',
      reminder_1d:  'webinar_reminder_1d',
      reminder_3h:  'webinar_reminder_3h',
      reminder_15m: 'webinar_reminder_15m',
      live_now:   'webinar_live_now'
    },
    LANG: { en: 'en', ar: 'ar' }
  },

  SHEET: 'Registrations',
  SENT_SHEET: 'Sent log',
  LATE_WINDOW_HOURS: 2                            // default: a message is skipped if it is more than this many hours late (each SCHEDULE item can override with `late`)
};

const HEADERS = ['Timestamp', 'Ref', 'Name', 'Email', 'WhatsApp', 'Lang', 'Source', 'Medium', 'Campaign', 'Content',
                 'Consent', 'Status', 'Confirm email', 'Confirm WhatsApp', 'WA tapped (manual)', 'Attended (manual)', 'Notes'];

/* ------------------------------------------------------------------ */
/*  Schedule (Cairo time). Edit times here if the date moves.          */
/*  email:false = that message goes to WhatsApp only (saves the free   */
/*  Gmail quota of 100 emails/day). Set it to true if you have a       */
/*  Google Workspace account (1,500/day).                              */
/* ------------------------------------------------------------------ */
const SCHEDULE = [
  { id: 'reminder_1d',  at: '2026-10-24T19:00:00+03:00', wa: true,  needsWebinarUrl: true, late: 4 },
  { id: 'reminder_3h',  at: '2026-10-25T16:00:00+03:00', wa: true,  needsWebinarUrl: true, late: 1.5, email: false },
  { id: 'reminder_15m', at: '2026-10-25T18:45:00+03:00', wa: true,  needsWebinarUrl: true, late: 0.2 },
  { id: 'live_now',     at: '2026-10-25T19:00:00+03:00', wa: true,  needsWebinarUrl: true, late: 0.4, email: false },
  { id: 'post_thanks',  at: '2026-10-25T20:30:00+03:00', wa: false, late: 36 },
  { id: 'day1',         at: '2026-10-26T10:00:00+03:00', wa: false, late: 36 },
  { id: 'day2',         at: '2026-10-27T10:00:00+03:00', wa: false, late: 36 },
  { id: 'day3',         at: '2026-10-28T10:00:00+03:00', wa: false, late: 36 },
  { id: 'day4',         at: '2026-10-29T10:00:00+03:00', wa: false, late: 36 }
];

/* ------------------------------------------------------------------ */
/*  Messages. *text* = bold. {{NAME}} {{WEBINAR_URL}} {{GROUP_URL}}    */
/*  {{RETREAT_URL}} {{APPLY_URL}} {{DATE}} {{TIME}} {{SUPPORT_URL}}    */
/* ------------------------------------------------------------------ */
const MSG = {
  confirm: {
    en: { subject: "You're registered! Reclaim Your Power — October 25", lines: [
      'Hi {{NAME}},',
      "You're officially registered for *Reclaim Your Power*! We're excited to welcome you to this free live webinar.",
      '*Date:* {{DATE}}\n*Time:* {{TIME}}\n*Where:* Online, live on Zoom',
      '*Your Zoom link:* {{WEBINAR_URL}}',
      'Before we meet, there is one more thing we would love you to do. *Join our webinar group* to receive reminders, important updates, and connect with other participants.',
      { btn: 'JOIN THE WEBINAR GROUP', url: '{{GROUP_URL}}' },
      'Here is a small question to reflect on before the webinar:',
      '_What is one fear or belief you would like to stop letting control your choices?_',
      'We look forward to seeing you!', 'The Retrive team'] },
    ar: { subject: 'تم تسجيلك بنجاح في ويبينار استعد قوتك — ٢٥ أكتوبر', lines: [
      'أهلًا {{NAME}}،',
      'يسعدنا تأكيد تسجيلك في الويبينار المجاني *استعد قوتك*.',
      '*الموعد:* {{DATE}}\n*الوقت:* {{TIME}}\n*المكان:* أونلاين عبر Zoom',
      '*رابط Zoom للحضور:* {{WEBINAR_URL}}',
      'وقبل لقائنا، ندعوك إلى الانضمام لمجموعة الويبينار. من خلالها ستصلك التذكيرات وأهم التحديثات، وستتاح لك فرصة التواصل مع باقي المشاركين.',
      { btn: 'انضم إلى مجموعة الويبينار', url: '{{GROUP_URL}}' },
      'وقبل يوم اللقاء، فكّر في سؤال بسيط:',
      '_ما الخوف أو المعتقد الذي تتمنى ألا يتحكم في قراراتك بعد اليوم؟_',
      'نتطلع إلى لقائك!', 'فريق Retrive'] }
  },
  reminder_1d: {
    en: { subject: 'Tomorrow: Reclaim Your Power!', lines: ['Hi {{NAME}},', "*Tomorrow: Reclaim Your Power!* We're meeting tomorrow, {{DATE}}, at *7:00 PM Cairo time*.",
      'Prepare a quiet space, something to write with, and an open mind. We are going to explore fear, identity, and the courage to begin again.',
      { btn: 'JOIN ON ZOOM', url: '{{WEBINAR_URL}}' }] },
    ar: { subject: 'غدًا موعدنا مع ويبينار استعد قوتك!', lines: ['أهلًا {{NAME}}،', '*غدًا موعدنا مع ويبينار استعد قوتك!* نلتقي غدًا {{DATE}}، الساعة *٧ مساءً بتوقيت القاهرة*.',
      'جهّز مكانًا هادئًا، وورقة وقلمًا، واستعد لساعة من التأمل والتعلّم. سنتحدث عن الخوف، والهوية، والشجاعة لبدء فصل جديد.',
      { btn: 'ادخل عبر Zoom', url: '{{WEBINAR_URL}}' }] }
  },
  reminder_3h: {
    en: { subject: "We're live in 3 hours!", lines: ['Hi {{NAME}},', '*We are live in 3 hours!* Reclaim Your Power starts today at *7:00 PM Cairo time*.',
      'One question to bring with you: _What is one thing you feel ready to change?_', { btn: 'JOIN ON ZOOM', url: '{{WEBINAR_URL}}' }] },
    ar: { subject: 'باقي ٣ ساعات على ويبينار استعد قوتك!', lines: ['أهلًا {{NAME}}،', '*باقي ٣ ساعات على ويبينار استعد قوتك!* نبدأ اليوم الساعة *٧ مساءً بتوقيت القاهرة*.',
      'سؤال صغير للتفكير قبل اللقاء: _ما الشيء الذي تشعر أن الوقت قد حان لتغييره؟_', { btn: 'ادخل عبر Zoom', url: '{{WEBINAR_URL}}' }] }
  },
  reminder_15m: {
    en: { subject: 'We start in 15 minutes!', lines: ['Hi {{NAME}},', '*We start in 15 minutes!* Your free Reclaim Your Power webinar is about to begin. Find a comfortable place and join us here:',
      { btn: 'JOIN ON ZOOM NOW', url: '{{WEBINAR_URL}}' }] },
    ar: { subject: 'باقي ١٥ دقيقة ونبدأ!', lines: ['أهلًا {{NAME}}،', '*باقي ١٥ دقيقة ونبدأ!* ويبينار *استعد قوتك* على وشك البدء. اختَر مكانًا مريحًا وانضم إلينا من هنا:',
      { btn: 'ادخل عبر Zoom الآن', url: '{{WEBINAR_URL}}' }] }
  },
  live_now: {
    en: { subject: "We're live now! Reclaim Your Power", lines: ['*We are live now!* Reclaim Your Power has started.', { btn: 'JOIN ON ZOOM', url: '{{WEBINAR_URL}}' }] },
    ar: { subject: 'بدأنا الآن! ويبينار استعد قوتك', lines: ['*بدأنا الآن!* ويبينار *استعد قوتك* بدأ بالفعل.', { btn: 'ادخل عبر Zoom', url: '{{WEBINAR_URL}}' }] }
  },
  post_thanks: {
    en: { subject: "Your Personal Power journey doesn't end here", lines: ['Hi {{NAME}},', 'Thank you for joining *Reclaim Your Power*. Today we explored three important ideas:',
      '*RELEASE* — Recognize what holds you back.\n*RECONNECT* — Rediscover your values and authentic identity.\n*REINVENT* — Take a courageous step toward your next chapter.',
      'We hope you have left with a new perspective and a meaningful action you can take.',
      'If you would like to explore these themes more deeply, we also introduced the *Personal Power Retreat*. It is an immersive personal development experience designed to create space for reflection, self-discovery, mindset development, and connection.',
      { btn: 'DISCOVER THE PERSONAL POWER RETREAT', url: '{{RETREAT_URL}}' }, 'Your next chapter begins with you.', 'The Retrive team'] },
    ar: { subject: 'رحلتك لاستعادة قوتك لسه في بدايتها', lines: ['أهلًا {{NAME}}،', 'شكرًا لمشاركتك في ويبينار *استعد قوتك*. النهارده اكتشفنا معًا ٣ مفاتيح:',
      '*تحرّر* — افهم ما الذي يعيقك.\n*تواصل مع ذاتك* — أعد اكتشاف قيمك وهويتك الحقيقية.\n*ابدأ من جديد* — اختر خطوة شجاعة نحو الفصل القادم من حياتك.',
      'نتمنى تكون خرجت بفكرة جديدة وخطوة عملية تبدأ بيها.',
      'ولو حابب تستكشف المحاور دي بصورة أعمق، اتكلمنا في نهاية اللقاء عن تجربة *Personal Power Retreat*. تجربة مخصصة للتأمل الذاتي، وتطوير طريقة التفكير، وإعادة اكتشاف النفس، والتواصل مع الآخرين.',
      { btn: 'اكتشف Personal Power Retreat', url: '{{RETREAT_URL}}' }, 'الفصل القادم من حياتك يبدأ بك.', 'فريق Retrive'] }
  },
  day1: {
    en: { subject: 'What are you ready to leave behind?', lines: ['Hi {{NAME}},', 'Yesterday, we asked an important question:', '*What is one fear or limiting belief you no longer want making your decisions?*',
      'Maybe you have been holding on to a story about what you are capable of. Maybe you have been putting other people\'s expectations before your own needs. Or maybe you are simply ready to reconnect with yourself.',
      'Recognizing these patterns is a meaningful first step. If you would like to dedicate more time to exploring them, take a look at the Personal Power Retreat.',
      { btn: 'EXPLORE THE RETREAT', url: '{{RETREAT_URL}}' }] },
    ar: { subject: 'ما الشيء الذي حان الوقت أن تتركه خلفك؟', lines: ['أهلًا {{NAME}}،', 'امبارح سألنا نفسنا سؤالًا مهمًا:', '*ما الخوف أو المعتقد الذي لم تعد تريد أن يتحكم في قراراتك؟*',
      'يمكن تكون متعود على أفكار معينة عن قدراتك. أو بتقدم توقعات الناس على احتياجاتك. أو ببساطة حاسس إنك محتاج ترجع تتواصل مع نفسك.',
      'مجرد ملاحظة الأنماط دي خطوة مهمة. ولو حابب تخصص وقتًا أكبر لاستكشافها، ندعوك للتعرف على تجربة Personal Power Retreat.',
      { btn: 'اكتشف تفاصيل الريتريت', url: '{{RETREAT_URL}}' }] }
  },
  day2: {
    en: { subject: 'What actually happens at the Personal Power Retreat?', lines: ['Hi {{NAME}},', 'The Personal Power Retreat is designed to offer more than information. It is an opportunity to step away from everyday distractions and dedicate time to your personal growth.',
      'Through guided activities, self-discovery experiences, and mindset work, the retreat offers a focused environment for reflection and exploration.',
      'You can review the location, full program, included experiences, facilitator information, and price on the retreat page.', { btn: 'SEE THE FULL RETREAT EXPERIENCE', url: '{{RETREAT_URL}}' }] },
    ar: { subject: 'إيه اللي بيحصل فعلًا في Personal Power Retreat؟', lines: ['أهلًا {{NAME}}،', 'Personal Power Retreat مش مجرد معلومات ومحاضرات. هي تجربة بتديك فرصة تبعد قليلًا عن ضغوط الحياة اليومية وتخصص وقتًا لنموك الشخصي.',
      'من خلال أنشطة وتجارب للتأمل الذاتي وإعادة اكتشاف النفس وتطوير طريقة التفكير، هتكون عندك مساحة للاستكشاف والتفكير بصورة أعمق.',
      'تقدر تتعرف على المكان والبرنامج والتفاصيل والخدمات المشمولة والسعر من خلال صفحة الريتريت.', { btn: 'شاهد تفاصيل التجربة', url: '{{RETREAT_URL}}' }] }
  },
  day3: {
    en: { subject: 'Is the Personal Power Retreat right for you?', lines: ['Hi {{NAME}},', 'Choosing a personal development retreat is an important decision. You may be wondering: Will I feel comfortable? Will I need to share private experiences? Is the investment worthwhile for my goals? Does the schedule fit my life?',
      'These are valid questions. We want you to understand the experience before making any commitment. You can explore the program, participant expectations, inclusions, price, and booking process here:',
      { btn: 'LEARN MORE ABOUT THE RETREAT', url: '{{RETREAT_URL}}' }, 'If you still have questions, message us on WhatsApp: {{SUPPORT_URL}}'] },
    ar: { subject: 'هل Personal Power Retreat مناسبة ليك؟', lines: ['أهلًا {{NAME}}،', 'الاشتراك في ريتريت للتطوير الشخصي قرار مهم. وطبيعي يكون عندك أسئلة: هل هكون مرتاح في التجربة؟ هل لازم أشارك أمورًا شخصية؟ هل التجربة مناسبة لأهدافي؟ هل الوقت والتكلفة مناسبين لظروفي؟',
      'كل دي أسئلة مهمة. هدفنا إنك تكون فاهم تفاصيل التجربة قبل ما تاخد أي قرار. تقدر تتعرف على البرنامج وطبيعة الأنشطة والتكلفة وطريقة الحجز من هنا:',
      { btn: 'تعرّف على تفاصيل الريتريت', url: '{{RETREAT_URL}}' }, 'ولو عندك أي سؤال إضافي، تواصل معانا على واتساب: {{SUPPORT_URL}}'] }
  },
  day4: {
    en: { subject: 'Your next chapter deserves your attention', lines: ['Hi {{NAME}},', "Over the past few days, we've explored what it means to release limiting patterns, reconnect with ourselves, and make more intentional choices.",
      'The Personal Power Retreat is an invitation to give those ideas more time, attention, and practical exploration. If you have been considering joining us, you are welcome to review the details and reserve your spot.',
      { btn: 'EXPLORE THE RETREAT & RESERVE', url: '{{APPLY_URL}}' }, 'Only join if the timing, investment, and experience genuinely fit your circumstances.',
      'And whether you attend or not, remember: *your past is part of your story. It does not have to decide your future.*', 'The Retrive team'] },
    ar: { subject: 'الفصل القادم من حياتك يستحق اهتمامك', lines: ['أهلًا {{NAME}}،', 'خلال الأيام الماضية اتكلمنا عن التحرر من المعتقدات التي تعيقنا، وإعادة التواصل مع أنفسنا، واتخاذ قرارات أكثر وعيًا.',
      'Personal Power Retreat فرصة إنك تدي الأفكار دي وقتًا ومساحة أكبر للتأمل والتجربة. لو بتفكر في الانضمام، تقدر تراجع كل التفاصيل وتحجز مكانك.',
      { btn: 'اكتشف الريتريت واحجز مكانك', url: '{{APPLY_URL}}' }, 'اتخذ القرار فقط إذا كانت التجربة ومواعيدها وتكلفتها مناسبة ليك.',
      'وسواء شاركت في الريتريت أو لا، افتكر: *ماضيك جزء من قصتك... لكنه مش لازم يحدد مستقبلك.*', 'فريق Retrive'] }
  }
};

/* ------------------------------------------------------------------ */
/*  Web endpoints                                                      */
/* ------------------------------------------------------------------ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const v = validate_(d);
    if (!v.ok) return json_({ ok: false, error: v.error });
    const sheet = sheet_();
    const email = v.email, ref = v.ref;
    const existing = findRow_(sheet, 4, email);
    if (existing) {                                  // same email registered before: update, do not duplicate or re-send
      sheet.getRange(existing, 6).setValue(v.lang);
      sheet.getRange(existing, 5).setValue(v.phone);
      return json_({ ok: true, duplicate: true });
    }
    sheet.appendRow([new Date(), ref, v.name, email, "'" + v.phone, v.lang, d.source || '', d.medium || '', d.campaign || '', d.content || '',
                     'yes', 'registered', '', '', '', '', '']);
    const row = sheet.getLastRow();
    const rec = { name: v.name, email: email, phone: v.phone, lang: v.lang, ref: ref };
    try {                                            // confirmation email
      sendEmail_(rec, 'confirm'); sheet.getRange(row, 13).setValue('sent ' + stamp_());
    } catch (err) { sheet.getRange(row, 13).setValue('ERROR ' + err); }
    if (CFG.WA_CLOUD.ENABLED) {                      // confirmation WhatsApp (optional)
      try { sendWa_(rec, 'confirm'); sheet.getRange(row, 14).setValue('sent ' + stamp_()); }
      catch (err) { sheet.getRange(row, 14).setValue('ERROR ' + err); }
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.unsub) {                                     // one-click unsubscribe from any email
    const sheet = sheet_(), row = findRow_(sheet, 2, p.unsub);
    if (row) sheet.getRange(row, 12).setValue('unsubscribed');
    return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:40px;text-align:center;color:#1E2B2B">' +
      '<h2 style="color:#035E5E">You have been unsubscribed · تم إلغاء الاشتراك</h2><p>You will not receive further messages from us.<br>لن تصلك رسائل أخرى منا.</p></body>');
  }
  return json_({ ok: true, service: 'reclaim-your-power', time: stamp_() });
}

/* ------------------------------------------------------------------ */
/*  Reminder engine: runs every 5 minutes (installed by setup())       */
/* ------------------------------------------------------------------ */
function tick() {
  const now = new Date(), start = Date.now();
  const sheet = sheet_(), sent = sentSheet_();
  SCHEDULE.forEach(function (it) {
    const at = new Date(it.at), lateH = it.late || CFG.LATE_WINDOW_HOURS;
    if (now < at || now > new Date(at.getTime() + lateH * 3600 * 1000)) return;
    if (it.needsWebinarUrl && !CFG.WEBINAR_URL) { Logger.log('Skipping %s: set CFG.WEBINAR_URL', it.id); return; }
    const done = {};
    sent.getDataRange().getValues().forEach(function (r) { if (r[0] === it.id) done[r[1] + '|' + r[2]] = true; });   // key: channel|ref (errors are logged as email-error and not retried)
    const rows = sheet.getDataRange().getValues().slice(1);
    for (var i = 0; i < rows.length; i++) {
      if (Date.now() - start > 4.5 * 60 * 1000) return;               // stay inside the 6-minute Apps Script limit; next tick continues
      const r = rows[i], rec = { name: r[2], email: r[3], phone: String(r[4]).replace(/^'/, ''), lang: r[5] === 'ar' ? 'ar' : 'en', ref: r[1] };
      if (!rec.email || r[11] === 'unsubscribed') continue;
      if (it.email !== false && !hasSent_(done, 'email', rec.ref)) {
        if (MailApp.getRemainingDailyQuota() < 1) { Logger.log('Daily email quota reached; resuming next tick'); return; }
        try { sendEmail_(rec, it.id); sent.appendRow([it.id, 'email', rec.ref, stamp_()]); } catch (err) { sent.appendRow([it.id, 'email-error', rec.ref, String(err)]); }
      }
      if (it.wa && CFG.WA_CLOUD.ENABLED && rec.phone && !hasSent_(done, 'wa', rec.ref)) {
        try { sendWa_(rec, it.id); sent.appendRow([it.id, 'wa', rec.ref, stamp_()]); } catch (err) { sent.appendRow([it.id, 'wa-error', rec.ref, String(err)]); }
      }
    }
  });
}
function hasSent_(done, channel, ref) { return !!done[channel + '|' + ref] || !!done[channel + '-error|' + ref]; }

/* ------------------------------------------------------------------ */
/*  Senders                                                            */
/* ------------------------------------------------------------------ */
function fill_(text, rec) {
  const wa = 'https://wa.me/' + CFG.SUPPORT_WA;
  const vars = { NAME: rec.name.split(' ')[0], WEBINAR_URL: CFG.WEBINAR_URL || '(link coming soon)', GROUP_URL: CFG.GROUP_URL, RETREAT_URL: CFG.RETREAT_URL,
                 APPLY_URL: CFG.RETREAT_URL + '#investment', DATE: rec.lang === 'ar' ? CFG.WEBINAR_DATE_AR : CFG.WEBINAR_DATE_EN,
                 TIME: rec.lang === 'ar' ? CFG.WEBINAR_TIME_AR : CFG.WEBINAR_TIME_EN, SUPPORT_URL: wa };
  return String(text).replace(/\{\{(\w+)\}\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
}
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function rich_(s) { return esc_(s).replace(/\*(.+?)\*/g, '<strong>$1</strong>').replace(/_(.+?)_/g, '<em>$1</em>').replace(/\n/g, '<br>')
                     .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#035E5E">$1</a>'); }

function html_(rec, m) {
  const rtl = rec.lang === 'ar', dir = rtl ? 'rtl' : 'ltr', al = rtl ? 'right' : 'left';
  const unsub = ScriptApp.getService().getUrl() + '?unsub=' + encodeURIComponent(rec.ref);
  const body = m.lines.map(function (l) {
    if (typeof l === 'object') {
      const url = fill_(l.url, rec); if (!url) return '';
      return '<p style="margin:22px 0"><a href="' + esc_(url) + '" style="background:#035E5E;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:99px;display:inline-block">' + esc_(l.btn) + '</a></p>';
    }
    return '<p style="margin:0 0 14px;line-height:1.7">' + rich_(fill_(l, rec)) + '</p>';
  }).join('');
  return '<!doctype html><html dir="' + dir + '"><body style="margin:0;background:#F1F2F2;padding:24px 12px">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;font-family:Tahoma,Arial,sans-serif;color:#1E2B2B;direction:' + dir + ';text-align:' + al + '">' +
    '<div style="background:#035E5E;color:#fff;padding:22px 28px;font-size:20px;font-weight:600">' + CFG.BRAND + '</div>' +
    '<div style="padding:28px 28px 8px;font-size:16px">' + body + '</div>' +
    '<div style="padding:16px 28px 26px;font-size:12px;color:#5E6B6A;border-top:1px solid #DCE1E0">' +
    (rtl ? 'وصلتك هذه الرسالة لأنك سجّلت في ويبينار استعد قوتك. <a href="' + unsub + '" style="color:#035E5E">إلغاء الاشتراك</a>'
         : 'You are receiving this because you registered for the Reclaim Your Power webinar. <a href="' + unsub + '" style="color:#035E5E">Unsubscribe</a>') +
    '</div></div></body></html>';
}

function sendEmail_(rec, id) {
  const m = MSG[id][rec.lang] || MSG[id].en;
  const plain = m.lines.map(function (l) { return typeof l === 'object' ? l.btn + ': ' + fill_(l.url, rec) : fill_(l, rec).replace(/[*_]/g, ''); }).join('\n\n');
  const opts = { name: CFG.FROM_NAME, htmlBody: html_(rec, m) };
  if (CFG.REPLY_TO) opts.replyTo = CFG.REPLY_TO;
  MailApp.sendEmail(rec.email, fill_(m.subject, rec), plain, opts);
}

// WhatsApp Cloud API: template messages (the only kind you can send first, outside the 24-hour window).
function sendWa_(rec, id) {
  const c = CFG.WA_CLOUD, token = PropertiesService.getScriptProperties().getProperty('WA_TOKEN');
  if (!c.PHONE_NUMBER_ID || !token) throw new Error('WhatsApp Cloud API not configured');
  const tpl = c.TEMPLATES[id]; if (!tpl) return;
  const first = rec.name.split(' ')[0];
  // Template variables: {{1}} = first name, {{2}} = webinar link, {{3}} = group link (confirm template only)
  const params = [first, CFG.WEBINAR_URL || CFG.RETREAT_URL];
  if (id === 'confirm') params.push(CFG.GROUP_URL || CFG.RETREAT_URL);
  const payload = { messaging_product: 'whatsapp', to: rec.phone.replace(/\D/g, ''), type: 'template',
    template: { name: tpl, language: { code: c.LANG[rec.lang] || 'en' },
      components: [{ type: 'body', parameters: params.map(function (t) { return { type: 'text', text: String(t) }; }) }] } };
  const res = UrlFetchApp.fetch('https://graph.facebook.com/' + c.API_VERSION + '/' + c.PHONE_NUMBER_ID + '/messages',
    { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) throw new Error(res.getContentText().slice(0, 300));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function validate_(d) {
  const name = String(d.name || '').trim().slice(0, 80);
  const email = String(d.email || '').trim().toLowerCase().slice(0, 120);
  if (!name) return { ok: false, error: 'name' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'email' };
  const phone = normPhone_(d.phone);
  if (!phone) return { ok: false, error: 'phone' };
  if (d.consent !== true) return { ok: false, error: 'consent' };
  const ref = String(d.ref || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || Utilities.getUuid().slice(0, 5).toUpperCase();
  return { ok: true, name: name, email: email, phone: phone, lang: d.lang === 'ar' ? 'ar' : 'en', ref: ref };
}
function normPhone_(p) {
  var s = String(p || '').replace(/[^\d+]/g, '');
  if (s.indexOf('00') === 0) s = '+' + s.slice(2);
  if (/^01\d{9}$/.test(s)) s = '+2' + s;                 // Egyptian local mobile 01xxxxxxxxx
  if (s[0] !== '+') s = '+' + s;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15 ? '+' + digits : '';
}
function stamp_() { return Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd HH:mm'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function findRow_(sheet, col, value) {
  const last = sheet.getLastRow(); if (last < 2) return 0;
  const vals = sheet.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]).toLowerCase() === String(value).toLowerCase()) return i + 2;
  return 0;
}
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.SHEET);
  if (!sh) { sh = ss.insertSheet(CFG.SHEET); sh.appendRow(HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#035E5E').setFontColor('#ffffff'); }
  return sh;
}
function sentSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CFG.SENT_SHEET);
  if (!sh) { sh = ss.insertSheet(CFG.SENT_SHEET); sh.appendRow(['Message', 'Channel', 'Ref', 'When']); sh.setFrozenRows(1); }
  return sh;
}

/* ------------------------------------------------------------------ */
/*  One-time setup. Run setup() once from the editor, then deploy.     */
/* ------------------------------------------------------------------ */
function setup() {
  sheet_(); sentSheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  Logger.log('Done. Sheet tabs created and the 5-minute reminder trigger installed.');
}
// Sends every message to YOU so you can proof them (run from the editor, check your inbox).
function sendTestToMe() {
  const me = Session.getActiveUser().getEmail();
  ['en', 'ar'].forEach(function (lang) {
    Object.keys(MSG).forEach(function (id) { sendEmail_({ name: 'Test Name', email: me, phone: '', lang: lang, ref: 'TEST1' }, id); });
  });
  Logger.log('Sent ' + Object.keys(MSG).length * 2 + ' test emails to ' + me);
}
