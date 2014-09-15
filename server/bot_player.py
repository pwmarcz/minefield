
import logging

import gevent

from bot import Bot
from utils import make_key

logger = logging.getLogger('bot')


class BotPlayer(object):
    nick = 'Bot'

    def __init__(self):
        self.key = make_key()
        self.thread = None

    def send(self, msg_type, msg):
        if msg_type == 'phase_one':
            self.on_phase_one(msg)
        elif msg_type == 'hand':
            self.on_hand(msg)
        elif msg_type == 'discarded':
            self.on_discarded(msg)
        elif msg_type == 'start_move':
            self.on_start_move(msg)
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

    def on_hand(self, msg):
        self.bot.use_tenpai(msg['hand'])

    def choose_tenpai(self):
        def run():
            logger.info('Choosing tenpai...')
            hand = self.bot.choose_tenpai(cooperative=True)
            logger.info('Tenpai found')
            self.room.send_to_game(self.idx, 'hand', hand)
        self.thread = gevent.spawn(run)

    def on_discarded(self, msg):
        if msg['player'] == self.idx:
            self.bot.use_discard(msg['tile'])
        else:
            self.bot.opponent_discard(msg['tile'])

    def on_start_move(self, msg):
        if msg['type'] == 'discard':
            tile = self.bot.discard()
            self.room.send_to_game(self.idx, 'discard', tile)
        elif msg['type'] == 'hand':
            self.choose_tenpai()

    def shutdown(self):
        if self.thread:
            self.thread.join()
