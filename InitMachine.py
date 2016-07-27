import random
import geojson as json
import numpy as np
import os

class InitMachine():
    """ Initializes centers of clusters.

    Attributes
    ----------
    centers : array, [n_clusters, n_params]
        n_params = 3: lat, lon, id
    """
    centers = np.empty([0, 3], dtype='object')

    def grid(self, gridSize, bounds):
        """ Initialize centers by grid.

        Parameters
        ----------
        gridSize : array {size_x, size_y}
            Set grid size.
        bounds : array {bottom_border, left_border, top_border, right_border}
            Specify borders.
        """
        delta_lt = (bounds[2] - bounds[0]) / gridSize[0]
        delta_ln = (bounds[3] - bounds[1]) / gridSize[1]
        curr_lt = bounds[0] + delta_lt / 2
        curr_ln = bounds[1] + delta_ln / 2

        self.centers = np.append(self.centers,
            [[curr_lt, curr_ln, 0]], axis=0)
        for i in range(gridSize[0] * gridSize[1]):
            if curr_ln + delta_ln > bounds[3]:
                if curr_lt + delta_lt > bounds[2]:
                    break
                else:
                    curr_lt += delta_lt
                    curr_ln -= delta_ln * (gridSize[0] - 1)
            else:
                curr_ln += delta_ln
            self.centers = np.append(self.centers,
                [[curr_lt, curr_ln, i + 1]], axis=0)

    def random(self, count, bounds):
        """ Initialize centers by random.

        Parameters
        ----------
        count : int
            Set clusters count.
        bounds : array {bottom_border, left_border, top_border, right_border}
            Specify borders.
        """
        for i in range(count):
            self.centers = np.append(self.centers,
                [[random.uniform(bounds[0], bounds[2]),
                  random.uniform(bounds[1], bounds[3]), i]], axis=0)

    def file(self, filename, JSON=True, params=[]):
        """ Initialize centers by random.

        Parameters
        ----------
        filename : int
            Specify source file name.
        JSON : boolean, default True
            If true, use json to parse source file.
        params : list, default empty list
            Specifies types of points which will be loaded.
        """
        with open(filename, 'r') as file_:
            arr = json.load(file_)
            centers = np.empty((0, 3), object)
        if JSON:
            k = 0
        for i in arr:
            if JSON:
                if str(i['type']) in params or params == []:
                    lat, lon, id = float(i['lat']), float(i['lon']), k
                    center = np.array([[lat, lon, id]], dtype='object')
                    centers = np.append(centers, center, axis=0)
            else:
                lat = float(arr[int(i[2])][0])
                lon = float(arr[int(i[2])][1])
                id = int(arr[int(i[2])][2])
                center = np.array([[lat, lon, id]], dtype='object')
                centers = np.append(centers, center, axis=0)
        self.centers = centers

    def getCenters(self):
        """ Get centers of clusters.

        """
        return self.centers

    def exportCentersToTextFile(self, filename):
        """ Record cluster centers to text file.

        Parameters
        ----------
        filename : string path
            Recording file name.

        Notes
        -----
        Uses JSON data format.
        """
        try:
            path = os.path.dirname(filename)
            if path == '':
                pass
            else:
                if not (os.path.exists(path)):
                     os.makedirs(os.path.dirname(filename))
            with open(filename, 'w') as file_:
                json.dump(self.centers.tolist(), file_)
        except IOError as e:
            print('{}'.format(e))
