  -- RailNet course staging + compliance documents (admin-only, additive)

  CREATE TYPE compliance_document_type AS ENUM (
    'disaster_recovery',
    'incident_response',
    'hipaa_risk_analysis',
    'acceptable_use',
    'vulnerability_management',
    'security_awareness'
  );

  CREATE TYPE compliance_document_status AS ENUM (
    'draft',
    'in_review',
    'approved'
  );

  CREATE TYPE course_staging_status AS ENUM (
    'pending_review',
    'published',
    'rejected'
  );

  CREATE TABLE compliance_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type compliance_document_type NOT NULL UNIQUE,
    title TEXT NOT NULL,
    template_structure JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type compliance_document_type NOT NULL,
    title TEXT NOT NULL,
    status compliance_document_status NOT NULL DEFAULT 'draft',
    railnet_org_id TEXT,
    current_version_id UUID,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE compliance_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL CHECK (version_number > 0),
    content JSONB NOT NULL DEFAULT '{}',
    aws_data_snapshot JSONB,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_number)
  );

  ALTER TABLE compliance_documents
    ADD CONSTRAINT compliance_documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES compliance_document_versions(id) ON DELETE SET NULL;

  CREATE TABLE course_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    railnet_org_id TEXT NOT NULL,
    source_assignment_sk TEXT,
    source_trend_report_sk TEXT,
    title TEXT NOT NULL,
    status course_staging_status NOT NULL DEFAULT 'pending_review',
    proposed_content JSONB NOT NULL,
    published_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX course_staging_status_idx ON course_staging (status);
  CREATE INDEX compliance_documents_status_idx ON compliance_documents (status);
  CREATE INDEX compliance_documents_railnet_org_idx ON compliance_documents (railnet_org_id);

  ALTER TABLE compliance_document_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE compliance_document_versions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE course_staging ENABLE ROW LEVEL SECURITY;

  CREATE POLICY compliance_document_templates_admin_all ON compliance_document_templates
    FOR ALL USING (auth_user_role() = 'admin') WITH CHECK (auth_user_role() = 'admin');

  CREATE POLICY compliance_documents_admin_all ON compliance_documents
    FOR ALL USING (auth_user_role() = 'admin') WITH CHECK (auth_user_role() = 'admin');

  CREATE POLICY compliance_document_versions_admin_all ON compliance_document_versions
    FOR ALL USING (auth_user_role() = 'admin') WITH CHECK (auth_user_role() = 'admin');

  CREATE POLICY course_staging_admin_all ON course_staging
    FOR ALL USING (auth_user_role() = 'admin') WITH CHECK (auth_user_role() = 'admin');

  INSERT INTO compliance_document_templates (doc_type, title, template_structure) VALUES
    (
      'disaster_recovery',
      'Disaster Recovery Plan',
      '{"sections":[{"id":"executive_summary","label":"Executive summary","type":"textarea"},{"id":"recovery_objectives","label":"Recovery objectives (RTO/RPO)","type":"textarea"},{"id":"critical_systems","label":"Critical systems","type":"textarea"},{"id":"backup_procedures","label":"Backup procedures","type":"textarea"},{"id":"communication_plan","label":"Communication plan","type":"textarea"}]}'::jsonb
    ),
    (
      'incident_response',
      'Incident Response Plan',
      '{"sections":[{"id":"executive_summary","label":"Executive summary","type":"textarea"},{"id":"roles_responsibilities","label":"Roles and responsibilities","type":"textarea"},{"id":"detection_reporting","label":"Detection and reporting","type":"textarea"},{"id":"containment_eradication","label":"Containment and eradication","type":"textarea"},{"id":"post_incident_review","label":"Post-incident review","type":"textarea"}]}'::jsonb
    ),
    (
      'hipaa_risk_analysis',
      'HIPAA Risk Analysis',
      '{"sections":[{"id":"executive_summary","label":"Executive summary","type":"textarea"},{"id":"scope","label":"Scope of analysis","type":"textarea"},{"id":"threat_landscape","label":"Threat landscape","type":"textarea"},{"id":"safeguards","label":"Administrative/technical safeguards","type":"textarea"},{"id":"residual_risk","label":"Residual risk","type":"textarea"}]}'::jsonb
    ),
    (
      'acceptable_use',
      'Acceptable Use Policy',
      '{"sections":[{"id":"purpose","label":"Purpose","type":"textarea"},{"id":"acceptable_use","label":"Acceptable use","type":"textarea"},{"id":"prohibited_use","label":"Prohibited use","type":"textarea"},{"id":"security_awareness","label":"Security awareness requirements","type":"textarea"}]}'::jsonb
    ),
    (
      'vulnerability_management',
      'Vulnerability Management Program',
      '{"sections":[{"id":"executive_summary","label":"Executive summary","type":"textarea"},{"id":"scanning_cadence","label":"Scanning cadence","type":"textarea"},{"id":"patch_management","label":"Patch management","type":"textarea"},{"id":"outdated_software","label":"Outdated software findings","type":"textarea"},{"id":"remediation_sla","label":"Remediation SLAs","type":"textarea"}]}'::jsonb
    ),
    (
      'security_awareness',
      'Security Awareness Program',
      '{"sections":[{"id":"executive_summary","label":"Executive summary","type":"textarea"},{"id":"training_program","label":"Training program overview","type":"textarea"},{"id":"weak_domains","label":"Weak domains / focus areas","type":"textarea"},{"id":"approved_controls","label":"Approved detection controls","type":"textarea"}]}'::jsonb
    )
  ON CONFLICT (doc_type) DO NOTHING;
