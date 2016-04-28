from __future__ import division
import geojson as json
import time
import numpy as np
from routelib import route
from InitMachine import InitMachine
from ClusteringMachine import ClusteringMachine

def dump(data, filename):
    try:
        with open(filename, 'w') as file_:
            json.dump(data, file_)
    except IOError as e:
        print('{}'.format(e))

class KMeans():
    """ K-Means clustering.

    Attributes
    ----------
    max_iter_ : int
        Maximum iteration number. After reaching it, clustering is
        considered as completed.
    cluster_centers_ : array, [n_clusters, n_dimensions + 1]
        Centers of clusters.
    labels_ : array, [n_points]
        Labels of points.

    Parameters
    ----------
    max_iter : int
        Set maximum iteration number.
    """
    max_iter_ = None
    cluster_centers_ = None
    labels_ = None
    population_ = None
    log = False
    route_ = None

    def __init__(self, max_iter, log, cache):
        self.max_iter_ = max_iter
        self.log = log
        self.route_ = route(cache)

    def dist(self, a, b, metric):
        """ Calculate distance between two points.

        Parameters
        ----------
        a : array, [n_dimensions]
            First point.
        b : array, [n_dimensions]
            Second point.

        Returns
        -------
        r : float
            Distance between points.
        """
        if metric == 'route':
            r = self.route_.route_distance(a, b)
        elif metric == 'euclid':
            r = np.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
        else:
            raise ValueError('Unknown metric: {}'.format(metric))
        return r

    def stop(self, iter, old, new):
        """ Check whenever clustering needs to be stopped.

        Parameters
        ----------
        iter : int
            Number of current iteration.
        old : array, [n_clusters, n_dimensions + 1]
            Centers of clusters on previous iteration.
        new : array, [n_clusters, n_dimensions + 1]
            Centers of clusters on current iteration.

        Returns
        -------
        stop : boolean
            If true, clustering is completed.
        """
        if iter >= self.max_iter_:
            return True
        return np.array_equal(old, new)

    def fit(self, X, centroids, metric):
        """ Perform clustering.

        Parameters
        ----------
        X : array, [n_points, n_dimensions]
            Coordinates of points.
        centroids : array, [n_clusters, n_dimensions + 1]
            Centers of clusters.
        """
        # set initial parameters
        iteration = 0
        c_old = None

        c_curr = centroids
        l_curr = np.empty([len(X)])

        if metric == 'route':
            self.route_.start()
        # while clustering isn't completed
        while not self.stop(iteration, c_old, c_curr):
            # reset population in clusters
            p_curr = np.zeros([len(c_curr)])
            # show iteration number
            print('iteration {}'.format(iteration + 1))
            # create empty python array
            # each item will contain all the points belongs to specific cluster
            arrays = [np.empty([0, 2]) for each in c_curr]
            # for each point
            for i in range(len(X)):
                # calculate distance between point and all the clusters centers
                distances = [(self.dist(X[i], c_curr[each], metric), each) for
                    each in range(len(c_curr))]
                # sort distances ascending
                distances.sort(key=lambda x: x[0])
                # pick number of cluster, which center has the smallest
                # distance to point
                m = distances[0][1]
                # set label of point
                l_curr[i] = c_curr[m][2]
                p_curr[m] += 1
                arrays[m] = np.append(arrays[m], [X[i]], axis=0)
            # equate the previous and current centers of clusters
            c_old = c_curr
            if self.log:
                cc = c_curr
                cc = map(lambda x, y: (np.append(x, y)).tolist(), cc, p_curr)
                filename = 'km_{}/{}_centers_{}.js'.format(metric[:2], metric[0], iteration)
                dump(cc, filename)

                xc = X
                xc = map(lambda x, y: (np.append(x, y)).tolist(), xc, l_curr)
                filename = 'km_{}/{}_points_{}.js'.format(metric[:2], metric[0], iteration)
                dump(xc, filename)

            # array for calculated centers of clusters
            mu = np.empty([len(c_curr), 3])

            # for each cluster
            i = 0
            while i < len(arrays):
                # if it contains points
                if p_curr[i] != 0:
                    # calculate center of cluster
                    mu[i] = np.append(np.mean(arrays[i], axis=0), i)
                else:
                    mu[i] = c_curr[i]
                i += 1
            # equate current centroids to calculated
            c_curr = mu

            # increment iteration counter
            iteration += 1
        # record results
        self.cluster_centers_ = c_curr
        self.labels_ = l_curr
        self.population_ = p_curr
        if metric == 'route':
            self.route_.stop()

class KMeansClusteringMachine(ClusteringMachine):
    """ A derived class from ClusteringMachine.

    Performs clustering with using K-Means algorithm.

    Parameters
    ----------
    X : array, [n_points, n_dimensions]
        Coordinates of points.
    init : string, default 'random'
        Specify the initializing type.
    count : int, default 40
        Set clusters count (in random initializing).
    gridSize : array {size_x, size_y}, default [7, 7]
        Set size of grid (in grid initializing).
    filename : string path, default 'init.txt'
        Specify the name of initialize file (in file initializing).
    max_iter : int, default 100
        Set maximum iteration number.
    header : string, default None
        Set header that contains info about borders.

    Attributes
    ----------
    initM : InitMachine object
        Initializes centers of clusters.
    bounds : array {bottom_border, left_border, top_border, right_border}
        Bounds of initial centers generation.
    """
    initM = None
    bounds = None

    def __init__(self, X, init='random', count=40, gridSize=[7, 7],
                 filename='init.txt', max_iter=100, header=None,
                 log=True, cache=False):
        self.X = X

        self.initM = InitMachine()

        self.bounds = self.getBounds(header_=header, points_=X)
        if init == 'random':
            self.initM.random(count=count, bounds=self.bounds)
        elif init == 'grid':
            self.initM.grid(gridSize=gridSize, bounds=self.bounds)
        elif init == 'file':
            self.initM.file(filename=filename)
        else:
            print('Unrecognized init type: {}'.format(init))
        self.cluster_centers = self.initM.getCenters()
        self.cluster_instance = KMeans(max_iter=max_iter, log=log, cache=cache)

    def getBounds(self, header_=None, points_=None):
        """ Calculate bounds of initial centers generation.

        Parameters
        ----------
        header_ : string
            String contains info about borders.
        points_ : array [n_points, n_dimensions]
            Coordinates of points

        Returns
        -------
        bounds : array {bottom_border, left_border, top_border, right_border}
            Bounds of initial centers generation.
        """
        bounds_ = None
        # if both header_ and points_ are not setted show error
        if header_ == None and points_ == None:
            print('No source to get bounds')
        else:
            # if header_ is setted, split it to get bounds
            if header_:
                bounds_ = [float(n) for n in header_.split()]
            else:
                # if points are setted, choose four coordinates
                # of different points as bounds:
                # most bottom, most left, most top, and most right
                b, l, t, r = [points_[0]] * 4
                for p in points_[1:]:
                    if p[0] > t[0]:
                        t = p
                    if p[0] < b[0]:
                        b = p
                    if p[1] > r[1]:
                        r = p
                    if p[1] < l[1]:
                        l = p
                bounds_ = [b[0], l[1], t[0], r[1]]
        return bounds_

    def fit(self, metric='route'):
        """ Perform clustering.

        """
        t_start = time.time()
        # perform clustering
        self.cluster_instance.fit(self.X, self.cluster_centers, metric)
        # calculate time
        self.fit_time = time.time() - t_start
        # get points labels
        self.labels = self.cluster_instance.labels_
        # get clusters population
        self.population = self.cluster_instance.population_
        # get cluster centers
        self.cluster_centers = self.cluster_instance.cluster_centers_
        # get clusters number
        self.n_cluster = len(np.unique(self.labels))
