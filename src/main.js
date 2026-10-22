
import './style.css'
import { io } from 'socket.io-client'
const socket = io()

socket.on('connect', () => {
  console.log('NOCTURNA: conexión establecida', socket.id)
})

socket.on('connect_error', (error) => {
  console.log('NOCTURNA: error de conexión', error.message)
})

document.querySelector('#app').innerHTML = `
  <main class="inicio">
    <header class="barra-superior">
      <span class="marca">N<span>·</span></span>
      <button id="como-jugar" class="boton-ayuda">
        ? Cómo jugar?
      </button>
    </header>

    <section class="portada">
      <p class="etiqueta">UNA PARTIDA. MUCHOS SECRETOS.</p>

      <h1>NOCTURNA</h1>

      <div class="separador">
        <span></span>
        <span class="rombo">◆</span>
        <span></span>
      </div>

      <p class="eslogan">
        Esta noche, cualquiera puede ser el asesino.
      </p>

      <div class="menu">
        <button id="crear-sala" class="boton-principal">
          Crear una sala
        </button>

        <button id="unirse-sala" class="boton-secundario">
          Unirse a una sala
        </button>
      </div>

      <p class="nota">Se necesitan al menos 5 jugadores</p>
    </section>

    <footer class="pie">
      <span>NOCTURNA</span>
      <span>CONFÍA EN NADIE.</span>
    </footer>
  </main>

  <div id="fondo-modal" class="fondo-modal oculto">
    <section
      class="ventana-reglas"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reglas"
    >
      <button
        id="cerrar-reglas"
        class="cerrar-reglas"
        aria-label="Cerrar reglas"
      >×</button>

      <p class="etiqueta">ANTES DE QUE CAIGA LA NOCHE</p>
      <h2 id="titulo-reglas">Cómo jugar</h2>

      <p class="intro-reglas">
        Todos tienen un papel. No todos dicen la verdad.
      </p>

      <div class="lista-roles">
        <article class="rol">
          <div class="icono-rol mafia">♠</div>
          <div>
            <h3>Mafia</h3>
            <p>
              Cada noche eliges a una víctima. Tu misión es eliminar
              a los demás sin que descubran tu identidad.
            </p>
          </div>
        </article>

        <article class="rol">
          <div class="icono-rol doctor">✚</div>
          <div>
            <h3>Doctor</h3>
            <p>
              Cada noche puedes proteger a una persona, incluso a ti.
              Si salvas a la víctima elegida por la Mafia, sobrevivirá.
              Debes mantener tu identidad en secreto.
            </p>
          </div>
        </article>

        <article class="rol">
          <div class="icono-rol detective">⌕</div>
          <div>
            <h3>Detective</h3>
            <p>
              Una vez por ronda investigas a una persona. El resultado
              solo lo conocerás tú. Convence a los demás sin revelar
              que eres el detective.
            </p>
          </div>
        </article>

        <article class="rol">
          <div class="icono-rol civil">◈</div>
          <div>
            <h3>Civil / Inocente</h3>
            <p>
              No tienes poderes especiales. Analiza las pistas,
              debate con los demás y vota para descubrir a la Mafia.
            </p>
          </div>
        </article>
      </div>

      <div class="reglas-finales">
        <h3>Las reglas de la noche</h3>
        <p>
          Durante la noche actúan los roles secretos. Después se
          revela el resultado y los jugadores debaten y votan.
        </p>

        <div class="condicion victoria-mafia">
          <span>♠</span>
          <p>
            <strong>Gana la Mafia</strong>
            <span>Cuando quedan solo 3 jugadores vivos.</span>
          </p>
        </div>

        <div class="condicion victoria-civiles">
          <span>◆</span>
          <p>
            <strong>Ganan los demás</strong>
            <span>Cuando la Mafia es descubierta y eliminada.</span>
          </p>
        </div>
      </div>

      <p class="minimo-jugadores">
        MÍNIMO 5 JUGADORES POR PARTIDA
      </p>

      <button id="entendido" class="boton-principal boton-entendido">
        Entendido
      </button>
    </section>
  </div>
`

// ABRIR LAS REGLAS
const fondoModal = document.querySelector('#fondo-modal')
const botonAyuda = document.querySelector('#como-jugar')
const botonCerrar = document.querySelector('#cerrar-reglas')
const botonEntendido = document.querySelector('#entendido')

function abrirReglas() {
  fondoModal.classList.remove('oculto')
  document.body.classList.add('modal-abierto')
  botonCerrar.focus()
}

function cerrarReglas() {
  fondoModal.classList.add('oculto')
  document.body.classList.remove('modal-abierto')
  botonAyuda.focus()
}

botonAyuda.addEventListener('click', abrirReglas)
botonCerrar.addEventListener('click', cerrarReglas)
botonEntendido.addEventListener('click', cerrarReglas)

// CERRAR AL PULSAR FUERA DE LA VENTANA
fondoModal.addEventListener('click', (evento) => {
  if (evento.target === fondoModal) {
    cerrarReglas()
  }
})

// CERRAR CON LA TECLA ESCAPE
document.addEventListener('keydown', (evento) => {
  if (
    evento.key === 'Escape' &&
    !fondoModal.classList.contains('oculto')
  ) {
    cerrarReglas()
  }
})


const botonCrear = document.querySelector('#crear-sala')
const botonUnirse = document.querySelector('#unirse-sala')

let codigoSalaActual = null

function mostrarFormulario(tipo) {
  const esCrear = tipo === 'crear'

  const formularioAnterior = document.querySelector('#modal-sala')
  if (formularioAnterior) formularioAnterior.remove()

  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-sala" class="fondo-modal">
      <section class="ventana-reglas" role="dialog" aria-modal="true">
        <button id="cerrar-sala" class="cerrar-reglas"
          aria-label="Cerrar">×</button>

        <p class="etiqueta">NOCTURNA</p>
        <h2>${esCrear ? 'Crear una sala' : 'Unirse a una sala'}</h2>

        <form id="formulario-sala">
          <label for="nombre-jugador">Tu nombre</label>
          <input
            id="nombre-jugador"
            name="nombre"
            type="text"
            maxlength="20"
            placeholder="Escribe tu nombre"
            required
          />

          ${esCrear ? '' : `
            <label for="codigo-sala">Código de la sala</label>
            <input
              id="codigo-sala"
              name="codigo"
              type="text"
              maxlength="6"
              placeholder="Ej. AB23CD"
              required
            />
          `}

          <p id="error-sala" role="alert"></p>

          <button class="boton-principal" type="submit">
            ${esCrear ? 'Crear sala' : 'Entrar en la sala'}
          </button>
        </form>
      </section>
    </div>
  `)

  const modal = document.querySelector('#modal-sala')
  const formulario = document.querySelector('#formulario-sala')
  const botonCerrarSala = document.querySelector('#cerrar-sala')
  const errorSala = document.querySelector('#error-sala')

  document.querySelector('#nombre-jugador').focus()

  function cerrarFormulario() {
    modal.remove()
  }

  botonCerrarSala.addEventListener('click', cerrarFormulario)

  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) cerrarFormulario()
  })

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()

    const nombre = document.querySelector('#nombre-jugador').value.trim()
    const codigo = document.querySelector('#codigo-sala')?.value.trim()

    errorSala.textContent = ''

    if (!nombre) {
      errorSala.textContent = 'Escribe tu nombre para continuar.'
      return
    }

    if (!socket.connected) {
      errorSala.textContent = 'Conectando con el servidor... Inténtalo de nuevo en unos segundos.'
      socket.connect()
      return
    }

    const eventoServidor = esCrear ? 'crear-sala' : 'unirse-sala'
    const datos = esCrear ? { nombre } : { nombre, codigo }

    socket.emit(eventoServidor, datos, (respuesta) => {
      if (!respuesta?.ok) {
        errorSala.textContent = respuesta?.mensaje || 'No se ha podido completar la operación.'
        return
      }

      codigoSalaActual = respuesta.codigo
      modal.remove()
      mostrarSalaEspera(nombre)
    })
  })
}

function mostrarSalaEspera(nombre) {
  document.querySelector('.inicio').style.display = 'none'

  let pantalla = document.querySelector('#pantalla-espera')

  if (!pantalla) {
    document.querySelector('#app').insertAdjacentHTML('beforeend', `
      <main id="pantalla-espera" class="inicio">
        <section class="portada">
          <p class="etiqueta">LA PARTIDA ESTÁ POR COMENZAR</p>
          <h1>NOCTURNA</h1>
          <p>Comparte este código con tus amigos:</p>
          <h2 id="codigo-visible"></h2>
          <button id="copiar-codigo" class="boton-secundario">
            Copiar código
          </button>
          <h2>Jugadores <span id="contador-jugadores">0/15</span></h2>
          <p id="lista-jugadores"></p>
          <p id="estado-espera">Se necesitan al menos 5 jugadores.</p>
          <button id="salir-sala" class="boton-secundario">
            Salir de la sala
          </button>
        </section>
      </main>
    `)

    pantalla = document.querySelector('#pantalla-espera')

    document.querySelector('#copiar-codigo').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codigoSalaActual)
        document.querySelector('#copiar-codigo').textContent = '¡Código copiado!'
      } catch {
        document.querySelector('#estado-espera').textContent =
          `Copia este código manualmente: ${codigoSalaActual}`
      }
    })

    document.querySelector('#salir-sala').addEventListener('click', () => {
      socket.emit('salir-sala', () => {
        codigoSalaActual = null
        pantalla.remove()
        document.querySelector('.inicio').style.display = ''
      })
    })
  }

  document.querySelector('#codigo-visible').textContent = codigoSalaActual
}

socket.on('estado-sala', (estado) => {
  if (!codigoSalaActual || estado.codigo !== codigoSalaActual) return

  const pantalla = document.querySelector('#pantalla-espera')
  if (!pantalla) return

  document.querySelector('#contador-jugadores').textContent =
    `${estado.jugadores.length}/${estado.maximoJugadores}`

  document.querySelector('#lista-jugadores').innerHTML =
    estado.jugadores.map((jugador) => {
      const anfitrion = jugador.anfitrion ? ' ♛ Anfitrión' : ''
      return `<span>${escaparHTML(jugador.nombre)}${anfitrion}</span><br>`
    }).join('')

  document.querySelector('#estado-espera').textContent =
    estado.puedeEmpezar
      ? '¡Ya hay suficientes jugadores para empezar!'
      : `Esperando a ${estado.minimoJugadores - estado.jugadores.length} jugador(es) más...`
})

function escaparHTML(texto) {
  return texto.replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caracter])
}

botonCrear.addEventListener('click', () => mostrarFormulario('crear'))
botonUnirse.addEventListener('click', () => mostrarFormulario('unirse'))

