// Rutina "Mi Entreno" — 5 días: 30 min de cardio por intervalos + fuerza enfocada en pérdida de grasa.
// Equipo: set de mancuernas ajustables 20 kg (convertible en barra), colchoneta, tabla de flexiones.

const EXERCISES = {
  // ---------- EMPUJE ----------
  flex_pecho: { name: 'Flexiones en tabla (zona pecho)', type: 'bw', tip: 'Agarres en la zona de PECHO de la tabla. Cuerpo recto, baja hasta casi tocar. Si cuesta, apoya rodillas.' },
  floor_press_db: { name: 'Press de pecho en suelo con mancuernas', type: 'kg', tip: 'Acostado en la colchoneta, codos a 45°. Baja hasta que el codo toque el suelo, pausa y empuja.' },
  press_militar_db: { name: 'Press de hombros con mancuernas (de pie)', type: 'kg', tip: 'Abdomen y glúteos apretados. No arquees la espalda baja.' },
  elev_laterales: { name: 'Elevaciones laterales', type: 'kg', tip: 'Peso liviano, sube hasta la altura de los hombros con codos levemente flectados.' },
  flex_triceps: { name: 'Flexiones en tabla (zona tríceps)', type: 'bw', tip: 'Agarres en la zona de TRÍCEPS (manos juntas). Codos pegados al cuerpo.' },
  flex_hombros: { name: 'Flexiones pica en tabla (zona hombros)', type: 'bw', tip: 'Cadera arriba en forma de V invertida, baja la cabeza entre las manos.' },
  floor_press_barra: { name: 'Press de pecho en suelo con barra', type: 'kg', tip: 'Igual que con mancuernas pero con la barra armada. Agarre un poco más ancho que los hombros.' },
  press_militar_barra: { name: 'Press de hombros con barra (de pie)', type: 'kg', tip: 'Barra desde la clavícula hasta arriba de la cabeza. Glúteos apretados.' },

  // ---------- PIERNAS ----------
  goblet_squat: { name: 'Sentadilla goblet', type: 'kg', tip: 'Una mancuerna al pecho. Baja con la espalda recta y rodillas siguiendo la punta de los pies.' },
  rdl_barra: { name: 'Peso muerto rumano con barra', type: 'kg', tip: 'Rodillas apenas flectadas, lleva la cadera atrás y baja la barra pegada a las piernas hasta media canilla.' },
  zancada_atras: { name: 'Zancadas hacia atrás con mancuernas', type: 'kg', tip: 'Alterna piernas. Las reps son por pierna. Rodilla de atrás casi toca la colchoneta.' },
  hip_thrust: { name: 'Puente de glúteo con barra', type: 'kg', tip: 'Espalda en la colchoneta, barra sobre la cadera (usa la colchoneta doblada como cojín). Aprieta 1 s arriba.' },
  sumo_squat: { name: 'Sentadilla sumo con mancuerna', type: 'kg', tip: 'Pies más anchos que los hombros, puntas afuera, mancuerna colgando entre las piernas.' },
  talones: { name: 'Elevación de talones con mancuernas', type: 'kg', tip: 'Sube en puntas, pausa 1 s arriba, baja lento.' },
  sentadilla_frontal: { name: 'Sentadilla frontal con barra', type: 'kg', tip: 'Barra apoyada sobre los hombros por delante, codos altos. Si molesta la muñeca, cruza los brazos.' },
  peso_muerto: { name: 'Peso muerto con barra', type: 'kg', tip: 'Barra pegada al cuerpo, espalda neutra, empuja el suelo con los pies. Baja controlado.' },
  zancada_estatica: { name: 'Zancada estática con mancuernas', type: 'kg', tip: 'Posición de zancada fija, sube y baja. Reps por pierna.' },

  // ---------- TIRÓN ----------
  remo_barra: { name: 'Remo inclinado con barra', type: 'kg', tip: 'Torso inclinado ~45°, tira la barra al ombligo juntando escápulas.' },
  remo_1mano: { name: 'Remo a una mano con mancuerna', type: 'kg', tip: 'Una rodilla y mano apoyadas (o mano en la rodilla). Reps por lado.' },
  pajaro: { name: 'Pájaro (aperturas posteriores)', type: 'kg', tip: 'Inclinado adelante, abre los brazos hacia los lados con peso liviano.' },
  curl_barra: { name: 'Curl de bíceps con barra', type: 'kg', tip: 'Codos fijos a los costados, sin balancear el cuerpo.' },
  curl_martillo: { name: 'Curl martillo con mancuernas', type: 'kg', tip: 'Palmas mirándose entre sí. Alterna o ambos a la vez.' },
  remo_renegado: { name: 'Remo renegado con mancuernas', type: 'kg', tip: 'En posición de plancha sobre las mancuernas, rema un brazo y luego el otro. Pies abiertos para estabilidad. Reps por lado.' },

  // ---------- METABÓLICOS ----------
  thruster: { name: 'Thruster con mancuernas', type: 'kg', tip: 'Sentadilla con mancuernas en los hombros y al subir empuja sobre la cabeza en un solo movimiento.' },
  swing_db: { name: 'Swing con mancuerna', type: 'kg', tip: 'Movimiento de bisagra de cadera, la fuerza sale del glúteo, no de los brazos.' },

  // ---------- CORE ----------
  plancha: { name: 'Plancha', type: 'time', tip: 'Antebrazos en la colchoneta, cuerpo en línea recta. Registra los segundos.' },
  bicho_muerto: { name: 'Bicho muerto (dead bug)', type: 'bw', tip: 'Espalda baja pegada a la colchoneta. Extiende brazo y pierna contraria. Reps por lado.' },
  plancha_lateral: { name: 'Plancha lateral', type: 'time', tip: 'Segundos por lado.' },
  superman: { name: 'Superman', type: 'bw', tip: 'Boca abajo, levanta brazos y piernas a la vez, pausa 2 s.' },
  giros_rusos: { name: 'Giros rusos con mancuerna', type: 'kg', tip: 'Sentado, pies elevados o apoyados, gira el torso llevando la mancuerna de lado a lado. Reps totales.' },
  escaladores: { name: 'Escaladores (mountain climbers)', type: 'time', tip: 'Manos en los agarres de la tabla, rodillas al pecho rápido. Registra segundos.' },
  elev_piernas: { name: 'Elevación de piernas', type: 'bw', tip: 'Acostado, piernas rectas, baja sin tocar el suelo. Espalda baja pegada.' },
};

// Cardio: 30 minutos por intervalos, sin equipo (sobre la colchoneta).
// Estructura: calentamiento → series (cada una con N rondas de trabajo/descanso) → vuelta a la calma.
const CARDIO_PRESETS = {
  hiit_30_30: {
    name: 'HIIT 30/30',
    desc: '20 rondas de 30 s trabajo / 30 s descanso. Intensidad alta pero manejable.',
    warmup: 300, cooldown: 300, sets: 1, rounds: 20, work: 30, rest: 30, setRest: 0,
    moves: ['Jumping jacks', 'Sentadilla al aire', 'Rodillas altas', 'Escaladores', 'Skipping lateral', 'Boxeo sombra', 'Saltos de tijera', 'Burpee sin salto'],
  },
  bajo_impacto: {
    name: 'Bajo impacto 45/15',
    desc: '24 rondas de 45 s / 15 s. Sin saltos: cuida las rodillas y quema mucho.',
    warmup: 240, cooldown: 120, sets: 1, rounds: 24, work: 45, rest: 15, setRest: 0,
    moves: ['Marcha rodillas altas', 'Step jacks (sin salto)', 'Boxeo sombra', 'Sentadilla + elevación de rodilla', 'Patada de glúteo caminando', 'Toques de talón laterales', 'Giros de torso con rodilla', 'Paso lateral + brazos arriba'],
  },
  tabata_x5: {
    name: 'Tabata x5',
    desc: '5 bloques Tabata (8 × 20 s / 10 s) con 1 min de pausa entre bloques.',
    warmup: 240, cooldown: 120, sets: 5, rounds: 8, work: 20, rest: 10, setRest: 60,
    moves: ['Jumping jacks', 'Escaladores', 'Sentadilla con salto suave', 'Rodillas altas', 'Burpee'],
    movePerSet: true,
  },
  intervalos_40_20: {
    name: 'Intervalos 40/20',
    desc: '20 rondas de 40 s / 20 s. Combina saltos y movimientos de piso.',
    warmup: 300, cooldown: 300, sets: 1, rounds: 20, work: 40, rest: 20, setRest: 0,
    moves: ['Jumping jacks', 'Escaladores', 'Sentadilla al aire', 'Skaters (patinador)', 'Plancha con toque de hombros', 'Rodillas altas', 'Burpee sin salto', 'Boxeo sombra', 'Zancada alterna', 'Saltos de tijera'],
  },
  bloques_50_10: {
    name: 'Bloques 50/10',
    desc: '4 series de 5 rondas (50 s / 10 s) con 1 min de pausa entre series. El más exigente: cierre de semana.',
    warmup: 300, cooldown: 120, sets: 4, rounds: 5, work: 50, rest: 10, setRest: 60,
    moves: ['Jumping jacks', 'Sentadilla al aire', 'Escaladores', 'Rodillas altas', 'Boxeo sombra'],
  },
};

// sets, reps (texto), rest en segundos
const ROUTINE = [
  {
    id: 'lunes', short: 'L', name: 'Lunes', title: 'Empuje + core',
    focus: 'Pecho, hombros, tríceps y abdomen',
    cardio: 'hiit_30_30',
    format: 'Ejercicios en orden. Descansa 45–60 s entre series.',
    items: [
      { ex: 'flex_pecho', sets: 4, reps: '8–12', rest: 60 },
      { ex: 'floor_press_db', sets: 4, reps: '10–12', rest: 60 },
      { ex: 'press_militar_db', sets: 3, reps: '10–12', rest: 60 },
      { ex: 'elev_laterales', sets: 3, reps: '12–15', rest: 45 },
      { ex: 'flex_triceps', sets: 3, reps: '8–12', rest: 45 },
      { ex: 'plancha', sets: 3, reps: '30–45 s', rest: 30 },
      { ex: 'bicho_muerto', sets: 3, reps: '10/lado', rest: 30 },
    ],
  },
  {
    id: 'martes', short: 'M', name: 'Martes', title: 'Piernas + glúteos',
    focus: 'Cuádriceps, isquios, glúteos y pantorrillas',
    cardio: 'bajo_impacto',
    format: 'Ejercicios en orden. Descansa 60 s entre series.',
    items: [
      { ex: 'goblet_squat', sets: 4, reps: '12–15', rest: 60 },
      { ex: 'rdl_barra', sets: 4, reps: '10–12', rest: 60 },
      { ex: 'zancada_atras', sets: 3, reps: '10/pierna', rest: 60 },
      { ex: 'hip_thrust', sets: 3, reps: '15', rest: 45 },
      { ex: 'sumo_squat', sets: 3, reps: '15', rest: 45 },
      { ex: 'talones', sets: 3, reps: '15–20', rest: 30 },
      { ex: 'plancha_lateral', sets: 3, reps: '20–30 s/lado', rest: 30 },
    ],
  },
  {
    id: 'miercoles', short: 'X', name: 'Miércoles', title: 'Tirón + brazos + core',
    focus: 'Espalda, bíceps, hombro posterior y abdomen',
    cardio: 'tabata_x5',
    format: 'Ejercicios en orden. Descansa 45–60 s entre series.',
    items: [
      { ex: 'remo_barra', sets: 4, reps: '10–12', rest: 60 },
      { ex: 'remo_1mano', sets: 3, reps: '10–12/lado', rest: 45 },
      { ex: 'pajaro', sets: 3, reps: '12–15', rest: 45 },
      { ex: 'curl_barra', sets: 3, reps: '10–12', rest: 45 },
      { ex: 'curl_martillo', sets: 3, reps: '12', rest: 45 },
      { ex: 'superman', sets: 3, reps: '12–15', rest: 30 },
      { ex: 'giros_rusos', sets: 3, reps: '20', rest: 30 },
    ],
  },
  {
    id: 'jueves', short: 'J', name: 'Jueves', title: 'Full body metabólico',
    focus: 'Circuito de todo el cuerpo para quemar más',
    cardio: 'intervalos_40_20',
    format: 'CIRCUITO: haz 1 serie de cada ejercicio seguido, sin descanso. Al terminar la vuelta descansa 90 s. 4 vueltas.',
    items: [
      { ex: 'thruster', sets: 4, reps: '12', rest: 0 },
      { ex: 'remo_renegado', sets: 4, reps: '8/lado', rest: 0 },
      { ex: 'swing_db', sets: 4, reps: '15', rest: 0 },
      { ex: 'zancada_estatica', sets: 4, reps: '10/pierna', rest: 0 },
      { ex: 'flex_hombros', sets: 4, reps: '8–10', rest: 0 },
      { ex: 'escaladores', sets: 4, reps: '30 s', rest: 90 },
    ],
  },
  {
    id: 'viernes', short: 'V', name: 'Viernes', title: 'Fuerza total con barra',
    focus: 'Básicos con barra para mantener y ganar músculo',
    cardio: 'bloques_50_10',
    format: 'Ejercicios en orden. Descansa 60–75 s entre series.',
    items: [
      { ex: 'sentadilla_frontal', sets: 4, reps: '10–12', rest: 75 },
      { ex: 'peso_muerto', sets: 4, reps: '10–12', rest: 75 },
      { ex: 'floor_press_barra', sets: 4, reps: '10–12', rest: 60 },
      { ex: 'remo_barra', sets: 4, reps: '10–12', rest: 60 },
      { ex: 'press_militar_barra', sets: 3, reps: '10', rest: 60 },
      { ex: 'flex_pecho', sets: 2, reps: 'máx. técnica', rest: 60 },
      { ex: 'elev_piernas', sets: 3, reps: '12', rest: 30 },
    ],
  },
];

const GUIDE = [
  { t: 'Cómo es cada sesión (~65 min)', p: [
    '1) 30 min de cardio con el timer (ya incluye calentamiento y vuelta a la calma).',
    '2) Toma agua 2–3 min y pasa a la parte de fuerza (~30 min).',
    '3) Termina con 3–5 min de estiramiento suave en la colchoneta.',
    'Sábado: caminata de 30–60 min o descanso activo. Domingo: descanso.'
  ]},
  { t: 'Cómo elegir el peso', p: [
    'Elige un peso con el que termines las reps indicadas sintiendo que te quedaban 1–2 más (sin perder la técnica).',
    'El set es de 20 kg en total: con las dos mancuernas tienes hasta ~10 kg cada una, y con la barra armada hasta 20 kg.',
    'Para los ejercicios a una mano (goblet, swing, sumo) usa una mancuerna cargada con más discos.'
  ]},
  { t: 'Cómo progresar (doble progresión)', p: [
    'Cuando completes TODAS las series en la parte alta del rango (ej. 4×12 en un rango 10–12), sube el peso un disco la próxima vez.',
    'Si ya no tienes más discos: agrega 2 reps por serie, baja más lento (3 s) o descansa 15 s menos.',
    'La app te muestra lo que hiciste la última vez en cada ejercicio para que lo superes.'
  ]},
  { t: 'Intensidad del cardio', p: [
    'En los intervalos de trabajo apunta a un esfuerzo de 7–8 de 10: te cuesta hablar.',
    'Si estás empezando, usa la versión sin salto de cada movimiento o alarga los descansos con el timer personalizado.',
    'Las dos primeras semanas está bien hacer 20 min en lugar de 30 mientras te adaptas.'
  ]},
  { t: 'Para bajar de peso', p: [
    'El ejercicio ayuda, pero el factor principal es comer un poco menos de lo que gastas (un déficit moderado, no dietas extremas).',
    'Prioriza proteína en cada comida (huevos, pollo, legumbres, lácteos, pescado) para no perder músculo.',
    'Camina más en el día (apunta a 7.000–10.000 pasos), duerme 7–8 h y pésate 2–3 veces por semana a la misma hora: mira la tendencia, no el día a día.',
    'Si tienes alguna condición médica o lesión, consulta con un profesional antes de empezar.'
  ]},
];
