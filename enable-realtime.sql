-- Realtime için tabloları etkinleştir
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table drawings;

-- Realtime için tabloları yapılandır
comment on table rooms is '@realtime';
comment on table players is '@realtime';
comment on table messages is '@realtime';
comment on table drawings is '@realtime';
