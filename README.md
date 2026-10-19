# pdf-password-breaker

Recupera la contraseña de **un PDF tuyo** probando candidatos que tú defines, a
partir de lo que ya conoces (DNI/NIE, fechas, palabras) y, opcionalmente, un
barrido numérico corto. Todo ocurre en el navegador: **el archivo no se sube a
ningún servidor**.

Pensado para documentos propios cuya contraseña es sencilla o medio recordada
—facturas y extractos bancarios suelen usar el DNI, una fecha o unos dígitos de
la cuenta—. No sirve para contraseñas largas y aleatorias con cifrado AES‑256:
eso no se recupera con fuerza bruta en un navegador.

## Cómo funciona

- Tú das pistas; la app genera variantes (fechas en varios formatos, el DNI con
  y sin letra y sin ceros, etc.) y prueba cada una abriendo el PDF.
- Cada intento reparsea el PDF (milisegundos), así que es rápido con listas de
  pistas (decenas a miles) y lento para barridos numéricos grandes. Por eso el
  barrido está limitado a 6 cifras.
- Al acertar, ofrece descargar una copia **sin contraseña** (se pierden marcadores
  y formularios; el contenido se conserva).

## Contraseñas difíciles: hashcat en tu GPU

Cuando las pistas no bastan, la app extrae el «hash» del PDF (formato
pdf2john, `$pdf$…`) para que lo pruebes en tu tarjeta gráfica con
[hashcat](https://hashcat.net/hashcat/), mucho más rápido que el navegador. La
propia página muestra el modo `-m` correcto según el cifrado del archivo y
comandos listos para copiar; el PDF no sale de tu equipo (solo se exporta el
hash). Resumen:

| Cifrado del PDF | Revisión | hashcat |
|---|---|---|
| RC4 40 bits | R2 | `-m 10400` (muy rápido) |
| RC4/AES-128 | R3/R4 | `-m 10500` |
| AES-256 (Acrobat 9) | R5 | `-m 10600` (lento) |
| AES-256 (Acrobat 10–11) | R6 | `-m 10700` (lento) |

Pega el hash en `hash.txt` y, por ejemplo, para una fecha de 8 cifras:

```bash
hashcat -m 10700 hash.txt -a 3 ?d?d?d?d?d?d?d?d
hashcat -m 10700 hash.txt --show   # ver la contraseña encontrada
```

Con AES-256 (10600/10700) incluso una GPU va lenta: céntrate en máscaras cortas
(fechas, PIN) o en un diccionario. Con RC4 (10400/10500) vuela.

## Desarrollo

```bash
npm install
npm run dev       # servidor local
npm test          # vitest
npm run build     # genera dist/ (estático)
```

Despliegue: `dist/` es estático y usa rutas relativas (`base: "./"`), así que
funciona bajo cualquier subruta de GitHub Pages o abierto en local.

## Aviso

Úsalo solo con documentos de tu propiedad o para los que tengas autorización.
