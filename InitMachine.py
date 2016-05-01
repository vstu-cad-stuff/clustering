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
    centers = None

    def __init__(self):
        self.centers = np.empty([0, 3], dtype='float64, float64, int32')

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
                  random.uniform(bounds[1], bounds[3]), i]],
                axis=0)

    def file(self, filename):
        """ Initialize centers by random.

        Parameters
        ----------
        filename : int
            Specify source file name.
        """
        with open(filename, 'r') as file_:
            centers = json.load(file_)
        for i in centers:
            centers[int(i[2])] = np.array(i, dtype='object')
            centers[int(i[2])][0] = float(centers[int(i[2])][0])
            centers[int(i[2])][1] = float(centers[int(i[2])][1])
            centers[int(i[2])][2] = int(centers[int(i[2])][2])
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
