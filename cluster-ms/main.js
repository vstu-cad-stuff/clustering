// создаем картуvar map = L.map('map').setView([48.7941, 44.8009], 13);L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);var colors = [
  '#ff0000', '#906090', '#239837', '#000030', '#d2691e',
  '#ff69b4', '#20b2aa', '#1e90ff', '#006400', '#8fbc8f',
  '#a0522d', '#1387a9', '#003000', '#808080', '#923999',
  '#48989e', '#b22222', '#20958a', '#800000', '#6b8e23',
  '#ba7478', '#008b8b', '#483d8b', '#8a2be2', '#ff00ff',
  '#7b68ee', '#654321', '#00bfff', '#2e8b57', '#983490',
  '#00ffff', '#98fb98', '#a52a2a', '#ff8c00', '#4682b4',
  '#00ff00', '#8748a8', '#b8860b', '#32cd32', '#b0c4de',
  '#a9a9a9', '#add8e6', '#808000', '#be8378', '#d8bfd8',
  '#ffa500', '#bf8949', '#40e0d0', '#cd5c5c', '#8b0000',
  '#123456', '#ff6347', '#228b22', '#389218', '#dabd13',
  '#ba55d3', '#90ee90', '#00008b', '#ff7f50', '#708090',
  '#e0ffff', '#ba7ea7', '#48d1cc', '#405719', '#da70d6',
  '#aebcbe', '#556b2f', '#9400d3', '#ab477e', '#2f4f4f',
  '#fa8072', '#9a9a32', '#9acd32', '#5f9ea0', '#7fff00',
  '#ffa07a', '#101101', '#eab478', '#00a000', '#f08080',
  '#7cfc00', '#000080', '#ee82ee', '#9932cc', '#b72004',  '#00ff7f', '#191970', '#afeeee', '#f4a460', '#ffff00',
  '#4169e1', '#f5deb3', '#0987b3', '#c0c0c0', '#ffd700',  '#bdb76b', '#d3d3d3', '#696969', '#00fa9a', '#2e7a57',  '#bd8747', '#ff1493', '#dda0dd', '#ffe4e1', '#008080',  '#ffe4c4', '#00ced1', '#498ba9', '#e9967a', '#8b4513',  '#6a5acd', '#d2b48c', '#daa520', '#0000ff', '#394991',  '#8b008b', '#000000', '#cd853f', '#778899', '#87ceeb',  '#300000', '#7fffd4', '#800080', '#db7093', '#b0e0e6',  '#66cdaa', '#ffe4b5', '#8387ba', '#ff4500', '#deb887',  '#008000', '#0000a0', '#8c8f8f', '#d38887', '#a00000',  '#bf883a', '#ffb6c1', '#0000cd', '#89390a', '#adff2f',  '#babbab', '#73287a', '#87cefa', '#ba8910', '#9370db',  '#c71585', '#bc8f8f', '#4b0082', '#dc143c', '#6495ed'];rotate = function(a, b, c) {    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);}function graham(a) {    n = a.length;    p = [];    for (i = 0; i < n; i++) p.push(i);    for (var i = 1; i < n; i++) {        if (a[p[i]][1] < a[p[0]][1])            p[0] = p[i] + (p[i] = p[0], 0);    }    for (var i = 2; i < n; i++) {        j = i;        while ((j > 1) && (rotate(a[p[0]], a[p[j - 1]], a[p[j]]) < 0)) {            p[j] = p[j - 1] + (p[j - 1] = p[j], 0);            j -= 1;        }    }    s = [p[0], p[1]];    for (var i = 2; i < n; i++) {        while (rotate(a[s[s.length - 2]], a[s[s.length - 1]], a[p[i]]) < 0)            s.pop();        s.push(p[i]);    }    return s;}hull = function(a, b) {    var h = [];  for (var i in a)    h.push(b[a[i]]);  return h;}Cluster = (function() {  function Cluster(lat, lon, list) {    this.lat = lat;    this.lon = lon;    this.list = list || [];    this.pop = this.list.length;  }    Cluster.prototype.addPoint = function(lat, lon) {    this.list.push([lat, lon]);    this.pop = this.list.length;  }    return Cluster;})();clusters = [];for (var i in c) {  var lat = c[i][0];  var lon = c[i][1];  clusters.push(new Cluster(lat, lon));}for (var i in p) {  var lat = p[i][0];  var lon = p[i][1];  var ctr = p[i][2];  clusters[ctr].addPoint(lat, lon);}var circles;draw = function() {  circles = new L.FeatureGroup();    for (k in clusters) {    var h = hull(graham(clusters[k].list), clusters[k].list);    var polygon = new L.polygon(h, {      color: colors[k % colors.length],      opacity: 0.6,      fillOpacity: 0.2,      weight: 2    }).addTo(map).bindPopup('Population of cluster #' + k + ': ' +      clusters[k].pop);          var circle = new L.circleMarker([clusters[k].lat, clusters[k].lon], {        color: colors[k % colors.length],        radius: 3 + Math.pow(clusters[k].pop, 1 / 3) * 2,        opacity: 0.9,        fillOpacity: 0.4      }).addTo(map).bindPopup('<b>Cluster #' + k + '</b> at ' +        lat + ', ' + lon + '<br />Has ' +        clusters[k].pop + ' points');     circles.addLayer(polygon);    circles.addLayer(circle);  }    map.addLayer(circles);}draw();