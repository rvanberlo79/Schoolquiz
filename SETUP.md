# Setup Instructions

## 1. Install Dependencies

First, install all required packages:

```bash
npm install
```

## 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once your project is ready, go to **Settings** > **API**
4. Copy your **Project URL** and **anon/public key**

## 3. Configure Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_project_url` and `your_supabase_anon_key` with the values from your Supabase project.

## 4. Create the profiles table (for nicknames, difficulty, leaderboard)

To use **User Settings** (nickname and difficulty level) and show nicknames on the **Leaderboard**, create the `profiles` table once:

1. In Supabase Dashboard go to **SQL Editor** → **New query**
2. Open the file `supabase/create_profiles_table.sql` in this project, copy all its contents, and paste into the SQL Editor
3. Click **Run**

After this, saving a nickname, avatar, and difficulty level in User Settings will work, and the leaderboard will show nicknames. Difficulty level can be used in games via the `useProfile()` hook.

**If you already have the profiles table**, run the migrations in the SQL Editor as needed:
- `supabase/migrations/20250228000000_add_difficulty_to_profiles.sql` (difficulty_level)
- `supabase/migrations/20250228100000_add_avatar_to_profiles.sql` (avatar 0–55)

**Avatars:** The User Settings avatar picker offers 3 avatars in `public/avatars/` (avatar-0.png, avatar-1.png, avatar-2.png).

## 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

## Features

- **Login Page**: Beautiful gradient design matching the reference image
- **Signup Page**: Create new user accounts
- **Forgot Password**: Password reset functionality
- **Protected Routes**: Hello World page is only accessible after login
- **User Authentication**: All user data stored securely in Supabase

## Routes

- `/login` - Login page (default)
- `/signup` - Sign up page
- `/forgot-password` - Password reset page
- `/home` - Protected Hello World page (requires authentication)

