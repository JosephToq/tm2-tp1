// sonido especifico
let labelUno= '';
let labelDos= '';
let escuchando = 'listening...';
let classifier;
let soundModel = 'https://teachablemachine.withgoogle.com/models/cTaxQleSS/';
let certezaUno = 0;
let certezaDos = 0;

// Sketch completo con topes de volumen y tono
let mic, fft;
let img = [];
let rectX = 199, rectY = -1, rectW = 200, rectH = 600;
let RectX = 0, RectY = 0, RectW = 200, RectH = 600;

let fondoX = 0, fondoY = 0;
let rojo = 0, verde = 1, azul = 2;
let circulos = [];
let numCirculos = 46;

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
    img[i] = loadImage(`CIRCULO${i}.png`);
  }
  fondo = loadImage('fondo.png');
}

function setup() {
  createCanvas(600, 600);
  filtroBuffer = createGraphics(RectW, RectH);
  triBuffer = createGraphics(rectW, rectH);
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

  // Solo cada 2 frames para aliviar carga
  if (frameCount % 2 === 0) {
    vol = mic.getLevel();
  }

  // Escalado volumen
  if (vol > 0.04) scaleFactor = min(scaleFactor + scaleStep, maxScale);
  else if (vol >= 0.01) scaleFactor = max(scaleFactor - scaleStep, minScale);
  else scaleFactor = lerp(scaleFactor, 1, 0.05);

  // Tintado básico sin tono ni velocidad (puede quedar fijo o modificar si querés)
  tintFactor = lerp(tintFactor, 0, 0.045);

  // Cambio colores según labelDos
  if (labelDos === 'shh') {
  // Asignar un orden aleatorio de índices 0,1,2 para rojo, verde, azul
  let indices = [0, 1, 2];
  indices = shuffle(indices);
  rojo = indices[0];
  verde = indices[1];
  azul = indices[2];
} else {
  rojo = 0;
  verde = 1;
  azul = 2;
}


  // Dibujar circulos
  // Dibujar los círculos desde el más grande al más chico (para que los chicos queden encima)
let circulosOrdenados = circulos.slice().sort((a, b) => b.tamano - a.tamano);
push();
blendMode(BLEND);  // modo normal para tintar bien

for (let elem of circulosOrdenados) {
  // Creamos un color pastel con menos saturación y un poco de transparencia
  let c = elem.baseColor;
  let pastel = color(
    red(c) * 0.7 + 70,
    green(c) * 0.7 + 70,
    blue(c) * 0.7 + 70,
    180  // alpha para transparencia
  );
  tint(pastel);
  elem.dibujar(scaleFactor, tintFactor);
}

pop();



  // Crear círculos con control de tiempo según volumen y labelUno 'pop'
  if (labelUno === 'pop' && certezaUno > 0.05 && millis() - ultimoTiempoCirculo > tiempoEntreCirculos) {
  ultimoTiempoCirculo = millis();

  if (circulos.length >= 20) circulos.shift(); // aumentamos el límite un poco

  // Determinar tamaño y comportamiento
  // Determinar tamaño y comportamiento
let tamano;
let alejarse = 0;

// Fuerza los dos primeros círculos a ser muy grandes
if (circulos.length < 2) {
  tamano = random(350, 450);
  alejarse = 0.1;  // mediano (igual que antes)
} else {
  let r = random();
  if (r < 0.07) { // 7% → extra grandes
    tamano = random(550, 600);
    alejarse = 0.7;
  } else if (r < 0.19) { // 12% → muy grandes
    tamano = random(300, 400);
    alejarse = 0.3;
  } else if (r < 0.49) { // 30% → grandes
    tamano = random(190, 320);
    alejarse = 0.2;
  } else if (r < 0.89) { // 40% → medianos
    tamano = random(150, 220);
    alejarse = 0.1;
  } else { // 11% → pequeños
    tamano = random(70, 120);
    alejarse = 0;
  }
}





  // Base en la diagonal
  // Base en la diagonal
let t = random(0, 1);
let baseX = lerp(400, 200, t);
let baseY = lerp(0, 600, t);
let x = baseX;
let y = baseY;

// Si toca alejarse, aplicar desvío perpendicular a la diagonal
if (random() < alejarse) {
  // Dirección perpendicular a la diagonal (normalizada)
  let dx = 400 - 200;
  let dy = 0 - 600;
  let length = sqrt(dx * dx + dy * dy);
  let nx = -dy / length;
  let ny = dx / length;

  // Desvío en dirección perpendicular (hasta ±300 px)
  let distancia = random(-300, 300);
  x += nx * distancia;
  y += ny * distancia;
}

  // --- CHEQUEO DE SUPERPOSICIÓN ---
  let reemplazarPosicion = false;
  let circuloDestino = null;

  let minTamano = 70;   // tamaño mínimo que puede tener un círculo
let maxTamano = 600;  // tamaño máximo que puede tener un círculo

for (let c of circulos) {
  let d = dist(x, y, c.x, c.y);
  if (d < (tamano + c.tamano) / 2) { // superposición
    // Calcular probabilidad de centrado en función del tamaño
    // Map tamaño del círculo de [minTamano, maxTamano] a probabilidad [1.0, 0.7]
    let probCentrar = map(tamano, minTamano, maxTamano, 1.0, 0.7);
    probCentrar = constrain(probCentrar, 0.7, 1.0); // asegurar rango

    if (random() < probCentrar) {
      reemplazarPosicion = true;
      circuloDestino = c;
      break;
    } else {
      reemplazarPosicion = false;
      circuloDestino = null;
      break;
    }
  }


  }

  if (reemplazarPosicion && circuloDestino) {
    x = circuloDestino.x;
    y = circuloDestino.y;
  }

  // Elegir imagen
  let numeroDeCirculo = int(random(0, numCirculos));
  if (numeroDeCirculo === 0 || numeroDeCirculo === 1) tamano = max(tamano, 300);

  let rot = random(TWO_PI);
  let baseColor = color(random(255), random(255), random(255));

  circulos.push(new Circulo(x, y, numeroDeCirculo, tamano, rot, baseColor));
}


  // Procesar filtro solo cada 4 frames
  let tintValueR = 156;
  let tintValueG = 156;
  let tintValueB = 156;

  if (frameCount % 1 === 0) {
    filtroBuffer.clear();
    filtroBuffer.image(get(RectX, RectY, RectW, RectH), 0, 0);
    filtroBuffer.loadPixels();

    for (let i = 0; i < filtroBuffer.pixels.length; i += 4) {
      let r = filtroBuffer.pixels[i];
      let g = filtroBuffer.pixels[i + 1];
      let b = filtroBuffer.pixels[i + 2];

      // Primero invertimos cada canal según rojo, verde, azul
      let invR = 255 - [r, g, b][rojo];
      let invG = 255 - [r, g, b][verde];
      let invB = 255 - [r, g, b][azul];

      // Luego mezclamos (lerp) con el color fijo para atenuar/incluir tinte
      filtroBuffer.pixels[i]     = lerp(invR, tintValueR, 0.3);
      filtroBuffer.pixels[i + 1] = lerp(invG, tintValueG, 0.3);
      filtroBuffer.pixels[i + 2] = lerp(invB, tintValueB, 0.3);
      // Alpha queda igual
    }


    triBuffer.clear();
    triBuffer.image(get(rectX, rectY, rectW, rectH), 0, 0);
  triBuffer.loadPixels();

  for (let y = 0; y < rectH; y++) {
    for (let x = 0; x < rectW; x++) {
      if (isInsideTriangle(x, y, 0, 0, rectW, 0, 0, rectH)) {
        let idx = (x + y * rectW) * 4;

        let r = triBuffer.pixels[idx];
        let g = triBuffer.pixels[idx + 1];
        let b = triBuffer.pixels[idx + 2];

        let invR = 255 - [r, g, b][rojo];
        let invG = 255 - [r, g, b][verde];
        let invB = 255 - [r, g, b][azul];

        triBuffer.pixels[idx]     = lerp(invR, tintValueR, 0.3);
        triBuffer.pixels[idx + 1] = lerp(invG, tintValueG, 0.3);
        triBuffer.pixels[idx + 2] = lerp(invB, tintValueB, 0.3);
        // Alpha queda igual
      }
    }
  }

    filtroBuffer.updatePixels();
    triBuffer.updatePixels();
  }

  image(triBuffer, rectX, rectY);
  image(filtroBuffer, RectX, RectY);
  



function ajustarColores() {
  loadPixels();
  for (let i = 0; i < pixels.length; i += 4) {
    // Obtener colores actuales
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    // Aplicar curva sencilla (ejemplo gamma corrector)
    r = pow(r / 255, 0.8) * 255;
    g = pow(g / 255, 0.8) * 255;
    b = pow(b / 255, 0.8) * 255;

    // Aumentar saturación ligeramente
    let maxVal = max(r, g, b);
    let minVal = min(r, g, b);
    let saturation = (maxVal - minVal) / maxVal || 0;
    let satFactor = 1.15; // 15% más saturación

    r = lerp(r, r + (r - (r + g + b)/3) * satFactor, 0.5);
    g = lerp(g, g + (g - (r + g + b)/3) * satFactor, 0.5);
    b = lerp(b, b + (b - (r + g + b)/3) * satFactor, 0.5);

    // Limitar valores
    pixels[i] = constrain(r, 0, 255);
    pixels[i + 1] = constrain(g, 0, 255);
    pixels[i + 2] = constrain(b, 0, 255);
  }
  updatePixels();
}

// Llama a la función justo después del ruido:
ajustarColores();

let desaturacion = 0.35; // 0 = sin desaturar, 1 = completamente gris

let desatBuffer = get();
desatBuffer.loadPixels();

for (let i = 0; i < desatBuffer.pixels.length; i += 4) {
  let r = desatBuffer.pixels[i];
  let g = desatBuffer.pixels[i + 1];
  let b = desatBuffer.pixels[i + 2];

  let gris = 0.3 * r + 0.59 * g + 0.11 * b;

  // Mezclar original con gris según el factor desaturacion
  desatBuffer.pixels[i]     = lerp(r, gris, desaturacion);
  desatBuffer.pixels[i + 1] = lerp(g, gris, desaturacion);
  desatBuffer.pixels[i + 2] = lerp(b, gris, desaturacion);
  // Alpha queda igual
}

desatBuffer.updatePixels();
image(desatBuffer, 0, 0);


loadPixels();
for (let i = 0; i < pixels.length; i += 4) {
  let noiseVal = random(-5, 5);
  pixels[i] = constrain(pixels[i] + noiseVal, 0, 255);     // rojo
  pixels[i + 1] = constrain(pixels[i + 1] + noiseVal, 0, 255); // verde
  pixels[i + 2] = constrain(pixels[i + 2] + noiseVal, 0, 255); // azul
  // alpha no tocamos
}
updatePixels();

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
  constructor(x, y, numero, tamano, rotacion, baseColor, ordenRGB = [0, 1, 2]) {
    this.x = x;
    this.y = y;
    this.numero = numero;
    this.tamano = tamano;
    this.rotacion = rotacion;
    this.baseColor = baseColor;
    this.ordenRGB = ordenRGB;
  }

  dibujar(scale = 1, tintF = 0) {
    push();
    translate(this.x, this.y);
    rotate(this.rotacion);
    imageMode(CENTER);

    let canales = [
      red(this.baseColor),
      green(this.baseColor),
      blue(this.baseColor),
    ];
    let r = canales[this.ordenRGB[0]];
    let g = canales[this.ordenRGB[1]];
    let b = canales[this.ordenRGB[2]];

    if (tintF > 0) {
      r = lerp(r, 255, tintF);
      g = lerp(g, 150, tintF);
      b = lerp(b, 100, tintF);
    } else if (tintF < 0) {
      let t = abs(tintF);
      r = lerp(r, 100, t);
      g = lerp(g, 150, t);
      b = lerp(b, 255, t);
    }

    tint(r, g, b, 255);
    image(img[this.numero], 0, 0, this.tamano * scale, this.tamano * scale);
    pop();
  }
}
