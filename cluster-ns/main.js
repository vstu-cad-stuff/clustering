// создаем карту
var map = L.map('map').setView([48.7941, 44.8009], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 20 цветов для центроидов: 10 для origin, 10 для destination
var colors = [
  '#e32636', '#ab274f', '#841b2d', '#cd9575', '#cc4c3e',
  '#3b7a57', '#665d1e', '#008000', '#00ff00', '#ff771e',
  '#00308f', '#6666cc', '#5d8aa8', '#000000', '#003fc0',
  '#007ba7', '#0066ff', '#003153', '#909090', '#6495ed'
];

var time = 0; // текущая итерация алгоритма
var max_time = c.length - 1; // последняя итерация алгоритма

var circles; // слой для маркеров (для быстрой очистки)

// функция отрисовки в определенный момент времени time
draw = function() {
  circles = new L.FeatureGroup(); // обнуляем слой
  for (var i in c[time])
    c[time][i][3] = NaN;
  console.time('readingP');
  for (var i in pd) {   // считываем точки
    var uid = pd[i][0]; // ид пользователя
    var lat = pd[i][1]; // широта
    var lon = pd[i][2]; // долгота
    var ctr = p[time][i]; // принадлежность центроиду
    c[time][ctr][3] = isNaN(c[time][ctr][3]) ? 1 : c[time][ctr][3] + 1;
    var circle = L.circleMarker([lat, lon], { // создаем маркер
        color: colors[ctr],
        radius: 3,
        weight: 1
      }).addTo(map).bindPopup('<b>' + uid + '</b><br />belongs to cluster ' +
        ctr + '<br />' + lat + ', ' + lon); // добавляем к нему popup
    circles.addLayer(circle); // добавляем маркер на слой circles
  }
  console.timeEnd('readingP');
  console.time('readingC');
  for (i in c[time]) {   // считываем точки центроидов отправки
    lat = c[time][i][0];
    lon = c[time][i][1];
    ctr = c[time][i][2];
    if (lat == 0 && lon == 0) { continue; }
    circle = L.circleMarker([lat, lon], {
        color: colors[ctr],
        radius: 3.5 + (isNaN(c[time][ctr][3]) && time == 0 ? 0 :
          Math.log(c[time][ctr][3]) / Math.log(2) * 2),
        opacity: 0.8,
        fillOpacity: 0.6
      }).addTo(map).bindPopup('<b>Cluster ' + ctr +
      '</b><br />has ' + (isNaN(c[time][ctr][3]) ? 0 : c[time][ctr][3]) +
      ' points<br />' + lat + ', ' + lon);
    circles.addLayer(circle);
  }
  console.timeEnd('readingC');
  console.time('draw');
  map.addLayer(circles); // отрисовываем слой circles на карте
  console.timeEnd('draw');
}

// функция очистки карты
clear = function() {
  map.removeLayer(circles); // удаляем слой с маркерами
}

curr_iter = function() {
  document.getElementById('time').value = time;
  document.getElementById('cur').innerHTML = 'Текущая итерация:<br />' + time + ' / ' + max_time;
}

final_state = function() {
  document.getElementById('comment').innerHTML = 'Конечное состояние';
}

init_state = function() {
  document.getElementById('comment').innerHTML = 'Начальное состояние';
}

curr_state = function() {
  document.getElementById('comment').innerHTML = '';
}

// следующая итерация
time_add = function() {
  if (time < max_time) { // если не достигнута последняя итерация
    time++;  // прибавляем к time единицу
    clear(); // очищаем карту
    draw();  // отрисовываем новые точки
  } else {
    // выключаем кнопку со стрелкой вправо
    document.getElementById('rarrow').disabled = true;
  }
  if (time > 0)  {
    // включаем кнопку со стрелкой влево
    document.getElementById('larrow').disabled = false;
  }
  
  // отображаем комментарии о начальном и конечном состояниях
  if (time == 0) {
    init_state();
  } else {
    if (time == max_time) {
      final_state();
    } else {
      curr_state();
    }
  }
  // отображаем текущий момент времени
  curr_iter();
}

// предыдущая итерация
time_rem = function() {
  if (time > 0) { // если не достигнута первая итерация
    time--;  // отнимаем от time единицу
    clear();
    draw();
  } else {
    // выключаем кнопку со стрелкой влево
    document.getElementById('larrow').disabled = true;
  }
  if (time < max_time)  {
    // включаем кнопку со стрелкой вправо
    document.getElementById('rarrow').disabled = false;
  }
  
  if (time == 0) {
    init_state();
  } else {
    if (time == max_time) {
      final_state();
    } else {
      curr_state();
    }
  }
  curr_iter();
}

time_set = function() {
  time = parseInt(document.getElementById('time').value);
  if (!isNaN(time)) {
    if (time <= 0) {
      time = 0;
      document.getElementById('larrow').disabled = true;
      document.getElementById('rarrow').disabled = false; 
      init_state();
    } else if (time >= max_time) {
        time = max_time;
        document.getElementById('larrow').disabled = false;
        document.getElementById('rarrow').disabled = true;
        final_state();
      } else {
        document.getElementById('larrow').disabled = false;
        document.getElementById('rarrow').disabled = false;
        curr_state();
      }
    clear();
    draw();
    curr_iter();
  }
}

// отрисовываем первую итерацию
draw();
init_state();
curr_iter();

// ------------------------------------

show = true;
hide = function() {
  if (show) {
    document.getElementById('map').style.width = "100%";
    document.getElementById('map').style.left = "-2px";
    document.getElementById('hide').value = "⇒";
    document.getElementById('hide').style.left = "10px";   
    show = false; 
  } else {
    document.getElementById('map').style.width = "calc(100% - 152px)";
    document.getElementById('map').style.left = "150px";
    document.getElementById('hide').value = "⇐";
    document.getElementById('hide').style.left = "162px";
    show = true;
  }
}
