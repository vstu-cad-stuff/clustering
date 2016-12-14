import time
import requests as req
from geodata import Geodata as Gd

class RouteError(Exception):
    def __init__(self, value):
        self.value = value
    def __str__(self):
        return repr(self.value)

def request(url):
    errors = 0
    while errors < 5:
        try:
            response = req.get(url)
            return response
        except:
            time.sleep(0.005)
            errors += 1
    raise RouteError('Can\'t get response for {}'.format(url))

class Route():
    """ A class for getting distance between points by finding a route.

    Uses OSRM-Project API for routing. It sends requests to local OSRM machine
    and gets distance from json-formatted response.

    Notes
    -----
    See https://github.com/Project-OSRM/osrm-backend/wiki for OSRM-Project API.

    """
    API = 5

    def __init__(self):
        """ Detect local OSRM version. """

        url = 'http://127.0.0.1:5000/'
        response = req.get(url)
        data = response.json()
        try:
            code = data['code']
            self.API = 5
        except KeyError:
            self.API = 4

    def route(self, a, b):
        # API v4 uses [lat, lon] coordinates
        # API v5 uses [lon, lat] coordinates

        # send request to find route between points
        if self.API == 4:
            url = "http://127.0.0.1:5000/viaroute?loc={}&loc={}" \
                "&geometry=false&alt=false".format(a.latlon(), b.latlon())
        elif self.API == 5:
            url = 'http://127.0.0.1:5000/route/v1/car/{};{}?overview=false' \
                '&alternatives=false&steps=false'.format(a.reverso().latlon(), b.reverso().latlon())

        # get response
        response = request(url)
        # parse json
        data = response.json()

        # if route isn't found
        if self.API == 4:
            if data['status'] is not 200:
                raise RouteError('Error routing: {}'.format(data['status_message']))
            else:
                return data['route_summary']['total_distance']
        elif self.API == 5:
            if data['code'] != 'Ok':
                raise RouteError('Error routing: {}'.format(data['message']))
            else:
                return data['routes'][0]['distance']

    def nearest(self, a):
        if self.API == 4:
            url = 'http://127.0.0.1:5000/locate?loc={}'.format(a.latlon())
        elif self.API == 5:
            url = 'http://127.0.0.1:5000/nearest/v1/car/{}'.format(a.reverso().latlon())
        response = request(url)
        data = response.json()
        # if can't locate
        if self.API == 4:
            if data['status'] != 200:
                # throw error
                raise RouteError('Error locating: {}'.format(data['status_message']))
            else:
                return Gd.array(data['mapped_coordinate'])
        elif self.API == 5:
            if data['code'] != 'Ok':
                raise RouteError('Error locating: {}'.format(data['message']))
            else:
                return Gd.array(data['waypoints'][0]['location'][::-1])

    def distance(self, a, b):
        """ Get distance between points a and b by finding route on OSM map. """
        dist = None

        if a == b:
            # if points are the same return zero
            dist = 0.0
        else:
            # send request to find route between points
            dist = self.route(a, b)
        return dist
