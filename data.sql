DO $$
DECLARE
  my_user_id UUID := '3108fbde-9fc5-49a3-9db7-6f286eaf6980';
  
  -- SPT UUIDs
  spt1 UUID := '10000000-0000-0000-0000-000000000001';
  spt2 UUID := '10000000-0000-0000-0000-000000000002';
  spt3 UUID := '10000000-0000-0000-0000-000000000003';

  -- JPT UUIDs
  jpt1 UUID := '20000000-0000-0000-0000-000000000001';
  jpt2 UUID := '20000000-0000-0000-0000-000000000002';
  jpt3 UUID := '20000000-0000-0000-0000-000000000003';
  jpt4 UUID := '20000000-0000-0000-0000-000000000004';
  jpt5 UUID := '20000000-0000-0000-0000-000000000005';
  jpt6 UUID := '20000000-0000-0000-0000-000000000006';
  jpt7 UUID := '20000000-0000-0000-0000-000000000007';
  jpt8 UUID := '20000000-0000-0000-0000-000000000008';
  jpt9 UUID := '20000000-0000-0000-0000-000000000009';

  -- Associate UUIDs
  a1 UUID := '30000000-0000-0000-0000-000000000001';
  a2 UUID := '30000000-0000-0000-0000-000000000002';
  a3 UUID := '30000000-0000-0000-0000-000000000003';
  a4 UUID := '30000000-0000-0000-0000-000000000004';
  a5 UUID := '30000000-0000-0000-0000-000000000005';
  a6 UUID := '30000000-0000-0000-0000-000000000006';
  a7 UUID := '30000000-0000-0000-0000-000000000007';
  a8 UUID := '30000000-0000-0000-0000-000000000008';
  a9 UUID := '30000000-0000-0000-0000-000000000009';
  a10 UUID := '30000000-0000-0000-0000-000000000010';
  a11 UUID := '30000000-0000-0000-0000-000000000011';
  a12 UUID := '30000000-0000-0000-0000-000000000012';

BEGIN

  -- 1. Create SPTs
  INSERT INTO public.users (id, name, role, email, status) VALUES 
    (spt1, 'Rohan (SPT)', 'SPT', 'spt1@example.com', 'active'),
    (spt2, 'Priya (SPT)', 'SPT', 'spt2@example.com', 'active'),
    (spt3, 'Vikram (SPT)', 'SPT', 'spt3@example.com', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure your own user is an SPT (Admin)
  UPDATE public.users SET role = 'SPT', status = 'active' WHERE id = my_user_id;

  -- 2. Create JPTs
  INSERT INTO public.users (id, name, role, email, status) VALUES 
    (jpt1, 'Amit (JPT)', 'JPT', 'jpt1@example.com', 'active'),
    (jpt2, 'Sneha (JPT)', 'JPT', 'jpt2@example.com', 'active'),
    (jpt3, 'Karan (JPT)', 'JPT', 'jpt3@example.com', 'active'),
    (jpt4, 'Neha (JPT)', 'JPT', 'jpt4@example.com', 'active'),
    (jpt5, 'Rahul (JPT)', 'JPT', 'jpt5@example.com', 'active'),
    (jpt6, 'Anjali (JPT)', 'JPT', 'jpt6@example.com', 'active'),
    (jpt7, 'Deepak (JPT)', 'JPT', 'jpt7@example.com', 'active'),
    (jpt8, 'Pooja (JPT)', 'JPT', 'jpt8@example.com', 'active'),
    (jpt9, 'Suresh (JPT)', 'JPT', 'jpt9@example.com', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Create Associates
  INSERT INTO public.users (id, name, role, email, status) VALUES 
    (a1, 'Aisha (Assoc)', 'Associate', 'a1@example.com', 'active'),
    (a2, 'Ravi (Assoc)', 'Associate', 'a2@example.com', 'active'),
    (a3, 'Maya (Assoc)', 'Associate', 'a3@example.com', 'active'),
    (a4, 'Dev (Assoc)', 'Associate', 'a4@example.com', 'active'),
    (a5, 'Riya (Assoc)', 'Associate', 'a5@example.com', 'active'),
    (a6, 'Arjun (Assoc)', 'Associate', 'a6@example.com', 'active'),
    (a7, 'Sanya (Assoc)', 'Associate', 'a7@example.com', 'active'),
    (a8, 'Yash (Assoc)', 'Associate', 'a8@example.com', 'active'),
    (a9, 'Kavya (Assoc)', 'Associate', 'a9@example.com', 'active'),
    (a10, 'Samir (Assoc)', 'Associate', 'a10@example.com', 'active'),
    (a11, 'Tara (Assoc)', 'Associate', 'a11@example.com', 'active'),
    (a12, 'Aditya (Assoc)', 'Associate', 'a12@example.com', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Create dummy Tasks (Open, In Progress, Completed)
  INSERT INTO public.tasks (title, description, tags, status, created_by, assignable_to, assigned_to, required_associates, required_jpts) VALUES 
    -- Open Tasks
    ('Venue Booking Finalization', 'Follow up with the admin to confirm the auditorium booking.', ARRAY['logistics', 'urgent'], 'Open', spt1, ARRAY['JPT'], ARRAY[]::UUID[], 0, 1),
    ('Order ID Cards & Lanyards', 'Get quotes from 3 vendors for 500 ID cards.', ARRAY['procurement'], 'Open', jpt2, ARRAY['Associate'], ARRAY[]::UUID[], 2, 0),
    ('Create Social Media Teaser', 'Design a 15-second teaser video for Instagram reels.', ARRAY['design', 'socials'], 'Open', jpt4, ARRAY['Associate'], ARRAY[]::UUID[], 1, 0),
    ('Draft Invitation Letters', 'Prepare official invitation letters for chief guests.', ARRAY['documentation'], 'Open', my_user_id, ARRAY['JPT', 'Associate'], ARRAY[]::UUID[], 1, 1),
    
    -- In Progress Tasks
    ('Sponsorship Outreach (Tier 1)', 'Contacting title sponsors. Ongoing negotiation.', ARRAY['sponsorship', 'finance'], 'In Progress', spt2, ARRAY['JPT'], ARRAY[jpt1, jpt3]::UUID[], 0, 2),
    ('Website UI Refresh', 'Updating the homepage for the fest. Almost done with the hero section.', ARRAY['tech', 'design'], 'In Progress', jpt5, ARRAY['Associate'], ARRAY[a1, a2, a3]::UUID[], 3, 0),
    ('Catering Menu Selection', 'Tasting and finalizing the menu with the vendor.', ARRAY['logistics', 'food'], 'In Progress', jpt6, ARRAY['JPT', 'Associate'], ARRAY[jpt6, a4, a5]::UUID[], 2, 1),
    ('Decor Setup Planning', 'Creating the layout and material list for the entrance arch.', ARRAY['creative'], 'In Progress', jpt7, ARRAY['Associate'], ARRAY[a6, a7]::UUID[], 2, 0),
    ('Speaker Accommodation', 'Booking hotels for the 3 guest speakers.', ARRAY['hospitality'], 'In Progress', my_user_id, ARRAY['JPT'], ARRAY[jpt8]::UUID[], 0, 1),

    -- Completed Tasks
    ('Initial Budget Approval', 'Got the initial budget approved by the dean.', ARRAY['finance', 'admin'], 'Completed', spt3, ARRAY['JPT'], ARRAY[jpt9]::UUID[], 0, 1),
    ('Theme Selection Meeting', 'Decided on "Retro Future" as the fest theme.', ARRAY['creative', 'planning'], 'Completed', spt1, ARRAY['JPT', 'Associate'], ARRAY[jpt2, jpt4, a8]::UUID[], 1, 2),
    ('Create WhatsApp Groups', 'Set up all internal communication channels.', ARRAY['admin'], 'Completed', jpt1, ARRAY['Associate'], ARRAY[a9, a10]::UUID[], 2, 0);

  -- 5. Create dummy Announcements
  INSERT INTO public.announcements (title, content, author_id, audience, is_pinned) VALUES
    ('🚨 Urgent: All-hands meeting tonight', 'We need everyone at the student center at 8 PM for a crucial update on sponsorships.', spt1, 'all', true),
    ('Budget Increased!', 'Great news, the admin has increased our budget by 20%.', spt2, 'jpt-only', true),
    ('T-shirt designs finalized', 'The design team has finalized the core team t-shirts. Check the drive link.', jpt4, 'all', false),
    ('Logistics Team Update', 'We have secured the main auditorium. Good job team!', jpt6, 'all', false),
    ('Sponsorship leads needed', 'If anyone has contacts in local tech companies, please DM Amit.', jpt1, 'jpt-only', false);

  -- 6. Create dummy Resources
  INSERT INTO public.resources (title, description, link, created_by) VALUES
    ('Fest Master Timeline', 'Gantt chart containing all deadlines.', '{"name": "Google Sheets", "url": "https://docs.google.com"}'::jsonb, spt1),
    ('Sponsorship Deck 2026', 'The pitch deck to share with potential sponsors.', '{"name": "PDF Download", "url": "https://drive.google.com"}'::jsonb, jpt3),
    ('Vendor Contact List', 'Database of all vendors we used last year (Catering, Tent, Sound).', '{"name": "Airtable", "url": "https://airtable.com"}'::jsonb, jpt6),
    ('Design Brand Kit', 'Logos, fonts, hex codes, and templates for social media.', '{"name": "Canva Team Link", "url": "https://canva.com"}'::jsonb, jpt4),
    ('Reimbursement Form', 'Fill this out if you paid for any fest materials out of pocket.', '{"name": "Google Form", "url": "https://forms.google.com"}'::jsonb, spt3);

END $$;
