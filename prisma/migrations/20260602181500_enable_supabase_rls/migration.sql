-- Harden Supabase Data API access for all Prisma-managed public tables.
-- The application writes through validated Next.js/Prisma endpoints; direct
-- Supabase REST access is limited to authenticated row reads only.

create or replace function public.app_current_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public."User" u
  where (
      auth.uid() is not null
      and u.id = auth.uid()::text
    )
    or (
      nullif(auth.jwt() ->> 'email', '') is not null
      and lower(u.email) = lower(auth.jwt() ->> 'email')
    )
    or (
      nullif(auth.jwt() ->> 'phone', '') is not null
      and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') =
        regexp_replace(regexp_replace(auth.jwt() ->> 'phone', '^\+?55', ''), '\D', '', 'g')
    )
  order by case when auth.uid() is not null and u.id = auth.uid()::text then 0 else 1 end
  limit 1
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."User" u
    where u.id = public.app_current_user_id()
      and u.role = 'ADMIN'
      and u.blocked = false
  )
$$;

create or replace function public.app_owns_property(property_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."Property" p
    where p.id = property_id
      and p."hostId" = public.app_current_user_id()
  )
$$;

create or replace function public.app_owns_professional(professional_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."Professional" p
    where p.id = professional_id
      and p."userId" = public.app_current_user_id()
  )
$$;

create or replace function public.app_booking_participant(booking_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."Booking" b
    left join public."Property" p on p.id = b."propertyId"
    where b.id = booking_id
      and (
        b."guestId" = public.app_current_user_id()
        or p."hostId" = public.app_current_user_id()
      )
  )
$$;

revoke all on function public.app_current_user_id() from public;
revoke all on function public.app_is_admin() from public;
revoke all on function public.app_owns_property(text) from public;
revoke all on function public.app_owns_professional(text) from public;
revoke all on function public.app_booking_participant(text) from public;

grant execute on function public.app_current_user_id() to anon, authenticated, service_role;
grant execute on function public.app_is_admin() to authenticated, service_role;
grant execute on function public.app_owns_property(text) to authenticated, service_role;
grant execute on function public.app_owns_professional(text) to authenticated, service_role;
grant execute on function public.app_booking_participant(text) to authenticated, service_role;

alter table public."Account" enable row level security;
alter table public."Appointment" enable row level security;
alter table public."AuditLog" enable row level security;
alter table public."BlockedDate" enable row level security;
alter table public."Booking" enable row level security;
alter table public."ClientProfile" enable row level security;
alter table public."ClientVoucher" enable row level security;
alter table public."Coupon" enable row level security;
alter table public."Favorite" enable row level security;
alter table public."HostProfile" enable row level security;
alter table public."Message" enable row level security;
alter table public."Notification" enable row level security;
alter table public."Payment" enable row level security;
alter table public."PhoneVerificationCode" enable row level security;
alter table public."Professional" enable row level security;
alter table public."ProfessionalPhoto" enable row level security;
alter table public."ProfessionalProfileEvent" enable row level security;
alter table public."ProfessionalReview" enable row level security;
alter table public."ProfessionalReviewDispute" enable row level security;
alter table public."ProfessionalSpecialty" enable row level security;
alter table public."ProfessionalVoucherSettings" enable row level security;
alter table public."Property" enable row level security;
alter table public."PropertyAmenity" enable row level security;
alter table public."PropertyPhoto" enable row level security;
alter table public."Referral" enable row level security;
alter table public."Report" enable row level security;
alter table public."Review" enable row level security;
alter table public."Schedule" enable row level security;
alter table public."SeasonalPrice" enable row level security;
alter table public."Session" enable row level security;
alter table public."Story" enable row level security;
alter table public."User" enable row level security;
alter table public."VerificationToken" enable row level security;
alter table public."VoucherBudget" enable row level security;
alter table public."VoucherDailyStock" enable row level security;
alter table public."VoucherPrize" enable row level security;
alter table public."VoucherSettings" enable row level security;
alter table public."VoucherSpin" enable row level security;
alter table public."WebhookEvent" enable row level security;
alter table public."_prisma_migrations" enable row level security;

grant usage on schema public to anon, authenticated;

revoke all privileges on table
  public."Account",
  public."Appointment",
  public."AuditLog",
  public."BlockedDate",
  public."Booking",
  public."ClientProfile",
  public."ClientVoucher",
  public."Coupon",
  public."Favorite",
  public."HostProfile",
  public."Message",
  public."Notification",
  public."Payment",
  public."PhoneVerificationCode",
  public."Professional",
  public."ProfessionalPhoto",
  public."ProfessionalProfileEvent",
  public."ProfessionalReview",
  public."ProfessionalReviewDispute",
  public."ProfessionalSpecialty",
  public."ProfessionalVoucherSettings",
  public."Property",
  public."PropertyAmenity",
  public."PropertyPhoto",
  public."Referral",
  public."Report",
  public."Review",
  public."Schedule",
  public."SeasonalPrice",
  public."Session",
  public."Story",
  public."User",
  public."VerificationToken",
  public."VoucherBudget",
  public."VoucherDailyStock",
  public."VoucherPrize",
  public."VoucherSettings",
  public."VoucherSpin",
  public."WebhookEvent",
  public."_prisma_migrations"
from anon, authenticated;

grant select on table
  public."Appointment",
  public."AuditLog",
  public."BlockedDate",
  public."Booking",
  public."ClientProfile",
  public."ClientVoucher",
  public."Coupon",
  public."Favorite",
  public."HostProfile",
  public."Message",
  public."Notification",
  public."Payment",
  public."Professional",
  public."ProfessionalPhoto",
  public."ProfessionalProfileEvent",
  public."ProfessionalReview",
  public."ProfessionalReviewDispute",
  public."ProfessionalSpecialty",
  public."ProfessionalVoucherSettings",
  public."Property",
  public."PropertyAmenity",
  public."PropertyPhoto",
  public."Referral",
  public."Report",
  public."Review",
  public."Schedule",
  public."SeasonalPrice",
  public."Story",
  public."User",
  public."VoucherBudget",
  public."VoucherDailyStock",
  public."VoucherPrize",
  public."VoucherSettings",
  public."VoucherSpin"
to authenticated;

create policy "Users can read own user row"
on public."User"
for select
to authenticated
using (id = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own client profile"
on public."ClientProfile"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own host profile"
on public."HostProfile"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own stories"
on public."Story"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Hosts can read own properties"
on public."Property"
for select
to authenticated
using ("hostId" = public.app_current_user_id() or public.app_is_admin());

create policy "Hosts can read own property photos"
on public."PropertyPhoto"
for select
to authenticated
using (public.app_owns_property("propertyId") or public.app_is_admin());

create policy "Hosts can read own property amenities"
on public."PropertyAmenity"
for select
to authenticated
using (public.app_owns_property("propertyId") or public.app_is_admin());

create policy "Hosts can read own blocked dates"
on public."BlockedDate"
for select
to authenticated
using (public.app_owns_property("propertyId") or public.app_is_admin());

create policy "Hosts can read own seasonal prices"
on public."SeasonalPrice"
for select
to authenticated
using (public.app_owns_property("propertyId") or public.app_is_admin());

create policy "Booking participants can read bookings"
on public."Booking"
for select
to authenticated
using (
  "guestId" = public.app_current_user_id()
  or public.app_owns_property("propertyId")
  or public.app_is_admin()
);

create policy "Payment participants can read payments"
on public."Payment"
for select
to authenticated
using (
  "userId" = public.app_current_user_id()
  or public.app_booking_participant("bookingId")
  or public.app_is_admin()
);

create policy "Booking participants can read messages"
on public."Message"
for select
to authenticated
using (
  "senderId" = public.app_current_user_id()
  or public.app_booking_participant("bookingId")
  or public.app_is_admin()
);

create policy "Review participants can read property reviews"
on public."Review"
for select
to authenticated
using (
  "authorId" = public.app_current_user_id()
  or public.app_owns_property("propertyId")
  or public.app_is_admin()
);

create policy "Users can read own favorites"
on public."Favorite"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own referrals"
on public."Referral"
for select
to authenticated
using (
  "referrerId" = public.app_current_user_id()
  or "referredId" = public.app_current_user_id()
  or public.app_is_admin()
);

create policy "Users can read own notifications"
on public."Notification"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Professionals can read own professional row"
on public."Professional"
for select
to authenticated
using ("userId" = public.app_current_user_id() or public.app_is_admin());

create policy "Professionals can read own photos"
on public."ProfessionalPhoto"
for select
to authenticated
using (public.app_owns_professional("professionalId") or public.app_is_admin());

create policy "Professionals can read own specialties"
on public."ProfessionalSpecialty"
for select
to authenticated
using (public.app_owns_professional("professionalId") or public.app_is_admin());

create policy "Professionals can read own schedules"
on public."Schedule"
for select
to authenticated
using (public.app_owns_professional("professionalId") or public.app_is_admin());

create policy "Professionals can read own profile events"
on public."ProfessionalProfileEvent"
for select
to authenticated
using (public.app_owns_professional("professionalId") or public.app_is_admin());

create policy "Appointment participants can read appointments"
on public."Appointment"
for select
to authenticated
using (
  "clientId" = public.app_current_user_id()
  or public.app_owns_professional("professionalId")
  or public.app_is_admin()
);

create policy "Professional review participants can read reviews"
on public."ProfessionalReview"
for select
to authenticated
using (
  "authorId" = public.app_current_user_id()
  or public.app_owns_professional("professionalId")
  or public.app_is_admin()
);

create policy "Professional dispute participants can read disputes"
on public."ProfessionalReviewDispute"
for select
to authenticated
using (
  "authorId" = public.app_current_user_id()
  or public.app_owns_professional("professionalId")
  or public.app_is_admin()
);

create policy "Professionals can read own voucher settings"
on public."ProfessionalVoucherSettings"
for select
to authenticated
using (public.app_owns_professional("professionalId") or public.app_is_admin());

create policy "Users can read own voucher spins"
on public."VoucherSpin"
for select
to authenticated
using ("clientId" = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own client vouchers"
on public."ClientVoucher"
for select
to authenticated
using ("clientId" = public.app_current_user_id() or public.app_is_admin());

create policy "Users can read own reports"
on public."Report"
for select
to authenticated
using ("authorId" = public.app_current_user_id() or public.app_is_admin());

create policy "Admins can read audit logs"
on public."AuditLog"
for select
to authenticated
using (public.app_is_admin());

create policy "Admins can read coupons"
on public."Coupon"
for select
to authenticated
using (public.app_is_admin());

create policy "Admins can read voucher settings"
on public."VoucherSettings"
for select
to authenticated
using (public.app_is_admin());

create policy "Admins can read voucher budgets"
on public."VoucherBudget"
for select
to authenticated
using (public.app_is_admin());

create policy "Admins can read voucher prizes"
on public."VoucherPrize"
for select
to authenticated
using (public.app_is_admin());

create policy "Admins can read voucher daily stock"
on public."VoucherDailyStock"
for select
to authenticated
using (public.app_is_admin());
