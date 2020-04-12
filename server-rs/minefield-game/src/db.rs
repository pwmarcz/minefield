use std::collections::HashMap;

use failure::Error;
use rusqlite::{params, Connection};

use crate::room::Room;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: &str) -> Result<Self, Error> {
        let conn = Connection::open(path)?;
        conn.execute(
            "
            CREATE TABLE IF NOT EXISTS rooms (
                create_date TIMESTAMP NOT NULL DEFAULT current_timestamp,
                finished INTEGER NOT NULL,
                data TEXT NOT NULL
            )
            ",
            params![],
        )?;

        Ok(Database { conn })
    }

    pub fn load_rooms(&mut self) -> Result<HashMap<usize, Room>, Error> {
        let mut rooms = HashMap::new();

        let mut stmt = self
            .conn
            .prepare("SELECT rowid, data FROM rooms WHERE NOT finished")?;
        for mapped_row in stmt.query_map(params![], |row| Ok((row.get(0)?, row.get(1)?)))? {
            let (room_id, room_data): (isize, String) = mapped_row?;
            let room = serde_json::from_str(&room_data)?;
            rooms.insert(room_id as usize, room);
        }

        Ok(rooms)
    }

    pub fn new_room(&mut self, room: &Room) -> Result<usize, Error> {
        let room_data = serde_json::to_string(room)?;
        self.conn.execute(
            "INSERT INTO rooms (finished, data) VALUES (?1, ?2)",
            params![room.finished(), room_data],
        )?;
        let room_id: isize =
            self.conn
                .query_row("SELECT last_insert_rowid()", params![], |row| row.get(0))?;
        Ok(room_id as usize)
    }

    pub fn save_room(&mut self, room_id: usize, room: &Room) -> Result<(), Error> {
        let room_data = serde_json::to_string(room)?;
        self.conn.execute(
            "UPDATE rooms SET finished = ?1, data = ?2 WHERE rowid = ?3",
            params![room.finished(), room_data, room_id as isize],
        )?;
        Ok(())
    }

    pub fn delete_room(&mut self, room_id: usize) -> Result<(), Error> {
        self.conn.execute(
            "DELETE FROM rooms WHERE rowid = ?1",
            params![room_id as isize],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test() {
        let mut db = Database::open(":memory:").unwrap();
        let room = Room::new(10, "xxx".to_owned());
        let room_id = db.new_room(&room).unwrap();

        let room = Room::new(10, "yyy".to_owned());
        db.save_room(room_id, &room).unwrap();

        let rooms = db.load_rooms().unwrap();
        assert_eq!(rooms.len(), 1);

        db.delete_room(room_id).unwrap();

        let rooms = db.load_rooms().unwrap();
        assert_eq!(rooms.len(), 0);
    }
}
