/* ============================================================
   content.js — Static copy & reference data.
   Kept separate so wording (the part that matters most in a mental-
   health app) can be reviewed and localised without touching logic.
   ============================================================ */

// Starter emotions. Users can add their own; custom ones persist per record.
export const EMOTIONS = [
  'Anxious', 'Sad', 'Angry', 'Guilty', 'Ashamed',
  'Frustrated', 'Afraid', 'Hurt', 'Lonely', 'Overwhelmed', 'Embarrassed', 'Hopeless'
];

// Cognitive distortions, phrased warmly as "thinking traps".
export const TRAPS = [
  { key: 'all-or-nothing', name: 'All-or-nothing', desc: 'Seeing things as black or white, with no middle ground.' },
  { key: 'catastrophising', name: 'Catastrophising', desc: 'Jumping to the worst possible outcome.' },
  { key: 'mind-reading', name: 'Mind reading', desc: 'Assuming you know what others are thinking.' },
  { key: 'fortune-telling', name: 'Fortune telling', desc: 'Predicting the future will go badly, as if it’s certain.' },
  { key: 'emotional-reasoning', name: 'Emotional reasoning', desc: '“I feel it, so it must be true.”' },
  { key: 'overgeneralising', name: 'Overgeneralising', desc: 'Treating one event as a never-ending pattern.' },
  { key: 'labelling', name: 'Labelling', desc: 'Attaching a harsh label to yourself or others.' },
  { key: 'shoulds', name: 'Should / must', desc: 'Rigid rules about how you or others ought to be.' },
  { key: 'discounting-positives', name: 'Discounting the positive', desc: 'Brushing off good things as if they don’t count.' },
  { key: 'personalising', name: 'Personalising', desc: 'Taking the blame for things outside your control.' }
];

export const TRAP_BY_KEY = Object.fromEntries(TRAPS.map((t) => [t.key, t]));

// First-run onboarding slides.
export const ONBOARDING = [
  {
    title: 'Notice the thought',
    body: 'When a moment leaves you upset, Unspiral walks you through it gently — one step at a time.',
    art: 'bubble'
  },
  {
    title: 'Weigh it fairly',
    body: 'Look at the evidence for and against, then find a more balanced way to see the situation.',
    art: 'scales'
  },
  {
    title: 'Yours alone',
    body: 'Every entry stays on this device. No account, no cloud, no tracking. You can lock the app with a PIN.',
    art: 'lock'
  }
];

// Shown on home, settings, and onboarding. This is not therapy.
export const DISCLAIMER =
  'Unspiral is a self-help tool, not a substitute for professional care. ' +
  'If you’re struggling, please reach out to a qualified professional or a crisis line.';

// Crisis resources. Defaults to widely-reachable lines; a region note keeps
// it honest that the user should use their local service.
export const CRISIS = {
  intro:
    'If you’re thinking about harming yourself or are in crisis, you’re not alone and help is available right now. ' +
    'If you’re in immediate danger, call your local emergency number.',
  lines: [
    { region: 'US', name: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988', action: 'tel:988' },
    { region: 'US/Canada', name: 'Crisis Text Line', detail: 'Text HOME to 741741', action: 'sms:741741' },
    { region: 'UK & ROI', name: 'Samaritans', detail: 'Call 116 123', action: 'tel:116123' },
    { region: 'International', name: 'Find a helpline', detail: 'findahelpline.com', action: 'https://findahelpline.com' }
  ],
  grounding:
    'Try this while you wait: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.'
};

// Per-step guidance for the 7-column wizard.
export const STEPS = [
  {
    key: 'situation', title: 'What happened?',
    help: 'Describe the moment that set off the feeling — who, what, where, when. Just the facts, like a camera would see it.'
  },
  {
    key: 'moods', title: 'What did you feel?',
    help: 'Pick the emotions you noticed and rate how strong each one was.'
  },
  {
    key: 'thoughts', title: 'What went through your mind?',
    help: 'Write the thoughts or images that showed up. Then choose the one with the most charge — your “hot thought”.'
  },
  {
    key: 'evidenceFor', title: 'Evidence for the thought', optional: true,
    help: 'What facts seem to support the hot thought? Stick to what actually happened, not feelings or guesses.'
  },
  {
    key: 'evidenceAgainst', title: 'Evidence against the thought',
    help: 'What facts don’t fit the hot thought? What might you tell a friend who had it? Any other explanation?'
  },
  {
    key: 'balanced', title: 'A more balanced thought',
    help: 'Holding both sides together, what’s a fairer, more realistic way to see this? How much do you believe it?'
  },
  {
    key: 'rerate', title: 'How do you feel now?',
    help: 'Re-rate those same emotions, and note any small next step you’d like to take.'
  }
];

/* ============================================================
   Learn — plain-language explainer for people new to CBT.
   ============================================================ */
export const LEARN = {
  what: {
    title: 'What is CBT?',
    body:
      'Cognitive Behavioural Therapy (CBT) is one of the most studied forms of talk therapy. ' +
      'Its core idea is simple: it isn’t events themselves that upset us, but the thoughts we have about them. ' +
      'Those thoughts are often automatic, exaggerated, or unfair — and when we slow down and examine them, ' +
      'the feeling usually softens.'
  },
  record: {
    title: 'What is a thought record?',
    body:
      'A thought record is the classic CBT worksheet for doing exactly that. You take one upsetting moment and walk ' +
      'through it in seven short steps — noticing the situation, the feelings, the automatic thought, the evidence ' +
      'on both sides, and finally a more balanced way of seeing it. Doing this regularly gradually trains a fairer, ' +
      'calmer inner voice. That’s the whole app.'
  },
  // The 7 columns, named plainly.
  columns: [
    'The situation — what actually happened',
    'Your moods — and how strong they were',
    'Automatic thoughts — and the “hot” one driving the feeling',
    'Evidence that supports the hot thought',
    'Evidence that doesn’t fit it',
    'A more balanced, realistic thought',
    'How you feel now — re-rated'
  ]
};

/* The most substantial evidence for CBT and cognitive restructuring.
   Curated to a few high-impact, citable sources. */
export const RESEARCH = [
  {
    cite: 'Hofmann et al. (2012)',
    title: 'The Efficacy of CBT: A Review of Meta-analyses',
    note: 'A review of 269 meta-analyses — the strongest single summary of CBT’s evidence base across anxiety and depression.',
    url: 'https://doi.org/10.1007/s10608-012-9476-1'
  },
  {
    cite: 'Cuijpers et al. (2016)',
    title: 'How effective are cognitive behaviour therapies for major depression and anxiety disorders?',
    note: 'A meta-analytic update in World Psychiatry confirming robust effects for CBT.',
    url: 'https://doi.org/10.1002/wps.20346'
  },
  {
    cite: 'Greenberger & Padesky (2015)',
    title: 'Mind Over Mood (2nd ed.)',
    note: 'The clinical gold-standard guide that standardised the 7-column thought record this app is based on.',
    url: 'https://www.guilford.com/books/Mind-Over-Mood/Greenberger-Padesky/9781462520428'
  },
  {
    cite: 'Lattie et al. (2019)',
    title: 'Digital Mental Health Interventions for Depression, Anxiety, and Beyond',
    note: 'Evidence that self-guided, app-based cognitive tools meaningfully reduce symptoms.',
    url: 'https://doi.org/10.1007/s11920-019-0994-x'
  }
];
