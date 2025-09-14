-- Work Sites table creation and security policies
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- IMPORTANT: This migration depends on user_profiles table existing
-- Make sure migration 009_create_profiles_view_and_user_profiles.sql has been executed first

-- Create work_sites table
CREATE TABLE IF NOT EXISTS work_sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    project_id UUID,
    client_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    manager_id UUID REFERENCES auth.users(id),
    notes TEXT,
    coordinates JSONB,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_sites_company_id ON work_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_work_sites_manager_id ON work_sites(manager_id);
CREATE INDEX IF NOT EXISTS idx_work_sites_status ON work_sites(status);
CREATE INDEX IF NOT EXISTS idx_work_sites_created_by ON work_sites(created_by);

-- Enable Row Level Security
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access work sites from their company
CREATE POLICY "Users can view work sites from their company" ON work_sites
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert work sites for their company
CREATE POLICY "Users can create work sites for their company" ON work_sites
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) AND
        created_by = auth.uid()
    );

-- Users can update work sites in their company
CREATE POLICY "Users can update work sites in their company" ON work_sites
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Only managers or admins can delete work sites
CREATE POLICY "Managers can delete work sites" ON work_sites
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) AND
        (
            manager_id = auth.uid() OR
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'manager')
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_sites_updated_at 
    BEFORE UPDATE ON work_sites 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO work_sites (name, address, status, client_name, company_id, manager_id, created_by, notes) 
VALUES 
    ('東京駅前プロジェクト', '東京都千代田区丸の内1-1-1', 'active', '株式会社サンプル', 
     '00000000-0000-0000-0000-000000000001', 
     '00000000-0000-0000-0000-000000000001', 
     '00000000-0000-0000-0000-000000000001',
     'サンプルの現場データです')
ON CONFLICT (id) DO NOTHING;