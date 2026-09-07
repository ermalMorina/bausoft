/**
 * GraphQL client for the Construction Workforce & Site Management feature.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/graphql';

const TIMEOUT_MS = 12000;

async function gql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (e: any) {
    // Network-level failure: unreachable host, blocked cleartext, timeout, etc.
    const reason = e?.name === 'AbortError' ? 'timed out' : 'failed';
    throw new Error(
      `Can't reach the backend at ${API_URL} (request ${reason}). ` +
        `Make sure the backend is running and, on a physical device, that EXPO_PUBLIC_API_URL ` +
        `points to your computer's LAN IP (not localhost).`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status} from ${API_URL}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'GraphQL error');
  }
  return json.data;
}

export const workforceApi = {
  raw: gql,

  // Dashboards
  getOverview: () =>
    gql(`{
      workforceOverview {
        active_projects active_sites employees_working employees_absent teams_active open_issues
        sites { id name address status project_name client_name }
      }
    }`).then((d) => d.workforceOverview),

  getSiteDashboard: (siteId: number) =>
    gql(
      `query($id:Int!){ siteDashboard(siteId:$id){
        site { id name address status project_name client_name project_manager { name } }
        workers_total currently_working checked_out absent progress open_issues todays_tasks
      } }`,
      { id: siteId }
    ).then((d) => d.siteDashboard),

  // Sites & employees
  getSites: () =>
    gql(`{ sites { id name address status project_name } }`).then((d) => d.sites),

  getEmployees: (vars: { role?: string; siteId?: number; status?: string } = {}) =>
    gql(
      `query($role:String,$siteId:Int,$status:String){
        employees(role:$role, siteId:$siteId, status:$status){
          id name role position phone employment_status employee_code
          current_site { name } current_team { name }
        }
      }`,
      vars
    ).then((d) => d.employees),

  getWorkers: () =>
    gql(`{ employees(role:"WORKER"){ id name position current_site { name } current_team { name } } }`).then(
      (d) => d.employees
    ),

  // Employee & team management
  listEmployees: () =>
    gql(`{
      employees {
        id name role position employment_status
        current_site { id name }
        current_team { id name }
      }
    }`).then((d) => d.employees),

  getEmployee: (id: number) =>
    gql(
      `query($id:Int!){ employee(id:$id){ id name role position employment_status current_site { id name } current_team { id name } } }`,
      { id }
    ).then((d) => d.employee),

  getTeams: (siteId?: number) =>
    gql(`query($id:Int){ teams(siteId:$id){ id name status site { id name } leader { name } members { id } } }`, {
      id: siteId,
    }).then((d) => d.teams),

  assignEmployee: (employeeId: number, siteId: number, teamId?: number) =>
    gql(
      `mutation($e:Int!,$s:Int!,$t:Int){ assignEmployee(employeeId:$e,siteId:$s,teamId:$t){ id employee { name current_site { name } current_team { name } } } }`,
      { e: employeeId, s: siteId, t: teamId }
    ).then((d) => d.assignEmployee),

  createTeam: (input: { name: string; site_id?: number; leader_id?: number }) =>
    gql(`mutation($i:TeamInput!){ createTeam(input:$i){ id name site_id } }`, { i: input }).then(
      (d) => d.createTeam
    ),

  // Tasks
  getSiteTasks: (siteId: number) =>
    gql(
      `query($id:Int){ tasks(siteId:$id){ id title status priority expected_start expected_end assignee { name } } }`,
      { id: siteId }
    ).then((d) => d.tasks),

  updateTaskStatus: (id: number, status: string) =>
    gql(`mutation($id:Int!,$s:String!){ updateTaskStatus(id:$id,status:$s){ id status } }`, {
      id,
      s: status,
    }).then((d) => d.updateTaskStatus),

  // Attendance
  getAttendance: (vars: { siteId?: number; today?: boolean } = { today: true }) =>
    gql(
      `query($siteId:Int,$today:Boolean){
        attendance(siteId:$siteId, today:$today){
          id check_in check_out hours status within_geofence
          employee { name } site { name }
        }
      }`,
      vars
    ).then((d) => d.attendance),

  // Issues
  getIssues: (siteId?: number) =>
    gql(
      `query($id:Int){ issues(siteId:$id){ id title description priority status reported_by { name } assigned_to { name } site { name } created_at } }`,
      { id: siteId }
    ).then((d) => d.issues),

  createIssue: (input: any) =>
    gql(`mutation($i:IssueInput!){ createIssue(input:$i){ id title status } }`, { i: input }).then(
      (d) => d.createIssue
    ),

  // Worker home
  getWorkerHome: (employeeId: number) =>
    gql(
      `query($id:Int!){ workerHome(employeeId:$id){
        employee { id name role position current_site { name } current_team { name } }
        site { id name address status }
        team { id name }
        checked_in
        attendance { id check_in }
        current_activity { state description created_at }
        todays_tasks { id title status priority expected_start expected_end }
        announcements { body created_at author { name } }
      } }`,
      { id: employeeId }
    ).then((d) => d.workerHome),

  checkIn: (employeeId: number, siteId: number, lat?: number, lng?: number) =>
    gql(
      `mutation($e:Int!,$s:Int!,$lat:Float,$lng:Float){ checkIn(employeeId:$e,siteId:$s,lat:$lat,lng:$lng){ id within_geofence check_in status } }`,
      { e: employeeId, s: siteId, lat, lng }
    ).then((d) => d.checkIn),

  checkOut: (employeeId: number, lat?: number, lng?: number) =>
    gql(`mutation($e:Int!,$lat:Float,$lng:Float){ checkOut(employeeId:$e,lat:$lat,lng:$lng){ id check_out hours } }`, {
      e: employeeId,
      lat,
      lng,
    }).then((d) => d.checkOut),

  setActivity: (employeeId: number, state: string, description?: string) =>
    gql(
      `mutation($e:Int!,$s:String!,$d:String){ setActivity(employeeId:$e,state:$s,description:$d){ id state description } }`,
      { e: employeeId, s: state, d: description }
    ).then((d) => d.setActivity),

  submitDailyReport: (input: any) =>
    gql(`mutation($i:DailyReportInput!){ submitDailyReport(input:$i){ id created_at } }`, { i: input }).then(
      (d) => d.submitDailyReport
    ),

  // Chat
  getMessages: (vars: { teamId?: number; siteId?: number }) =>
    gql(
      `query($teamId:Int,$siteId:Int){ chatMessages(teamId:$teamId, siteId:$siteId){ id body created_at sender { id name role } } }`,
      vars
    ).then((d) => d.chatMessages),

  sendMessage: (senderId: number, body: string, vars: { teamId?: number; siteId?: number }) =>
    gql(
      `mutation($s:Int!,$b:String!,$teamId:Int,$siteId:Int){ sendMessage(senderId:$s,body:$b,teamId:$teamId,siteId:$siteId){ id body created_at sender { name } } }`,
      { s: senderId, b: body, ...vars }
    ).then((d) => d.sendMessage),

  // Timelines
  getSiteTimeline: (siteId: number) =>
    gql(`query($id:Int!){ siteTimeline(siteId:$id){ time label kind } }`, { id: siteId }).then(
      (d) => d.siteTimeline
    ),

  getWorkerTimeline: (employeeId: number) =>
    gql(`query($id:Int!){ workerTimeline(employeeId:$id){ time label kind } }`, { id: employeeId }).then(
      (d) => d.workerTimeline
    ),
};
