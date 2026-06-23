
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar TEXT,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_roles policies
CREATE POLICY "View own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Analytics
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analytics_metric_created_idx ON public.analytics(metric, created_at DESC);
GRANT SELECT, INSERT ON public.analytics TO authenticated;
GRANT ALL ON public.analytics TO service_role;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read analytics" ON public.analytics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert analytics" ON public.analytics FOR INSERT TO authenticated WITH CHECK (true);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activities_created_idx ON public.activities(created_at DESC);
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View activities" ON public.activities FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Insert own activity" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reports" ON public.reports FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger: create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- First user is admin
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  INSERT INTO public.activities (user_id, event, description)
  VALUES (NEW.id, 'user.signup', 'New user registered');

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (NEW.id, 'Welcome to InsightFlow', 'Your analytics dashboard is ready.');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Seed 60 days of analytics
INSERT INTO public.analytics (metric, value, category, created_at)
SELECT
  metric,
  CASE metric
    WHEN 'revenue' THEN 8000 + random()*4000 + (60-d)*120
    WHEN 'users' THEN 450 + random()*200 + (60-d)*8
    WHEN 'active_users' THEN 180 + random()*120 + (60-d)*4
    WHEN 'orders' THEN 80 + random()*60 + (60-d)*2
    WHEN 'conversion' THEN 2.5 + random()*2
    WHEN 'traffic' THEN 1200 + random()*800 + (60-d)*15
  END,
  CASE (random()*4)::int
    WHEN 0 THEN 'Direct' WHEN 1 THEN 'Organic'
    WHEN 2 THEN 'Social' ELSE 'Referral'
  END,
  now() - (d || ' days')::interval - (random()*86400 || ' seconds')::interval
FROM generate_series(0, 59) AS d,
  unnest(ARRAY['revenue','users','active_users','orders','conversion','traffic']) AS metric;

-- Seed activities (no user_id since none exist yet)
INSERT INTO public.activities (event, description, created_at)
SELECT
  (ARRAY['order.created','report.generated','data.update','user.login','metric.spike'])[1+(random()*4)::int],
  (ARRAY['Order #'||(1000+(random()*9000)::int)||' created','Weekly report generated','Metrics updated','User signed in','Traffic spike detected'])[1+(random()*4)::int],
  now() - (random()*30 || ' days')::interval
FROM generate_series(1,40);
