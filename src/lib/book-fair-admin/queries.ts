// All Postgres access for the coordinator dashboard. STRICTLY READ-ONLY:
// every function here is a Drizzle select(); no inserts, updates, deletes,
// DDL, or migrations — ever. Every query is parameterized by Drizzle and
// scoped to a school_id taken from the verified session (never from
// client-supplied input directly).
import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import { getDb } from './db';
import {
  classrooms,
  ewallets,
  ewalletTransactions,
  fairAdminProfiles,
  fairs,
  orderLineItems,
  parentProfiles,
  schools,
  students,
  studentsToClassrooms,
  teacherProfiles,
  users,
} from './schema';

// ---------- Authorization ----------

// The existence of a fair_admin_profiles row IS the coordinator role.
// (Do not use the HubSpot Contact `role` property — it is ~2% filled.)
export async function getCoordinatorByBcUserId(bcUserId: number) {
  const db = getDb();
  const rows = await db
    .select({
      fairAdminProfileId: fairAdminProfiles.id,
      schoolId: fairAdminProfiles.schoolId,
      userId: users.id,
    })
    .from(users)
    .innerJoin(fairAdminProfiles, eq(fairAdminProfiles.userId, users.id))
    .where(eq(users.bcUserId, bcUserId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------- School & fairs ----------

export async function getSchool(schoolId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      city: schools.city,
      state: schools.state,
      hsCompanyId: schools.hsCompanyId,
    })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  return rows[0] ?? null;
}

export type FairRow = {
  id: number;
  startDate: string;
  endDate: string;
  hsDealId: string | null;
};

const fairColumns = {
  id: fairs.id,
  startDate: fairs.startDate,
  endDate: fairs.endDate,
  hsDealId: fairs.hsDealId,
};

// Fair dates are naive ET local times; now() is UTC. The few-hour skew at the
// boundary is acceptable for upcoming/past bucketing.
export async function getUpcomingFair(schoolId: number): Promise<FairRow | null> {
  const db = getDb();
  const rows = await db
    .select(fairColumns)
    .from(fairs)
    .where(and(eq(fairs.schoolId, schoolId), gte(fairs.endDate, sql`now()`)))
    .orderBy(asc(fairs.startDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPastFairs(schoolId: number): Promise<FairRow[]> {
  const db = getDb();
  return db
    .select(fairColumns)
    .from(fairs)
    .where(and(eq(fairs.schoolId, schoolId), lt(fairs.endDate, sql`now()`)))
    .orderBy(desc(fairs.startDate));
}

// ---------- Classrooms & invite tree ----------

export type ClassroomTeacherRow = {
  id: number;
  classroomName: string;
  invitedTeacherEmail: string | null;
  invitedTeacherFirstName: string | null;
  invitedTeacherLastName: string | null;
  teacherStatus: string | null;
  teacherProfileId: number | null;
  teacherTosAcceptedAt: string | null;
};

export async function getClassroomsWithTeachers(schoolId: number): Promise<ClassroomTeacherRow[]> {
  const db = getDb();
  return db
    .select({
      id: classrooms.id,
      classroomName: classrooms.classroomName,
      invitedTeacherEmail: classrooms.invitedTeacherEmail,
      invitedTeacherFirstName: classrooms.invitedTeacherFirstName,
      invitedTeacherLastName: classrooms.invitedTeacherLastName,
      teacherStatus: classrooms.teacherStatus,
      teacherProfileId: classrooms.teacherProfileId,
      teacherTosAcceptedAt: users.tosAcceptedAt,
    })
    .from(classrooms)
    .leftJoin(teacherProfiles, eq(teacherProfiles.id, classrooms.teacherProfileId))
    .leftJoin(users, eq(users.id, teacherProfiles.userId))
    .where(eq(classrooms.schoolId, schoolId))
    .orderBy(asc(classrooms.classroomName));
}

export type ParentCounts = { classroomId: number; parents: number; activeParents: number };

export async function getParentCountsByClassroom(schoolId: number): Promise<ParentCounts[]> {
  const db = getDb();
  const rows = await db
    .select({
      classroomId: studentsToClassrooms.classroomId,
      parents: sql<number>`count(distinct ${students.parentProfileId})::int`,
      activeParents: sql<number>`count(distinct case when ${users.tosAcceptedAt} is not null then ${students.parentProfileId} end)::int`,
    })
    .from(studentsToClassrooms)
    .innerJoin(classrooms, eq(classrooms.id, studentsToClassrooms.classroomId))
    .innerJoin(students, eq(students.id, studentsToClassrooms.studentId))
    .leftJoin(parentProfiles, eq(parentProfiles.id, students.parentProfileId))
    .leftJoin(users, eq(users.id, parentProfiles.userId))
    .where(eq(classrooms.schoolId, schoolId))
    .groupBy(studentsToClassrooms.classroomId);
  return rows;
}

// School-wide distinct parent counts (a parent with students in several
// classrooms counts once).
export async function getSchoolParentSummary(
  schoolId: number
): Promise<{ parents: number; activeParents: number }> {
  const db = getDb();
  const rows = await db
    .select({
      parents: sql<number>`count(distinct ${students.parentProfileId})::int`,
      activeParents: sql<number>`count(distinct case when ${users.tosAcceptedAt} is not null then ${students.parentProfileId} end)::int`,
    })
    .from(studentsToClassrooms)
    .innerJoin(classrooms, eq(classrooms.id, studentsToClassrooms.classroomId))
    .innerJoin(students, eq(students.id, studentsToClassrooms.studentId))
    .leftJoin(parentProfiles, eq(parentProfiles.id, students.parentProfileId))
    .leftJoin(users, eq(users.id, parentProfiles.userId))
    .where(eq(classrooms.schoolId, schoolId));
  return rows[0] ?? { parents: 0, activeParents: 0 };
}

export type ClassroomParent = {
  parentProfileId: number;
  hasUser: boolean;
  tosAcceptedAt: string | null;
  studentNames: string[];
};

// Lazy-loaded per classroom from the invite tree. Returns null when the
// classroom doesn't belong to the session's school (never leak cross-school
// data, even with a manipulated classroom id).
export async function getParentsForClassroom(
  classroomId: number,
  schoolId: number
): Promise<ClassroomParent[] | null> {
  const db = getDb();
  const owned = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.schoolId, schoolId)))
    .limit(1);
  if (owned.length === 0) return null;

  const rows = await db
    .select({
      parentProfileId: students.parentProfileId,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      userId: parentProfiles.userId,
      tosAcceptedAt: users.tosAcceptedAt,
    })
    .from(studentsToClassrooms)
    .innerJoin(students, eq(students.id, studentsToClassrooms.studentId))
    .innerJoin(parentProfiles, eq(parentProfiles.id, students.parentProfileId))
    .leftJoin(users, eq(users.id, parentProfiles.userId))
    .where(eq(studentsToClassrooms.classroomId, classroomId))
    .orderBy(asc(students.lastName), asc(students.firstName));

  const byParent = new Map<number, ClassroomParent>();
  for (const row of rows) {
    if (row.parentProfileId == null) continue;
    let parent = byParent.get(row.parentProfileId);
    if (!parent) {
      parent = {
        parentProfileId: row.parentProfileId,
        hasUser: row.userId != null,
        tosAcceptedAt: row.tosAcceptedAt,
        studentNames: [],
      };
      byParent.set(row.parentProfileId, parent);
    }
    parent.studentNames.push(`${row.studentFirstName} ${row.studentLastName}`);
  }
  return [...byParent.values()];
}

// ---------- Past-fair money figures ----------

export async function getAveDollarsEarned(fairId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({
      total: sql<string>`coalesce(sum(${orderLineItems.aveDollarsEarned}), 0)`,
    })
    .from(orderLineItems)
    .where(and(eq(orderLineItems.fairId, fairId), eq(orderLineItems.completedCheckout, true)));
  return Number(rows[0]?.total ?? 0);
}

export type AveDollarsActivity = {
  amount: number;
  // True when every transaction type in the window classified cleanly as
  // spend vs credit; false means the caller should label the figure
  // "Ave Dollars activity" instead of "Ave Dollars spent".
  isSpendCertain: boolean;
};

const SPEND_TYPE = /(debit|spend|spent|purchase|redeem|redemption|charge|payment|sale)/i;
const CREDIT_TYPE = /(credit|deposit|load|reload|top.?up|earn|grant|gift|refund|reversal|award)/i;

// Sums ewallet activity for the school's students between the fair's start
// and end_date + 30 days, grouped by transaction_type so spend-like types can
// be classified defensively in code.
export async function getAveDollarsSpent(
  schoolId: number,
  fairStart: string,
  fairEnd: string
): Promise<AveDollarsActivity> {
  const db = getDb();
  const schoolStudentIds = db
    .select({ id: studentsToClassrooms.studentId })
    .from(studentsToClassrooms)
    .innerJoin(classrooms, eq(classrooms.id, studentsToClassrooms.classroomId))
    .where(eq(classrooms.schoolId, schoolId));

  const rows = await db
    .select({
      transactionType: ewalletTransactions.transactionType,
      total: sql<string>`coalesce(sum(${ewalletTransactions.amount}), 0)`,
    })
    .from(ewalletTransactions)
    .innerJoin(ewallets, eq(ewallets.id, ewalletTransactions.ewalletId))
    .where(
      and(
        inArray(ewallets.studentId, schoolStudentIds),
        gte(ewalletTransactions.transactionTime, fairStart),
        sql`${ewalletTransactions.transactionTime} <= ${fairEnd}::timestamp + interval '30 days'`
      )
    )
    .groupBy(ewalletTransactions.transactionType);

  let spend = 0;
  let activity = 0;
  let allClassified = true;
  for (const row of rows) {
    const total = Math.abs(Number(row.total));
    if (!Number.isFinite(total) || total === 0) continue;
    activity += total;
    const type = row.transactionType ?? '';
    if (SPEND_TYPE.test(type)) {
      spend += total;
    } else if (!CREDIT_TYPE.test(type)) {
      allClassified = false;
    }
  }

  return allClassified
    ? { amount: spend, isSpendCertain: true }
    : { amount: activity, isSpendCertain: false };
}
