# pdf-password-breaker

**Recupera el acceso a un PDF tuyo cuya contraseña recuerdas a medias.** Le das las
pistas que ya conoces —tu DNI/NIE, una fecha, unas palabras— y la app genera y prueba
las variantes habituales hasta abrirlo, para luego descargar una copia sin contraseña.
Todo ocurre en el navegador: **el archivo nunca se sube a ningún servidor.**

Pensado para documentos propios con contraseñas sencillas o medio olvidadas —facturas y
extractos bancarios suelen usar el DNI, una fecha o unos dígitos de la cuenta—. No sirve
para contraseñas largas y aleatorias con cifrado fuerte: para esos casos exporta el hash
y lo crackeas en tu GPU (ver abajo).

## Inicio rápido

```bash
npm install
npm run dev      # abre http://localhost:5173
```

Arrastra tu PDF, escribe las pistas y pulsa probar. Al acertar, descarga la copia sin
contraseña.

## Ejemplo

Con las pistas DNI `12345678`, fecha `14/03/1985` y palabra `Barcelona`, la app expande
cada pista a sus formatos habituales y prueba primero los más probables:

```
pista "Barcelona"   -> Barcelona, barcelona, BARCELONA
pista DNI 12345678  -> 12345678, 12345678Z (letra de control), 12345678z
pista 14/03/1985    -> 14031985, 140385, 19850314, 850314
```

Esas tres pistas producen 10 candidatos ordenados de más a menos probable. Una lista de
pistas normal (decenas a miles de combinaciones) se prueba en segundos; cada intento
reparsea el PDF en milisegundos.

## Cómo funciona

- Tú das pistas; la app genera variantes: fechas en varios formatos (`ddmmaaaa`,
  `ddmmaa`, `aaaammdd`…), el DNI con y sin la letra de control y sin ceros, palabras en
  minúsculas/MAYÚSCULAS/Capitalizadas.
- Opcionalmente añade un barrido numérico corto (limitado a 6 cifras, porque cada intento
  reparsea el PDF y un barrido grande sería lento).
- Al acertar, ofrece descargar una copia **sin contraseña**. Se conserva el contenido;
  se pierden marcadores y formularios.

## Contraseñas difíciles: hashcat en tu GPU

Cuando las pistas no bastan, la app extrae el «hash» del PDF (formato pdf2john, `$pdf$…`)
para que lo pruebes en tu tarjeta gráfica con [hashcat](https://hashcat.net/hashcat/),
mucho más rápido que el navegador. La propia página muestra el modo `-m` correcto según
el cifrado del archivo y comandos listos para copiar; el PDF no sale de tu equipo (solo
se exporta el hash).

| Cifrado del PDF | Revisión | hashcat |
|---|---|---|
| RC4 40 bits | R2 | `-m 10400` (muy rápido) |
| RC4/AES-128 | R3/R4 | `-m 10500` |
| AES-256 (Acrobat 9) | R5 | `-m 10600` (lento) |
| AES-256 (Acrobat 10-11) | R6 | `-m 10700` (lento) |

Pega el hash en `hash.txt` y, por ejemplo, para una fecha de 8 cifras:

```bash
hashcat -m 10700 hash.txt -a 3 ?d?d?d?d?d?d?d?d
hashcat -m 10700 hash.txt --show   # ver la contraseña encontrada
```

Con AES-256 (10600/10700) incluso una GPU va lenta: céntrate en máscaras cortas (fechas,
PIN) o en un diccionario. Con RC4 (10400/10500) vuela.

## Qué no hace

- No rompe contraseñas largas y aleatorias con AES-256 por fuerza bruta en el navegador:
  eso no es viable. Para eso está la ruta de hashcat.
- No elimina DRM ni restricciones de permisos distintas de la contraseña de apertura.
- No es un servicio: no hay backend ni subida de archivos.

## Desarrollo

```bash
npm install
npm run dev       # servidor local
npm test          # vitest
npm run build     # genera dist/ (estático)
```

El despliegue es estático y usa rutas relativas (`base: "./"`), así que funciona bajo
cualquier subruta de GitHub Pages o abierto en local.

## Aviso

Úsalo solo con documentos de tu propiedad o para los que tengas autorización.

## Proyectos relacionados

- [claude-arsenal](https://github.com/nuncaeslupus/claude-arsenal) — flujo spec-driven para Claude Code y cola de tareas con gates.
- [drawspec](https://github.com/nuncaeslupus/drawspec) — spec declarativo de diagramas → SVG/PNG/texto limpio, escribible por LLMs; incluye servidor MCP.
- [doc-control](https://github.com/nuncaeslupus/doc-control) — permite a agentes de IA editar documentos Word como cambios con control de versiones.
- [literary-critic](https://github.com/nuncaeslupus/literary-critic) — análisis de manuscritos con LLM como lo haría un editor profesional.
- [integral-job-search](https://github.com/nuncaeslupus/integral-job-search) — búsqueda de empleo centrada en el candidato, dentro de Claude Code.

## Licencia

MIT — ver [LICENSE](LICENSE).
