/* ================================
   NATCHAR — Controller del menú
   Este archivo CONECTA los datos
   del model con lo que se ve en
   la página. Lee los platos y los
   convierte en HTML automáticamente.
================================ */

import menuModel from '../models/menu.model.js'

/* 
  Esta función toma UN plato (objeto)
  y devuelve el HTML de esa tarjeta.
  Es como un molde — le metes datos,
  te saca HTML.
*/
function crearTarjetaPlato(plato, numero) {
  return `
    <div class="plato">
      <span class="plato-num">0${numero}</span>
      <p class="plato-cat">${plato.categoria}</p>
      <p class="plato-name">${plato.nombre}</p>
      <p class="plato-desc">${plato.descripcion}</p>
      <p class="plato-price">
        <span>$</span> ${plato.precio.toLocaleString('es-CO')} COP
      </p>
    </div>
  `
}

/*
  Esta función recorre TODOS los platos
  del model, crea una tarjeta para cada uno,
  y los inyecta en el HTML de la página.
*/
function renderizarMenu() {
  // Busca el contenedor en el HTML
  const contenedor = document.querySelector('.platos-grid')

  // Si no existe en esta página, no hace nada
  if (!contenedor) return

  // Recorre cada plato y crea su tarjeta
  const tarjetas = menuModel.map((plato, index) => {
    return crearTarjetaPlato(plato, index + 1)
  })

  // Las une todas y las mete en la página
  contenedor.innerHTML = tarjetas.join('')
}

/*
  Filtrar por horario — útil para el home
  que solo muestra algunos platos
*/
function renderizarMenuFiltrado(horario) {
  const contenedor = document.querySelector('.platos-grid')
  if (!contenedor) return

  // Solo los platos que coincidan con el horario
  const platosFiltrados = menuModel.filter(plato => plato.horario === horario)

  const tarjetas = platosFiltrados.map((plato, index) => {
    return crearTarjetaPlato(plato, index + 1)
  })

  contenedor.innerHTML = tarjetas.join('')
}

export { renderizarMenu, renderizarMenuFiltrado }