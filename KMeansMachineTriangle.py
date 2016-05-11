from __future__ import division, print_function
import geojson as json
import time
import numpy as np
import os

from routelib import route
from InitMachine import InitMachine
from ClusteringMachine import ClusteringMachine

from multiprocessing.dummy import Pool as ThreadPool
POOL = ThreadPool(processes=4)

def async_worker(iterator, func):
    thread_list = []
    result = []
    for item in iterator:
        # create job for new_route function
        thread = POOL.apply_async(func, item)
        # add thread in list
        thread_list.append(thread)
    for thread in thread_list:
        # get result of job
        result.append(thread.get())
    return result

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
    _dxc = None
    cntr = 0
    icntr = 0

    def __init__(self, max_iter, log):
        self.max_iter_ = max_iter
        self.log = log
        self.route_ = route()

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
        elif metric == 'surface':
            d = np.arccos(np.sin(a[0]) * np.sin(b[0]) + np.cos(a[0]) * np.cos(b[0]) * np.cos(b[1] - a[1]))
            R = 6371. # Earth radius
            r = d * R
        else:
            raise ValueError('Unknown metric: {}'.format(metric))
        self.cntr += 1
        self.icntr += 1
        text = '{:.2f}k'.format(self.cntr / 1000)
        digits = len(text)
        delete = '\r' * digits
        print('{0}{1}'.format(delete, text), end=',')
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

    def dxc(self, x, c):
        try:
            return self._dxc[c][x]
        except:
            return -1.

    """def xloop(self, i):
        dist, clus = self.dist(X[i], C[0], metric) if self.dxc(i, 0) < 0 else self.dxc(i, 0), C[0]
        self._dxc[0][i] = dist
        lower[0][i] = dist
        for c in C[1:]:
            cc = int(c[2])
            cl = int(clus[2])
            if d[cc][cl] < 2 * dist:
                dist, clus = self.dist(X[i], c, metric) if self.dxc(i, 0) < 0 else self.dxc(i, 0), c
                cl = int(clus[2])
                self._dxc[cl][i] = dist
                lower[cl][i] = dist
        n = int(clus[2])
        l_curr[i] = n
        p_curr[n] += 1
        arrays[n] = np.append(arrays[n], [X[i]], axis=0)"""

    def fit(self, X, C, metric):
        """ Perform clustering.

        Parameters
        ----------
        X : array, [n_points, n_dimensions]
            Coordinates of points.
        C : array, [n_clusters, n_dimensions + 1]
            Centers of clusters.
        """
        # set initial parameters
        iteration = 0
        c_old = None
        # get length of lists
        c_len = len(C)
        x_len = len(X)
        print('Now {} points will be clustering to {} clusters'.format(x_len, c_len))

        lower = np.zeros([c_len, x_len]) # l(c, x)
        upper = np.empty([x_len]) # u(x)
        r = np.full([x_len], True) # r(x)
        self._dxc = np.full([c_len, x_len], -1) # d(c, x)
        l_curr = np.empty([x_len]) # c(x)

        if metric == 'route':
            self.route_.start()
        # while clustering isn't completed
        while not self.stop(iteration, c_old, C):
            # reset population in clusters
            p_curr = np.zeros([c_len])
            # show iteration number
            print('Iteration {:02d}'.format(iteration + 1))
            # create empty python array
            # each item will contain all the points belongs to specific cluster
            arrays = [np.empty([0, 2]) for each in C]
            # calc distances between centers
            print('  calculating d(c, c'')')
            d = [list(map(lambda b: self.dist(a, b, metric), C)) for a in C]
            print('\n  calculating s(c)')
            s = [0.5 * min(d[int(c[2])][int(c[2])+1:] + d[int(c[2])][:int(c[2])]) for c in C]
            # for each point
            print('  loop on X')
            """result = async_worker(range(x_len), xloop)
            print(result)
            exit()"""
            for i in range(x_len):
                dist, clus = self.dist(X[i], C[0], metric) if self.dxc(i, 0) < 0 else self.dxc(i, 0), C[0]
                self._dxc[0][i] = dist
                lower[0][i] = dist
                for c in C[1:]:
                    cc = int(c[2])
                    cl = int(clus[2])
                    if d[cc][cl] < 2 * dist:
                        dist, clus = self.dist(X[i], c, metric) if self.dxc(i, 0) < 0 else self.dxc(i, 0), c
                        cl = int(clus[2])
                        self._dxc[cl][i] = dist
                        lower[cl][i] = dist
                n = int(clus[2])
                l_curr[i] = n
                p_curr[n] += 1
                arrays[n] = np.append(arrays[n], [X[i]], axis=0)
            print('\n  endloop')
            print('  upper loop on X')
            for i in range(x_len):
                upper[i] = min([x for x in list(zip(*self._dxc))[i] if x >= 0])
            print('  endloop')
            op = []
            print('  op loop on X')
            for i in range(x_len):
                if upper[i] > s[int(l_curr[i])]:
                    op.append(i)
            print('  endloop')
            print('  loop on op')
            for x in op:
                cx = int(l_curr[x])
                for c in C:
                    cc = int(c[2])
                    if c is not C[cx] and upper[x] > lower[cc][x] and upper[x] > 0.5 * d[cc][cx]:
                        if r[x]:
                            self._dxc[cx][x] = self.dist(X[x], C[cx], metric)
                            lower[cx][x] = self._dxc[cx][x]
                            r[x] = False
                        else:
                            self._dxc[cx][x] = upper[x]
                        if self.dxc(x, cx) > lower[cc][x] or self.dxc(x, cx) > 0.5 * d[cc][cx]:
                            self._dxc[cc][x] = self.dist(X[x], c, metric)
                            lower[cc][x] = self._dxc[cc][x]
                            if self.dxc(x, cc) < self.dxc(x, cx):
                                l_curr[x] = cc
                                try:
                                    nz = np.nonzero(arrays[cx] == X[x])[0]
                                    for i in nz:
                                        if np.array_equal(arrays[cx][i], X[x]):
                                            arrays[cx] = np.delete(arrays[cx], i, 0)
                                            break
                                except:
                                    print('  Not find {} in {}'.format(X[x], arrays[cx]))
                                    pass
                                cx = int(l_curr[x])
                                arrays[cx] = np.append(arrays[cx], [X[x]], axis=0)
            # equate the previous and current centers of clusters
            print('\n  endloop')
            c_old = C
            if self.log:
                if self.log is not True:
                    path = '{}'.format(self.log)
                else:
                    path = 'km_{}'.format(metric[:2])
                if path == '':
                    path = '.'
                else:
                    if not (os.path.exists(path)):
                         os.makedirs(path)
                cc = C
                cc = list(map(lambda x, y: (np.append(x, y)).tolist(), cc, p_curr))
                filename = '{}/{}_centers_{}.js'.format(path, metric[0], iteration)
                dump(cc, filename)

                xc = X
                xc = list(map(lambda x, y: (np.append(x, y)).tolist(), xc, l_curr))
                filename = '{}/{}_points_{}.js'.format(path, metric[0], iteration)
                dump(xc, filename)

            # array for calculated centers of clusters
            print('  calculating mu')
            mu = np.empty([c_len, 3])

            # for each cluster
            i = 0
            while i < c_len:
                # if it contains points
                if p_curr[i] != 0:
                    # calculate center of cluster
                    mu[i] = np.append(np.mean(arrays[i], axis=0), i)
                else:
                    mu[i] = C[i]
                i += 1

            print('  calculating d(c, mu(c))')
            dist = [self.dist(C[c], mu[c], metric) for c in range(c_len)]
            print('\n  loop on c, x')
            for c in range(c_len):
                for x in range(x_len):
                    lower[c][x] = max([lower[c][x] - dist[c], 0])
                    upper[x] = upper[x] + dist[int(l_curr[x])]
                    r[x] = True
            print('  endloop')
            # equate current centroids to calculated
            C = mu
            # increment iteration counter
            iteration += 1
            print('  iter end: {:.2f}k distance calculations\n'.format(self.icntr / 1000))
            self.icntr = 0
        print('Overall distance calculations: {}'.format(self.cntr))
        # record results
        self.cluster_centers_ = C
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
                 log=True):
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
        self.cluster_instance = KMeans(max_iter=max_iter, log=log)

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
