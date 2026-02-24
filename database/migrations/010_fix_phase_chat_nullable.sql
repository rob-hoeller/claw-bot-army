-- Make handoff_packet_id nullable so phase chat messages
-- can be created without being tied to a handoff packet.
ALTER TABLE phase_chat_messages ALTER COLUMN handoff_packet_id DROP NOT NULL;
