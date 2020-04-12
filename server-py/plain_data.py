
import copy


class DataMixin(object):
    @classmethod
    def from_data(cls, data, *args, **kwargs):
        obj = cls.__new__(cls)
        obj.init_from_data(copy.copy(data), *args, **kwargs)
        return obj

    def to_data(self):
        import copy
        data = copy.copy(self.__dict__)
        return data

    def init_from_data(self, data):
        self.__dict__.update(data)
