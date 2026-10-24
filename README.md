# Generador y corrector de exámenes de ingeniería 

App estática (Astro + TypeScript) que genera exámenes a partir de apuntes y los corrige automáticamente. BYOK: la clave de LLM se guarda solo en el navegador.

https://cce-ops.github.io/generador-examenes/

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
# salida en dist/
```

## Despliegue

- **Cloudflare Pages**: comando de build `npm run build`, directorio de salida `dist`.
- **GitHub Pages**: fija `BASE_PATH=/nombre-del-repo` al hacer build si el sitio no está en la raíz:
  ```bash
  BASE_PATH=/generador-examenes-ingenieria npm run build
  ```

## Funcionalidades

- Subida de apuntes (PDF, DOCX, MD, TXT) con extracción en el navegador.
- Generación de examen con LLM (Gemini).
- Corrección determinista de test y problemas (numérico, vector, matriz, simbólico, texto).
- Corrección con LLM de preguntas abiertas mediante rúbrica.
- Nota total, por pregunta/subapartado, feedback y resolución.
- Botón opcional "Analizar mi desarrollo".
- Persistencia local (examen, respuestas, clave BYOK).

## Privacidad

La API key se guarda en `sessionStorage` por defecto (opción `localStorage`) y nunca se envía a un backend propio.
EOF
