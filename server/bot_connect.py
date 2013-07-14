from socketIO_client import BaseNamespace, SocketIO

from bot import Bot

class MinefieldNamespace(BaseNamespace):
    def on_wait(self):
        pass

    def on_phase_one(self, data):
        tiles = data['tiles']
        print ' '.join(sorted(tiles))
        dora_ind = data['dora_ind']
        print 'dora indicator:', dora_ind
        east = data['east'] == data['you']
        options = {
            'fanpai_winds': ['X1' if east else 'X3'],
            'dora_ind': dora_ind,
        }
        self.me = data['you']
        self.bot = Bot(tiles=tiles, options=options)
        tenpai = self.bot.choose_tenpai()
        print ' '.join(tenpai)
        self.emit('hand', tenpai)

    def on_wait_for_phase_two(self, data):
        pass

    def on_phase_two(self, data):
        pass

    def on_your_move(self, data):
        tile = self.bot.discard()
        print tile
        self.emit('discard', tile)

    def on_discarded(self, data):
        if data['player'] != self.me:
            self.bot.opponent_discard(data['tile'])

    def on_ron(self, data):
        if data['player'] == self.me:
            print 'I won!'
            print 'uradora indicator:', data['uradora_ind']
            print ' '.join(data['hand'])
            print ', '.join(['riichi'] + data['yaku'] + ['dora %s' % data['dora']])
            print data['points']
        else:
            print 'I lost!'

    def on_draw(self, data):
        print 'Draw!'

def bot_connect(host, port):
    socket = SocketIO(host, port)
    minefield = socket.define(MinefieldNamespace, '/minefield')
    minefield.emit('hello', 'Bot')
    socket.wait()

if __name__ == '__main__':
    bot_connect('localhost', 8080)
