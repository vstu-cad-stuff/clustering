gradient = function(ar) {
  var c = document.createElement("canvas");
  c.width = 1;
  c.height = 256;
  var ctx = c.getContext("2d");
  var grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (var e in ar) grad.addColorStop(e, ar[e]);
  return ctx.fillStyle = grad,
    ctx.fillRect(0, 0, 1, 256),
    this._grad = ctx.getImageData(0, 0, 1, 256).data,
    this
}
