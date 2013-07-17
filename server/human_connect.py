from socketIO_client import BaseNamespace, SocketIO

import rules

class MinefieldNamespace(BaseNamespace):
    def on_wait(self):
        print 'Waiting for the other player...'

    def on_phase_one(self, data):
        tiles = sorted(data['tiles'])
        print ' '.join(tiles[:17])
        print ' '.join(tiles[17:])
        dora_ind = data['dora_ind']
        print 'Dora indicator:', dora_ind
        if data['east'] == data['you']:
            print 'You are East.'
        else:
            print 'You are West.'
        self.me = data['you']
        while True:
            tenpai = raw_input('Enter tenpai (space separated): ').split()
            if not set(tenpai) <= set(rules.ALL_TILES):
                print 'Illegal tiles!'
            else:
                discards = list(tiles)
                try:
                    for tile in tenpai:
                        discards.remove(tile)
                    break
                except ValueError:
                    print 'Illegal tiles!'
                    continue
        self.tenpai = sorted(tenpai)
        self.discards = discards
        self.emit('hand', tenpai)

    def on_wait_for_phase_two(self, data):
        print 'Waiting for the other player\'s tenpai...'

    def on_phase_two(self, data):
        print 'Phase 2'

    def on_your_move(self, data):
        print 'Your tenpai:'
        print ' '.join(self.tenpai)
        print 'Your discards:'
        print ' '.join(self.discards)
        while True:
            tile = raw_input('Discard a tile: ')
            try:
                self.discards.remove(tile)
                break
            except ValueError:
                print 'Illegal tile!'
                continue
        self.emit('discard', tile)

    def on_discarded(self, data):
        if data['player'] != self.me:
            print 'Opponent discarded %s' % data['tile']

    def on_ron(self, data):
        if data['player'] == self.me:
            print 'You won!'
        else:
            print 'You lost!'
        print 'uradora indicator:', data['uradora_ind']
        print ' '.join(data['hand'])
        desc = ['riichi'] + data['yaku']
        if data['dora']:
            desc.append('dora %s' % data['dora'])
        print ', '.join(desc)
        print data['points']

    def on_draw(self, data):
        print 'Draw!'

def human_connect(host, port):
    socket = SocketIO(host, port)
    minefield = socket.define(MinefieldNamespace, '/minefield')
    minefield.emit('hello', 'Human')
    socket.wait()

if __name__ == '__main__':
    human_connect('localhost', 8080)
