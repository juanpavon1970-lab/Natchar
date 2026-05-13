/* ================================
   NATCHAR — Modxel del menú
   Aquí viven los DATOS de los platos.
   Si quieres agregar, editar o borrar
   un plato, solo tocas este archivo.
   El HTML nunca se toca para eso.
================================ */

const menuModel = [
  {
    id: 1,
    categoria: "Desayuno ancestral",
    nombre: "Changua de la Abuela",
    descripcion: "Leche entera, huevo pochado, cebolla larga y cilantro. Con pan de yuca artesanal. El desayuno que Colombia le debe al mundo.",
    precio: 18000,
    horario: "amanecer"
  },
  {
    id: 2,
    categoria: "Brunch estelar",
    nombre: "Tamal Caleño Natchar",
    descripcion: "Masa de maíz, cerdo, pollo, zanahoria y arveja. Envuelto en hoja de bijao, cocinado al vapor por tres horas. Con ají casero.",
    precio: 22000,
    horario: "brunch"
  },
  {
    id: 3,
    categoria: "Almuerzo mayor",
    nombre: "Bandeja Paisa Completa",
    descripcion: "Fríjoles rojos, arroz, chicharrón, chorizo, morcilla, aguacate, huevo frito, maduro y arepa. El plato más generoso de la tierra.",
    precio: 38000,
    horario: "almuerzo"
  },
  {
    id: 4,
    categoria: "Media tarde",
    nombre: "El Domingo Eterno",
    descripcion: "Selección de buñuelos, natilla, bollo de choclo y agua de panela con limón y jengibre. Ritual de media tarde.",
    precio: 24000,
    horario: "tarde"
  },
  {
    id: 5,
    categoria: "Bebida sagrada",
    nombre: "Café Estrella del Sur",
    descripcion: "Café de origen Valle del Cauca, preparación en chemex o prensa francesa. Servido con panela artesanal de Palmira.",
    precio: 9000,
    horario: "amanecer"
  },
  {
    id: 6,
    categoria: "Especial domingos",
    nombre: "Sancocho de Gallina Criolla",
    descripcion: "Gallina criolla, papa criolla, mazorca, yuca y plátano verde. Seis horas de cocción lenta. Sopa que cura el alma.",
    precio: 32000,
    horario: "almuerzo"
  }
]

/* 
  Esto de abajo hace que otros archivos JS
  puedan usar esta lista. Es como decir
  "este dato es público, úsalo donde necesites"
*/
export default menuModel