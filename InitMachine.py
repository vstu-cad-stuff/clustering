import random as rnd
import geojson as json
import numpy as np
import os

def grid(grid, bounds):
    """ Initialize centers on grid.

    Parameters
    ----------
    grid : array {size_x, size_y}
        Set grid size.
    bounds : array {bottom_border, left_border, top_border, right_border}
        Specify borders.
    """
    delta_lt = (bounds[2] - bounds[0]) / grid[0]
    delta_ln = (bounds[3] - bounds[1]) / grid[1]
    curr_lt = bounds[0] + delta_lt / 2
    curr_ln = bounds[1] + delta_ln / 2

    centers = np.empty([0, 3], dtype='object')

    centers = np.append(centers,
        [[curr_lt, curr_ln, 0]], axis=0)
    for i in range(grid[0] * grid[1]):
        if curr_ln + delta_ln > bounds[3]:
            if curr_lt + delta_lt > bounds[2]:
                break
            else:
                curr_lt += delta_lt
                curr_ln -= delta_ln * (grid[0] - 1)
        else:
            curr_ln += delta_ln
        centers = np.append(centers,
            [[curr_lt, curr_ln, i + 1]], axis=0)
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
    if points == None:
        print('No source to get bounds')
    else:
        # if points are setted, choose four coordinates
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
