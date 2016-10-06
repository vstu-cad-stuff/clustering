import time
import json
import subprocess
import numpy as np

from sys import version_info as vinfo
PYTHON2 = True
if vinfo[0] > 2:
    PYTHON2 = False

if PYTHON2:
    from urllib import urlopen
else:
    from urllib.request import urlopen

class OSRMError(Exception):
    def __init__(self, value):
        self.value = value
    def __str__(self):
        return repr(self.value)

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

    def start(self, loud=False, map_='', dim=1):
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
        url = 'http://localhost:5000/nearest/v1/car/{},{}'.format(*a[::-1])
        try:
            response = urlopen(url)
            if not PYTHON2:
                response = response.readall().decode('utf-8')
                data = json.loads(response)
            else:
                data = json.load(response)
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
            url = "http://localhost:5000/viaroute?loc={},{}&loc={},{}" \
                "&geometry=false&alt=false".format(*np.append(a, b))
        elif self.API == 5:
            url = 'http://localhost:5000/route/v1/car/{},{};{},{}?overview=false' \
                '&alternatives=false&steps=false'.format(*np.append(a[::-1], b[::-1]))

        # get response
        response = urlopen(url)
        # parse json
        if not PYTHON2:
            response = response.readall().decode('utf-8')
            data = json.loads(response)
        else:
            data = json.load(response)

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
            loc = 'http://localhost:5000/locate?loc={},{}'.format(*a)
        elif self.API == 5:
            loc = 'http://localhost:5000/nearest/v1/car/{},{}'.format(*a[::-1])
        l_resp = urlopen(loc)
        if not PYTHON2:
            l_resp = l_resp.readall().decode('utf-8')
            l_data = json.loads(l_resp)
        else:
            l_data = json.load(l_resp)
        # if can't locate
        if self.API == 4:
            if l_data['status'] != 0:
                # stop osrm machine
                self.stop()
                # throw error
                raise OSRMError('Error locating: {}'.format(l_data['status_message']))
            else:
                return l_data['mapped_coordinate']
        elif self.API == 5:
            if l_data['code'] != 'Ok':
                # stop osrm machine
                self.stop()
                # throw error
                raise OSRMError('Error locating: {}'.format(l_data['message']))
            else:
                return l_data['waypoints'][0]['location'][::-1]

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
        # if shape of given arrays isn't (0:2)
        if a.shape[0] == 1:
            a = np.array([a[0][0], a[0][1]])
        if b.shape[0] == 1:
            b = np.array([b[0][0], b[0][1]])

        a, b = a[:2], b[:2]

        c = list(map(lambda i: np.round(i, decimals=5), a))
        d = list(map(lambda i: np.round(i, decimals=5), b))

        if np.array_equal(c, d):
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

        if self.osrm:
            self.table = np.zeros([dim, dim])
            for i in range(len(X)):
                for j in range(i + 1, dim):
                    self.table[i][j] = self.route_distance(X[i], X[j])
                    self.table[j][i] = self.table[i][j]
        return self.table

    def stop(self):
        """ Stop local OSRM machine.

        """
        if self.osrm is not None:
            subprocess.Popen(['pkill', 'osrm-routed'])
            self.osrm = None
