
import gevent

from bot import Bot
from utils import make_key


class BotPlayer(object):
    nick = 'Bot'

    def __init__(self):
        self.key = make_key()
        self.thread = None

    def send(self, msg_type, msg):
        if msg_type == 'phase_one':
            self.on_phase_one(msg)
        elif msg_type == 'discarded':
            self.on_discarded(msg)
        elif msg_type == 'your_move':
            self.on_your_move(msg)
        elif msg_type in ['ron', 'draw', 'aborted']:
            self.room.remove_player(self.idx)
            self.shutdown()
        else:
            # ignore
            pass

    def set_room(self, room, idx):
        self.room = room
        self.idx = idx

    def on_phase_one(self, msg):
        tiles = msg['tiles']
        dora_ind = msg['dora_ind']
        if msg['east'] == msg['you']:
            fanpai_wind = 'X1'
        else:
            fanpai_wind = 'X2'
        self.bot = Bot(
            tiles=tiles,
            options={
                'dora_ind': dora_ind,
                'fanpai_winds': [fanpai_wind]
            }
        )

        self.choose_tenpai()

    def choose_tenpai(self):
        def run():
            hand = self.bot.choose_tenpai(cooperative=True)
            self.room.send_to_game(self.idx, 'hand', hand)
        self.thread = gevent.spawn(run)

    def on_discarded(self, msg):
        if msg['player'] != self.idx:
            self.bot.opponent_discard(msg['tile'])

    def on_your_move(self, msg):
        tile = self.bot.discard()
        self.room.send_to_game(self.idx, 'discard', tile)

    def shutdown(self):
        self.thread.join()
