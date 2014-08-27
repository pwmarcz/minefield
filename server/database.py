
import sqlite3
import unittest
import json
import logging

from game import Game
from room import Room


logger = logging.getLogger('database')


class Database(object):
    def __init__(self, fname='minefield.db'):
        logging.info('connecting to database %s', fname)
        self.conn = sqlite3.connect(fname)
        self.conn.isolation_level = None
        self.init_tables()

    def init_tables(self):
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS rooms (
                create_date TIMESTAMP NOT NULL DEFAULT current_timestamp,
                finished INTEGER NOT NULL,
                data BLOB NOT NULL
            );
        ''')

    def save_room(self, room):
        data = room.to_data()
        del data['id']
        data_json = json.dumps(data, indent=2)
        cur = self.conn.cursor()
        cur.execute('''
            INSERT OR REPLACE INTO rooms
                (rowid, finished, data)
                VALUES (?, ?, ?);
        ''', [room.id, room.finished, data_json])
        cur.execute('SELECT last_insert_rowid()')
        (id,) = cur.fetchone()
        room.id = id

    def load_room(self, id):
        cur = self.conn.cursor()
        cur.execute('''SELECT data FROM rooms WHERE rowid = ?''', [id])
        (data_json,) = cur.fetchone()
        return self.make_room(id, data_json)

    def make_room(self, id, data_json):
        data = json.loads(data_json)
        data['id'] = id
        return Room.from_data(data)

    def load_unfinished_rooms(self):
        cur = self.conn.cursor()
        cur.execute('''SELECT rowid, data FROM rooms WHERE NOT finished''')
        return [
            self.make_room(id, data_json)
            for (id, data_json) in cur.fetchall()
        ]


class SerializationTest(unittest.TestCase):
    def _test_serialize(self, cls, obj1):
        data1 = obj1.to_data()
        obj2 = cls.from_data(data1)
        data2 = obj2.to_data()
        self.assertEqual(data1, data2)

    def test_serialize_game(self):
        self._test_serialize(Game, Game())

    def test_serialize_room(self):
        self._test_serialize(Room, Room())


class DatabaseTest(unittest.TestCase):
    def setUp(self):
        self.db = Database(':memory:')

    def assertDataEquals(self, obj1, obj2):
        json1 = json.dumps(obj1.to_data(), sort_keys=True)
        json2 = json.dumps(obj2.to_data(), sort_keys=True)
        self.assertEquals(json1, json2)

    def test_save_room(self):
        room1 = Room()
        self.assertEquals(room1.id, None)
        self.db.save_room(room1)
        self.assertEquals(room1.id, 1)
        self.db.save_room(room1)
        self.assertEquals(room1.id, 1)
        room2 = Room()
        self.db.save_room(room2)
        self.assertEquals(room2.id, 2)

    def test_save_load(self):
        room = Room()
        self.db.save_room(room)
        loaded_room = self.db.load_room(room.id)
        self.assertDataEquals(room, loaded_room)

    def test_load_unfinished(self):
        room1 = Room()
        room2 = Room()
        self.db.save_room(room1)
        self.db.save_room(room2)
        self.assertEquals(len(self.db.load_unfinished_rooms()), 2)
        room2.abort()
        self.db.save_room(room2)
        self.assertEquals(len(self.db.load_unfinished_rooms()), 1)



if __name__ == '__main__':
    unittest.main()
