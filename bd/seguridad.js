const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

// Si falta JWT_SECRET en el .env, es mejor que el servidor no arranque
if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el archivo .env');
}

// Los tres roles que existen en el sitio
const ROLES = ['cliente', 'empleado', 'administrador'];

// Crea el "pase" que recibe el usuario cuando inicia sesión (dura 8 horas).
// Solo guarda el id: el rol se consulta en la base en cada petición.
function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.id_usuarios },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Revisa que quien hace la petición haya iniciado sesión
// y trae su rol ACTUAL desde la base de datos
async function exigirLogin(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Sesión no válida o vencida' });
  }

  try {
    const result = await pool.query(
      'SELECT id_usuarios, rol FROM usuarios WHERE id_usuarios = $1',
      [datos.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Sesión no válida o vencida' });
    }
    req.usuario = { id: result.rows[0].id_usuarios, rol: result.rows[0].rol };
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al comprobar la sesión' });
  }
}

// Revisa que haya iniciado sesión Y tenga uno de los roles permitidos
// Ejemplo: exigirRol('empleado', 'administrador')
function exigirRol(...rolesPermitidos) {
  return (req, res, next) => {
    exigirLogin(req, res, () => {
      if (!rolesPermitidos.includes(req.usuario.rol)) {
        return res.status(403).json({ error: 'No tienes permiso para hacer esto' });
      }
      next();
    });
  };
}

// Como exigirLogin, pero NO rechaza a los visitantes sin sesión:
// si hay una sesión válida, guarda al usuario; si no, sigue como visitante
async function loginOpcional(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!token) return next();
  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id_usuarios, rol FROM usuarios WHERE id_usuarios = $1',
      [datos.id]
    );
    if (result.rows.length > 0) {
      req.usuario = { id: result.rows[0].id_usuarios, rol: result.rows[0].rol };
    }
  } catch (error) {
    // Sesión inválida o vencida: se trata como visitante
  }
  next();
}

module.exports = { ROLES, crearToken, exigirLogin, exigirRol, loginOpcional };