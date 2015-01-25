// создаем карту
var map = L.map('map').setView([48.7941, 44.8009], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 20 цветов для центроидов: 10 для origin, 10 для destination
var colors = [
  ['#e32636', '#ab274f', '#841b2d', '#cd9575', '#cc4c3e',
     '#3b7a57', '#665d1e', '#008000', '#00ff00', '#ff771e'],
  ['#00308f', '#6666cc', '#5d8aa8', '#000000', '#003fc0',
     '#007ba7', '#0066ff', '#003153', '#909090', '#6495ed']
];

var time = 0; // текущая итерация алгоритма
var max_time = 0; // последняя итерация алгоритма

// если k-means для одного из типов центроидов сошелся раньше, чем для другого,
// то для него повторяем предыдущую итерацию до тех пор, пока количество итераций
// не сравняется
if (cs.length > cd.length) {
  // если для destination сошелся за меньшее количество итераций
  max_time = cs.length - 1;
  for (i = cd.length; i < cs.length; i++) {
    cd[i] = cd[i - 1];
    pd[i] = pd[i - 1];
  }
}  else {
  // если для origin сошелся за меньшее количество итераций
  max_time = cd.length - 1;
  for (i = cs.length; i < cd.length; i++) {
    cs[i] = cs[i - 1];
    ps[i] = ps[i - 1];
  }
}

var circles; // слой для маркеров (для быстрой очистки)

// функция отрисовки в определенный момент времени time
draw = function() {
  circles = new L.FeatureGroup(); // обнуляем слой
  for (i in ps[time]) {   // считываем точки отправки
    uid = ps[time][i][0]; // ид пользователя
    lat = ps[time][i][1]; // широта
    lon = ps[time][i][2]; // долгота
    ctr = ps[time][i][3]; // принадлежность центроиду
    cs[time][ctr][4] = isNaN(cs[time][ctr][4]) ? 1 : cs[time][ctr][4] + 1;
    circle = L.circleMarker([lat, lon], { // создаем маркер
        color: colors[0][ctr],
        radius: 3,
        weight: 1
      }).addTo(map).bindPopup('<b>' + uid + '</b><br />origin : ' +
        ctr + '<br />' + lat + ', ' + lon); // добавляем к нему popup
    circles.addLayer(circle); // добавляем маркер на слой circles
  }
  for (i in pd[time]) {   // считываем точки прибытия
    uid = pd[time][i][0];
    lat = pd[time][i][1];
    lon = pd[time][i][2];
    ctr = pd[time][i][3];
    cd[time][ctr][4] = isNaN(cd[time][ctr][4]) ? 1 : cd[time][ctr][4] + 1;
    circle = L.circleMarker([lat, lon], {
        color: colors[1][ctr],
        radius: 3,
        weigth: 1
      }).addTo(map).bindPopup('<b>' + uid + '</b><br />destination : ' +
        ctr + '<br />' + lat + ', ' + lon); // добавляем к нему popup
    circles.addLayer(circle);
  }
  for (i in cs[time]) {   // считываем точки центроидов отправки
    uid = cs[time][i][0];
    lat = cs[time][i][1];
    lon = cs[time][i][2];
    ctr = cs[time][i][3];
    if (lat == 0 && lon == 0) { continue; }
    circle = L.circleMarker([lat, lon], {
        color: colors[0][ctr],
        radius: 3.5 + (isNaN(cs[time][ctr][4]) && time == 0 ? 0 :
          Math.log(cs[time][ctr][4]) / Math.log(2) * 2),
        opacity: 0.8,
        fillOpacity: 0.6
      }).addTo(map).bindPopup('<b>' + uid + ' : ' + ctr +
      '</b><br />has ' + (isNaN(cs[time][ctr][4]) ? 0 : cs[time][ctr][4]) +
      ' points<br />' + lat + ', ' + lon);
    circles.addLayer(circle);
  }
  for (i in cd[time]) {   // считываем точки центроидов прибытия
    uid = cd[time][i][0];
    lat = cd[time][i][1];
    lon = cd[time][i][2];
    ctr = cd[time][i][3];
    if (lat == 0 && lon == 0) { continue; }
    circle = L.circleMarker([lat, lon], {
        color: colors[1][ctr],
        radius: 3.5 + (isNaN(cd[time][ctr][4]) && time == 0 ? 0 :
          Math.log(cd[time][ctr][4]) / Math.log(2) * 2),
        opacity: 0.8,
        fillOpacity: 0.6
      }).addTo(map).bindPopup('<b>' + uid + ' : ' + ctr +
      '</b><br />has ' + (isNaN(cd[time][ctr][4]) ? 0 : cd[time][ctr][4]) +
      ' points<br />' + lat + ', ' + lon);
    circles.addLayer(circle);
  }
  map.addLayer(circles); // отрисовываем слой circles на карте
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
