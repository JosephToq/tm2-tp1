// Sketch completo con topes de volumen y tono
let mic, fft, prevSpectrum = [];
let img = [];
let rectX = 200, rectY = -1, rectW = 200, rectH = 600;
let RectX = 0, RectY = 0, RectW = 201, RectH = 600;

let fondoX = 0, fondoY = 0;
let funciona = false;
let rojo = 0, verde = 1, azul = 2;
let circulos = [];
let numCirculos = 18;

let scaleFactor = 1;
let scaleStep = 0.04;
let maxScale = 1.3;
let minScale = 0.7;

let tintFactor = 0;
let tintStep = 0.06;
let filtroBuffer;

function preload() {
  for (let i = 0; i < numCirculos; i++) {
    img[i] = loadImage(`Circulo${i}.png`);
  }
  fondo = loadImage('fondo.png');
}

function setup() {
  createCanvas(600, 600);
  filtroBuffer = createGraphics(RectW, RectH);
  mic = new p5.AudioIn();
  userStartAudio();
  mic.start();
  fft = new p5.FFT();
  fft.setInput(mic);
}

function draw() {
  background(0);
  image(fondo, fondoX, fondoY);

  let elementosADibujar = [...circulos].sort((a, b) => b.tamano - a.tamano);

  let vol = mic.getLevel();
  ellipse(200, 200, vol * 500, vol * 500);
  let spectrum = fft.analyze();

  // Definir rangos aproximados (Hz) para graves, medios y agudos
  let graveMin = 20;
  let graveMax = 250;
  let medioMin = 251;
  let medioMax = 2000;
  let agudoMin = 2001;
  let agudoMax = 20000;

  // Obtener energía en cada banda
  let energiaGrave = fft.getEnergy(graveMin, graveMax);
  let energiaMedio = fft.getEnergy(medioMin, medioMax);
  let energiaAgudo = fft.getEnergy(agudoMin, agudoMax);

  // Calcular tono relativo: más energía aguda => tono alto; más energía grave => tono bajo
  let tono = constrain(energiaAgudo / max(energiaGrave + energiaAgudo, 1), 0, 1);

  let velocidadFrecuencia = 0;
  if (prevSpectrum.length === spectrum.length) {
    let diff = 0;
    for (let i = 0; i < spectrum.length; i++) {
      diff += abs(spectrum[i] - prevSpectrum[i]);
    }
    velocidadFrecuencia = diff / spectrum.length;
  }
  prevSpectrum = spectrum;

  // Escalado basado en volumen
  if (vol > 0.04) {
    scaleFactor = min(scaleFactor + scaleStep, maxScale);
  } else if (vol >= 0.01 && vol <= 0.04) {
    scaleFactor = max(scaleFactor - scaleStep, minScale);
  } else {
    scaleFactor = lerp(scaleFactor, 1, 0.05);
  }

  // Tintado basado en tono
  if (tono > 0.005) {
    tintFactor = min(tintFactor + tintStep, 6);
  } else if (tono >= 0.002 && tono <= 0.02) {
    tintFactor = max(tintFactor - tintStep, -6);
  } else {
    tintFactor = lerp(tintFactor, 0, 0.045);
  }

  for (let elem of elementosADibujar) {
    elem.dibujar(scaleFactor, tintFactor);
  }

  filtroBuffer.clear();
  filtroBuffer.image(get(RectX, RectY, RectW, RectH), 0, 0);
  filtroBuffer.loadPixels();
  for (let i = 0; i < filtroBuffer.pixels.length; i += 4) {
    filtroBuffer.pixels[i] = 255 - filtroBuffer.pixels[i + rojo];
    filtroBuffer.pixels[i + 1] = 255 - filtroBuffer.pixels[i + verde];
    filtroBuffer.pixels[i + 2] = 255 - filtroBuffer.pixels[i + azul];
  }
  filtroBuffer.updatePixels();
  image(filtroBuffer, RectX, RectY);

  let triBuffer = createGraphics(rectW, rectH);
  triBuffer.image(get(rectX, rectY, rectW, rectH), 0, 0);
  triBuffer.loadPixels();
  for (let y = 0; y < rectH; y++) {
    for (let x = 0; x < rectW; x++) {
      if (isInsideTriangle(x, y, 0, 0, rectW, 0, 0, rectH)) {
        let idx = (x + y * rectW) * 4;
        triBuffer.pixels[idx] = 255 - triBuffer.pixels[idx + rojo];
        triBuffer.pixels[idx + 1] = 255 - triBuffer.pixels[idx + verde];
        triBuffer.pixels[idx + 2] = 255 - triBuffer.pixels[idx + azul];
      }
    }
  }
  triBuffer.updatePixels();
  image(triBuffer, rectX, rectY);

  if (vol > 0.01 && frameCount % 5 === 0) {
    funciona = true;
    if (circulos.length >= 7) circulos.shift();

    let tamano;
    let r = random();
    if (r < 0.10) tamano = random(70, 110);
    else if (r < 0.65) tamano = random(140, 230);
    else if (r < 0.30) tamano = random(250, 440);
    else tamano = random(460, 600);

    let esGrande = tamano >= 250;
    let x, y;
    if (esGrande && random() < 0.75) {
      x = random(0, width);
      y = random(0, height);
    } else {
      x = random(width / 2 - 100, width / 2 + 100);
      y = random(height / 2 - 100, height / 2 + 100);
    }

    let numeroDeCirculo;
    if (velocidadFrecuencia > 5) {
      numeroDeCirculo = random() < 0.7 ? 0 : int(random(0, numCirculos));
    } else {
      numeroDeCirculo = int(random(0, numCirculos));
    }

    if (numeroDeCirculo === 0 || numeroDeCirculo === 1) {
      tamano = max(tamano, 300);
    }

    let rot = random(TWO_PI);
    let baseColor = color(random(255), random(255), random(255));

    circulos.push(new Circulo(x, y, numeroDeCirculo, tamano, rot, baseColor));
  }

  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text("🎤 Volumen: " + nf(vol * 1000, 1, 1), 10, 10);
  fill(100, 255, 100);
  rect(10, 30, vol * 500, 10);
  fill(255);
  text("🎶 Tono: " + nf(tono, 1, 2), 10, 50);
  fill(100, 100, 255);
  rect(10, 70, tono * 300, 10);
  fill(255);
  text("⚡ Variación: " + nf(velocidadFrecuencia, 1, 2), 10, 90);
  fill(255, 100, 100);
  rect(10, 110, velocidadFrecuencia * 30, 10);
}


function isInsideTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  let area =
    0.5 *
    (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
  let s =
    (1 / (2 * area)) *
    (y1 * x3 - x1 * y3 + (y3 - y1) * px + (x1 - x3) * py);
  let t =
    (1 / (2 * area)) *
    (x1 * y2 - y1 * x2 + (y1 - y2) * px + (x2 - x1) * py);
  return s > 0 && t > 0 && 1 - s - t > 0;
}

class Circulo {
  constructor(x, y, numero, tamano, rotacion, baseColor) {
    this.x = x;
    this.y = y;
    this.numero = numero;
    this.tamano = tamano;
    this.rotacion = rotacion;
    this.baseColor = baseColor;
  }

  dibujar(scale = 1, tintF = 0) {
    push();
    translate(this.x, this.y);
    rotate(this.rotacion);
    imageMode(CENTER);

    if (tintF > 0) {
      let r = lerp(red(this.baseColor), 255, tintF);
      let g = lerp(green(this.baseColor), 150, tintF);
      let b = lerp(blue(this.baseColor), 100, tintF);
      tint(r, g, b, 255);
    } else if (tintF < 0) {
      let t = abs(tintF);
      let r = lerp(red(this.baseColor), 100, t);
      let g = lerp(green(this.baseColor), 150, t);
      let b = lerp(blue(this.baseColor), 255, t);
      tint(r, g, b, 255);
    } else {
      tint(this.baseColor); 
    }

    image(img[this.numero], 0, 0, this.tamano * scale, this.tamano * scale);
    pop();

    if (keyIsDown(37)) this.x -= 10 - this.tamano / 150;
    if (keyIsDown(39)) this.x += 10 - this.tamano / 50;
  }
}
