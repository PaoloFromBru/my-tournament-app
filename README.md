This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend Setup

1. Create a [Supabase](https://supabase.com) project.
2. In the Supabase dashboard create the app tables used by the client:
   - **sports** for shared sport configuration, including `id`, `display_name`, `skills`, and `team_size`.
   - **user_profiles** with `user_id` (uuid, primary key), `email`, `sport_id`, `paying_status`, and `donation_date`.
   - **players** with `id` (uuid, primary key), `name`, and `user_id`.
   - **player_profiles** with `player_id`, `sport_id`, and `skills`.
   - **teams** with `id` (uuid, primary key), `name`, `user_id`, `sport_id`, and optional `tournament_id`.
   - **team_players** with `team_id`, `player_id`, and `user_id`.
   - **tournaments** with `id` (uuid, primary key), `name`, `format`, `user_id`, `sport_id`, `ended`, and `winner_id`.
   - **tournament_teams** with `tournament_id`, `team_id`, and `user_id`.
   - **matches** with `id`, `tournament_id`, `team_a`, `team_b`, `phase`, `scheduled_at`, `winner`, `score_a`, `score_b`, and `user_id`.
3. Run the following SQL so a profile row is automatically created whenever a new user signs up:

   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.user_profiles (user_id)
     values (new.id);
     return new;
   end;
   $$ language plpgsql;

   create trigger on_auth_user_created
   after insert on auth.users
   for each row execute function public.handle_new_user();
   ```
4. Run [`scripts/supabase_data_api_grants_and_rls.sql`](./scripts/supabase_data_api_grants_and_rls.sql) in the Supabase SQL editor. This adds missing `user_id` ownership columns for older schemas, makes Supabase Data API grants explicit, enables RLS on user-owned tables, gives authenticated users access to their own data, and keeps anonymous access read-only for public tournament views.
5. Under **Authentication** enable email login and disable anonymous sign ups.
6. In the **Email** settings choose **Email OTP** for "Confirm signup" so new accounts receive a numeric code instead of a magic link. Also set the password recovery redirect URL to `<your site>/reset` so the reset link leads to the page for choosing a new password.
7. Set the SMTP settings to use your [Resend](https://resend.com) credentials so Supabase will send the emails via Resend.
8. Grab the project URL and anon key from the Supabase settings and add them to an `.env` file using the variables shown in `.env.example`.

### Supabase Data API grants

Supabase announced that new tables in the `public` schema are no longer automatically exposed to the Data API. Because this app uses `supabase-js`, every table the client reads or writes needs explicit grants. Keep grants, RLS, and policies together in SQL whenever you add a table.

For this app:

- `authenticated` gets read/write grants on user-owned app tables, with RLS policies limiting access to rows where `user_id = auth.uid()` or related owned rows.
- `anon` gets read-only column grants for public tournament viewing on `tournaments`, `teams`, `tournament_teams`, and `matches`.
- `anon` does not get insert, update, or delete grants.
- `sports` is shared configuration and is read-only to normal app users.

Public tournament URLs are shareable read-only views. They are not an authorization boundary for private data, so do not store sensitive data in tournament names, team names, or match fields.

## Authentication

Users sign in with an email and password. Registering sends a confirmation code
to the provided address which must be entered to verify the account. Forgotten
passwords can be reset via a recovery email.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Importing Players from CSV

On the Settings page you can bulk add players by uploading a CSV file. The file
should contain the player's `name` followed by one column for each skill of the
selected sport. Example:

```
name,attack,defense,serve
Alice,7,6,5
Bob,5,8,6
```

The first row can optionally be a header. If present, its skill columns must
match the selected sport's configured skills. Both `,` and `;` separators are
accepted. After choosing your file and clicking **Import Players**, a message
will indicate whether the operation succeeded or failed.
