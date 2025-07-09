// sonido especifico
let labelUno= '';
let labelDos= '';
let escuchando = 'listening...';
let classifier;
let soundModel = 'https://teachablemachine.withgoogle.com/models/cTaxQleSS/';
let certezaUno = 0;
let certezaDos = 0;

// Sketch completo con topes de volumen y tono
let mic, fft, prevSpectrum = [];
let img = [];
let rectX = 200, rectY = -1, rectW = 200, rectH = 600;
let RectX = 0, RectY = 0, RectW = 201, RectH = 600;

let fondoX = 0, fondoY = 0;
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

let ultimoTiempoCirculo = 0;
let tiempoEntreCirculos = 500;

function preload() {
  classifier = ml5.soundClassifier(soundModel + 'model.json', modelReady);
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

  let vol = 0;
  let spectrum = [];

  // Solo cada 2 frames para aliviar carga
  if (frameCount % 2 === 0) {
    vol = mic.getLevel();
    spectrum = fft.analyze();
  }

  // Definir rangos
  let graveMin = 20, graveMax = 250;
  let agudoMin = 2001, agudoMax = 20000;
  let energiaGrave = fft.getEnergy(graveMin, graveMax);
  let energiaAgudo = fft.getEnergy(agudoMin, agudoMax);
  let tono = constrain(energiaAgudo / max(energiaGrave + energiaAgudo, 1), 0, 1);

  let velocidadFrecuencia = 0;
  if (prevSpectrum.length === spectrum.length) {
    let diff = 0;
    for (let i = 0; i < spectrum.length; i++) diff += abs(spectrum[i] - prevSpectrum[i]);
    velocidadFrecuencia = diff / spectrum.length;
  }
  prevSpectrum = spectrum;

  // Escalado volumen
  if (vol > 0.04) scaleFactor = min(scaleFactor + scaleStep, maxScale);
  else if (vol >= 0.01) scaleFactor = max(scaleFactor - scaleStep, minScale);
  else scaleFactor = lerp(scaleFactor, 1, 0.05);

  // Tintado tono
  if (tono > 0.005) tintFactor = min(tintFactor + tintStep, 6);
  else if (tono >= 0.002) tintFactor = max(tintFactor - tintStep, -6);
  else tintFactor = lerp(tintFactor, 0, 0.045);

  // Cambio colores según labelDos
  if (labelDos === 'shh') { rojo=2; verde=0; azul=1; }
  else { rojo=0; verde=1; azul=2; }

  // Dibujar circulos
  for (let elem of circulos) elem.dibujar(scaleFactor, tintFactor);

  // Crear círculos con control de tiempo
  if (labelUno === 'pop' && certezaUno > 0.15 && millis() - ultimoTiempoCirculo > tiempoEntreCirculos) {
    ultimoTiempoCirculo = millis();

    if (circulos.length >= 20) circulos.shift();

    let tamano;
    let r = random();
    if (r < 0.10) tamano = random(70, 110);
    else if (r < 0.65) tamano = random(140, 230);
    else if (r < 0.30) tamano = random(250, 440);
    else tamano = random(460, 600);

    let esGrande = tamano >= 250;
    let x = esGrande && random() < 0.75 ? random(0, width) : random(width/2-100, width/2+100);
    let y = esGrande && random() < 0.75 ? random(0, height) : random(height/2-100, height/2+100);

    let numeroDeCirculo = velocidadFrecuencia > 5 ? (random() < 0.7 ? 0 : int(random(0, numCirculos))) : int(random(0, numCirculos));

    if (numeroDeCirculo === 0 || numeroDeCirculo === 1) tamano = max(tamano, 300);

    let rot = random(TWO_PI);
    let baseColor = color(random(255), random(255), random(255));
    circulos.push(new Circulo(x, y, numeroDeCirculo, tamano, rot, baseColor));
  }

  // Procesar filtro solo cada 4 frames
  if (frameCount % 4 === 0) {
    filtroBuffer.clear();
    filtroBuffer.image(get(RectX, RectY, RectW, RectH), 0, 0);
    filtroBuffer.loadPixels();
    for (let i = 0; i < filtroBuffer.pixels.length; i += 4) {
      filtroBuffer.pixels[i] = 255 - filtroBuffer.pixels[i+rojo];
      filtroBuffer.pixels[i+1] = 255 - filtroBuffer.pixels[i+verde];
      filtroBuffer.pixels[i+2] = 255 - filtroBuffer.pixels[i+azul];
    }
    filtroBuffer.updatePixels();
  }

  image(filtroBuffer, RectX, RectY);

  // Mostrar datos en pantalla
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text("🎤 Volumen: " + nf(vol * 1000, 1, 1), 10, 10);
  text("🎧 Label 1: " + labelUno + " (" + nf(certezaUno,1,2) + ")", 10, 30);
  text("🎵 Label 2: " + labelDos + " (" + nf(certezaDos,1,2) + ")", 10, 50);
}

function modelReady() {
  console.log("Modelo cargado");
  classifier.classifyStart(gotResult);
}

function gotResult(results) {
  if (results.length > 1) {
    labelUno = results[1].label;
    certezaUno = results[1].confidence;
  }
  if (results.length > 2) {
    labelDos = results[2].label;
    certezaDos = results[2].confidence;
  }
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
  dibujar(scale=1, tintF=0) {
    push();
    translate(this.x, this.y);
    rotate(this.rotacion);
    imageMode(CENTER);
    if (tintF>0) {
      let r = lerp(red(this.baseColor), 255, tintF);
      let g = lerp(green(this.baseColor), 150, tintF);
      let b = lerp(blue(this.baseColor), 100, tintF);
      tint(r,g,b,255);
    } else if (tintF<0) {
      let t = abs(tintF);
      let r = lerp(red(this.baseColor), 100, t);
      let g = lerp(green(this.baseColor), 150, t);
      let b = lerp(blue(this.baseColor), 255, t);
      tint(r,g,b,255);
    } else {
      tint(this.baseColor);
    }
    image(img[this.numero], 0, 0, this.tamano*scale, this.tamano*scale);
    pop();
  }
}
