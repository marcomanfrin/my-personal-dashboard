import type {
  CalendarEventInput,
  EmailInput,
  GanttTaskInput,
  IssueInput,
  ProjectInput,
  PullRequestInput,
  ReminderInput,
  Resource,
  TaskInput,
} from '@command/shared';

/**
 * The mock data of demo.html (section 3. MOCK) as agent input, with dates
 * relative to `now`. Used by `npm run db:seed` and by the integration tests.
 */
export function demoData(now = new Date()) {
  const MIN = 60_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const minutesAgo = (m: number) => iso(now.getTime() - m * MIN);
  const inMinutes = (m: number) => iso(now.getTime() + m * MIN);
  /** `offset` days from today at h:m local time. */
  const onDay = (offset: number, h = 0, m = 0) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const emails: EmailInput[] = [
    { externalId: 'm1', from: { name: 'Luca Bortolan', org: 'Sistec AM', address: 'l.bortolan@sistec.example' },
      subject: 'Line 3 HMI keeps losing the PLC connection',
      preview: "Since this morning's update the production HMI on line 3 drops the TCP session every few minutes. Operators are working without alarms.",
      body: "Hi Marco,\n\nsince this morning's update (build 5309.4.2) the production HMI on line 3 drops the TCP session with the PLC every 3 to 5 minutes. It reconnects on its own, but during the gap operators don't see alarms.\n\nLog from the panel attached. Can you take a look before the afternoon shift starts? If we need to roll back I have to tell the plant manager by 14:00.\n\nLuca",
      receivedAt: minutesAgo(12), category: 'urgent', priority: 'critical', attachments: ['hmi-line3-0922.log'], deadline: inMinutes(150), read: false, done: false },
    { externalId: 'm4', from: { name: 'Giulia Ferro', org: 'KUKA Italia', address: 'giulia.ferro@kuka.example' },
      subject: 'KR 10 integration: confirm TCP payload spec',
      preview: 'Attached the v3 interface spec. We need your confirmation on the frame layout and heartbeat interval before we lock the robot program.',
      body: "Ciao Marco,\n\nattached is v3 of the interface spec for the KR 10 R1100 cell. Two open points:\n\n1. Frame layout for the position feedback (we moved the status word to byte 0).\n2. Heartbeat interval: 100 ms or 250 ms?\n\nWe'd like to lock the robot program tomorrow, so a reply by midday would help.\n\nGiulia",
      receivedAt: minutesAgo(95), category: 'needs-reply', priority: 'high', attachments: ['KR10_interface_spec_v3.pdf'], deadline: onDay(1, 12, 0), read: false, done: false },
    { externalId: 'm2', from: { name: 'Epicode Institute', org: 'University', address: 'no-reply@epicode.example' },
      subject: 'Computer Vision project: submission closes Friday',
      preview: 'Upload the final report and repository link before Friday 23:59. Late submissions move to the next session.',
      body: 'Reminder: the Computer Vision project submission window closes on Friday at 23:59.\n\nUpload the final report (PDF) and the repository link from the course page. Late submissions move to the next exam session.',
      receivedAt: minutesAgo(64), category: 'needs-reply', priority: 'medium', attachments: [], deadline: onDay(3, 23, 59), read: true, done: false },
    { externalId: 'm5', from: { name: 'Davide Zanon', org: 'Sistec', address: 'd.zanon@sistec.example' },
      subject: 'Pellucida: Redis keyspace proposal',
      preview: "I wrote down a first keyspace layout for tag values and alarm state. Would like your view before Thursday's review.",
      body: "Hi Marco,\n\nI drafted a keyspace layout for Pellucida: one hash per device for tag values, streams for alarm history, pub/sub only for UI invalidation.\n\nCould you have a look before Thursday's architecture review? Mostly worried about TTLs on the alarm streams.\n\nDavide",
      receivedAt: minutesAgo(180), category: 'needs-reply', priority: 'medium', attachments: ['pellucida-keyspace.md'], read: false, done: false },
    { externalId: 'm3', from: { name: 'GitHub', org: 'sistec/hmi-5309', address: 'notifications@github.example' },
      subject: 'PR #248 requires your review',
      preview: 'dzanon requested your review on "MES order sync over OPC UA".',
      body: 'dzanon requested your review on sistec/hmi-5309#248 "MES order sync over OPC UA".',
      receivedAt: minutesAgo(125), category: 'fyi', priority: 'medium', attachments: [], read: true, done: false },
    { externalId: 'm6', from: { name: 'Sara Pavan', org: 'Sistec PMO', address: 's.pavan@sistec.example' },
      subject: 'Q4 Gantt baseline published',
      preview: 'The Q4 baseline is live. Your HMI 5309 and Pellucida tasks were re-planned, please check the new dates.',
      body: 'Hi all,\n\nthe Q4 baseline is published in the planning tool. HMI 5309 FAT moved one week later, Pellucida API architecture got two more days.\n\nSara',
      receivedAt: minutesAgo(300), category: 'fyi', priority: 'low', attachments: [], read: true, done: false },
    { externalId: 'm7', from: { name: 'Elena Rossi', org: 'Machine Learning course', address: 'e.rossi@epicode.example' },
      subject: 'Oral exam slots published',
      preview: 'Slots for the October session are online. Book yours by Monday.',
      body: 'Slots for the October oral exams are online on the course page. Book yours by Monday.',
      receivedAt: minutesAgo(60 * 20), category: 'fyi', priority: 'low', attachments: [], read: true, done: false },
    { externalId: 'm8', from: { name: 'Beckhoff Italia', org: 'Supplier', address: 'orders@beckhoff.example' },
      subject: 'Order 45021: panel PCs ship next week',
      preview: 'Waiting on the tracking number. Two CP6606 units confirmed for Monday dispatch.',
      body: 'Order 45021: two CP6606 panel PCs are confirmed for dispatch on Monday. Tracking number to follow.',
      receivedAt: minutesAgo(60 * 26), category: 'waiting', priority: 'normal', attachments: [], read: true, done: false },
    { externalId: 'm9', from: { name: 'Andrea Marin', org: 'Sistec Sales', address: 'a.marin@sistec.example' },
      subject: 'HMI 5310 offer sent to the client',
      preview: 'Offer is out. Waiting for their sign-off before we plan engineering hours.',
      body: 'The HMI 5310 offer is out. Waiting for the client to sign off before we plan engineering hours.',
      receivedAt: minutesAgo(60 * 48), category: 'waiting', priority: 'normal', attachments: ['Offer_HMI5310.pdf'], read: true, done: false },
    { externalId: 'm10', from: { name: 'Docker', org: 'Billing', address: 'billing@docker.example' },
      subject: 'Your Docker subscription renews in 14 days',
      preview: 'No action needed if your payment method is up to date.',
      body: 'Your Docker Pro subscription renews in 14 days. No action needed if your payment method is up to date.',
      receivedAt: minutesAgo(60 * 30), category: 'fyi', priority: 'low', attachments: [], read: true, done: false },
    { externalId: 'm11', from: { name: 'AWS', org: 'Billing', address: 'billing@aws.example' },
      subject: 'Your August invoice is available',
      preview: 'Invoice for account sistec-dev is ready to download.',
      body: 'The August invoice for account sistec-dev is ready.',
      receivedAt: minutesAgo(60 * 24 * 6), category: 'archived', priority: 'normal', attachments: [], read: true, done: true },
  ];

  const events: CalendarEventInput[] = [
    { externalId: 'e1', title: 'Team stand-up', start: onDay(0, 9, 0), end: onDay(0, 9, 15), category: 'meeting', videoLink: 'Teams', important: false, attendees: ['Automation team'] },
    { externalId: 'e2', title: 'Code review: Pellucida API', start: onDay(0, 10, 30), end: onDay(0, 11, 15), category: 'focus', location: 'Room Adige', important: false, attendees: ['Davide Zanon'] },
    { externalId: 'e3', title: 'Lunch', start: onDay(0, 13, 0), end: onDay(0, 14, 0), category: 'personal', important: false, attendees: [] },
    { externalId: 'e4', title: 'AI strategy meeting', start: onDay(0, 14, 30), end: onDay(0, 15, 30), category: 'meeting', location: 'Room Brenta', important: true, attendees: ['Sara Pavan', 'CTO office'], notes: 'Bring the AI tools evaluation matrix.' },
    { externalId: 'e5', title: 'HMI 5309 client call', start: onDay(0, 16, 0), end: onDay(0, 16, 30), category: 'meeting', videoLink: 'Teams', important: true, attendees: ['Luca Bortolan', 'Client plant manager'] },
    { externalId: 'e6', title: 'Study: neural networks', start: onDay(0, 18, 0), end: onDay(0, 19, 30), category: 'study', important: false, attendees: [], notes: 'Chapter 6, backprop exercises.' },
    { externalId: 'e7', title: 'Sprint planning, Atix', start: onDay(1, 9, 30), end: onDay(1, 10, 30), category: 'meeting', videoLink: 'Teams', important: false, attendees: ['Atix team'] },
    { externalId: 'e8', title: 'KUKA integration workshop', start: onDay(1, 15, 0), end: onDay(1, 17, 0), category: 'meeting', location: 'Sistec lab, line 3', important: true, attendees: ['Giulia Ferro', 'Robotics team'] },
    { externalId: 'e9', title: '1:1 with Sara', start: onDay(2, 11, 0), end: onDay(2, 11, 30), category: 'meeting', location: 'Room Piave', important: false, attendees: ['Sara Pavan'] },
    { externalId: 'e10', title: 'Pellucida architecture review', start: onDay(2, 15, 0), end: onDay(2, 16, 0), category: 'meeting', location: 'Room Adige', important: false, attendees: ['Davide Zanon', 'Federico Basso'] },
    { externalId: 'e11', title: 'CV project submission', start: onDay(3, 23, 0), end: onDay(3, 23, 59), category: 'deadline', important: true, attendees: [] },
    { externalId: 'e12', title: 'HMI 5309 FAT dry run', start: onDay(6, 8, 30), end: onDay(6, 17, 30), category: 'meeting', location: 'Sistec lab, line 3', important: true, attendees: ['Luca Bortolan'] },
  ];

  const pulls: PullRequestInput[] = [
    { externalId: 'p1', repo: 'sistec/hmi-5309', number: 248, title: 'MES order sync over OPC UA', author: 'dzanon', status: 'open',
      checks: { total: 14, passed: 14, failed: 0, pending: 0, failedNames: [] }, reviewRequested: true, involved: true, createdAt: minutesAgo(125), priority: 'high' },
    { externalId: 'p2', repo: 'sistec/pellucida', number: 91, title: 'Redis pub/sub for tag updates', author: 'fbasso', status: 'open',
      checks: { total: 18, passed: 16, failed: 2, pending: 0, failedNames: ['TagCacheTests', 'lint'] }, reviewRequested: true, involved: true, createdAt: minutesAgo(60 * 26), priority: 'medium' },
    { externalId: 'p3', repo: 'sistec/atix-backend', number: 57, title: 'SLA escalation for stale tickets', author: 'marco-v', status: 'blocked', blockedBy: '#55 schema migration',
      checks: { total: 9, passed: 5, failed: 0, pending: 4, failedNames: [] }, reviewRequested: false, involved: true, createdAt: minutesAgo(60 * 72), priority: 'medium' },
    { externalId: 'p4', repo: 'sistec/sistec-skills', number: 23, title: 'Add codesys-review skill', author: 'edallaval', status: 'open',
      checks: { total: 6, passed: 6, failed: 0, pending: 0, failedNames: [] }, reviewRequested: true, involved: true, createdAt: minutesAgo(60 * 50), priority: 'low' },
    { externalId: 'p5', repo: 'marco-v/cv-plant-disease', number: 12, title: 'ViT pipeline with mixup augmentation', author: 'marco-v', status: 'draft',
      checks: { total: 4, passed: 3, failed: 1, pending: 0, failedNames: ['pytest (3.11)'] }, reviewRequested: false, involved: true, createdAt: minutesAgo(300), priority: 'medium' },
    { externalId: 'p6', repo: 'sistec/hmi-5309', number: 251, title: 'Fix alarm banner layout on 1024x768 panels', author: 'fbasso', status: 'changes-requested',
      checks: { total: 14, passed: 14, failed: 0, pending: 0, failedNames: [] }, reviewRequested: false, involved: true, createdAt: minutesAgo(35), priority: 'low' },
  ];

  const issues: IssueInput[] = [
    { externalId: 'i1', kind: 'deploy', repo: 'sistec/hmi-5309', title: 'Production deploy failed: image push timed out', detail: 'Workflow deploy-prod #412 stopped at "push image" after 10 min. The line 3 hotfix is not live.', state: 'error', level: 'critical', createdAt: minutesAgo(40), acknowledged: false },
    { externalId: 'i2', kind: 'actions', repo: 'sistec/pellucida', title: 'build-and-test failed on main', detail: '3 tests failing in TagCacheTests after merge of #89.', state: 'error', level: 'high', createdAt: minutesAgo(25), acknowledged: false },
    { externalId: 'i3', kind: 'bug', repo: 'sistec/atix-backend', number: 142, title: 'NullPointerException when reassigning a closed ticket', detail: 'Assigned to you. Reported by support, 4 occurrences today.', state: 'error', level: 'medium', createdAt: minutesAgo(60 * 7), acknowledged: false },
    { externalId: 'i4', kind: 'issue', repo: 'sistec/hmi-5309', number: 310, title: 'Alarm banner overlaps footer on 1024x768 panels', detail: 'Assigned to you. Fix in progress in #251.', state: 'warning', level: 'low', createdAt: minutesAgo(60 * 30), acknowledged: false },
    { externalId: 'i5', kind: 'actions', repo: 'marco-v/cv-plant-disease', title: 'nightly-train waiting for runner', detail: 'Self-hosted runner gpu-01 has been offline for 9 hours.', state: 'blocked', level: 'medium', createdAt: minutesAgo(60 * 9), acknowledged: false },
    { externalId: 'i6', kind: 'security', repo: 'sistec/sistec-skills', title: '3 vulnerable dependencies', detail: 'Dependabot: 1 moderate, 2 low. Upgrade paths available.', state: 'warning', level: 'low', createdAt: minutesAgo(60 * 50), acknowledged: false },
  ];

  const reminders: ReminderInput[] = [
    { externalId: 'r1', title: 'Send project update to Sistec AM', due: onDay(0, 17, 0), hasTime: true, priority: 'high', category: 'Work', done: false },
    { externalId: 'r2', title: 'Review AI policy document', due: onDay(0, 23, 59), hasTime: false, priority: 'medium', category: 'Work', done: false },
    { externalId: 'r3', title: 'Submit August expense report', due: onDay(-1, 23, 59), hasTime: false, priority: 'medium', category: 'Work', done: false },
    { externalId: 'r4', title: 'Renew marco-v.dev domain', due: onDay(1, 23, 59), hasTime: false, priority: 'medium', category: 'Personal', done: false },
    { externalId: 'r5', title: 'Study neural networks, chapter 6', due: onDay(1, 23, 59), hasTime: false, priority: 'medium', category: 'University', done: false },
    { externalId: 'r6', title: 'Book car service', due: onDay(3, 23, 59), hasTime: false, priority: 'low', category: 'Personal', done: false },
    { externalId: 'r7', title: 'Update CODESYS license', due: onDay(-1, 23, 59), hasTime: false, priority: 'low', category: 'Work', done: true },
  ];

  const tasks: TaskInput[] = [
    { externalId: 't1', title: 'Implement API authentication', column: 'todo', position: 65536, board: 'Atix Backend', labels: ['backend'], due: onDay(2, 18), checklist: { done: 1, total: 5 } },
    { externalId: 't2', title: 'Update Pellucida documentation', column: 'todo', position: 131072, board: 'Pellucida', labels: ['docs'], checklist: { done: 0, total: 3 } },
    { externalId: 't3', title: 'Export alarm texts for translation', column: 'todo', position: 196608, board: 'HMI 5309', labels: ['hmi'], due: onDay(4, 18) },
    { externalId: 't4', title: 'HMI refactoring: alarm manager', column: 'doing', position: 65536, board: 'HMI 5309', labels: ['hmi'], due: onDay(1, 18), checklist: { done: 3, total: 6 } },
    { externalId: 't5', title: 'KUKA TCP client retry logic', column: 'doing', position: 131072, board: 'HMI 5309', labels: ['robotics'], checklist: { done: 2, total: 4 } },
    { externalId: 't6', title: 'AI dashboard prototype', column: 'review', position: 65536, board: 'AI Strategy', labels: ['ai'] },
    { externalId: 't7', title: 'sistec-skills marketplace README', column: 'review', position: 131072, board: 'Tooling', labels: ['docs'] },
    { externalId: 't8', title: 'Set up CI/CD for atix-backend', column: 'done', position: 65536, board: 'Atix Backend', labels: ['devops'] },
    { externalId: 't9', title: 'Docker Compose dev environment', column: 'done', position: 131072, board: 'Tooling', labels: ['devops'] },
  ];

  const projects: ProjectInput[] = [
    { externalId: 'hmi', key: 'HMI', name: 'HMI 5309', area: 'Sistec', owner: 'Luca Bortolan' },
    { externalId: 'pel', key: 'PEL', name: 'Pellucida', area: 'Sistec', owner: 'Davide Zanon' },
    { externalId: 'ai', key: 'AIS', name: 'AI Strategy', area: 'Sistec', owner: 'Sara Pavan' },
    { externalId: 'atix', key: 'ATX', name: 'Atix Backend', area: 'Sistec', owner: 'Marco' },
    { externalId: 'uni', key: 'UNI', name: 'University', area: 'Epicode', owner: 'Marco' },
  ];

  const gantt: GanttTaskInput[] = [
    { externalId: 'g1', projectKey: 'HMI', key: 'HMI-41', tags: [], title: 'PLC tag mapping', assignee: 'Marco', start: onDay(-20), end: onDay(-9), progress: 100, dependsOn: [] },
    { externalId: 'g2', projectKey: 'HMI', key: 'HMI-42', tags: ['Important'], title: 'MES integration', assignee: 'Marco', start: onDay(-5), end: onDay(6), deadline: onDay(6), progress: 70, dependsOn: ['HMI-41'] },
    { externalId: 'g3', projectKey: 'HMI', key: 'HMI-43', tags: ['Client'], title: 'FAT preparation', assignee: 'Marco', start: onDay(7), end: onDay(14), deadline: onDay(15), progress: 0, dependsOn: ['HMI-42'] },
    { externalId: 'gx1', projectKey: 'HMI', key: 'HMI-39', tags: [], title: 'Electrical panel wiring', assignee: 'Luca Bortolan', start: onDay(-10), end: onDay(4), progress: 60, dependsOn: [] },
    { externalId: 'g4', projectKey: 'AIS', key: 'AIS-4', tags: ['Star'], title: 'AI tools evaluation', assignee: 'Marco', start: onDay(-10), end: onDay(4), progress: 50, dependsOn: [] },
    { externalId: 'g5', projectKey: 'AIS', key: 'AIS-5', tags: [], title: 'AI usage policy draft', assignee: 'Marco', start: onDay(3), end: onDay(12), progress: 0, dependsOn: ['AIS-4'] },
    { externalId: 'g6', projectKey: 'PEL', key: 'PEL-17', tags: ['Star'], title: 'API architecture', assignee: 'Marco', start: onDay(-6), end: onDay(9), progress: 30, dependsOn: [] },
    { externalId: 'g7', projectKey: 'PEL', key: 'PEL-18', tags: [], title: 'Redis strategy PoC', assignee: 'Marco', start: onDay(5), end: onDay(18), progress: 0, dependsOn: ['PEL-17'] },
    { externalId: 'gx2', projectKey: 'PEL', key: 'PEL-15', tags: [], title: 'UI component library', assignee: 'Federico Basso', start: onDay(-3), end: onDay(12), progress: 20, dependsOn: [] },
    { externalId: 'g8', projectKey: 'ATX', key: 'ATX-57', tags: ['Important'], title: 'SLA escalation module', assignee: 'Marco', start: onDay(-9), end: onDay(-1), deadline: onDay(-1), progress: 60, dependsOn: [] },
    { externalId: 'g9', projectKey: 'UNI', key: 'UNI-9', tags: [], title: 'Spring Boot project', assignee: 'Marco', start: onDay(-15), end: onDay(3), deadline: onDay(3), progress: 80, dependsOn: [] },
    { externalId: 'g10', projectKey: 'UNI', key: 'UNI-10', tags: ['Star'], title: 'CV project final report', assignee: 'Marco', start: onDay(-8), end: onDay(3), deadline: onDay(3), progress: 60, dependsOn: [] },
  ];

  return { emails, events, pulls, issues, reminders, tasks, projects, gantt } satisfies Record<Resource, unknown[]>;
}
