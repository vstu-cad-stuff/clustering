// создаем карту
var map = L.map('map').setView([48.7941, 44.8009], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var colors = [
  '#800000', '#b22222', '#ff0000', '#fa8072', '#ff6347',
  '#ff7f50', '#ff4500', '#d2691e', '#f4a460', '#ff8c00',
  '#ffa500', '#b8860b', '#daa520', '#ffd700', '#808000',
  '#ffff00', '#9acd32', '#adff2f', '#7cfc00', '#008000',
  '#00ff00', '#32cd32', '#00ff7f', '#00fa9a', '#40e0d0',
  '#20b2aa', '#48d1cc', '#008080', '#008b8b', '#00ffff',
  '#00ced1', '#00bfff', '#1e90ff', '#4169e1', '#000080',
  '#00008b', '#0000cd', '#0000ff', '#8a2be2', '#9932cc',
  '#7fff00', '#8b0000', '#9400d3', '#800080', '#8b008b',
  '#ff00ff', '#c71585', '#ff1493', '#ff69b4', '#dc143c',
  '#a52a2a', '#cd5c5c', '#bc8f8f', '#f08080', '#ffe4e1',
  '#e9967a', '#ffa07a', '#a0522d', '#8b4513', '#cd853f',
  '#ffe4c4', '#deb887', '#d2b48c', '#ffe4b5', '#bdb76b',
  '#6b8e23', '#556b2f', '#8fbc8f', '#006400', '#228b22',
  '#90ee90', '#2e8b57', '#98fb98', '#66cdaa', '#7fffd4',
  '#2f4f4f', '#afeeee', '#e0ffff', '#5f9ea0', '#b0e0e6',
  '#add8e6', '#87ceeb', '#87cefa', '#4682b4', '#708090',
  '#778899', '#b0c4de', '#6495ed', '#191970', '#6a5acd',
  '#483d8b', '#7b68ee', '#9370db', '#4b0082', '#ba55d3',
  '#dda0dd', '#ee82ee', '#d8bfd8', '#da70d6', '#db7093',
  '#ffb6c1', '#000000', '#696969', '#808080', '#a9a9a9',
  '#c0c0c0', '#d3d3d3', '#f5deb3', '#d38887', '#8c8f8f',
  '#2e7a57', '#9a9a32', '#003000', '#300000', '#000030',
  '#00a000', '#a00000', '#0000a0', '#405719', '#123456',
  '#654321', '#906090', '#aebcbe', '#73287a', '#239837',
  '#389218', '#1387a9', '#983490', '#8748a8', '#48989e',
  '#ab477e', '#bf883a', '#bd8747', '#89390a', '#ba7478',
  '#923999', '#8387ba', '#20958a', '#bf8949', '#498ba9',
  '#0987b3', '#b72004', '#101101', '#babbab', '#ba7ea7',
  '#dabd13', '#394991', '#ba8910', '#eab478', '#be8378'
];

rotate = function(a, b, c) {
    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}
  
range = function(start, end) {
    var s = [];
    if (!end) {
        end = start;
        start = 0;
    }
    for (var i = start; i < end; i++) {
        s.push(i);
    }
    return s;
}

jarvis = function(a) {
  n = a.length;
  p = range(n);
  
  for (var i in range(1, n)) {
    if (a[p[i]][1] < a[p[0]][1])
      p[i] = p[0] + (p[0] = p[i], 0);
  }
  
  h = [p[0]];
  p.splice(0, 1);
  p.push(h[0]);
  while (true) {
    right = 0;
    len = p.length;
    for (var i in range(1, len + 1)) {
      if (rotate(a[h[h.length - 1]], a[p[right]], a[p[i]]) < 0)
        right = i;
    }
    if (p[right] == h[0]) {
      break;
    } else {
      h.push(p[right]);
      p.splice(right, 1);
    }
  }
  return h
}

hull = function(a, b) {  
  var h = [];
  for (var i in a)
    h.push(b[a[i]]);
  return h;
}

Cluster = (function() {
  function Cluster(lat, lon, list) {
    this.lat = lat;
    this.lon = lon;
    this.list = list || [];
    this.pop = this.list.length;
  }
  
  Cluster.prototype.addPoint = function(lat, lon) {
    this.list.push([lat, lon]);
    this.pop = this.list.length;
  }
  
  return Cluster;
})();

clusters = [];

for (var i in c) {
  var lat = c[i][0];
  var lon = c[i][1];
  clusters.push(new Cluster(lat, lon));
}

for (var i in p) {
  var lat = p[i][0];
  var lon = p[i][1];
  var ctr = p[i][2];
  clusters[ctr].addPoint(lat, lon);
}

var circles;

draw = function() {
  circles = new L.FeatureGroup();
  
  for (k in clusters) {
    var h = hull(jarvis(clusters[k].list), clusters[k].list);
    var polygon = new L.polygon(h, {
      color: colors[k % colors.length],
      opacity: 0.6,
      fillOpacity: 0.2,
      weight: 2
    }).addTo(map).bindPopup('Population of cluster #' + k + ': ' +
      clusters[k].pop);
      
    var circle = new L.circleMarker([clusters[k].lat, clusters[k].lon], {
        color: colors[k % colors.length],
        radius: 3 + Math.pow(clusters[k].pop, 1 / 3) * 2,
        opacity: 0.9,
        fillOpacity: 0.4
      }).addTo(map).bindPopup('<b>Cluster #' + k + '</b> at ' +
        lat + ', ' + lon + '<br />Has ' +
        clusters[k].pop + ' points');
 
    circles.addLayer(polygon);
    circles.addLayer(circle);
  }

  map.addLayer(circles);
}

draw();
