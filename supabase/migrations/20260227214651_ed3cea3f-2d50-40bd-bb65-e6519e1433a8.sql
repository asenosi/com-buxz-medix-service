
-- Create enums
CREATE TYPE public.document_status AS ENUM (
  'UPLOADED', 'PREPROCESSING', 'OCR_RUNNING', 'EXTRACTION_RUNNING',
  'DRAFT_READY', 'NEEDS_REVIEW', 'CONFIRMED', 'FAILED'
);

CREATE TYPE public.document_type_hint AS ENUM (
  'PRINTED', 'HANDWRITTEN', 'MIXED', 'UNKNOWN'
);

-- documents table
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  original_file_url text NOT NULL,
  status public.document_status NOT NULL DEFAULT 'UPLOADED',
  document_type_hint public.document_type_hint NOT NULL DEFAULT 'UNKNOWN',
  page_count integer NOT NULL DEFAULT 1,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- extraction_drafts table
CREATE TABLE public.extraction_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_version text NOT NULL DEFAULT '1.0',
  llm_model text,
  prompt_version text,
  draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  needs_human_review boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extraction drafts" ON public.extraction_drafts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = extraction_drafts.document_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can create extraction drafts for their documents" ON public.extraction_drafts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = extraction_drafts.document_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can update their extraction drafts" ON public.extraction_drafts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = extraction_drafts.document_id AND d.user_id = auth.uid()));

-- confirmed_plans table
CREATE TABLE public.confirmed_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  confirmed_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.confirmed_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own confirmed plans" ON public.confirmed_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own confirmed plans" ON public.confirmed_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- audit_events table (immutable log)
CREATE TABLE public.audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit events for their documents" ON public.audit_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = audit_events.document_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can create audit events for their documents" ON public.audit_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.documents d WHERE d.id = audit_events.document_id AND d.user_id = auth.uid()));

-- Private prescriptions storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);

CREATE POLICY "Users can upload prescriptions" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own prescriptions" ON storage.objects FOR SELECT
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own prescriptions" ON storage.objects FOR DELETE
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
