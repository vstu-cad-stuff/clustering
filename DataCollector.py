import geojson as json
import numpy as np
from routelib import Point

class DataCollector():
    """ Collects points from various sources.

    Attributes
    ----------
    data : array, [n_points, n_dimensions]
        Coordinates of points.
    """

    data = np.array([])

    def uploadFromTextFile(self, filename, params=[]):
        """ Upload data from text file.

        Parameters
        ----------
        filename : string path
            Name of data source file.
        params : list, default empty list
            Specifies types of points which will not be loaded.
        """
        try:
            with open(filename) as file_:
                # create an empty array for points
                data = np.empty(0, object)
                arr = json.loads(file_.readlines()[0])
                for i in arr:
                    if str(i['type']) not in params:
                        p = Point(float(i['lat']), float(i['lon']))
                        data = np.append(data, p)
            self.data = data
        # if error while reading file, print error message and clear data array
        except IOError as e:
            print('{}'.format(e))
            self.data = np.array([])

    def getData(self):
        """ Get collected data.

        Returns
        -------
        data : array, [n_points, n_dimensions]
            Coordinates of points
        """
        return self.data

    def exportToTextFile(self, filename):
        """ Record data to text file.

        Parameters
        ----------
        filename : string path
            Recording file name.

        Notes
        -----
        Uses JSON data format.
        """
        try:
            with open(filename, 'w') as file_:
                json.dump(self.data.tolist(), file_)
        except IOError as e:
            print('{}'.format(e))
