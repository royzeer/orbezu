// Esqueleto comun de cada escena. Cada idioma rellena las mismas claves,
// asi todas las lecciones siguen el mismo metodo de 6 pasos.

export const SCENES = {
  bakery: {
    story: ['L1', 'L2', 'T', 'L4', 'L5'],
    target: 'T',
    dialog: {
      start: 'start',
      nodes: {
        start: { npc: 'N_start', options: [{ line: 'T', next: 'good' }, { line: 'L1', next: 'what' }] },
        what: { npc: 'N_what', options: [{ line: 'T', next: 'good' }] },
        good: { npc: 'N_good', options: [{ line: 'L4', next: 'end' }] },
        end: { npc: 'N_end', options: [] }
      }
    },
    es: {
      title: 'La panadería de la esquina',
      L1: 'Hoy la panadería está cerrada.',
      L2: 'No hay pan en casa.',
      T: 'Mañana por la mañana voy a comprar pan en la panadería de la esquina.',
      L4: 'Abren a las siete.',
      L5: 'El pan de allí es delicioso.',
      N_start: '¡Hola! ¿Tienes pan para el desayuno?',
      N_what: '¡Vaya! ¿Y qué vas a hacer?',
      N_good: '¡Buena idea! ¿A qué hora abren?',
      N_end: 'Perfecto. ¡Hasta mañana!'
    },
    en: {
      title: 'The corner bakery',
      L1: 'The bakery is closed today.',
      L2: "There's no bread at home.",
      T: "Tomorrow morning I'm going to buy bread at the bakery on the corner.",
      L4: 'They open at seven.',
      L5: 'The bread there is delicious.',
      N_start: 'Hi! Do you have bread for breakfast?',
      N_what: 'Oh no! So what are you going to do?',
      N_good: 'Good idea! What time do they open?',
      N_end: 'Perfect. See you tomorrow!'
    }
  },
  station: {
    story: ['L1', 'L2', 'T', 'L4', 'L5'],
    target: 'T',
    dialog: {
      start: 'start',
      nodes: {
        start: { npc: 'N_start', options: [{ line: 'T', next: 'info' }, { line: 'ALT', next: 'help' }] },
        help: { npc: 'N_help', options: [{ line: 'T', next: 'info' }] },
        info: { npc: 'L4', options: [{ line: 'L5', next: 'end' }] },
        end: { npc: 'N_end', options: [] }
      }
    },
    es: {
      title: 'En la estación',
      L1: 'Estoy en la estación con mi maleta.',
      L2: 'Hay mucha gente y no veo el horario.',
      T: '¿Sabe a qué hora sale el próximo tren a la ciudad?',
      L4: 'Sale en diez minutos del andén tres.',
      L5: '¡Muchas gracias!',
      ALT: 'No veo el horario.',
      N_start: 'Buenos días. ¿En qué puedo ayudarle?',
      N_help: 'El horario está allí. ¿Qué necesita saber?',
      N_end: 'De nada. ¡Buen viaje!'
    },
    en: {
      title: 'At the station',
      L1: "I'm at the station with my suitcase.",
      L2: "There are a lot of people and I can't see the timetable.",
      T: 'Do you know when the next train leaves for the city?',
      L4: 'It leaves in ten minutes from platform three.',
      L5: 'Thank you very much!',
      ALT: "I can't see the timetable.",
      N_start: 'Good morning. Can I help you?',
      N_help: "The timetable is over there. What do you need to know?",
      N_end: "You're welcome. Have a good trip!"
    }
  }
}

export const SCENE_ORDER = ['bakery', 'station']
