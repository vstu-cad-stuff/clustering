/* ---------- error showing ---------- */ {
// reload page if error while loading js-libraries
function reload() {
  window.location.reload();
}

// show div with error description
if (error) {
  document.getElementById("error").style.visibility = "visible";
}
/* ---------- ----- ------- ---------- */ }

/* ---------- initializing all variables ---------- */ {
/* creating map; turning off closing popups on click:
   we'll do it ourselves */
var map = L.map('map', {closePopupOnClick: false}).
  setView([48.7819, 44.7777], 14);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

/* array for points. Structure of an element:
   [point_lat, point_lng, point_type] */
var points = [];

// array of layers, needed for easy deletion and selection
var layers = [];

// current mode of work. Initial - 'select' mode
var work_mode = 'select';
// current type of point. Initial - 'default'
var point_type = 'default';
// points count, need for spray and uniform modes
var count = 20;
// array of last actions
var last_actions = [];
// _leaflet_id of clicked marker
var clicked;
// 
var poly_state = [false, []];
/* ---------- ------------ --- --------- ---------- */ }

/* ---------- marker icons ---------- */ {
// icon for non-separated point
var icon_def = L.icon({
  iconUrl: 'img/icon.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for origin point
var icon_origin = L.icon({
  iconUrl: 'img/origin.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for destination point
var icon_destination = L.icon({
  iconUrl: 'img/destination.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for polygon handle
var icon_handle = L.icon({
  iconUrl: 'img/handle.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});
/* ---------- ------ ----- ---------- */ }

/* ---------- common ---------- */ {
function everytime() {
  if (poly_state[1] == true) {
    // hide completed polygon
    map.removeLayer(poly_state[0]);
    poly_state[0] = false;
    poly_state[1] = [];
  } else {
    var undef_pos = poly_state[1].slice(0).sort().indexOf(undefined);
    var len = poly_state[1].length;
    if (undef_pos == -1) {
      if (len > 2) {
        document.getElementById('poly_ready').disabled = false;
      } else {
        document.getElementById('poly_ready').disabled = true;
      }
      if (len > 0) {
        document.getElementById('poly_cancel').disabled = false;
      } else {
        document.getElementById('poly_cancel').disabled = true;
      }
    } else {
      if (undef_pos > 2) {
        document.getElementById('poly_ready').disabled = false;
      } else {
        document.getElementById('poly_ready').disabled = true;
      }
      if (undef_pos > 0) {
        document.getElementById('poly_cancel').disabled = false;
      } else {
        document.getElementById('poly_cancel').disabled = true;
      }
    }
  }
  map.contextmenu.hide();
}

function get_type(marker) {
  /* some strange way to get state of marker:
     get name of it's icon, then cut 'img/' in beginning
     and '.png' at the end. If name is 'icon' then it is
     a default marker */
  var m_type = marker.options.icon.options.iconUrl.slice(4, -4);
  if (m_type == 'icon')
    m_type = 'default';
  return m_type;
}

function draw_marker(type, latlng) {
  // creating marker
  switch (type) {
    case 'default': {
      var marker = L.marker(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
          bindPopup(latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'origin': {
      var marker = L.origin(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
          bindPopup('<b>origin</b><br/>' +
          latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'destination': {
      var marker = L.destination(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
          bindPopup('<b>destination</b><br/>' +
          latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'handle': {
      var marker = L.handle(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1
      }).addTo(map);
    }
  }
  // add event listeners to marker
  marker.on('click', onMarkerClick);
  marker.on('dragstart', onMarkerDragStart);
  marker.on('dragend', onMarkerDragEnd);
  if (type == 'handle') {
    marker.on('contextmenu', function (e) {
      if (work_mode != 'select' && work_mode != 'poly') {
        map.contextmenu.hide();
        return false;
      }
      clicked = e.target._leaflet_id;
    })
  } else {
    marker.on('contextmenu', function (e) {
      if (work_mode != 'select') {
        map.contextmenu.hide();
        return false;
      }
      clicked = e.target._leaflet_id;
    })
  }
  return marker;
}

function change_to(type, L_id) {
  /* change type of point with _leaflet_id = L_id to 'type' */
  // get marker
  var marker = map._layers[L_id];
  // get latlng of marker
  var latlng = marker._latlng;
  // get options layer and point from marker
  var layer = marker.options.layer;
  var point = marker.options.point;
  // get previous state of marker
  var prev_type = get_type(marker);
  // remove marker from layer
  layers[layer].removeLayer(marker);
  // remove marker from map
  map.removeLayer(marker);
  // use specified marker template
  switch (type) {
    case 'origin': {
      marker = L.origin(latlng, {
        layer: layer,
        point: point
      }).addTo(map).
          bindPopup('<b>origin</b><br/>' +
          lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
    case 'destination': {
      marker = L.destination(latlng, {
        layer: layer,
        point: point
      }).addTo(map).
          bindPopup('<b>destination</b><br/>' +
          lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
    case 'default': {
      marker = L.marker(latlng, {
        layer: layer,
        point: point
      }).addTo(map).
          bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
  }
  // add event listeners and callback functions
  marker.on('click', onMarkerClick);
  marker.on('dragstart', onMarkerDragStart);
  marker.on('dragend', onMarkerDragEnd);
  marker.on('contextmenu', function (e) {
    clicked = e.target._leaflet_id
  });
  // write new marker to PREVIOUS position (!important)
  map._layers[L_id] = marker;
  // delete automatically created layer
  delete map._layers[marker._leaflet_id];
  // change _leaflet_id of created marker to L_id
  map._layers[L_id]._leaflet_id = L_id;
  // add created marker to previous layer contained it
  layers[layer].addLayer(map._layers[L_id]);
  //
  points[point][2] = type;
  // return prev_type because we'll need it in undo function
  return prev_type;
}

function delete_marker(L_id) {
  var marker = map._layers[L_id];
  var type = get_type(marker);
  // get layer it contained
  var layer = marker.options.layer;
  // variable for last_actions array
  var temp = ['delete', [marker]];
  // remove marker from layer
  layers[layer].removeLayer(marker);
  if (type == 'handle') {
    var inline = marker.options.in;
    var outline = marker.options.out;
    var vertex = marker.options.vertex;
    if (inline == undefined) {
      if (outline != undefined) {
        // first point deletion: delete out
        layers[layer].removeLayer(outline);
        map.removeLayer(outline);
        var i = 1;
        while (poly_state[1][vertex + i] == undefined &&
            vertex + i < poly_state[1].length)
          i++;
        if (vertex + i < poly_state[1].length &&
            poly_state[1][vertex + i] != undefined)
          poly_state[1][vertex + i].options.in = undefined;
      } // 'else' here is polygon which has only one point
    } else {
      if (outline == undefined) {
        // last point deletion: delete in
        layers[layer].removeLayer(inline);
        map.removeLayer(inline);
        var i = 1;
        while (poly_state[1][vertex - i] == undefined &&
            vertex - i > 0)
          i++;
        if (vertex - i > 0 &&
            poly_state[1][vertex - i] != undefined)
          poly_state[1][vertex - i].options.out = undefined;
      } else {
        // middle point deletion: delete one of lines
        layers[layer].removeLayer(outline);
        map.removeLayer(outline);
        layers[layer].removeLayer(inline);
        map.removeLayer(inline);
        var i = 1;
        var j = 1;
        while (poly_state[1][vertex + i] == undefined &&
            vertex + i < poly_state[1].length)
          i++;
        while (poly_state[1][vertex - j] == undefined &&
            vertex - j > 0)
          j++;
        if (vertex + i < poly_state[1].length &&
            poly_state[1][vertex + i] != undefined) {
          if (vertex - j >= 0 &&
              poly_state[1][vertex - j] != undefined) {
            inline._latlngs[1] = poly_state[1][vertex + i]._latlng;
            poly_state[1][vertex - j].options.out = inline;
            poly_state[1][vertex + i].options.in = inline;
            layers[layer].addLayer(inline);
            map.addLayer(inline);
          } else {
            poly_state[1][vertex + i].options.in = undefined;
          }
        };
      }
    }
    poly_state[1][vertex] = undefined;
  } else {
    delete points[marker.options.point];
  }
  map.removeLayer(marker);
  // getting layer._layers properties
  var props = Object.getOwnPropertyNames(layers[layer]._layers);
  // if layer._layers does not have any properties
  if (!props.length) {
    // if we delete layer, add it to last_actions item
    temp[1][1] = layers[layer];
    // remove layer from the map
    map.removeLayer(layers[layer]);
    // and the 'layers' array
    delete layers[layer];
    if (type == 'handle') {
      poly_state[0] = false;
      poly_state[1] = [];
      document.getElementById('poly_cancel').disabled = true;
      document.getElementById('poly_ready').disabled = true;
    }
  }
  return temp;
}
/* ---------- ------ ---------- */ }

/* ---------- context menu functions ---------- */ {
function set_as_origin() {
  // get prev_type and change 'clicked' marker to origin
  var prev_type = change_to('origin', clicked);
  // write new action to 'last_actions'
  last_actions.push(['change', clicked, prev_type]);
}

function set_as_destin() {
  var prev_type = change_to('destination', clicked);
  last_actions.push(['change', clicked, prev_type]);
}

function set_as_default() {
  var prev_type = change_to('default', clicked);
  last_actions.push(['change', clicked, prev_type]);
}

function delete_point() {
  var temp = delete_marker(clicked);
  last_actions.push(temp);
  everytime();
}
/* ---------- ------- ---- --------- ---------- */ }

/* ---------- extending Leaflet templates ---------- */ {
/* extend Leaflet Marker:
   add option for binding Marker with Layer in which
   it was created (was made for undo actions),
   add option for binding Marker with it index in
   'points' array (was made for dragging points) */
L.Marker = L.Marker.extend({
   options: {
      draggable: 'true',              // we can drag it now
      layer: 0,                       // option for binding with layer
      point: 0,                       // option for binding with index
      icon: icon_def,                 // set icon to default
      contextmenu: true,              // create context menu
      contextmenuInheritItems: false, // do NOT get inherit items (if do, we'll get infinite menu)
      contextmenuItems: [{            // set as origin
        text: 'Set as origin point',
        callback: set_as_origin,
        icon: 'img/origin.png'
      }, {                            // set as destination
        text: 'Set as destination point',
        callback: set_as_destin,
        icon: 'img/destination.png'
      }, {                            // separator
        separator: true
      }, {                            // delete
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.Origin = L.Marker.extend({
   options: {
      draggable: 'true',
      layer: 0,
      point: 0,
      icon: icon_origin,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Set as default point',
        callback: set_as_default,
        icon: 'img/icon.png'
      }, {
        text: 'Set as destination point',
        callback: set_as_destin,
        icon: 'img/destination.png'
      }, {
        separator: true
      }, {
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.origin = function (t, e) { return new L.Origin(t, e) };

L.Destination = L.Marker.extend({
   options: {
      draggable: 'true',
      layer: 0,
      point: 0,
      icon: icon_destination,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Set as default point',
        callback: set_as_default,
        icon: 'img/icon.png'
      }, {
        text: 'Set as origin point',
        callback: set_as_origin,
        icon: 'img/origin.png'
      }, {
        separator: true
      }, {
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.destination = function (t, e) { return new L.Destination(t, e) };

L.Handle = L.Marker.extend({
   ilatlng: undefined,
   options: {
      draggable: 'true',
      layer: 0,
      vertex: 0,
      in: undefined,
      out: undefined,
      icon: icon_handle,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.handle = function (t, e) { return new L.Handle(t, e) };
/* ---------- --------- ------- --------- ---------- */ }

/* ---------- event handlers ---------- */ {
// on map click
function onClick(e) {
  everytime();
  // getting coordinates of click
  lat = e.latlng.lat;
  lng = e.latlng.lng;
  // doing stuff depending on work mode
  switch (work_mode) {
    /* ----- select mode ----- */
    /* ----- delete mode ----- */
    case 'select':
    case 'delete': {
      /* if clicking on map in 'select' or 'delete' mode
         we should close opened popup */
      map.closePopup();
      everytime();
      break; }
    /* ----- point mode ----- */
    case 'point': {
      /* if clicking on map in 'point' mode
         we should set marker */
      // creating new layer for point
      layers.push(new L.FeatureGroup());
      // writing point to 'points' array
      points.push([lat, lng, point_type]);
      // creating marker
      var marker = draw_marker(point_type, [lat, lng]);
      // add marker to layer
      layers[layers.length - 1].addLayer(marker);
      last_actions.push(['add', layers.length - 1]);
      // and draw it on map
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- spray mode ----- */
    case 'spray': {
      /* if clicking on map in 'spray' mode
         we should set 'count' of points in an small area
         near click point */
      // parsing input for number
      var count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // showing number
      document.getElementById('count').value = count;
      
      var radius = document.getElementById('input_radius').value;
      
      // create new layer
      layers.push(new L.FeatureGroup());
      // for each point we
      for (i = 0; i < count; i++) {
        // generate random coordinates
        var not_in_circle = true;
        var nlat = 0;
        var nlng = 0;
        while (not_in_circle) {
          nlat = (Math.random() - 0.5) * (radius * 2 / 3);
          nlng = (Math.random() - 0.5) * radius;
          if ((nlat << 1) + (nlng << 1) <= 2 / 3 * (radius << 1))
            not_in_circle = false;
        }
        nlat += lat;
        nlng += lng;
        // writing point to 'points' array
        points.push([nlat, nlng, point_type]);
        // creating marker
        var marker = draw_marker(point_type, [nlat, nlng]);
        // adding markers to layer
        layers[layers.length - 1].addLayer(marker);
      }
      last_actions.push(['add', layers.length - 1]);
      // draw markers
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- bounding box mode ----- */
    case 'bb': {
      /* if clicking on map in 'bb' mode
         we should set 'count' of points in a bounding
         box of a map on screen */
      // parsing input for number
      count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // showing number
      document.getElementById('count').value = count;
      
      // getting map bounds on screen
      bounds = [
        map.getBounds()._southWest.lat,  // min latitude
        map.getBounds()._northEast.lat,  // max latitude
        map.getBounds()._southWest.lng,  // min longitude
        map.getBounds()._northEast.lng]; // max longitude
        
      // create new layer
      layers.push(new L.FeatureGroup());
      for (i = 0; i < count; i++) {
        // generate random coordinates
        nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
        nlng = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
        // writing point to 'points' array
        points.push([nlat, nlng, point_type]);
        // creating marker
        var marker = draw_marker(point_type, [nlat, nlng]);
        // adding markers to layer
        layers[layers.length - 1].addLayer(marker);
      }
      last_actions.push(['add', layers.length - 1]);
      // draw markers
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- polygon mode ----- */
    case 'poly': {
      /* if clicking on map in 'polygon' mode
         we should set vertex of polygon. Then, by clicking
         special button we fill it by 'count' points */
      var started = false;
      if (!poly_state[0]) {
        // creating new layer for point
        layers.push(new L.FeatureGroup());
        poly_state[0] = layers[layers.length - 1];
        started = true;
        document.getElementById('poly_cancel').disabled = false;
      }
      // creating marker
      var marker = draw_marker('handle', [lat, lng]);
      // add marker to layer
      poly_state[0].addLayer(marker);
      marker.ilatlng = marker._latlng;
      if (started) {
        last_actions.push(['handle', [marker._leaflet_id]]);
      } else {
        var i = poly_state[1].length - 1;
        while (poly_state[1][i] == undefined &&
            i > 0)
          i--;
        if (i >= 0 &&
            poly_state[1][i] != undefined) {
          var last = poly_state[1][i];
        } else {
          var last = undefined;
        }
        if (last == undefined) {
          return 0
        } else {        
          var line = L.polyline([last._latlng, [lat, lng]],
            {color: 'green'});
          poly_state[0].addLayer(line);
          last.options.out = line;
          last_actions.push(['handle',
            [marker._leaflet_id, last._leaflet_id, line]]);
          marker.options.in = line;
        }
      }
      marker.options.vertex = poly_state[1].length;
      poly_state[1].push(marker);
      if (poly_state[1].length > 2)
        document.getElementById('poly_ready').disabled = false;
      // and draw it on map
      map.addLayer(poly_state[0]);
      break; }
  }
}

// on marker click
function onMarkerClick(e) {
  everytime();
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select': {
      /* in 'select' mode we just open popup */
      // opening popup for clicked marker
      map._layers[e.target._leaflet_id].openPopup();
      map.contextmenu.hide();
      break; }
    case 'delete': {
      /* in 'delete' mode we delete marker
         and layer contained it, if it has no more markers */
      map.contextmenu.hide();
      var l_id = e.target._leaflet_id;
      var temp = delete_marker(l_id);
      last_actions.push(temp);
      break; }
    case 'poly': {
      var i = 0;
      while (poly_state[1][i] == undefined &&
          i < poly_state[1].length)
        i++;
      if (i < poly_state[1].length &&
          poly_state[1][i] != undefined)
        if (e.target == poly_state[1][i])
          poly_ready();
      break; }
  }
}

// on marker drag start
function onMarkerDragStart(e) {
  everytime();
  /* an easy protection from dragging markers in not 'select'
     work mode: equate new coordinates to old */
  var marker = e.target;
  var marker_type = get_type(marker);
  if (work_mode != 'select' &&
      !(work_mode == 'poly' && marker_type == 'handle')) {
    var layer = marker.options.layer;
    layers[layer].removeLayer(e.target);
    if (marker_type != 'handle') {
      marker._latlng.lat = points[marker.options.point][0];
      marker._latlng.lng = points[marker.options.point][1];
    } else {
      marker._latlng = marker.ilatlng;
    }    
    layers[layer].addLayer(e.target);
  }
}

// on marker drag end
function onMarkerDragEnd(e) {
  var marker = e.target;
  // getting new coordinates of marker
  var lat = marker._latlng.lat;
  var lng = marker._latlng.lng;
  var type = get_type(marker);
  if (type == 'handle') {
    var line;
    if (marker.options.out != undefined) {
      line = marker.options.out;
      line._latlngs[0] = [lat, lng];
      map.removeLayer(line);
      map.addLayer(line);
    }
    if (marker.options.in != undefined) {
      line = marker.options.in;
      line._latlngs[1] = [lat, lng];
      map.removeLayer(line);
      map.addLayer(line);
    }
    marker.ilatlng = marker._latlng;
  } else {
    last_actions.push(['move',
        points[marker.options.point], marker._leaflet_id]);
    // changing data in array
    points[marker.options.point] = [lat, lng, type];
    
    // binding new popup
    switch (type) {
      case 'default': {
        marker.bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
      case 'origin': {
        marker.bindPopup('<b>origin</b><br/>' +
            lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
      case 'destination': {
        marker.bindPopup('<b>destination</b><br/>' +
            lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
    }
  }
}
/* ---------- ----- -------- ---------- */ }

/* ---------- toolbar functions ---------- */ {
// on toolbar's element click
function select(option) {
  everytime();
  // setting work mode
  work_mode = option;
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select': {
      // hide input panel
      document.getElementById('input').style.visibility = 'hidden';
      // hide polygon submenu
      document.getElementById('poly_sub').style.visibility = 'hidden';
      // hide delete submenu
      document.getElementById('del_sub').style.visibility = 'hidden';
      // hide spray radius changer
      document.getElementById('spray_radius').style.visibility = 'hidden';
      // hide point's type selection menu
      document.getElementById('select_type').style.visibility = 'hidden';
      // select 'select' element
      document.getElementById('select').className = 'selected';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'point': {
      document.getElementById('input').style.visibility = 'hidden';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('del_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      // show point's type selection menu
      document.getElementById('select_type').style.visibility = 'visible';
      // change position of type selection menu
      document.getElementById('select_type').style.top = 132;
      // select 'point' element
      document.getElementById('select').className = '';
      document.getElementById('point').className = 'selected';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'spray': {
      // show input panel
      document.getElementById('input').style.visibility = 'visible';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('del_sub').style.visibility = 'hidden';
      // show spray radius changer
      document.getElementById('spray_radius').style.visibility = 'visible';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('select_type').style.top = 159;
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = 'selected';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'poly': {
      document.getElementById('input').style.visibility = 'visible';
      // show polygon submenu
      document.getElementById('poly_sub').style.visibility = 'visible';
      document.getElementById('del_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('select_type').style.top = 186;
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = 'selected';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'bb': {
      document.getElementById('input').style.visibility = 'visible';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('del_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('select_type').style.top = 213;
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = 'selected';
      document.getElementById('delete').className = '';
      break; }
    case 'delete': {
      document.getElementById('input').style.visibility = 'hidden';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      // show delete submenu
      document.getElementById('del_sub').style.visibility = 'visible';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'hidden';
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = 'selected';
      break; }
  }
}

// on point type selection
function select_type(option) {
  everytime();
  // changing point's type
  point_type = option;
  // doing stuff depending on work mode
  switch (point_type) {
    case 'default': {
      // select 'default' type
      document.getElementById('default').className = 'selected';
      document.getElementById('origin').className = '';
      document.getElementById('destination').className = 'last';
      break; }
    case 'origin': {
      // select 'origin' type
      document.getElementById('default').className = '';
      document.getElementById('origin').className = 'selected';
      document.getElementById('destination').className = 'last';
      break; }
    case 'destination': {
      // select 'destination' type
      document.getElementById('default').className = '';
      document.getElementById('origin').className = '';
      document.getElementById('destination').className = 'last selected';
      break; }
  }
}

// clear map
function all_clear() {
  points = [];
  last_actions = [];
  for (var i in layers) {
    if (layers[i] != undefined)
      map.removeLayer(layers[i]);
  }
  layers = [];
  poly_state = [false, []];
}

// save function
function save() {
  everytime();
  // variable for text
  var text = '';

  // for each point
  for (i = 0; i < points.length; i++) {
    // variable for element of 'points' array
    var el = points[i];
    if (el != undefined) {
      // write it to 'text'
      text += el[2] + ', ';
      text += el[0].toFixed(6) + ', ';
      text += el[1].toFixed(6);
      // line break
      text += '\n';
    }
  }

  // creating an 'a' element for downloading
  var a = document.createElement('a');
  // setting 'text' to href
  a.setAttribute('href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  // setting link to download, not to navigate; setting name of file
  a.setAttribute('download', 'data.txt');
  // adding to body (need this for firefox)
  document.body.appendChild(a);
  // clicking
  a.click();
  // removing from body
  document.body.removeChild(a);
}

// load function
function load() {
  everytime();
  var input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('id', 'input_id');
  document.body.appendChild(input);
  input.click();
  input.addEventListener('change', read, false);
}

// function for reading file 
function read() {
  var input = document.getElementById('input_id');
  var files = input.files;
  var file = files[0];
  var start = 0;
  var stop = file.size - 1;
  var reader = new FileReader();
  reader.onload = function(e) {
    var string = e.target.result;
    points = string.split('\n');
    if (points.slice(-1)[0].indexOf(',' == -1))
      points.splice(-1);
    layers.push(new L.FeatureGroup());
    for (var i in points) {
      points[i] = points[i].split(', ');
      var type = points[i][0];
      var lat = parseFloat(points[i][1]);
      var lng = parseFloat(points[i][2]);
      points[i][0] = lat;
      points[i][1] = lng;
      points[i][2] = type;
      var marker = draw_marker(type, [lat, lng]);
      layers[layers.length - 1].addLayer(marker);
    }
    last_actions.push(['add', layers.length - 1]);
    map.addLayer(layers[layers.length - 1]);
  };
  
  blob = file.slice(start, stop + 1);
  reader.readAsBinaryString(blob);
  document.body.onfocus = '';
  document.body.removeChild(input);
}

// undo function
function undo() {
  // if user did nothing
  if (last_actions.length == 0)
    return false;
  // last action
  var action = last_actions.pop();
  // type of last action
  var type = action[0]
  switch (type) {
    case 'add': {
      /* 'add' type: delete created layer.
         Element structure:
           ['add', layer] */
      // get layer index
      var layer = action[1];
      //
      for (i in layers[layer]._layers) {
        delete points[map._layers[i].options.point];
      }
      // remove layer from the map
      map.removeLayer(layers[layer]);
      // and the 'layers' array
      delete layers[layer];
      break; }
    case 'move': {
      /* 'move' type: move marker back.
         Element structure:
           ['move', [old_lat, old_lng], marker_leaflet_id] */
      // get marker
      var marker = map._layers[action[2]];
      // get index in 'points' array
      var point = marker.options.point;
      // set old coordinates to points array
      points[point] = action[1];
      // set old coordinates to marker
      marker._latlng = action[1];
      // redraw marker
      map.removeLayer(marker);
      map.addLayer(marker);
      break; }
    case 'delete': {
      /* 'delete' type: return deleted layers.
         Element structure:
           ['delete', [layers]] */
      // get deleted layers array
      var deleted = action[1];
      // if point and layer were deleted
      if (deleted.length > 1) {
        // getting layer
        var layer = deleted[1];
        // getting point
        var point = deleted[0];
        // adding point to layer
        layer.addLayer(point);
        // getting layer's index in 'layers' array
        var layer_index = point.options.layer;
        // getting point's index in 'points' array
        var point_index = point.options.point;
        // adding deleted coordinates of point to 'points' array
        points[point_index] = [point._latlng.lat, point._latlng.lng];
        // adding deleted layer to 'layers' array
        layers[layer_index] = layer;
        // draw layer on map
        map.addLayer(layer);
      // if just point was deleted
      } else {
        // getting point
        var point = deleted[0];
        // getting layer's index in 'layers' array
        var layer_index = point.options.layer;
        if (get_type(point) != 'handle') {
          // getting point's index in 'points' array
          var point_index = point.options.point;
          // adding deleted coordinates of point to 'points' array
          points[point_index] = [point._latlng.lat, point._latlng.lng];
        } else {
          var vertex = point.options.vertex;
          poly_state[1][vertex] = point;
          var inline = point.options.in;
          var outline = point.options.out;
          if (inline == undefined) {
            if (outline != undefined) {
              var i = 1;
              while (poly_state[1][vertex + i] == undefined &&
                  vertex + i < poly_state[1].length)
                i++;
              if (vertex + i < poly_state[1].length &&
                  poly_state[1][vertex + i] != undefined) {
                outline._latlngs[1] = poly_state[1][vertex + i]._latlng;
                poly_state[1][vertex + i].options.in = outline;
                poly_state[0].addLayer(outline);
                map.addLayer(outline);
              }
            }
          } else {
            if (outline == undefined) {
              var i = 1;
              while (poly_state[1][vertex - i] == undefined &&
                  vertex - i > 0)
                i++;
              if (vertex - i >= 0 &&
                  poly_state[1][vertex - i] != undefined) {
                inline._latlngs[0] = poly_state[1][vertex - i]._latlng;
                poly_state[1][vertex - i].options.out = inline;
                poly_state[0].addLayer(inline);
                map.addLayer(inline);
              }
            } else {
              var i = 1;
              var j = 1;
              while (poly_state[1][vertex + i] == undefined &&
                  vertex + i < poly_state[1].length)
                i++;
              while (poly_state[1][vertex - j] == undefined &&
                  vertex - j > 0)
                j++;
              if (vertex + i < poly_state[1].length &&
                  poly_state[1][vertex + i] != undefined) {
                if (vertex - j >= 0 &&
                    poly_state[1][vertex - j] != undefined) {
                  poly_state[0].removeLayer(poly_state[1][vertex + i].options.in);
                  map.removeLayer(poly_state[1][vertex - j].options.out);
                  map.removeLayer(poly_state[1][vertex + i].options.in);
                  inline._latlngs[0] = poly_state[1][vertex - j]._latlng;
                  inline._latlngs[1] = poly_state[1][vertex]._latlng;
                  poly_state[1][vertex - j].options.out = inline;
                  poly_state[1][vertex].options.in = inline;
                  outline._latlngs[0] = poly_state[1][vertex]._latlng;
                  outline._latlngs[1] = poly_state[1][vertex + i]._latlng;
                  poly_state[1][vertex + i].options.in = outline;
                  poly_state[1][vertex].options.out = outline;
                  poly_state[0].addLayer(inline);
                  poly_state[0].addLayer(outline);
                  map.addLayer(poly_state[0]);
                }
              }
            }
          }
        };
        // adding point to layer
        layers[layer_index].addLayer(point);
      }
      break; }
    case 'handle': {
      /* 'handle' type: delete created handle
         Element structure:
           ['handle', [element(s)]] */
      var options = action[1];
      if (options.length == 1) {
        delete_marker(options[0]);
        poly_state[0] = false;
        poly_state[1] = [];
      } else {
        var line = options[2];
        poly_state[0].removeLayer(line);
        map.removeLayer(line);
        delete_marker(options[0]);
        poly_state[1].pop();
      }
      break; }
    case 'polygon': {
      /* 'polygon' type: unlock created polygon and
         delete points from it.
         Element structure:
           ['polygon', [poly_state[1], points_layer]] */
      var options = action[1];
      poly_state[1] = options[0];
      var last = poly_state[1].slice(-1)[0];
      var first = poly_state[1][0];
      if (poly_state[0] != true)
        map.addLayer(layers[last.options.layer]);
      poly_state[0] = layers[last.options.layer];
      var line = last.options.out;
      poly_state[0].removeLayer(line);
      map.removeLayer(line);
      last.options.out = undefined;
      first.options.in = undefined;
      for (i in options[1]._layers) {
        delete points[map._layers[i].options.point];
      }
      poly_state[0].removeLayer(options[1]);
      map.removeLayer(options[1]);
      break; }
    case 'poly_cancel': {
      /* 'poly_cancel' type: return cancelled polygon.
         Element structure:
           ['poly_cancel', poly_state[0], poly_state[1]] */
      var layer = action[1];
      var handles = action[2];
      poly_state[0] = layer;
      poly_state[1] = handles;
      map.addLayer(layer);
      break; }
    case 'change': {
      /* 'change' type: change type of marker back.
         Element structure:
           ['change', marker_leaflet_id, previous_type] */
      var marker = action[1];
      var type = action[2];
      change_to(type, marker);
      break; }
  }
  everytime();
  return true;
}

// cancel the current polygon
function poly_cancel() {
  everytime();
  if (poly_state[0]) {
    map.removeLayer(poly_state[0]);
    last_actions.push(['poly_cancel', poly_state[0], poly_state[1]]);
    poly_state[0] = false;
    poly_state[1] = [];
  }
  document.getElementById('poly_cancel').disabled = true;
  document.getElementById('poly_ready').disabled = true;
}

// create points inside the current polygon
function poly_ready () {
  everytime();
  var i = poly_state[1].length - 1;
  while (poly_state[1][i] == undefined &&
      i > 0)
    i--;
  if (i >= 0 &&
      poly_state[1][i] != undefined) {
    var last = poly_state[1][i];
  } else {
    var last = undefined;
  }
  if (last == undefined) return 0;
  i = 0;
  while (poly_state[1][i] == undefined &&
      i < poly_state[1].length)
    i++;
  if (i < poly_state[1].length &&
      poly_state[1][i] != undefined) {
    var first = poly_state[1][i];
  } else {
    var first = undefined;
  }
  if (first == undefined) return 0;
  var line = L.polyline([last._latlng, first._latlng],
    {color: 'blue'});
  poly_state[0].addLayer(line);
  last.options.out = line;
  first.options.in = line;
  var layer = new L.FeatureGroup();
  // parsing input for number
  count = parseInt(document.getElementById('count').value);
  // if wrong number set it to default
  if (isNaN(count) || count <= 0)
    count = 20;
  // showing number
  document.getElementById('count').value = count;
      
  // getting bounds of polygon
  var len = poly_state[1].length;
  bounds = [
      first._latlng.lat,  // min latitude
      first._latlng.lat,  // max latitude
      first._latlng.lng,  // min longitude
      first._latlng.lng]; // max longitude
  var i = 0;
  while (i < len) {
    if (poly_state[1][i] != undefined) {
      if (poly_state[1][i]._latlng.lat < bounds[0])
        bounds[0] = poly_state[1][i]._latlng.lat;
      if (poly_state[1][i]._latlng.lat > bounds[1])
        bounds[1] = poly_state[1][i]._latlng.lat;
      if (poly_state[1][i]._latlng.lng < bounds[2])
        bounds[2] = poly_state[1][i]._latlng.lng;
      if (poly_state[1][i]._latlng.lng > bounds[3])
        bounds[3] = poly_state[1][i]._latlng.lng;
    }
    i++;
  };
  
  for (i = 0; i < count; i++) {
    // generate random coordinates
    var not_in_poly = true;
    var nlat, nlng;
    while (not_in_poly) {
      nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
      nlng = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
      
      var p = poly_state[1];
      var k = 0;
      var j = p.length - 1;
      for (k in p) {
        if (p[k] != undefined && p[j] != undefined) {
          if (((p[k]._latlng.lat > nlat) != (p[j]._latlng.lat > nlat))
              && (nlng < (p[j]._latlng.lng - p[k]._latlng.lng) *
              (nlat - p[k]._latlng.lat) /
              (p[j]._latlng.lat - p[k]._latlng.lat) + p[k]._latlng.lng))
            not_in_poly = !not_in_poly;
          j = k
        }
      }
    }
    // writing point to 'points' array
    points.push([nlat, nlng, point_type]);
    // creating marker
    var marker = draw_marker(point_type, [nlat, nlng]);
    // adding markers to layer
    layer.addLayer(marker);
  }
  // draw markers
  map.addLayer(poly_state[0]);
  layers.push(layer);
  map.addLayer(layer);
  last_actions.push(['polygon', [poly_state[1], layer]]);
  poly_state[1] = true;
  document.getElementById('poly_cancel').disabled = true;
  document.getElementById('poly_ready').disabled = true;
}
/* ---------- ------- --------- ---------- */ }

// binding function 'onClick' with map click event
map.on('click', onClick);
