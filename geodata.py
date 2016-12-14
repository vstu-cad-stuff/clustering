import numpy as np

class Geodata:
    def __init__(self, lat, lon):
        self.lat = lat
        self.lon = lon
        self.cls = Geodata

    @classmethod
    def array(cls, array):
        return cls(array[0], array[1])

    def __eq__(self, other):
        return self.__dict__ == other.__dict__

    def __iter__(self):
        return iter([self.lat, self.lon])

    def __add__(self, other):
        return self.cls(self.lat + other.lat, self.lon + other.lon)

    def __mul__(self, value):
        return self.cls(self.lat * value, self.lon * value)

    def __div__(self, value):
        return self.cls(self.lat / value, self.lon / value)

    def __sub__(self, other):
        return self.cls(self.lat - other.lat, self.lon - other.lon)

    def __str__(self):
        return '{},{}'.format(self.lat, self.lon)

    def latlon(self):
        return (self.lat, self.lon)

    def reverso(self):
        return Geodata(self.lon, self.lat)

    def round(self, decimals):
        return self.cls(round(self.lat, decimals), round(self.lon, decimals))

class Point(Geodata):
    def __init__(self, lat, lon, cid):
        self.lat = lat
        self.lon = lon
        self.cid = cid
        self.cls = Point

    def __str__(self):
        return '{},{}:{}'.format(self.lat, self.lon, self.cid)

    @classmethod
    def geodata(cls, data, cid):
        return cls(data.lat, data.lon, cid)

class Cluster(Point):
    def __init__(self, lat, lon, cid, pop):
        self.lat = lat
        self.lon = lon
        self.cid = cid
        self.pop = pop
        self.cls = Cluster

    def __str__(self):
        return '{},{}:{}:{}'.format(self.lat, self.lon, self.cid, self.pop)

    @classmethod
    def point(cls, point, pop):
        return cls(point.lat, point.lon, point.cid, pop)
