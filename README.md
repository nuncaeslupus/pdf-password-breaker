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
