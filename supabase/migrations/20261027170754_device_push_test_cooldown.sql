alter table public.push_subscriptions add column last_test_at timestamptz;
comment on column public.push_subscriptions.last_test_at is 'Server-only throttle for explicit, single-device notification tests.';
