import random as rnd
import geojson as json
import numpy as np
import os

def grid(grid, bounds, round_=None):
    """ Initialize centers on grid.

    Parameters
    ----------
    grid : array {size_x, size_y}
        Set grid size.
    bounds : array {bottom_border, left_border, top_border, right_border}
        Specify borders.
    """
    lt = np.linspace(bounds[0], bounds[2], grid[0])
    ln = np.linspace(bounds[1], bounds[3], grid[1])
    lb = iter(range(grid[0] * grid[1]))

    centers = np.empty([0, 3], dtype='object')

    x = [[round(clt, round_), round(cln, round_), next(lb)] for clt in lt for cln in ln]
    for i in x:
        centers = np.append(centers, [i], axis=0)

    return centers

def random(count, bounds):
    """ Initialize centers by random.

    Parameters
    ----------
    count : int
        Set clusters count.
    bounds : array {bottom_border, left_border, top_border, right_border}
        Specify borders.
    """
    centers = np.empty([0, 3], dtype='object')
    for i in range(count):
        centers = np.append(centers,
            [[rnd.uniform(bounds[0], bounds[2]),
              rnd.uniform(bounds[1], bounds[3]), i]], axis=0)
    return centers

def file(filename, params=[]):
    """ Initialize centers from file.

    Parameters
    ----------
    filename : int
        Specify source file name.
    params : list, default empty list
        Specifies types of points which will be loaded.
    """
    with open(filename, 'r') as file_:
        arr = json.load(file_)
    centers = np.empty((0, 3), object)
    k = 0
    for i in arr:
        if str(i['type']) in params or params == []:
            lat, lon, id = float(i['lat']), float(i['lon']), k
            center = np.array([[lat, lon, id]], dtype='object')
            centers = np.append(centers, center, axis=0)
            k += 1
    return centers

def getBounds(points):
    """ Calculate bounds of initial centers generation.

    Parameters
    ----------
    points : array [n_points, n_dimensions]
        Coordinates of points

    Returns
    -------
    bounds : array {bottom_border, left_border, top_border, right_border}
        Bounds of initial centers generation.
    """
    bounds = None
    # choose four coordinates
    # of different points as bounds:
    # most bottom, most left, most top, and most right
    b, l, t, r = [points[0]] * 4
    for p in points[1:]:
        if p[0] > t[0]:
            t = p
        if p[0] < b[0]:
            b = p
        if p[1] > r[1]:
            r = p
        if p[1] < l[1]:
            l = p
    bounds = [b[0], l[1], t[0], r[1]]
    return bounds
