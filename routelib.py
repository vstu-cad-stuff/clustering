from __future__ import print_function
import time
import json
import subprocess
import numpy as np
import requests as req

class OSRMError(Exception):
    def __init__(self, value):
        self.value = value
    def __str__(self):
        return repr(self.value)

class Point():
    def __init__(self, lat, lon):
        self.lat = lat
        self.lon = lon

    def __str__(self):
        return '{},{}'.format(self.lat, self.lon)

    def __eq__(self, other):
        return self.__dict__ == other.__dict__

    def __iter__(self):
        return iter([self.lat, self.lon])

    def __add__(self, other):
        return Point(self.lat + other.lat, self.lon + other.lon)

    def __sub__(self, other):
        return Point(self.lat - other.lat, self.lon - other.lon)

    def reverso(self):
        return '{},{}'.format(self.lon, self.lat)

    def round(self, decimals):
        return Point(round(self.lat, decimals), round(self.lon, decimals))

def request(url):
    errors = 0
    while errors < 20:
        try:
            response = req.get(url)
            return response
        except:
            time.sleep(0.005)
            errors += 1
    raise OSRMError('Can\'t get response for {}'.format(url))

class route():
    """ A class for getting distance between points by finding a route.

    Uses OSRM-Project API for routing. It sends requests to local OSRM machine
    and gets distance from json-formatted response.

    Attributes
    ----------
    osrm: subprocess
        Local OSRM machine.

    Notes
    -----
    See https://github.com/Project-OSRM/osrm-backend/wiki for OSRM-Project API.

    """
    osrm = None
    API = 5
    sleep = 5

    def start(self, loud=False, map_=''):
        """ Start local OSRM machine.

        Needs time to start, contains a sleep statement.

        You can have one running machine per instance of class.

        """
        if map_ == '' or map_ == None:
            map_ = '~/map/map.osrm'
        if self.osrm is None:
            if loud:
                osrm = subprocess.Popen('osrm-routed {}'.format(map_), shell=True)
            else:
                osrm = subprocess.Popen('osrm-routed {} > /dev/null'.format(map_), shell=True)
            self.osrm = osrm
        time.sleep(self.sleep)
        a = [44.27, 48.41]
        url = 'http://127.0.0.1:5000/nearest/v1/car/{},{}'.format(*a[::-1])
        try:
            response = req.get(url)
            data = response.json()
            try:
                code = data['code']
                self.API = 5
            except KeyError:
                self.API = 4
        except:
            self.API = 4

    def viaroute(self, a, b):
        if self.osrm is None:
            raise OSRMError('OSRM not started!')

        # API v4 uses [lat, lon] coordinates
        # API v5 uses [lon, lat] coordinates

        # send request to find route between points
        if self.API == 4:
            url = "http://127.0.0.1:5000/viaroute?loc={}&loc={}" \
                "&geometry=false&alt=false".format(a, b)
        elif self.API == 5:
            url = 'http://127.0.0.1:5000/route/v1/car/{};{}?overview=false' \
                '&alternatives=false&steps=false'.format(a.reverso(), b.reverso())

        # get response
        response = request(url)
        # parse json
        data = response.json()

        # if route isn't found
        if self.API == 4:
            if data['status'] is not 0:
                raise OSRMError('Error routing: {}'.format(data['status_message']))
            else:
                return data['route_summary']['total_distance']
        elif self.API == 5:
            if data['code'] != 'Ok':
                raise OSRMError('Error routing: {}'.format(data['message']))
            else:
                return data['routes'][0]['distance']

    def locate(self, a):
        if self.osrm is None:
            raise OSRMError('OSRM not started!')

        if self.API == 4:
            url = 'http://127.0.0.1:5000/locate?loc={}'.format(a)
        elif self.API == 5:
            url = 'http://127.0.0.1:5000/nearest/v1/car/{}'.format(a.reverso())
        response = request(url)
        data = response.json()
        # if can't locate
        if self.API == 4:
            if data['status'] != 0:
                # stop osrm machine
                self.stop()
                # throw error
                raise OSRMError('Error locating: {}'.format(data['status_message']))
            else:
                return np.array(data['mapped_coordinate'])
        elif self.API == 5:
            if data['code'] != 'Ok':
                # stop osrm machine
                self.stop()
                # throw error
                raise OSRMError('Error locating: {}'.format(data['message']))
            else:
                return np.array(data['waypoints'][0]['location'][::-1])

    def route_distance(self, a, b):
        """ Get distance between points.

        Get distance between points a and b by finding route on OSM map.

        Parameters
        ----------
        a: array-like, shape=[2]
            Coordinates of first point.
        b: array-like, shape=[2]
            Coordinates of second point.

        Returns
        -------
        dist: int
            Route distance between given points.

        """

        if self.osrm is None:
            raise OSRMError('OSRM not started!')

        dist = None

        if a == b:
            # if points are the same return zero
            dist = 0.0
        else:
            # send request to find route between points
            try:
                dist = self.viaroute(a, b)
            except OSRMError:
                # locate first point
                c = self.locate(a)
                c = list(map(lambda i: np.round(i, decimals=5), c))
                # locate second point
                d = self.locate(b)
                d = list(map(lambda i: np.round(i, decimals=5), d))

                if np.array_equal(c, d):
                    dist = 0.0
                else:
                    dist = self.viaroute(c, d)
        return dist

    def make_table(self, X):
        dim = len(X)
        percent = 0
        digits = 0
        last = -1
        from math import floor

        if self.osrm:
            self.table = np.zeros([dim, dim])
            for i in range(len(X)):
                for j in range(i + 1, dim):
                    self.table[i][j] = self.route_distance(X[i], X[j])
                    self.table[j][i] = self.table[i][j]
                    completed = i * dim + j
                    all = dim * dim
                    percent = floor(completed / all * 1000) / 10

                    text = '  {}% ({} / {})'.format(percent, completed, all)
                    delete = '\r' * digits
                    if percent != last:
                        last = percent
                        print('{0}{1}'.format(delete, text), end='')
                        digits = len(text)

            text = '  100% ({a} / {a})'.format(a=all)
            delete = '\r' * digits
            print('{0}{1}'.format(delete, text), end='')
        return self.table

    def stop(self):
        """ Stop local OSRM machine.

        """
        if self.osrm is not None:
            subprocess.Popen(['pkill', 'osrm-routed'])
            self.osrm = None
