-- GrievanceAI schema. All tables are accessed only by the `api` Edge Function
-- (service role), so RLS is enabled with no policies: the anon/authenticated
-- keys can't read or write anything directly.

create table public.profiles (
  id                 uuid primary key references auth.users on delete cascade,
  name               text not null default '',
  email              text,
  phone              text,
  preferred_language text not null default 'en-IN',
  role               text not null default 'citizen' check (role in ('citizen', 'authority', 'admin')),
  created_at         timestamptz not null default now()
);

create table public.grievances (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles on delete cascade,
  title                    text,
  original_text            text,
  original_language        text,
  input_type               text,
  image_url                text,
  audio_url                text,
  status                   text not null default 'pending'
                           check (status in ('pending', 'processing', 'open', 'in_progress', 'resolved', 'closed')),
  category                 text check (category in (
    'cybercrime', 'telecom_fraud', 'human_rights', 'corruption',
    'consumer_rights', 'banking', 'stock_market', 'insurance',
    'telecom', 'railways', 'airlines', 'road_transport',
    'real_estate', 'sanitation', 'food_safety', 'medicines',
    'health_schemes', 'environment', 'aadhaar', 'passport',
    'income_tax', 'provident_fund', 'pensions', 'postal_services',
    'rti', 'electricity_water', 'national_general', 'state_general', 'other')),
  assigned_to              text,
  user_name                text,
  user_phone               text,
  state                    text,
  district                 text,
  pincode                  text,
  address                  text,
  landmark                 text,
  portal_links             jsonb,
  nearby_offices           jsonb not null default '[]',
  procedure_steps          jsonb not null default '[]',
  expected_resolution_days int,
  follow_up_sent           boolean not null default false,
  citizen_feedback         text check (citizen_feedback in ('resolved', 'not_resolved')),
  submitted_at             timestamptz not null default now(),
  resolved_at              timestamptz
);
create index on public.grievances (user_id, submitted_at desc);
create index on public.grievances (status);

create table public.ai_analyses (
  grievance_id          uuid primary key references public.grievances on delete cascade,
  english_summary       text,
  verification_sentence text,
  detected_language     text,
  ocr_raw_text          text,
  stt_transcript        text,
  llm_category          text,
  keywords              text[] not null default '{}',
  confidence_score      real check (confidence_score between 0 and 1),
  processing_ms         int,
  processed_at          timestamptz not null default now()
);

create table public.status_updates (
  id           uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances on delete cascade,
  old_status   text not null,
  new_status   text not null,
  changed_by   text not null,
  remark       text,
  updated_at   timestamptz not null default now()
);
create index on public.status_updates (grievance_id, updated_at);

create table public.training_data (
  id                 uuid primary key default gen_random_uuid(),
  original_text      text not null,
  detected_language  text not null,
  english_text       text not null,
  confirmed_category text not null,
  confirmed_at       timestamptz not null default now()
);

alter table public.profiles       enable row level security;
alter table public.grievances     enable row level security;
alter table public.ai_analyses    enable row level security;
alter table public.status_updates enable row level security;
alter table public.training_data  enable row level security;

-- Every new auth user (email/password or Google) gets a citizen profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Private bucket for grievance attachments; the API hands out signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('grievance-uploads', 'grievance-uploads', false, 4194304);
