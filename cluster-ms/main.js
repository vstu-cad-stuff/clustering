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

var circles; // слой для быстрой очистки

// функция отрисовки
draw = function() {
  circles = new L.FeatureGroup(); // обнуляем слой

  console.time('readingP');
  for (var i in p) {   // считываем точки
    var lat = p[i][0]; // широта
    var lon = p[i][1]; // долгота
    var ctr = p[i][2]; // принадлежность центроиду
    c[ctr][2] = (isNaN(c[ctr][2]) ? 0 : c[ctr][2] + 1);
    var circle = L.circleMarker([lat, lon], { // создаем маркер
        color: colors[ctr % colors.length],
        radius: 3,
        weight: 1
      }).addTo(map).bindPopup(lat + ', ' + lon +
        '<br />belongs to cluster ' + ctr); // добавляем к нему popup
    circles.addLayer(circle); // добавляем маркер на слой circles
  }

  console.timeEnd('readingP');
  console.time('readingC');

  for (i in c) {   // считываем точки центроидов отправки
    lat = c[i][0];
    lon = c[i][1];
    ctr = i;
    circle = L.circleMarker([lat, lon], {
        color: colors[ctr % colors.length],
        radius: 3.5 + (isNaN(c[ctr][2]) ? 0 : Math.log(c[ctr][2]) / Math.log(2) * 2),
        opacity: 0.8,
        fillOpacity: 0.6
      }).addTo(map).bindPopup('<b>Cluster ' + ctr +
      '</b><br />has ' + (isNaN(c[ctr][2]) ? 0 : c[ctr][2]) +
      ' points<br />' + lat + ', ' + lon);
    circles.addLayer(circle);
  }

  console.timeEnd('readingC');
  console.time('draw');

  map.addLayer(circles); // отрисовываем слой circles на карте

  console.timeEnd('draw');
}

// отрисовываем первую итерацию
draw();
