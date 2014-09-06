import random


KEY_WIDTH = 10
# Bitcoin's Base58 :)
BASE_58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def make_key(exclude=[]):
    while True:
        key = ''.join(random.choice(BASE_58) for _ in range(KEY_WIDTH))
        if key not in exclude:
            return key
