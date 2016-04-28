import time
import json
import subprocess
from urllib import urlopen
import numpy as np

class route():
    """ A class for getting distance between points by finding a route.

    Uses OSRM-Project API for routing. It sends requests to local OSRM machine
    and gets distance from json-formatted responce.

    Attributes
    ----------
    osrm: subprocess
        Local OSRM machine.

    Notes
    -----
    See https://github.com/Project-OSRM/osrm-backend/wiki for OSRM-Project API.

    """
    osrm = None

    def start(self):
        """ Start local OSRM machine.

        Needs time to start, contains a 5 seconds sleep statement.

        You can have one running machine per instance of class.

        """
        if self.osrm is None:
            osrm = subprocess.Popen('osrm-routed ~/map/map.osrm > /dev/null', shell=True)
            self.osrm = osrm
        time.sleep(5)

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
        dist = None
        # if shape of given arrays isn't (0:2)
        if a.shape[0] == 1:
            a = np.array([a[0][0], a[0][1]])
        if b.shape[0] == 1:
            b = np.array([b[0][0], b[0][1]])

        c = map(lambda i: np.round(i, decimals=5), a)
        d = map(lambda i: np.round(i, decimals=5), b)

        if dist is None:
            if np.array_equal(c, d):
                # if points are the same return zero
                dist = 0.0
            else:
                # send request to find route between points
                url = "http://localhost:5000/viaroute?loc={},{}&loc={},{}" \
                    "&geometry=false&alt=false".format(*np.append(a, b))
                # get responce
                responce = urlopen(url)
                # parse json
                data = json.load(responce)

                # if route isn't found
                if data['status'] is not 0:
                    # locate first point
                    loc = 'http://localhost:5000/locate?loc={},{}'.format(*a)
                    l_resp = urlopen(loc)
                    l_data = json.load(l_resp)
                    # if can't locate
                    if l_data['status'] is not 0:
                        # stop osrm machine
                        self.stop()
                        # throw error
                        raise ValueError(l_data['status_message'])
                    else:
                        first = l_data['mapped_coordinate']

                    # locate second point
                    loc = 'http://localhost:5000/locate?loc={},{}'.format(*b)
                    l_resp = urlopen(loc)
                    l_data = json.load(l_resp)
                    if l_data['status'] is not 0:
                        self.stop()
                        raise ValueError(l_data['status_message'])
                    else:
                        second = l_data['mapped_coordinate']

                    e = map(lambda i: np.round(i, decimals=5), first)
                    f = map(lambda i: np.round(i, decimals=5), second)

                    if dist is None:
                        # try to find route between located points
                        url = "http://localhost:5000/viaroute?loc={},{}&loc={},{}" \
                            "&geometry=false&alt=false".format(*np.append(first, second))
                        responce = urlopen(url)
                        data = json.load(responce)
                        if data['status'] is not 0:
                            self.stop()
                            raise ValueError(data['status_message'])
                        else:
                            # if route is found return distance
                            dist = data['route_summary']['total_distance']
                else:
                    dist = data['route_summary']['total_distance']
        return dist

    def stop(self):
        """ Stop local OSRM machine.

        """
        if self.osrm is not None:
            subprocess.Popen(['pkill', 'osrm-routed'])
            self.osrm = None
