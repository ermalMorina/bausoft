/**
 * Construction Workforce & Site Management GraphQL module.
 *
 * Exposes typeDefs (extending the root Query/Mutation) and resolvers that are
 * merged into the main schema in schema.ts.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toISO = (v: any) => (v instanceof Date ? v.toISOString() : v);

/** Build a resolver map that serializes the given Date fields as ISO strings. */
function dateFields(...fields: string[]) {
  const map: Record<string, (parent: any) => any> = {};
  for (const f of fields) map[f] = (parent: any) => toISO(parent[f]);
  return map;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Haversine distance in meters between two lat/lng points. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function audit(prisma: any, actor_id: number | null, action: string, entity?: string) {
  try {
    await prisma.auditLog.create({ data: { actor_id: actor_id ?? undefined, action, entity } });
  } catch {
    /* auditing should never break a mutation */
  }
}

async function notify(prisma: any, user_id: number, type: string, body: string) {
  try {
    await prisma.notification.create({ data: { user_id, type, body } });
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Type definitions (extend the root schema)
// ---------------------------------------------------------------------------

export const workforceTypeDefs = /* GraphQL */ `
  extend type User {
    role: String!
    phone: String
    position: String
    skills: String
    avatar_url: String
    employee_code: String
    employment_status: String!
    date_joined: String!
    emergency_contact: String
    current_site_id: Int
    current_team_id: Int
    current_site: Site
    current_team: Team
    assignments: [Assignment!]!
  }

  type Site {
    id: Int!
    name: String!
    address: String
    latitude: Float
    longitude: Float
    radius_m: Int!
    client_name: String
    project_name: String
    description: String
    start_date: String
    expected_completion: String
    status: String!
    project_manager_id: Int
    created_at: String!
    project_manager: User
    teams: [Team!]!
    current_members: [User!]!
    tasks: [Task!]!
    issues: [Issue!]!
    notes: [Note!]!
    announcements: [Announcement!]!
  }

  type Team {
    id: Int!
    name: String!
    status: String!
    site_id: Int
    leader_id: Int
    created_at: String!
    site: Site
    leader: User
    members: [User!]!
  }

  type Assignment {
    id: Int!
    employee_id: Int!
    site_id: Int!
    team_id: Int
    start_date: String!
    end_date: String
    created_at: String!
    employee: User
    site: Site
    team: Team
  }

  type Task {
    id: Int!
    site_id: Int!
    team_id: Int
    assignee_id: Int
    title: String!
    description: String
    priority: String!
    date: String!
    expected_start: String
    expected_end: String
    status: String!
    notes: String
    created_at: String!
    site: Site
    team: Team
    assignee: User
  }

  type DailyReport {
    id: Int!
    site_id: Int!
    team_id: Int
    employee_id: Int!
    date: String!
    completed: String
    in_progress: String
    planned_next: String
    notes: String
    issues: String
    materials: String
    photos: String
    check_in_time: String
    check_out_time: String
    created_at: String!
    site: Site
    team: Team
    employee: User
  }

  type Attendance {
    id: Int!
    employee_id: Int!
    site_id: Int!
    team_id: Int
    check_in: String!
    check_out: String
    check_in_lat: Float
    check_in_lng: Float
    check_out_lat: Float
    check_out_lng: Float
    within_geofence: Boolean!
    status: String!
    hours: Float
    created_at: String!
    employee: User
    site: Site
    team: Team
  }

  type Activity {
    id: Int!
    employee_id: Int!
    site_id: Int
    state: String!
    description: String
    created_at: String!
    employee: User
    site: Site
  }

  type Issue {
    id: Int!
    site_id: Int!
    reported_by_id: Int!
    assigned_to_id: Int
    title: String!
    description: String
    priority: String!
    status: String!
    photos: String
    created_at: String!
    site: Site
    reported_by: User
    assigned_to: User
  }

  type Note {
    id: Int!
    author_id: Int!
    site_id: Int
    task_id: Int
    team_id: Int
    employee_id: Int
    body: String!
    priority: String!
    photos: String
    created_at: String!
    author: User
    site: Site
    team: Team
  }

  type ChatMessage {
    id: Int!
    team_id: Int
    site_id: Int
    sender_id: Int!
    body: String!
    created_at: String!
    sender: User
  }

  type Announcement {
    id: Int!
    site_id: Int!
    author_id: Int!
    body: String!
    created_at: String!
    site: Site
    author: User
  }

  type Notification {
    id: Int!
    user_id: Int!
    type: String!
    body: String!
    read: Boolean!
    created_at: String!
  }

  type AuditLog {
    id: Int!
    actor_id: Int
    action: String!
    entity: String
    created_at: String!
    actor: User
  }

  type TimelineEvent {
    time: String!
    label: String!
    kind: String!
  }

  type WorkforceOverview {
    active_projects: Int!
    active_sites: Int!
    employees_working: Int!
    employees_absent: Int!
    teams_active: Int!
    open_issues: Int!
    sites: [Site!]!
  }

  type SiteDashboard {
    site: Site!
    workers_total: Int!
    currently_working: Int!
    checked_out: Int!
    absent: Int!
    progress: Int!
    open_issues: Int!
    todays_tasks: Int!
  }

  type WorkerHome {
    employee: User!
    site: Site
    team: Team
    checked_in: Boolean!
    attendance: Attendance
    current_activity: Activity
    todays_tasks: [Task!]!
    announcements: [Announcement!]!
  }

  input SiteInput {
    name: String!
    address: String
    latitude: Float
    longitude: Float
    radius_m: Int
    client_name: String
    project_name: String
    description: String
    start_date: String
    expected_completion: String
    status: String
    project_manager_id: Int
  }

  input SiteUpdateInput {
    name: String
    address: String
    latitude: Float
    longitude: Float
    radius_m: Int
    client_name: String
    project_name: String
    description: String
    start_date: String
    expected_completion: String
    status: String
    project_manager_id: Int
  }

  input EmployeeInput {
    name: String!
    email: String!
    password: String
    role: String
    phone: String
    position: String
    skills: String
    avatar_url: String
    employee_code: String
    employment_status: String
    emergency_contact: String
  }

  input EmployeeUpdateInput {
    name: String
    email: String
    role: String
    phone: String
    position: String
    skills: String
    avatar_url: String
    employee_code: String
    employment_status: String
    emergency_contact: String
  }

  input TeamInput {
    name: String!
    leader_id: Int
    site_id: Int
    status: String
  }

  input TaskInput {
    site_id: Int!
    team_id: Int
    assignee_id: Int
    title: String!
    description: String
    priority: String
    date: String
    expected_start: String
    expected_end: String
    status: String
    notes: String
  }

  input DailyReportInput {
    site_id: Int!
    team_id: Int
    employee_id: Int!
    completed: String
    in_progress: String
    planned_next: String
    notes: String
    issues: String
    materials: String
    photos: String
    check_in_time: String
    check_out_time: String
  }

  input IssueInput {
    site_id: Int!
    reported_by_id: Int!
    assigned_to_id: Int
    title: String!
    description: String
    priority: String
    photos: String
  }

  input NoteInput {
    author_id: Int!
    site_id: Int
    task_id: Int
    team_id: Int
    employee_id: Int
    body: String!
    priority: String
    photos: String
  }

  extend type Query {
    sites(status: String): [Site!]!
    site(id: Int!): Site
    teams(siteId: Int): [Team!]!
    team(id: Int!): Team
    employees(role: String, siteId: Int, teamId: Int, status: String): [User!]!
    employee(id: Int!): User
    assignments(employeeId: Int, siteId: Int): [Assignment!]!
    tasks(siteId: Int, teamId: Int, assigneeId: Int, today: Boolean): [Task!]!
    task(id: Int!): Task
    dailyReports(siteId: Int, employeeId: Int): [DailyReport!]!
    attendance(siteId: Int, employeeId: Int, today: Boolean, status: String): [Attendance!]!
    currentActivity(employeeId: Int!): Activity
    issues(siteId: Int, status: String): [Issue!]!
    issue(id: Int!): Issue
    notes(siteId: Int, taskId: Int, teamId: Int, employeeId: Int): [Note!]!
    chatMessages(teamId: Int, siteId: Int): [ChatMessage!]!
    announcements(siteId: Int!): [Announcement!]!
    notifications(userId: Int!, unreadOnly: Boolean): [Notification!]!
    auditLogs(limit: Int): [AuditLog!]!
    workforceOverview: WorkforceOverview!
    siteDashboard(siteId: Int!): SiteDashboard!
    workerHome(employeeId: Int!): WorkerHome!
    workerTimeline(employeeId: Int!): [TimelineEvent!]!
    siteTimeline(siteId: Int!): [TimelineEvent!]!
  }

  extend type Mutation {
    createSite(input: SiteInput!): Site!
    updateSite(id: Int!, input: SiteUpdateInput!): Site!
    createEmployee(input: EmployeeInput!): User!
    updateEmployee(id: Int!, input: EmployeeUpdateInput!): User!
    createTeam(input: TeamInput!): Team!
    updateTeam(id: Int!, input: TeamInput!): Team!
    assignEmployee(employeeId: Int!, siteId: Int!, teamId: Int): Assignment!
    createTask(input: TaskInput!): Task!
    updateTaskStatus(id: Int!, status: String!): Task!
    submitDailyReport(input: DailyReportInput!): DailyReport!
    checkIn(employeeId: Int!, siteId: Int!, lat: Float, lng: Float): Attendance!
    checkOut(employeeId: Int!, lat: Float, lng: Float): Attendance!
    setActivity(employeeId: Int!, state: String!, description: String, siteId: Int): Activity!
    createIssue(input: IssueInput!): Issue!
    updateIssue(id: Int!, status: String, assignedToId: Int): Issue!
    createNote(input: NoteInput!): Note!
    sendMessage(senderId: Int!, teamId: Int, siteId: Int, body: String!): ChatMessage!
    createAnnouncement(siteId: Int!, authorId: Int!, body: String!): Announcement!
    markNotificationRead(id: Int!): Notification!
  }
`;

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

const userInclude = { current_site: true, current_team: true };

export const workforceResolvers = {
  User: {
    ...dateFields('date_joined'),
    assignments: (p: any, _a: any, { prisma }: any) =>
      prisma.assignment.findMany({ where: { employee_id: p.id }, orderBy: { start_date: 'desc' } }),
    current_site: (p: any, _a: any, { prisma }: any) =>
      p.current_site ?? (p.current_site_id ? prisma.site.findUnique({ where: { id: p.current_site_id } }) : null),
    current_team: (p: any, _a: any, { prisma }: any) =>
      p.current_team ?? (p.current_team_id ? prisma.team.findUnique({ where: { id: p.current_team_id } }) : null),
  },
  Site: {
    ...dateFields('start_date', 'expected_completion', 'created_at'),
    project_manager: (p: any, _a: any, { prisma }: any) =>
      p.project_manager_id ? prisma.user.findUnique({ where: { id: p.project_manager_id } }) : null,
    teams: (p: any, _a: any, { prisma }: any) => prisma.team.findMany({ where: { site_id: p.id } }),
    current_members: (p: any, _a: any, { prisma }: any) =>
      prisma.user.findMany({ where: { current_site_id: p.id } }),
    tasks: (p: any, _a: any, { prisma }: any) => prisma.task.findMany({ where: { site_id: p.id } }),
    issues: (p: any, _a: any, { prisma }: any) => prisma.issue.findMany({ where: { site_id: p.id } }),
    notes: (p: any, _a: any, { prisma }: any) => prisma.note.findMany({ where: { site_id: p.id } }),
    announcements: (p: any, _a: any, { prisma }: any) =>
      prisma.announcement.findMany({ where: { site_id: p.id }, orderBy: { created_at: 'desc' } }),
  },
  Team: {
    ...dateFields('created_at'),
    site: (p: any, _a: any, { prisma }: any) => (p.site_id ? prisma.site.findUnique({ where: { id: p.site_id } }) : null),
    leader: (p: any, _a: any, { prisma }: any) =>
      p.leader_id ? prisma.user.findUnique({ where: { id: p.leader_id } }) : null,
    members: (p: any, _a: any, { prisma }: any) => prisma.user.findMany({ where: { current_team_id: p.id } }),
  },
  Assignment: {
    ...dateFields('start_date', 'end_date', 'created_at'),
    employee: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.employee_id } }),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    team: (p: any, _a: any, { prisma }: any) => (p.team_id ? prisma.team.findUnique({ where: { id: p.team_id } }) : null),
  },
  Task: {
    ...dateFields('date', 'created_at'),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    team: (p: any, _a: any, { prisma }: any) => (p.team_id ? prisma.team.findUnique({ where: { id: p.team_id } }) : null),
    assignee: (p: any, _a: any, { prisma }: any) =>
      p.assignee_id ? prisma.user.findUnique({ where: { id: p.assignee_id } }) : null,
  },
  DailyReport: {
    ...dateFields('date', 'created_at'),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    team: (p: any, _a: any, { prisma }: any) => (p.team_id ? prisma.team.findUnique({ where: { id: p.team_id } }) : null),
    employee: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.employee_id } }),
  },
  Attendance: {
    ...dateFields('check_in', 'check_out', 'created_at'),
    hours: (p: any) => {
      if (!p.check_out) return null;
      const ms = new Date(p.check_out).getTime() - new Date(p.check_in).getTime();
      return Math.round((ms / 3600000) * 100) / 100;
    },
    employee: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.employee_id } }),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    team: (p: any, _a: any, { prisma }: any) => (p.team_id ? prisma.team.findUnique({ where: { id: p.team_id } }) : null),
  },
  Activity: {
    ...dateFields('created_at'),
    employee: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.employee_id } }),
    site: (p: any, _a: any, { prisma }: any) => (p.site_id ? prisma.site.findUnique({ where: { id: p.site_id } }) : null),
  },
  Issue: {
    ...dateFields('created_at'),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    reported_by: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.reported_by_id } }),
    assigned_to: (p: any, _a: any, { prisma }: any) =>
      p.assigned_to_id ? prisma.user.findUnique({ where: { id: p.assigned_to_id } }) : null,
  },
  Note: {
    ...dateFields('created_at'),
    author: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.author_id } }),
    site: (p: any, _a: any, { prisma }: any) => (p.site_id ? prisma.site.findUnique({ where: { id: p.site_id } }) : null),
    team: (p: any, _a: any, { prisma }: any) => (p.team_id ? prisma.team.findUnique({ where: { id: p.team_id } }) : null),
  },
  ChatMessage: {
    ...dateFields('created_at'),
    sender: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.sender_id } }),
  },
  Announcement: {
    ...dateFields('created_at'),
    site: (p: any, _a: any, { prisma }: any) => prisma.site.findUnique({ where: { id: p.site_id } }),
    author: (p: any, _a: any, { prisma }: any) => prisma.user.findUnique({ where: { id: p.author_id } }),
  },
  Notification: { ...dateFields('created_at') },
  AuditLog: {
    ...dateFields('created_at'),
    actor: (p: any, _a: any, { prisma }: any) =>
      p.actor_id ? prisma.user.findUnique({ where: { id: p.actor_id } }) : null,
  },

  Query: {
    sites: (_: any, { status }: any, { prisma }: any) =>
      prisma.site.findMany({ where: status ? { status } : {}, orderBy: { id: 'asc' } }),
    site: (_: any, { id }: any, { prisma }: any) => prisma.site.findUnique({ where: { id } }),
    teams: (_: any, { siteId }: any, { prisma }: any) =>
      prisma.team.findMany({ where: siteId ? { site_id: siteId } : {}, orderBy: { id: 'asc' } }),
    team: (_: any, { id }: any, { prisma }: any) => prisma.team.findUnique({ where: { id } }),
    employees: (_: any, { role, siteId, teamId, status }: any, { prisma }: any) => {
      const where: any = {};
      if (role) where.role = role;
      if (siteId) where.current_site_id = siteId;
      if (teamId) where.current_team_id = teamId;
      if (status) where.employment_status = status;
      return prisma.user.findMany({ where, include: userInclude, orderBy: { name: 'asc' } });
    },
    employee: (_: any, { id }: any, { prisma }: any) =>
      prisma.user.findUnique({ where: { id }, include: userInclude }),
    assignments: (_: any, { employeeId, siteId }: any, { prisma }: any) => {
      const where: any = {};
      if (employeeId) where.employee_id = employeeId;
      if (siteId) where.site_id = siteId;
      return prisma.assignment.findMany({ where, orderBy: { start_date: 'desc' } });
    },
    tasks: (_: any, { siteId, teamId, assigneeId, today }: any, { prisma }: any) => {
      const where: any = {};
      if (siteId) where.site_id = siteId;
      if (teamId) where.team_id = teamId;
      if (assigneeId) where.assignee_id = assigneeId;
      if (today) where.date = { gte: startOfDay(), lte: endOfDay() };
      return prisma.task.findMany({ where, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
    },
    task: (_: any, { id }: any, { prisma }: any) => prisma.task.findUnique({ where: { id } }),
    dailyReports: (_: any, { siteId, employeeId }: any, { prisma }: any) => {
      const where: any = {};
      if (siteId) where.site_id = siteId;
      if (employeeId) where.employee_id = employeeId;
      return prisma.dailyReport.findMany({ where, orderBy: { created_at: 'desc' } });
    },
    attendance: (_: any, { siteId, employeeId, today, status }: any, { prisma }: any) => {
      const where: any = {};
      if (siteId) where.site_id = siteId;
      if (employeeId) where.employee_id = employeeId;
      if (status) where.status = status;
      if (today) where.check_in = { gte: startOfDay(), lte: endOfDay() };
      return prisma.attendance.findMany({ where, orderBy: { check_in: 'desc' } });
    },
    currentActivity: (_: any, { employeeId }: any, { prisma }: any) =>
      prisma.activity.findFirst({ where: { employee_id: employeeId }, orderBy: { created_at: 'desc' } }),
    issues: (_: any, { siteId, status }: any, { prisma }: any) => {
      const where: any = {};
      if (siteId) where.site_id = siteId;
      if (status) where.status = status;
      return prisma.issue.findMany({ where, orderBy: { created_at: 'desc' } });
    },
    issue: (_: any, { id }: any, { prisma }: any) => prisma.issue.findUnique({ where: { id } }),
    notes: (_: any, { siteId, taskId, teamId, employeeId }: any, { prisma }: any) => {
      const where: any = {};
      if (siteId) where.site_id = siteId;
      if (taskId) where.task_id = taskId;
      if (teamId) where.team_id = teamId;
      if (employeeId) where.employee_id = employeeId;
      return prisma.note.findMany({ where, orderBy: { created_at: 'desc' } });
    },
    chatMessages: (_: any, { teamId, siteId }: any, { prisma }: any) => {
      const where: any = {};
      if (teamId) where.team_id = teamId;
      if (siteId) where.site_id = siteId;
      return prisma.chatMessage.findMany({ where, orderBy: { created_at: 'asc' } });
    },
    announcements: (_: any, { siteId }: any, { prisma }: any) =>
      prisma.announcement.findMany({ where: { site_id: siteId }, orderBy: { created_at: 'desc' } }),
    notifications: (_: any, { userId, unreadOnly }: any, { prisma }: any) =>
      prisma.notification.findMany({
        where: { user_id: userId, ...(unreadOnly ? { read: false } : {}) },
        orderBy: { created_at: 'desc' },
      }),
    auditLogs: (_: any, { limit }: any, { prisma }: any) =>
      prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: limit ?? 50 }),

    workforceOverview: async (_: any, __: any, { prisma }: any) => {
      const [activeSites, teamsActive, openIssues] = await Promise.all([
        prisma.site.findMany({ where: { status: 'ACTIVE' } }),
        prisma.team.count({ where: { status: 'ACTIVE' } }),
        prisma.issue.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      ]);
      const working = await prisma.attendance.findMany({
        where: { check_out: null, check_in: { gte: startOfDay(), lte: endOfDay() } },
        select: { employee_id: true },
      });
      const workingIds = new Set(working.map((w: any) => w.employee_id));
      const workers = await prisma.user.count({
        where: { role: 'WORKER', employment_status: 'ACTIVE' },
      });
      const projects = new Set(
        activeSites.map((s: any) => s.project_name || s.name).filter(Boolean)
      );
      return {
        active_projects: projects.size,
        active_sites: activeSites.length,
        employees_working: workingIds.size,
        employees_absent: Math.max(workers - workingIds.size, 0),
        teams_active: teamsActive,
        open_issues: openIssues,
        sites: await prisma.site.findMany({ orderBy: { id: 'asc' } }),
      };
    },

    siteDashboard: async (_: any, { siteId }: any, { prisma }: any) => {
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) throw new Error(`Site ${siteId} not found`);
      const [workersTotal, todaysAttendance, openIssues, todaysTasks] = await Promise.all([
        prisma.user.count({ where: { current_site_id: siteId } }),
        prisma.attendance.findMany({
          where: { site_id: siteId, check_in: { gte: startOfDay(), lte: endOfDay() } },
        }),
        prisma.issue.count({ where: { site_id: siteId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
        prisma.task.findMany({ where: { site_id: siteId, date: { gte: startOfDay(), lte: endOfDay() } } }),
      ]);
      const currentlyWorking = todaysAttendance.filter((a: any) => !a.check_out).length;
      const checkedOut = todaysAttendance.filter((a: any) => a.check_out).length;
      const present = new Set(todaysAttendance.map((a: any) => a.employee_id)).size;
      const completed = todaysTasks.filter((t: any) => t.status === 'COMPLETED').length;
      const progress = todaysTasks.length ? Math.round((completed / todaysTasks.length) * 100) : 0;
      return {
        site,
        workers_total: workersTotal,
        currently_working: currentlyWorking,
        checked_out: checkedOut,
        absent: Math.max(workersTotal - present, 0),
        progress,
        open_issues: openIssues,
        todays_tasks: todaysTasks.length,
      };
    },

    workerHome: async (_: any, { employeeId }: any, { prisma }: any) => {
      const employee = await prisma.user.findUnique({ where: { id: employeeId } });
      if (!employee) throw new Error(`Employee ${employeeId} not found`);
      const site = employee.current_site_id
        ? await prisma.site.findUnique({ where: { id: employee.current_site_id } })
        : null;
      const team = employee.current_team_id
        ? await prisma.team.findUnique({ where: { id: employee.current_team_id } })
        : null;
      const attendance = await prisma.attendance.findFirst({
        where: { employee_id: employeeId, check_out: null, check_in: { gte: startOfDay(), lte: endOfDay() } },
        orderBy: { check_in: 'desc' },
      });
      const current_activity = await prisma.activity.findFirst({
        where: { employee_id: employeeId },
        orderBy: { created_at: 'desc' },
      });
      const todays_tasks = await prisma.task.findMany({
        where: { assignee_id: employeeId, date: { gte: startOfDay(), lte: endOfDay() } },
        orderBy: [{ expected_start: 'asc' }, { id: 'asc' }],
      });
      const announcements = site
        ? await prisma.announcement.findMany({ where: { site_id: site.id }, orderBy: { created_at: 'desc' }, take: 5 })
        : [];
      return { employee, site, team, checked_in: !!attendance, attendance, current_activity, todays_tasks, announcements };
    },

    workerTimeline: async (_: any, { employeeId }: any, { prisma }: any) => {
      const [att, acts, reports] = await Promise.all([
        prisma.attendance.findMany({ where: { employee_id: employeeId }, orderBy: { check_in: 'desc' }, take: 20 }),
        prisma.activity.findMany({ where: { employee_id: employeeId }, orderBy: { created_at: 'desc' }, take: 20 }),
        prisma.dailyReport.findMany({ where: { employee_id: employeeId }, orderBy: { created_at: 'desc' }, take: 10 }),
      ]);
      const events: any[] = [];
      for (const a of att) {
        events.push({ time: a.check_in, label: 'Checked in', kind: 'checkin' });
        if (a.check_out) events.push({ time: a.check_out, label: 'Checked out', kind: 'checkout' });
      }
      for (const a of acts) events.push({ time: a.created_at, label: `Activity: ${a.description || a.state}`, kind: 'activity' });
      for (const r of reports) events.push({ time: r.created_at, label: 'Daily report submitted', kind: 'report' });
      return events
        .sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime())
        .slice(0, 30)
        .map((e) => ({ ...e, time: toISO(e.time) }));
    },

    siteTimeline: async (_: any, { siteId }: any, { prisma }: any) => {
      const [att, issues, reports, tasks] = await Promise.all([
        prisma.attendance.findMany({ where: { site_id: siteId }, orderBy: { check_in: 'desc' }, take: 20, include: { employee: true } }),
        prisma.issue.findMany({ where: { site_id: siteId }, orderBy: { created_at: 'desc' }, take: 20, include: { reported_by: true } }),
        prisma.dailyReport.findMany({ where: { site_id: siteId }, orderBy: { created_at: 'desc' }, take: 10, include: { employee: true } }),
        prisma.task.findMany({ where: { site_id: siteId, status: 'COMPLETED' }, orderBy: { created_at: 'desc' }, take: 10 }),
      ]);
      const events: any[] = [];
      for (const a of att) {
        events.push({ time: a.check_in, label: `${a.employee?.name || 'Worker'} checked in`, kind: 'checkin' });
        if (a.check_out) events.push({ time: a.check_out, label: `${a.employee?.name || 'Worker'} checked out`, kind: 'checkout' });
      }
      for (const i of issues) events.push({ time: i.created_at, label: `${i.reported_by?.name || 'Someone'} reported: ${i.title}`, kind: 'issue' });
      for (const r of reports) events.push({ time: r.created_at, label: `${r.employee?.name || 'Worker'} submitted a daily report`, kind: 'report' });
      for (const t of tasks) events.push({ time: t.created_at, label: `Task completed: ${t.title}`, kind: 'task' });
      return events
        .sort((x, y) => new Date(y.time).getTime() - new Date(x.time).getTime())
        .slice(0, 40)
        .map((e) => ({ ...e, time: toISO(e.time) }));
    },
  },

  Mutation: {
    createSite: async (_: any, { input }: any, { prisma }: any) => {
      const data: any = { ...input };
      if (input.start_date) data.start_date = new Date(input.start_date);
      if (input.expected_completion) data.expected_completion = new Date(input.expected_completion);
      const site = await prisma.site.create({ data });
      await audit(prisma, input.project_manager_id ?? null, `Created site ${site.name}`, 'Site');
      return site;
    },
    updateSite: async (_: any, { id, input }: any, { prisma }: any) => {
      const data: any = { ...input };
      if (input.start_date) data.start_date = new Date(input.start_date);
      if (input.expected_completion) data.expected_completion = new Date(input.expected_completion);
      const site = await prisma.site.update({ where: { id }, data });
      await audit(prisma, null, `Updated site ${site.name}`, 'Site');
      return site;
    },
    createEmployee: async (_: any, { input }: any, { prisma }: any) => {
      const employee = await prisma.user.create({
        data: { ...input, password: input.password || 'changeme', role: input.role || 'WORKER' },
      });
      await audit(prisma, null, `Created employee ${employee.name}`, 'User');
      return employee;
    },
    updateEmployee: async (_: any, { id, input }: any, { prisma }: any) => {
      const employee = await prisma.user.update({ where: { id }, data: input });
      await audit(prisma, null, `Updated employee ${employee.name}`, 'User');
      return employee;
    },
    createTeam: async (_: any, { input }: any, { prisma }: any) => {
      const team = await prisma.team.create({ data: input });
      await audit(prisma, null, `Created team ${team.name}`, 'Team');
      return team;
    },
    updateTeam: async (_: any, { id, input }: any, { prisma }: any) =>
      prisma.team.update({ where: { id }, data: input }),

    assignEmployee: async (_: any, { employeeId, siteId, teamId }: any, { prisma }: any) => {
      // Close any open assignment.
      await prisma.assignment.updateMany({
        where: { employee_id: employeeId, end_date: null },
        data: { end_date: new Date() },
      });
      const assignment = await prisma.assignment.create({
        data: { employee_id: employeeId, site_id: siteId, team_id: teamId ?? undefined, start_date: new Date() },
      });
      await prisma.user.update({
        where: { id: employeeId },
        data: { current_site_id: siteId, current_team_id: teamId ?? null },
      });
      const emp = await prisma.user.findUnique({ where: { id: employeeId } });
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      await audit(prisma, null, `Assigned ${emp?.name} to ${site?.name}`, 'Assignment');
      await notify(prisma, employeeId, 'ASSIGNMENT', `You have been assigned to ${site?.name}`);
      return assignment;
    },

    createTask: async (_: any, { input }: any, { prisma }: any) => {
      const data: any = { ...input };
      data.date = input.date ? new Date(input.date) : new Date();
      const task = await prisma.task.create({ data });
      if (input.assignee_id) await notify(prisma, input.assignee_id, 'TASK', `New task assigned: ${task.title}`);
      await audit(prisma, null, `Created task ${task.title}`, 'Task');
      return task;
    },
    updateTaskStatus: async (_: any, { id, status }: any, { prisma }: any) => {
      const task = await prisma.task.update({ where: { id }, data: { status } });
      await audit(prisma, task.assignee_id ?? null, `Task "${task.title}" → ${status}`, 'Task');
      return task;
    },

    submitDailyReport: async (_: any, { input }: any, { prisma }: any) => {
      const report = await prisma.dailyReport.create({ data: { ...input, date: new Date() } });
      await audit(prisma, input.employee_id, `Submitted daily report`, 'DailyReport');
      // Notify the site's project manager.
      const site = await prisma.site.findUnique({ where: { id: input.site_id } });
      if (site?.project_manager_id) await notify(prisma, site.project_manager_id, 'REPORT', `Daily report submitted for ${site.name}`);
      return report;
    },

    checkIn: async (_: any, { employeeId, siteId, lat, lng }: any, { prisma }: any) => {
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      let within = true;
      if (lat != null && lng != null && site?.latitude != null && site?.longitude != null) {
        within = distanceMeters(lat, lng, site.latitude, site.longitude) <= (site.radius_m || 200);
      }
      const employee = await prisma.user.findUnique({ where: { id: employeeId } });
      const attendance = await prisma.attendance.create({
        data: {
          employee_id: employeeId,
          site_id: siteId,
          team_id: employee?.current_team_id ?? undefined,
          check_in_lat: lat ?? undefined,
          check_in_lng: lng ?? undefined,
          within_geofence: within,
          status: 'WORKING',
        },
      });
      await prisma.activity.create({ data: { employee_id: employeeId, site_id: siteId, state: 'WORKING', description: 'Checked in' } });
      await audit(prisma, employeeId, `${employee?.name} checked in`, 'Attendance');
      return attendance;
    },

    checkOut: async (_: any, { employeeId, lat, lng }: any, { prisma }: any) => {
      const open = await prisma.attendance.findFirst({
        where: { employee_id: employeeId, check_out: null },
        orderBy: { check_in: 'desc' },
      });
      if (!open) throw new Error('No open check-in found for this employee.');
      const attendance = await prisma.attendance.update({
        where: { id: open.id },
        data: { check_out: new Date(), check_out_lat: lat ?? undefined, check_out_lng: lng ?? undefined, status: 'COMPLETED' },
      });
      const employee = await prisma.user.findUnique({ where: { id: employeeId } });
      await audit(prisma, employeeId, `${employee?.name} checked out`, 'Attendance');
      return attendance;
    },

    setActivity: async (_: any, { employeeId, state, description, siteId }: any, { prisma }: any) => {
      const employee = await prisma.user.findUnique({ where: { id: employeeId } });
      return prisma.activity.create({
        data: { employee_id: employeeId, state, description, site_id: siteId ?? employee?.current_site_id ?? undefined },
      });
    },

    createIssue: async (_: any, { input }: any, { prisma }: any) => {
      const issue = await prisma.issue.create({ data: { ...input, status: 'OPEN' } });
      const site = await prisma.site.findUnique({ where: { id: input.site_id } });
      await audit(prisma, input.reported_by_id, `Reported issue: ${issue.title}`, 'Issue');
      if (site?.project_manager_id) await notify(prisma, site.project_manager_id, 'ISSUE', `New issue at ${site.name}: ${issue.title}`);
      return issue;
    },
    updateIssue: async (_: any, { id, status, assignedToId }: any, { prisma }: any) => {
      const data: any = {};
      if (status) data.status = status;
      if (assignedToId !== undefined) {
        data.assigned_to_id = assignedToId;
        if (status === undefined) data.status = 'ASSIGNED';
      }
      const issue = await prisma.issue.update({ where: { id }, data });
      if (assignedToId) await notify(prisma, assignedToId, 'ISSUE', `Issue assigned to you: ${issue.title}`);
      await audit(prisma, null, `Issue "${issue.title}" updated`, 'Issue');
      return issue;
    },

    createNote: async (_: any, { input }: any, { prisma }: any) => {
      const note = await prisma.note.create({ data: input });
      await audit(prisma, input.author_id, `Created note`, 'Note');
      return note;
    },

    sendMessage: async (_: any, { senderId, teamId, siteId, body }: any, { prisma }: any) => {
      if (!teamId && !siteId) throw new Error('sendMessage requires teamId or siteId.');
      return prisma.chatMessage.create({ data: { sender_id: senderId, team_id: teamId ?? undefined, site_id: siteId ?? undefined, body } });
    },

    createAnnouncement: async (_: any, { siteId, authorId, body }: any, { prisma }: any) => {
      const ann = await prisma.announcement.create({ data: { site_id: siteId, author_id: authorId, body } });
      const members = await prisma.user.findMany({ where: { current_site_id: siteId }, select: { id: true } });
      await Promise.all(members.map((m: any) => notify(prisma, m.id, 'ANNOUNCEMENT', body)));
      await audit(prisma, authorId, `Posted site announcement`, 'Announcement');
      return ann;
    },

    markNotificationRead: (_: any, { id }: any, { prisma }: any) =>
      prisma.notification.update({ where: { id }, data: { read: true } }),
  },
};
