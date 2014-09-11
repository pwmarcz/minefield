import sys
import logging

from socketIO_client import BaseNamespace, SocketIO

from logs import init_logging
from bot import Bot

logger = logging.getLogger('bot')


class MinefieldNamespace(BaseNamespace):
    def on_wait(self):
        pass

    def on_phase_one(self, data):
        tiles = data['tiles']
        logger.info('my tiles: %s', ' '.join(sorted(tiles)))
        dora_ind = data['dora_ind']
        logger.info('dora indicator: %s', dora_ind)
        east = data['east'] == data['you']
        options = {
            'fanpai_winds': ['X1' if east else 'X3'],
            'dora_ind': dora_ind,
        }
        self.me = data['you']
        self.bot = Bot(tiles=tiles, options=options)
        tenpai = self.bot.choose_tenpai()
        logger.info('my hand: %s', ' '.join(tenpai))
        self.emit('hand', tenpai)

    def on_wait_for_phase_two(self, data):
        pass

    def on_phase_two(self, data):
        pass

    def on_your_move(self, data):
        tile = self.bot.discard()
        logger.info('discarding: %s', tile)
        self.emit('discard', tile)

    def on_discarded(self, data):
        if data['player'] != self.me:
            self.bot.opponent_discard(data['tile'])

    def on_ron(self, data):
        if data['player'] == self.me:
            logger.info('I won!\n%r', data)
        else:
            logger.info('I lost!\n%r', data)
        self.disconnect()

    def on_draw(self, data):
        logger.info('Draw!')
        self.disconnect()

    def on_disconnect(self):
        logger.info('Disconnected')
        sys.exit()

def bot_connect(host, port):
    socket = SocketIO(host, port)
    minefield = socket.define(MinefieldNamespace, '/minefield')
    minefield.emit('new_game', 'Bot')
    logger.info('Starting bot')
    socket.wait()


def main():
    init_logging()
    bot_connect('localhost', 8080)


if __name__ == '__main__':
    main()
