import json
import numpy as np

def rotate(a, b, c):
    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])

def jarvis(a):
    n = len(a)
    p = range(n)
    for i in range(1,n):
        if a[p[i]][1] < a[p[0]][1]:
            p[i], p[0] = p[0], p[i]
    h = [p[0]]
    del p[0]
    p.append(h[0])
    while True:
        right = 0
        for i in range(1, len(p)):
            if rotate(a[h[-1]], a[p[right]], a[p[i]]) < 0:
                right = i
        if p[right] == h[0]:
            break
        else:
            h.append(p[right])
            del p[right]
    print('Found {} vertices'.format(len(h)))
    return h

def hull(a, b):
    h = []
    for i in a:
        h.append(b[i])
    return h

last = 24
metric = 'route'
method = 'kmeans'
filecen = 'krc.js'
filepoi = 'krp.js'

centers = []
hulls = []

File = open(filecen, 'w')
File.write('{}{}c = '.format(method[0], metric[0]))
for i in range(last + 1):
    filec = '{}_{}/{}_centers_{}.js'.format(method[:2], metric[:2], metric[0], i)
    with open(filec, 'r') as file_:
        center = json.load(file_)
        print('readed c#' + str(i))
        centers.append(center)
json.dump(centers, File)
File.close()

File = open(filepoi, 'w')
File.write('{}{}p = '.format(method[0], metric[0]))
for i in range(last + 1):
    filep = '{}_{}/{}_points_{}.js'.format(method[:2], metric[:2], metric[0], i)
    with open(filep, 'r') as file_:
        points = json.load(file_)
        print('readed p#' + str(i))
    mx = int(max(map(lambda k: k[2], points))) + 1
    ps = [np.empty([0, 3]) for each in range(0, mx)]
    for j in points:
        b = int(j[2])
        ps[b] = np.append(ps[b], [j], axis=0)
    this_hulls = []
    for j in ps:
        try:
            print('Calculating hull of {} points for cluster {}'.format(len(j), j[0][2]))
            h = hull(jarvis(j), j.tolist())
            this_hulls.append(h)
        except IndexError:
            pass
    hulls.append(this_hulls)
json.dump(hulls, File)
File.close()