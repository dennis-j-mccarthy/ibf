// Drizzle table definitions for the IBF platform Postgres database (Neon).
//
// READ-ONLY: these definitions exist solely so the coordinator dashboard can
// run SELECT queries. Never generate or run migrations from this file —
// the schema is owned and provisioned externally (n8n / platform services).
//
// All timestamps are `timestamp without time zone` written as US/Eastern
// local times; they are read as strings (mode: 'string') and displayed
// as-is with an ET label.
import {
  pgTable,
  bigint,
  boolean,
  integer,
  numeric,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const id = (name: string) => bigint(name, { mode: 'number' });
const ts = (name: string) => timestamp(name, { mode: 'string' });

export const schools = pgTable('schools', {
  id: id('id').primaryKey(),
  name: text('name'),
  street: text('street'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  bcAveDollarsEmail: text('bc_ave_dollars_email'),
  ibcSchoolId: text('ibc_school_id').notNull(),
  totalStudents: integer('total_students'),
  emailDomain: text('email_domain'),
  salesTaxRate: numeric('sales_tax_rate'),
  posPin: text('pos_pin'),
  organizationType: text('organization_type'),
  schoolType: text('school_type'),
  schoolYear: text('school_year'),
  hsCompanyId: text('hs_company_id'),
});

export const fairs = pgTable('fairs', {
  id: id('id').primaryKey(),
  schoolId: id('school_id'),
  startDate: ts('start_date').notNull(),
  endDate: ts('end_date').notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  ibcFairId: text('ibc_fair_id'),
  hsDealId: text('hs_deal_id'),
});

export const classrooms = pgTable('classrooms', {
  id: id('id').primaryKey(),
  schoolId: id('school_id').notNull(),
  classroomName: text('classroom_name').notNull(),
  totalStudents: integer('total_students'),
  createdAt: ts('created_at'),
  teacherProfileId: id('teacher_profile_id'),
  updatedAt: ts('updated_at'),
  teacherStatus: text('teacher_status'),
  invitedTeacherEmail: text('invited_teacher_email'),
  invitedTeacherFirstName: text('invited_teacher_first_name'),
  invitedTeacherLastName: text('invited_teacher_last_name'),
  introText: text('intro_text'),
  groupType: text('group_type'),
});

export const users = pgTable('users', {
  id: id('id').primaryKey(),
  title: text('title'),
  bcUserId: id('bc_user_id').notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  tosAcceptedAt: ts('tos_accepted_at'),
  tosAcceptedIp: text('tos_accepted_ip'),
  tosAcceptedDevice: text('tos_accepted_device'),
  image: text('image'),
});

export const fairAdminProfiles = pgTable('fair_admin_profiles', {
  id: id('id').primaryKey(),
  userId: id('user_id').notNull(),
  schoolId: id('school_id').notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const teacherProfiles = pgTable('teacher_profiles', {
  id: id('id').primaryKey(),
  userId: id('user_id').notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const parentProfiles = pgTable('parent_profiles', {
  id: id('id').primaryKey(),
  userId: id('user_id').notNull(),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const students = pgTable('students', {
  id: id('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  parentProfileId: id('parent_profile_id'),
  memberProfileId: id('member_profile_id'),
  memberType: text('member_type'),
  schoolYear: text('school_year'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const studentsToClassrooms = pgTable('students_to_classrooms', {
  studentId: id('student_id').notNull(),
  classroomId: id('classroom_id').notNull(),
});

export const ewallets = pgTable('ewallets', {
  id: id('id').primaryKey(),
  externalId: text('external_id'),
  studentId: id('student_id').notNull(),
  balance: numeric('balance').notNull(),
  status: text('status'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
  deletedAt: ts('deleted_at'),
});

export const ewalletTransactions = pgTable('ewallet_transactions', {
  id: id('id').primaryKey(),
  ewalletId: id('ewallet_id').notNull(),
  source: text('source').notNull(),
  transactionType: text('transaction_type').notNull(),
  amount: numeric('amount').notNull(),
  description: text('description'),
  transactionTime: ts('transaction_time').notNull(),
  externalTerminalId: text('external_terminal_id').notNull(),
  externalTrxId: text('external_trx_id').notNull(),
  status: text('status'),
  bcOrderId: text('bc_order_id'),
  bcCustomerId: text('bc_customer_id'),
  bcOrderLineItemId: text('bc_order_line_item_id'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
});

export const orderLineItems = pgTable('order_line_items', {
  id: id('id').primaryKey(),
  userId: id('user_id'),
  bcCartId: text('bc_cart_id').notNull(),
  bcProductId: id('bc_product_id').notNull(),
  classroomId: id('classroom_id'),
  studentId: id('student_id'),
  classroomWishlistId: id('classroom_wishlist_id'),
  bcOrderId: text('bc_order_id'),
  bcOrderDate: ts('bc_order_date'),
  completedCheckout: boolean('completed_checkout').notNull(),
  bcCartLineItemId: text('bc_cart_line_item_id'),
  classroomName: text('classroom_name'),
  schoolId: id('school_id'),
  quantity: integer('quantity'),
  productPrice: numeric('product_price'),
  totalExTax: numeric('total_ex_tax'),
  aveDollarsEarned: numeric('ave_dollars_earned'),
  bcAveDollarsEmail: text('bc_ave_dollars_email'),
  bcOrderLineItemId: text('bc_order_line_item_id'),
  bcProductSku: text('bc_product_sku'),
  bookClubEventId: id('book_club_event_id'),
  fairId: id('fair_id'),
  cartId: id('cart_id'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});
