/**
 * Seeds a realistic multi-site construction company for the Workforce feature.
 * Idempotent: if the demo sites already exist, it exits without changes.
 *
 *   npm run seed:workforce   (from bauSoftBackend)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pg = require('pg');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function at(hoursAgo: number) {
  return new Date(Date.now() - hoursAgo * 3600_000);
}

async function main() {
  const existing = await prisma.site.findFirst({ where: { name: 'Residential Building — Pristina' } });
  if (existing) {
    console.log('Workforce demo data already present. Skipping seed.');
    return;
  }

  console.log('Seeding workforce demo data...');

  const mk = (
    name: string,
    email: string,
    role: string,
    position: string,
    extra: Record<string, any> = {}
  ) =>
    prisma.user.create({
      data: {
        name,
        email,
        password: 'changeme',
        role,
        position,
        phone: '+383 44 ' + Math.floor(100000 + Math.random() * 899999),
        employee_code: 'EMP-' + Math.floor(1000 + Math.random() * 8999),
        employment_status: 'ACTIVE',
        ...extra,
      },
    });

  // People
  const admin = await mk('Company Admin', 'admin@bausoft.dev', 'ADMIN', 'Company Administrator');
  const pm = await mk('Blerim Krasniqi', 'pm@bausoft.dev', 'PROJECT_MANAGER', 'Project Manager');
  const supAlpha = await mk('John Berisha', 'john@bausoft.dev', 'SUPERVISOR', 'Site Supervisor');
  const supBeta = await mk('Arben Gashi', 'arben@bausoft.dev', 'SUPERVISOR', 'Site Supervisor');
  const supGamma = await mk('Fatmir Hoxha', 'fatmir@bausoft.dev', 'SUPERVISOR', 'Site Supervisor');

  const skillPool = ['Masonry', 'Electrical', 'Plumbing', 'Plastering', 'Carpentry', 'Painting', 'Concrete'];
  const workerNames = [
    'Mark Dedaj', 'Alex Nikci', 'Tom Rugova', 'Driton Leka', 'Egzon Morina', 'Valon Krasniqi',
    'Besnik Shala', 'Rron Islami', 'Leon Berisha', 'Ardit Zeka', 'Genc Bala', 'Kushtrim Doda',
    'Fisnik Ahmeti', 'Lorik Sela', 'Endrit Kelmendi', 'Blend Rexha', 'Petrit Hasani', 'Gezim Vata',
  ];
  const workers: any[] = [];
  for (let i = 0; i < workerNames.length; i++) {
    const skills = [skillPool[i % skillPool.length], skillPool[(i + 3) % skillPool.length]].join(', ');
    workers.push(
      await mk(workerNames[i], `worker${i + 1}@bausoft.dev`, 'WORKER', 'Construction Worker', { skills })
    );
  }

  // Sites
  const siteA = await prisma.site.create({
    data: {
      name: 'Residential Building — Pristina',
      address: 'Rr. Agim Ramadani, Pristina',
      latitude: 42.6629, longitude: 21.1655, radius_m: 200,
      client_name: 'Green Living Sh.p.k.', project_name: 'Green Living Residences',
      description: '8-floor residential building with underground parking.',
      start_date: at(24 * 40), expected_completion: at(-24 * 120),
      status: 'ACTIVE', project_manager_id: pm.id,
    },
  });
  const siteB = await prisma.site.create({
    data: {
      name: 'Commercial Building — Prizren',
      address: 'Rr. Shadervan, Prizren',
      latitude: 42.2139, longitude: 20.7397, radius_m: 250,
      client_name: 'Prizren Mall LLC', project_name: 'Prizren City Mall',
      description: 'Two-story commercial complex with retail units.',
      start_date: at(24 * 25), expected_completion: at(-24 * 200),
      status: 'ACTIVE', project_manager_id: pm.id,
    },
  });
  const siteC = await prisma.site.create({
    data: {
      name: 'Renovation Project — Peja',
      address: 'Rr. Mbretëresha Teutë, Peja',
      latitude: 42.6591, longitude: 20.2887, radius_m: 150,
      client_name: 'Hotel Dukagjini', project_name: 'Dukagjini Restoration',
      description: 'Heritage hotel facade and interior renovation.',
      start_date: at(24 * 10), expected_completion: at(-24 * 60),
      status: 'ACTIVE', project_manager_id: pm.id,
    },
  });

  // Teams
  const teamAlpha = await prisma.team.create({ data: { name: 'Team Alpha', leader_id: supAlpha.id, site_id: siteA.id, status: 'ACTIVE' } });
  const teamBeta = await prisma.team.create({ data: { name: 'Team Beta', leader_id: supBeta.id, site_id: siteB.id, status: 'ACTIVE' } });
  const teamGamma = await prisma.team.create({ data: { name: 'Team Gamma', leader_id: supGamma.id, site_id: siteC.id, status: 'ACTIVE' } });

  // Supervisors are current members of their sites too
  await prisma.user.update({ where: { id: supAlpha.id }, data: { current_site_id: siteA.id, current_team_id: teamAlpha.id } });
  await prisma.user.update({ where: { id: supBeta.id }, data: { current_site_id: siteB.id, current_team_id: teamBeta.id } });
  await prisma.user.update({ where: { id: supGamma.id }, data: { current_site_id: siteC.id, current_team_id: teamGamma.id } });

  // Assign workers to teams/sites with time-aware assignments
  const layout = [
    { team: teamAlpha, site: siteA, count: 6 },
    { team: teamBeta, site: siteB, count: 8 },
    { team: teamGamma, site: siteC, count: 4 },
  ];
  let idx = 0;
  const assignedWorkers: Record<number, any[]> = {};
  for (const { team, site, count } of layout) {
    assignedWorkers[team.id] = [];
    for (let i = 0; i < count && idx < workers.length; i++, idx++) {
      const w = workers[idx];
      await prisma.assignment.create({ data: { employee_id: w.id, site_id: site.id, team_id: team.id, start_date: at(24 * 6) } });
      await prisma.user.update({ where: { id: w.id }, data: { current_site_id: site.id, current_team_id: team.id } });
      assignedWorkers[team.id].push(w);
    }
  }
  // One worker with a prior (closed) assignment to show history
  const historyWorker = assignedWorkers[teamAlpha.id][0];
  await prisma.assignment.updateMany({ where: { employee_id: historyWorker.id }, data: {} });
  await prisma.assignment.create({
    data: { employee_id: historyWorker.id, site_id: siteB.id, team_id: teamBeta.id, start_date: at(24 * 20), end_date: at(24 * 7) },
  });

  // Tasks for today (Site A / Team Alpha)
  const alphaWorkers = assignedWorkers[teamAlpha.id];
  const taskDefs = [
    { title: 'Install electrical conduits', start: '08:00', end: '10:30', status: 'COMPLETED', prio: 'HIGH' },
    { title: 'Prepare walls for plastering', start: '10:30', end: '13:00', status: 'IN_PROGRESS', prio: 'MEDIUM' },
    { title: 'Plaster first floor', start: '14:00', end: '17:00', status: 'PLANNED', prio: 'MEDIUM' },
    { title: 'Second-floor floor preparation', start: '14:00', end: '17:00', status: 'PLANNED', prio: 'LOW' },
  ];
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i];
    await prisma.task.create({
      data: {
        site_id: siteA.id, team_id: teamAlpha.id, assignee_id: alphaWorkers[i % alphaWorkers.length].id,
        title: t.title, description: `${t.title} — first floor block A`, priority: t.prio,
        expected_start: t.start, expected_end: t.end, status: t.status, date: new Date(),
      },
    });
  }
  // A couple of tasks for other sites
  await prisma.task.create({ data: { site_id: siteB.id, team_id: teamBeta.id, assignee_id: assignedWorkers[teamBeta.id][0].id, title: 'Pour foundation section B', priority: 'HIGH', expected_start: '08:00', expected_end: '12:00', status: 'IN_PROGRESS', date: new Date() } });
  await prisma.task.create({ data: { site_id: siteC.id, team_id: teamGamma.id, assignee_id: assignedWorkers[teamGamma.id][0].id, title: 'Restore facade stonework', priority: 'MEDIUM', expected_start: '09:00', expected_end: '16:00', status: 'PLANNED', date: new Date() } });

  // Attendance — most Alpha & Beta workers checked in this morning; Gamma partially
  const checkInMany = async (list: any[], site: any, team: any, howMany: number, checkedOut = 0) => {
    for (let i = 0; i < howMany && i < list.length; i++) {
      const w = list[i];
      const rec = await prisma.attendance.create({
        data: {
          employee_id: w.id, site_id: site.id, team_id: team.id,
          check_in: at(4), check_in_lat: site.latitude, check_in_lng: site.longitude,
          within_geofence: true, status: i < checkedOut ? 'COMPLETED' : 'WORKING',
          ...(i < checkedOut ? { check_out: at(0.2), check_out_lat: site.latitude, check_out_lng: site.longitude } : {}),
        },
      });
      await prisma.activity.create({
        data: { employee_id: w.id, site_id: site.id, state: 'WORKING', description: ['Installing drywall', 'Plastering', 'Laying bricks', 'Wiring', 'Painting'][i % 5] },
      });
      void rec;
    }
  };
  await checkInMany(alphaWorkers, siteA, teamAlpha, 5, 1);
  await checkInMany(assignedWorkers[teamBeta.id], siteB, teamBeta, 7, 2);
  await checkInMany(assignedWorkers[teamGamma.id], siteC, teamGamma, 2, 0);

  // Daily report
  await prisma.dailyReport.create({
    data: {
      site_id: siteA.id, team_id: teamAlpha.id, employee_id: alphaWorkers[0].id,
      completed: 'Finished wall preparation\nInstalled electrical conduits',
      in_progress: 'First-floor plastering',
      planned_next: 'Finish first-floor plastering\nStart second-floor preparation',
      notes: 'The material delivery arrived approximately 2 hours late.',
      issues: 'Missing plastering material for the second floor.',
      materials: 'Cement (12 bags), electrical conduit (60m)',
      check_in_time: '07:58', check_out_time: '17:02',
    },
  });

  // Issues
  await prisma.issue.create({ data: { site_id: siteB.id, reported_by_id: assignedWorkers[teamBeta.id][0].id, title: 'Electrical components not delivered', description: 'The required electrical components have not arrived.', priority: 'HIGH', status: 'OPEN' } });
  await prisma.issue.create({ data: { site_id: siteA.id, reported_by_id: alphaWorkers[1].id, assigned_to_id: supAlpha.id, title: 'Scaffolding needs inspection', description: 'Eastern scaffolding feels unstable.', priority: 'MEDIUM', status: 'ASSIGNED' } });
  await prisma.issue.create({ data: { site_id: siteC.id, reported_by_id: assignedWorkers[teamGamma.id][0].id, title: 'Water leak in basement', priority: 'HIGH', status: 'IN_PROGRESS', assigned_to_id: supGamma.id } });
  await prisma.issue.create({ data: { site_id: siteA.id, reported_by_id: alphaWorkers[2].id, title: 'Missing safety helmets (2)', priority: 'LOW', status: 'OPEN' } });

  // Notes
  await prisma.note.create({ data: { author_id: supAlpha.id, site_id: siteA.id, body: 'The concrete delivery is expected tomorrow at 08:00.', priority: 'HIGH' } });
  await prisma.note.create({ data: { author_id: pm.id, site_id: siteB.id, body: 'Client walkthrough scheduled for Friday afternoon.', priority: 'NORMAL' } });

  // Team + site chat
  await prisma.chatMessage.create({ data: { team_id: teamAlpha.id, sender_id: alphaWorkers[0].id, body: 'Concrete delivery arrived.', created_at: at(3) } });
  await prisma.chatMessage.create({ data: { team_id: teamAlpha.id, sender_id: alphaWorkers[1].id, body: "I'll start preparing the area.", created_at: at(2.8) } });
  await prisma.chatMessage.create({ data: { team_id: teamAlpha.id, sender_id: supAlpha.id, body: 'Please make sure the eastern wall is completed before 16:00.', created_at: at(2.5) } });
  await prisma.chatMessage.create({ data: { site_id: siteA.id, sender_id: supAlpha.id, body: 'The electrician will arrive at 10:00.', created_at: at(2) } });
  await prisma.chatMessage.create({ data: { site_id: siteA.id, sender_id: alphaWorkers[2].id, body: 'The second-floor area is ready.', created_at: at(1.5) } });
  await prisma.chatMessage.create({ data: { site_id: siteA.id, sender_id: pm.id, body: 'Good. Please upload photos when the work is completed.', created_at: at(1) } });

  // Announcement
  await prisma.announcement.create({ data: { site_id: siteA.id, author_id: pm.id, body: "Tomorrow's work will begin at 09:00 instead of 08:00 due to a material delivery." } });

  console.log('✅ Workforce demo data seeded:');
  console.log(`   Sites: 3 | Teams: 3 | Employees: ${5 + workers.length}`);
  console.log(`   Login as a worker example id: ${alphaWorkers[0].id} (${alphaWorkers[0].name})`);
  console.log(`   Supervisor (Alpha) id: ${supAlpha.id} | Project Manager id: ${pm.id} | Admin id: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
