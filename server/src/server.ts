import { createServer } from 'node:http'
import { app } from './app.js'
import { env, isAllowedOrigin } from './config/env.js'
import { Server } from 'socket.io'
import { attachRealtime } from './realtime.js'
import { refreshAllOverlays } from './services/adminOverlayService.js'
import { retryPendingAvatarDeletions } from './services/pendingAvatarDeletionService.js'

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) =>
      callback(null, isAllowedOrigin(origin)),
  },
})

attachRealtime(io)

// Chargement des surcharges administrateur
refreshAllOverlays()
  .catch((error) =>
    console.error(
      'Chargement des surcharges administrateur impossible:',
      error
    )
  )
  .finally(() => {
    httpServer.listen(env.port, () => {
      console.log(
        `API Shinobi Area démarrée sur http://localhost:${env.port}`
      )

      // Réessayer les suppressions Cloudinary échouées
      void retryPendingAvatarDeletions().catch((error) =>
        console.error(
          'Nettoyage des avatars en attente impossible:',
          error
        )
      )
    })
  })