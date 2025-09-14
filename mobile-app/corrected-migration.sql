-- Corrected Migration SQL for user_profiles table and profiles view
-- This version handles missing columns gracefully

-- Step 1: Create user_profiles table (if not exists)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Business profile fields
    company_name TEXT,
    business_type TEXT,
    phone_number TEXT,
    address TEXT,
    
    -- Preferences and settings
    theme_preference TEXT DEFAULT 'light',
    language_preference TEXT DEFAULT 'ja',
    notification_settings JSONB DEFAULT '{"email": true, "push": true}',
    
    -- Business settings
    currency TEXT DEFAULT 'JPY',
    tax_rate DECIMAL(5,4) DEFAULT 0.10,
    profit_margin DECIMAL(5,4) DEFAULT 0.20,
    
    -- Display preferences
    profit_visible BOOLEAN DEFAULT true,
    cost_breakdown_visible BOOLEAN DEFAULT true,
    
    -- Status and metadata
    status TEXT DEFAULT 'active',
    role TEXT DEFAULT 'contractor',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 4: Create a function to safely migrate data from profiles table
CREATE OR REPLACE FUNCTION migrate_profiles_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    profile_record RECORD;
    column_exists BOOLEAN;
BEGIN
    -- Check if the source profiles table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE NOTICE 'Source profiles table does not exist. Skipping migration.';
        RETURN;
    END IF;

    -- Check which columns exist in the source table
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'profit_visible'
    ) INTO column_exists;

    -- Migrate data based on available columns
    IF column_exists THEN
        -- Full migration with all columns
        INSERT INTO user_profiles (
            id, email, full_name, avatar_url, website, updated_at,
            company_name, business_type, phone_number, address,
            theme_preference, language_preference, notification_settings,
            currency, tax_rate, profit_margin,
            profit_visible, cost_breakdown_visible,
            status, role, last_login_at, created_at
        )
        SELECT 
            id, 
            email, 
            full_name, 
            avatar_url, 
            website, 
            COALESCE(updated_at, timezone('utc'::text, now())),
            company_name, 
            business_type, 
            phone_number, 
            address,
            COALESCE(theme_preference, 'light'), 
            COALESCE(language_preference, 'ja'), 
            COALESCE(notification_settings, '{"email": true, "push": true}'::jsonb),
            COALESCE(currency, 'JPY'), 
            COALESCE(tax_rate, 0.10), 
            COALESCE(profit_margin, 0.20),
            COALESCE(profit_visible, true), 
            COALESCE(cost_breakdown_visible, true),
            COALESCE(status, 'active'), 
            COALESCE(role, 'contractor'), 
            last_login_at, 
            COALESCE(created_at, timezone('utc'::text, now()))
        FROM public.profiles
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            website = EXCLUDED.website,
            updated_at = EXCLUDED.updated_at,
            company_name = EXCLUDED.company_name,
            business_type = EXCLUDED.business_type,
            phone_number = EXCLUDED.phone_number,
            address = EXCLUDED.address,
            theme_preference = EXCLUDED.theme_preference,
            language_preference = EXCLUDED.language_preference,
            notification_settings = EXCLUDED.notification_settings,
            currency = EXCLUDED.currency,
            tax_rate = EXCLUDED.tax_rate,
            profit_margin = EXCLUDED.profit_margin,
            profit_visible = EXCLUDED.profit_visible,
            cost_breakdown_visible = EXCLUDED.cost_breakdown_visible,
            status = EXCLUDED.status,
            role = EXCLUDED.role,
            last_login_at = EXCLUDED.last_login_at,
            created_at = EXCLUDED.created_at;
    ELSE
        -- Limited migration with only basic columns
        EXECUTE format('
            INSERT INTO user_profiles (
                id, email, full_name, avatar_url, website, updated_at,
                company_name, business_type, phone_number, address,
                theme_preference, language_preference, 
                currency, tax_rate, profit_margin,
                status, role, last_login_at, created_at
            )
            SELECT 
                id, 
                %s, 
                %s, 
                %s, 
                %s, 
                COALESCE(%s, timezone(''utc''::text, now())),
                %s, 
                %s, 
                %s, 
                %s,
                COALESCE(%s, ''light''), 
                COALESCE(%s, ''ja''), 
                COALESCE(%s, ''JPY''), 
                COALESCE(%s, 0.10), 
                COALESCE(%s, 0.20),
                COALESCE(%s, ''active''), 
                COALESCE(%s, ''contractor''), 
                %s, 
                COALESCE(%s, timezone(''utc''::text, now()))
            FROM public.profiles
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                avatar_url = EXCLUDED.avatar_url,
                website = EXCLUDED.website,
                updated_at = EXCLUDED.updated_at,
                company_name = EXCLUDED.company_name,
                business_type = EXCLUDED.business_type,
                phone_number = EXCLUDED.phone_number,
                address = EXCLUDED.address,
                theme_preference = EXCLUDED.theme_preference,
                language_preference = EXCLUDED.language_preference,
                currency = EXCLUDED.currency,
                tax_rate = EXCLUDED.tax_rate,
                profit_margin = EXCLUDED.profit_margin,
                status = EXCLUDED.status,
                role = EXCLUDED.role,
                last_login_at = EXCLUDED.last_login_at,
                created_at = EXCLUDED.created_at',
            -- Safely reference columns that might exist
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN 'email' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN 'full_name' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN 'avatar_url' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website') THEN 'website' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN 'updated_at' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_name') THEN 'company_name' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'business_type') THEN 'business_type' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN 'phone_number' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address') THEN 'address' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'theme_preference') THEN 'theme_preference' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'language_preference') THEN 'language_preference' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'currency') THEN 'currency' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tax_rate') THEN 'tax_rate' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'profit_margin') THEN 'profit_margin' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN 'status' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN 'role' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at') THEN 'last_login_at' ELSE 'NULL' END,
            CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN 'created_at' ELSE 'NULL' END
        );
    END IF;

    RAISE NOTICE 'Profile data migration completed successfully.';
END;
$$;

-- Step 5: Execute the migration
SELECT migrate_profiles_data();

-- Step 6: Drop the migration function (cleanup)
DROP FUNCTION IF EXISTS migrate_profiles_data();

-- Step 7: Rename original profiles table to profiles_backup (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles RENAME TO profiles_backup;
        RAISE NOTICE 'Original profiles table renamed to profiles_backup.';
    END IF;
END
$$;

-- Step 8: Create the profiles view
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    email,
    full_name,
    avatar_url,
    website,
    updated_at,
    company_name,
    business_type,
    phone_number,
    address,
    theme_preference,
    language_preference,
    notification_settings,
    currency,
    tax_rate,
    profit_margin,
    profit_visible,
    cost_breakdown_visible,
    status,
    role,
    last_login_at,
    created_at
FROM user_profiles;

-- Step 9: Enable RLS on the view (inherited from user_profiles)
ALTER VIEW public.profiles SET (security_invoker = true);

-- Step 10: Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Step 11: Create trigger on user_profiles
DROP TRIGGER IF EXISTS handle_updated_at ON user_profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Step 12: Insert a profile for any existing users who don't have one
INSERT INTO user_profiles (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    timezone('utc'::text, now())
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Original profiles table backed up as profiles_backup (if it existed).';
    RAISE NOTICE 'New user_profiles table created with all necessary columns.';
    RAISE NOTICE 'Public profiles view created for backward compatibility.';
END
$$;