
from game import Game
from room import Room

import unittest


class DatabaseTest(unittest.TestCase):
    def _test_serialize(self, cls, obj1):
        data1 = obj1.to_data()
        obj2 = cls.from_data(data1)
        data2 = obj2.to_data()
        self.assertEqual(data1, data2)

    def test_serialize_game(self):
        self._test_serialize(Game, Game())

    def test_serialize_room(self):
        self._test_serialize(Room, Room())

if __name__ == '__main__':
    unittest.main()
