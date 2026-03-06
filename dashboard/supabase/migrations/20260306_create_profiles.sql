-- =============================================================================
-- Migration: create_profiles
-- Creates the profiles table, RLS policies, and auto-provisioning trigger
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: profiles
-- One row per user. auth_id links to auth.users; id is a human-readable slug.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
    id           TEXT        PRIMARY KEY,
    auth_id      UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name TEXT        NOT NULL,
    email        TEXT,
    role         TEXT        NOT NULL DEFAULT 'member',
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Seed: known admin users
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, auth_id, display_name, role) VALUES
    ('lance',      '7435634a-27ea-4e90-875c-ea0859d2c6c0', 'Lance Manlove', 'admin'),
    ('rob-hoeller', 'dbdf86c1-499f-4213-ba64-85a71b29a780', 'Rob Hoeller',   'admin'),
    ('rob-lepard',  'b02c9e2f-2387-4220-9e58-20722c220504', 'Rob Lepard',    'admin');

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all profiles (e.g. for displaying names)
CREATE POLICY "authenticated users can read profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- A user may only update their own profile row
CREATE POLICY "users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Trigger: auto-create a profile when a new auth.users row is inserted
-- The profile id defaults to the user's email local-part; display_name to
-- their full_name metadata when available, otherwise their email.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _id           TEXT;
    _display_name TEXT;
    _email        TEXT;
BEGIN
    _email        := NEW.email;
    -- Use the local-part of the email as a default slug id
    _id           := COALESCE(
                         SPLIT_PART(_email, '@', 1),
                         NEW.id::TEXT
                     );
    -- Prefer full_name from user metadata, fall back to email
    _display_name := COALESCE(
                         NEW.raw_user_meta_data->>'full_name',
                         _email,
                         NEW.id::TEXT
                     );

    INSERT INTO profiles (id, auth_id, display_name, email, role)
    VALUES (_id, NEW.id, _display_name, _email, 'member')
    -- If a profile with that id already exists (e.g. the seed rows above),
    -- just backfill the auth_id without overwriting other fields.
    ON CONFLICT (id) DO UPDATE
        SET auth_id = EXCLUDED.auth_id
    -- Also handle the unique auth_id constraint gracefully
    ON CONFLICT (auth_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
