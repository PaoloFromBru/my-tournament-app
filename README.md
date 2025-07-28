This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend Setup

1. Create a [Supabase](https://supabase.com) project.
2. In the Supabase dashboard create three tables:
   - **players** with columns `id` (uuid, primary key), `name` (text), `offense` (int4), `defense` (int4).
   - **tournaments** with columns `id` (uuid, primary key) and `name` (text).
   - **user_profiles** with column `user_id` (uuid, primary key).
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
4. Under **Authentication** enable email login and disable anonymous sign ups.
5. In the **Email** settings choose **Email OTP** for "Confirm signup" so new accounts receive a numeric code instead of a magic link. Also set the password recovery redirect URL to `<your site>/reset` so the reset link leads to the page for choosing a new password.
6. Set the SMTP settings to use your [Resend](https://resend.com) credentials so Supabase will send the emails via Resend.
7. Grab the project URL and anon key from the Supabase settings and add them to an `.env` file using the variables shown in `.env.example`.

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

The first row can optionally be a header and will be ignored. Both `,` and `;`
separators are accepted. After choosing your file and clicking **Import
Players**, a message will indicate whether the operation succeeded or failed.
