

import express from 'express'
import http from 'node:http'
import { Server } from 'socket.io'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: true,
  },
})

const PORT = process.env.PORT || 3001

const MIN_JUGADORES = 5
const MAX_JUGADORES = 15

// Aquí se guardarán las salas activas mientras el servidor funcione.
const salas = new Map()

function generarCodigo() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo

  do {
    codigo = ''

    for (let i = 0; i < 6; i++) {
      codigo += caracteres[
        Math.floor(Math.random() * caracteres.length)
      ]
    }
  } while (salas.has(codigo))

  return codigo
}

function obtenerJugadores(sala) {
  return Array.from(sala.jugadores.values()).map((jugador) => ({
    id: jugador.id,
    nombre: jugador.nombre,
    anfitrion: jugador.anfitrion,
  }))
}

function enviarEstadoSala(codigo) {
  const sala = salas.get(codigo)

  if (!sala) return

  io.to(codigo).emit('estado-sala', {
    codigo,
    jugadores: obtenerJugadores(sala),
    minimoJugadores: MIN_JUGADORES,
    maximoJugadores: MAX_JUGADORES,
    puedeEmpezar: sala.jugadores.size >= MIN_JUGADORES,
    anfitrionId: sala.anfitrionId,
  })
}

function nombreValido(nombre) {
  return (
    typeof nombre === 'string' &&
    nombre.trim().length >= 1 &&
    nombre.trim().length <= 20
  )
}

// Conexiones de los jugadores.
io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id)

  // CREAR UNA SALA
  socket.on('crear-sala', (datos, respuesta) => {
    if (socket.data.codigoSala) {
      return respuesta?.({
        ok: false,
        mensaje: 'Ya estás dentro de una sala.',
      })
    }

    const nombre = datos?.nombre?.trim()

    if (!nombreValido(nombre)) {
      return respuesta?.({
        ok: false,
        mensaje: 'Tu nombre debe tener entre 1 y 20 caracteres.',
      })
    }

    const codigo = generarCodigo()

    const sala = {
      anfitrionId: socket.id,
      jugadores: new Map(),
      empezada: false,
    }

    sala.jugadores.set(socket.id, {
      id: socket.id,
      nombre,
      anfitrion: true,
    })

    salas.set(codigo, sala)

    socket.join(codigo)
    socket.data.codigoSala = codigo

    respuesta?.({
      ok: true,
      codigo,
      mensaje: 'Sala creada correctamente.',
    })

    enviarEstadoSala(codigo)

    console.log('Sala creada:', codigo)
  })

  // UNIRSE A UNA SALA
  socket.on('unirse-sala', (datos, respuesta) => {
    if (socket.data.codigoSala) {
      return respuesta?.({
        ok: false,
        mensaje: 'Ya estás dentro de una sala.',
      })
    }

    const codigo =
      typeof datos?.codigo === 'string'
        ? datos.codigo.trim().toUpperCase()
        : ''

    const nombre = datos?.nombre?.trim()

    if (!nombreValido(nombre)) {
      return respuesta?.({
        ok: false,
        mensaje: 'Tu nombre debe tener entre 1 y 20 caracteres.',
      })
    }

    const sala = salas.get(codigo)

    if (!sala) {
      return respuesta?.({
        ok: false,
        mensaje: 'No existe una sala con ese código.',
      })
    }

    if (sala.empezada) {
      return respuesta?.({
        ok: false,
        mensaje: 'La partida ya ha empezado.',
      })
    }

    if (sala.jugadores.size >= MAX_JUGADORES) {
      return respuesta?.({
        ok: false,
        mensaje: 'La sala está llena. El máximo es de 15 jugadores.',
      })
    }

    sala.jugadores.set(socket.id, {
      id: socket.id,
      nombre,
      anfitrion: false,
    })

    socket.join(codigo)
    socket.data.codigoSala = codigo

    respuesta?.({
      ok: true,
      codigo,
      mensaje: 'Te has unido a la sala.',
    })

    enviarEstadoSala(codigo)

    console.log(nombre, 'se ha unido a la sala', codigo)
  })

  // ABANDONAR UNA SALA
  socket.on('salir-sala', (respuesta) => {
    const codigo = socket.data.codigoSala

    if (!codigo) {
      return respuesta?.({ ok: true })
    }

    const sala = salas.get(codigo)

    socket.leave(codigo)
    delete socket.data.codigoSala

    if (!sala) {
      return respuesta?.({ ok: true })
    }

    sala.jugadores.delete(socket.id)

    if (sala.jugadores.size === 0) {
      salas.delete(codigo)
    } else {
      // Si sale el anfitrión, el siguiente jugador pasa a serlo.
      if (sala.anfitrionId === socket.id) {
        const siguiente = sala.jugadores.values().next().value

        sala.anfitrionId = siguiente.id
        siguiente.anfitrion = true
      }

      enviarEstadoSala(codigo)
    }

    respuesta?.({ ok: true })
  })

  // DESCONEXIÓN
  socket.on('disconnect', () => {
    const codigo = socket.data.codigoSala

    if (!codigo) return

    const sala = salas.get(codigo)

    if (!sala) return

    sala.jugadores.delete(socket.id)

    if (sala.jugadores.size === 0) {
      salas.delete(codigo)
    } else {
      if (sala.anfitrionId === socket.id) {
        const siguiente = sala.jugadores.values().next().value

        sala.anfitrionId = siguiente.id
        siguiente.anfitrion = true
      }

      enviarEstadoSala(codigo)
    }

    console.log('Jugador desconectado:', socket.id)
  })
})

// En producción serviremos la web compilada por Vite.
if (process.env.NODE_ENV === 'production') {
  const carpetaWeb = path.join(__dirname, 'dist')

  app.use(express.static(carpetaWeb))

  app.get('*', (req, res) => {
    res.sendFile(path.join(carpetaWeb, 'index.html'))
  })
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de NOCTURNA activo en el puerto ${PORT}`)
})
