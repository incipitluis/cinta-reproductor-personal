# Cinta — Roadmap

## Estado actual

Reproductor personal como sustituto de Spotify. Fuentes soportadas: archivos locales (Supabase Storage), SoundCloud (por URL), Free Music Archive.

---

## Funcionalidades por área

### Reproducción

| Función | Estado |
|---|---|
| Play / Pause / Siguiente / Anterior | ✅ |
| Seek (barra de progreso) | ✅ |
| Volumen | ✅ |
| Aleatorio (shuffle) | ⬜ |
| Repetir (off / una / todas) | ⬜ |

### Cola de reproducción

| Función | Estado |
|---|---|
| Cola implícita al reproducir una lista | ✅ |
| Ver la cola (qué suena a continuación) | ✅ |
| Añadir canción a la cola desde cualquier vista | ✅ |
| Reordenar la cola | ⬜ |

### Organización de la biblioteca

| Función | Estado |
|---|---|
| Vista de inicio con estadísticas y recientes | ✅ |
| Biblioteca — tab canciones (lista completa) | ✅ |
| Biblioteca — tab álbumes (grid agrupado) | ✅ |
| Vista de artista (todas sus canciones y álbumes) | ✅ |
| Vista de álbum (canciones del álbum, reproducible) | ✅ |
| Canciones favoritas / me gusta | ⬜ |

### Playlists

| Función | Estado |
|---|---|
| Ver y reproducir playlists | ✅ |
| Crear playlist | ✅ |
| Añadir canciones a una playlist | ✅ |
| Eliminar canciones de una playlist | ✅ |
| Reordenar canciones en una playlist (drag & drop) | ✅ |
| Renombrar / borrar playlist | ✅ |

### Gestión de canciones

| Función | Estado |
|---|---|
| Subir archivos locales con form de metadatos | ✅ |
| Añadir por URL de SoundCloud con metadatos | ✅ |
| Buscar en la biblioteca (título / artista / álbum) | ✅ |
| Filtrar búsqueda por fuente | ✅ |
| Historial de reproducción (last_played_at) | ✅ |
| Editar metadatos de una canción ya subida | ⬜ |
| Eliminar canción de la biblioteca | ⬜ |

---

## Orden de implementación

1. **Gestión de playlists** — crear, añadir/quitar canciones, reordenar, renombrar, borrar
2. **Vistas de álbum y artista** — hacer clic en álbum o artista abre su contenido reproducible
3. **Cola de reproducción** — panel lateral o modal con la cola actual, posibilidad de añadir desde cualquier vista
4. **Shuffle y repeat** — controles en el PlayerBar
5. **Editar / eliminar canciones** — acciones contextuales en las listas
6. **Favoritos** — marcar canciones con me gusta, vista de canciones favoritas
