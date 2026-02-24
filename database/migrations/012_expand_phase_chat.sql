-- Expand phase_chat_messages to support all pipeline phases and agent author types

ALTER TABLE phase_chat_messages DROP CONSTRAINT IF EXISTS phase_chat_messages_phase_check;
ALTER TABLE phase_chat_messages ADD CONSTRAINT phase_chat_messages_phase_check 
  CHECK (phase IN ('planning', 'design_review', 'in_progress', 'qa_review', 'review', 'approved', 'pr_submitted', 'done'));

ALTER TABLE phase_chat_messages DROP CONSTRAINT IF EXISTS phase_chat_messages_author_type_check;
ALTER TABLE phase_chat_messages ADD CONSTRAINT phase_chat_messages_author_type_check 
  CHECK (author_type IN ('human', 'agent', 'orchestrator', 'system'));
