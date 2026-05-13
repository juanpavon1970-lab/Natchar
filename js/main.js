/* ================================
   NATCHAR — Main JS
   Este archivo corre en TODAS
   las páginas. Cursor, animaciones
   y nav activo van aquí.
================================ */

// --- Cursor personalizado ---
function initCursor() {
  const cursor = document.getElementById('cursor')
  const dot = document.getElementById('cursorDot')

  if (!cursor || !dot) return

  let mx = 0, my = 0, cx = 0, cy = 0

  document.addEventListener('mousemove', e => {
    mx = e.clientX
    my = e.clientY
    // El punto sigue exacto
    dot.style.left = mx + 'px'
    dot.style.top = my + 'px'
  })

  // El círculo sigue con retraso suave
  function animarCursor() {
    cx += (mx - cx) * 0.10
    cy += (my - cy) * 0.10
    cursor.style.left = cx + 'px'
    cursor.style.top = cy + 'px'
    requestAnimationFrame(animarCursor)
  }
  animarCursor()

  // Agrandar al pasar sobre elementos clickeables
  document.querySelectorAll('a, button, input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('cursor-hover')
    })
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover')
    })
  })
}

// --- Nav activo ---
// Detecta en qué página estás y marca
// el link correspondiente en el nav
function initNavActivo() {
  const links = document.querySelectorAll('nav ul a')
  const paginaActual = window.location.pathname

  links.forEach(link => {
    // Si el href del link está en la URL actual
    if (paginaActual.includes(link.getAttribute('href'))) {
      link.classList.add('activo')
    }
  })
}

// --- Animaciones de entrada ---
// Los elementos aparecen suavemente
// cuando el usuario hace scroll hasta ellos
function initAnimaciones() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1'
        entry.target.style.transform = 'translateY(0)'
      }
    })
  }, { threshold: 0.1 })

  // Todos los elementos que quieres animar
  // los agregas aquí separados por coma
  document.querySelectorAll(
    '.horario-card, .plato, .contact-item, .exp-text p'
  ).forEach(el => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
    observer.observe(el)
  })
}

// --- Arrancar todo cuando carga la página ---
document.addEventListener('DOMContentLoaded', () => {
  initCursor()
  initNavActivo()
  initAnimaciones()
})