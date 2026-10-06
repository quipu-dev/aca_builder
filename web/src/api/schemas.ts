import { s } from './validator';

export const DiagnosticIssueSchema = s.object({
  level: s.string(),
  code: s.string(),
  message: s.string(),
  target: s.optional(s.any()),
});

export const LintReportSchema = s.object({
  workspace: s.string(),
  error_count: s.number(),
  warn_count: s.number(),
  issues: s.array(DiagnosticIssueSchema),
});

export const AtomDetailSchema = s.object({
  id: s.string(),
  package: s.optional(s.any()),
  meta: s.record(s.any()),
  content: s.string(),
  raw: s.string(),
  source_file: s.string(),
});
