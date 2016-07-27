import geojson as json
import numpy as np
import matplotlib.pyplot as plt
import os

class ClusteringMachine():
    """ General class for clustering machine.

    Parameters
    ----------
    X : array, [n_points, n_dimensions]
        Coordinates of points.

    Attributes
    ----------
    X : array, [n_points, n_dimensions]
        Coordinates of points.
    labels : array, [n_points]
        Labels of each point.
    cluster_centers : array, [n_clusters, n_dimensions]
        Coordinates of cluster centers.
    n_cluster : int
        Number of clusters.
    cluster_instance : class
        Class used for clustering.
    fit_time : float
        Time of clustering.
    """
    X = None
    labels = None
    population = None
    cluster_centers = None
    n_cluster = None
    cluster_instance = None
    fit_time = 0

    def __init__(self, X):
        self.X = X

    def fit(self):
        """ Perform clustering.

        """
        self.cluster_instance.fit(self.X)

    def plotClusters(self, plotCenters = True):
        """ Plot the results of clustering.

        Parameters
        ----------
        plotCenters : boolean, default True
            If true, mark centers of clusters on plot.

        Notes
        -----
        Uses matplotlib.pyplot for plotting data.
        """
        # set colors of clusters
        colors = 10 * ['r.', 'g.', 'm.', 'c.', 'k.', 'y.', 'b.']
        # create a new figure
        plt.figure()
        # for each point in X array
        for i in range(len(self.X)):
            # plot it on figure with specified color
            plt.plot(self.X[i][0], self.X[i][1],
                     colors[self.labels[i]], markersize = 5)
        # if plotCenters set to True, plot cluster centers as "X" marks
        if plotCenters:
            plt.scatter(self.cluster_centers[:, 0],
                        self.cluster_centers[:, 1], marker = "x",
                        s = 150, linewidths = 2.5, zorder = 10)
        # showing result
        plt.show()

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
        cc = map(lambda x, y: (np.append(x, y)).tolist(), self.cluster_centers, self.population)
        cc = list(map(lambda i: {'lat': i[0], 'lon': i[1], 'id': i[2], 'pop': i[3]}, cc))

        try:
            path = os.path.dirname(filename)
            if path == '':
                pass
            else:
                if not (os.path.exists(path)):
                     os.makedirs(os.path.dirname(filename))
            with open(filename, 'w') as file_:
                json.dump(cc, file_)
        except IOError as e:
            print('{}'.format(e))

    def exportPointsToTextFile(self, filename):
        """ Record points with labels to text file.

        Parameters
        ----------
        filename : string path
            Recording file name.

        Notes
        -----
        Uses JSON data format.
        """
        # create new array with one more dimension for points
        X = list(range(len(self.X)))
        # for each point in X array
        for i in X:
            X[i] = {'lat': self.X[i][0], 'lon': self.X[i][1], 'clusterId': self.labels[i]}

        try:
            path = os.path.dirname(filename)
            if path == '':
                pass
            else:
                if not (os.path.exists(path)):
                     os.makedirs(os.path.dirname(filename))
            with open(filename, 'w') as file_:
                json.dump(X, file_)
        except IOError as e:
            print('{}'.format(e))
