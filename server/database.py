
import sqlite3
import unittest
import json
import logging
import copy

from game import Game
from room import Room


logger = logging.getLogger('database')


class Serializer(object):
    cls = None
    exclude_keys = []

    def dump(self, obj):
        data = {}
        for k, v in obj.__dict__.iteritems():
            if k in self.exclude_keys:
                continue
            hook = getattr(self, 'dump_'+k, None)
            if hook:
                data[k] = hook(v)
            else:
                data[k] = copy.deepcopy(v)

        return data

    def load(self, data):
        obj = self.cls.__new__(self.cls)
        for k, v in data.iteritems():
            hook = getattr(self, 'load_'+k, None)
            if hook:
                setattr(obj, k, hook(v))
            else:
                setattr(obj, k, v)

        self.init(obj)
        return obj

    def init(self, obj):
        pass


class GameSerializer(Serializer):
    cls = Game
    exclude_keys = ['callback']


class RoomSerializer(Serializer):
    cls = Room
    exclude_keys = ['id', 'players']

    def dump_game(self, game):
        return GameSerializer().dump(game)

    def load_game(self, data):
        return GameSerializer().load(data)

    def init(self, room):
        room.players = [None, None]
        room.game.callback = room.send_to_player


SERIALIZERS = {Game: GameSerializer(), Room: RoomSerializer()}

def to_data(obj):
    assert type(obj) in SERIALIZERS
    return SERIALIZERS[type(obj)].dump(obj)

def from_data(cls, data):
    assert cls in SERIALIZERS
    return SERIALIZERS[cls].load(data)


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
        data = to_data(room)
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
        return from_data(Room, data)

    def load_unfinished_rooms(self):
        cur = self.conn.cursor()
        cur.execute('''SELECT rowid, data FROM rooms WHERE NOT finished''')
        return [
            self.make_room(id, data_json)
            for (id, data_json) in cur.fetchall()
        ]

    def dump_active_rooms(self):
        cur = self.conn.cursor()
        cur.execute('''SELECT rowid, data FROM rooms''')
        result = []
        for rowid, data in cur.fetchall():
            result.append('Room %d:\n%s' % (rowid, data))
        return '\n-----\n'.join(result)

class SerializationTest(unittest.TestCase):
    def _test_serialize(self, cls, obj1):
        data1 = to_data(obj1)
        obj2 = from_data(cls, data1)
        data2 = to_data(obj2)
        self.assertEqual(data1, data2)

    def test_serialize_game(self):
        self._test_serialize(Game, Game())

    def test_serialize_room(self):
        self._test_serialize(Room, Room())


class DatabaseTest(unittest.TestCase):
    def setUp(self):
        self.db = Database(':memory:')

    def assertDataEquals(self, obj1, obj2):
        # passing data through json changes string keys to unicode ones,
        # so we're comparing JSON instead.
        json1 = json.dumps(to_data(obj1), sort_keys=True)
        json2 = json.dumps(to_data(obj2), sort_keys=True)
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
