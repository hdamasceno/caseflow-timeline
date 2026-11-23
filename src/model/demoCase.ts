import type { CaseDef } from './case';

/**
 * Invented demo data. The case, the people and the organisation are fictional;
 * the dates are only chosen so the timeline shows every kind of item and status.
 */
export const DEMO_TODAY = '2026-05-04';

export const demoCase: CaseDef = {
  id: 'DEMO-1042',
  title: 'Case DEMO-1042 · Employment petition',
  subtitle: 'Fictional petitioner: Northwind Robotics (demo data)',
  phases: [
    { id: 'intake', label: 'Intake & eligibility review', start: '2025-11-03', end: '2025-12-13' },
    { id: 'evidence', label: 'Evidence collection', start: '2025-11-24', end: '2026-01-31' },
    { id: 'letters', label: 'Expert letters', start: '2025-12-15', end: '2026-01-24' },
    { id: 'drafting', label: 'Petition drafting', start: '2026-01-12', end: '2026-02-14' },
    { id: 'filed', label: 'Filed, awaiting receipt', start: '2026-02-17', end: '2026-03-03' },
    { id: 'review', label: 'Under agency review', start: '2026-03-02' },
    { id: 'rfe', label: 'Evidence request response', start: '2026-04-20', end: '2026-06-06' },
    { id: 'decision', label: 'Decision window', start: '2026-07-20', end: '2026-09-01' },
  ],
  milestones: [
    { id: 'engaged', label: 'Engagement signed', date: '2025-11-03' },
    { id: 'filed-on', label: 'Petition filed', date: '2026-02-17' },
    { id: 'receipt', label: 'Receipt notice', date: '2026-03-02' },
    { id: 'rfe-in', label: 'Evidence request received', date: '2026-04-20' },
  ],
  deadlines: [
    {
      id: 'evidence-index',
      label: 'Evidence index sent',
      anchor: 'engaged',
      rule: { kind: 'business-days', days: 15 },
      completedOn: '2025-11-24',
    },
    {
      id: 'fee-check',
      label: 'Fee receipt reconciled',
      anchor: 'filed-on',
      rule: { kind: 'business-days', days: 5 },
      completedOn: '2026-02-23',
    },
    {
      id: 'receipt-followup',
      label: 'Receipt follow-up',
      anchor: 'receipt',
      rule: { kind: 'business-days', days: 30 },
    },
    {
      id: 'client-docs',
      label: 'Client documents due',
      anchor: 'rfe-in',
      rule: { kind: 'calendar-days', days: 21, rollForward: true },
    },
    {
      id: 'draft-review',
      label: 'Internal draft review',
      anchor: 'rfe-in',
      rule: { kind: 'business-days', days: 30 },
    },
    {
      id: 'rfe-due',
      label: 'Response due to agency',
      anchor: 'rfe-in',
      rule: { kind: 'calendar-days', days: 87, rollForward: true },
    },
  ],
};
