filename = 'data_common.txt'

cluster_type = ('destination', 'cluster')

with open(filename) as f:
    data = f.readlines()

points = []
clusters = []

for entry in data:
    type, lat, lon = entry.replace('\n', '').split(', ')
    lat = float(lat)
    lon = float(lon)
    if type in cluster_type:
        clusters.append([lat, lon, len(clusters)])
    else:
        points.append([lat, lon])

with open ('{}_cls.txt'.format('.'.join(filename.split('.')[:-1])), 'w') as f:
    f.write(str(clusters))
with open ('{}_pts.txt'.format('.'.join(filename.split('.')[:-1])), 'w') as f:
    f.write('\n'.join(map(lambda x: '{},{}'.format(x[0], x[1]), points)))
