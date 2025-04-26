-- Önce tabloları temizleyelim (eğer varsa)
DROP TABLE IF EXISTS drawings;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS rooms;

-- Oyun odaları tablosu
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL UNIQUE,
  host_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  current_word VARCHAR(100),
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Oyuncular tablosu
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  is_drawing BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  connected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE,
  UNIQUE (room_code, player_id)
);

-- Sohbet mesajları tablosu
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_correct_guess BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
);

-- Çizimler tablosu
CREATE TABLE drawings (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  drawing_data TEXT NOT NULL,
  word VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_players_room_code ON players(room_code);
CREATE INDEX idx_players_player_id ON players(player_id);
CREATE INDEX idx_messages_room_code ON messages(room_code);
CREATE INDEX idx_drawings_room_code ON drawings(room_code);
