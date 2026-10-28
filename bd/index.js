const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { ROLES, crearToken, exigirLogin, exigirRol, loginOpcional } = require('./seguridad');
require('dotenv').config();

const app = express();

const rateLimit = require('express-rate-limit');

// Detrás de Render (u otro servicio) hay un proxy: así se lee bien la IP real de cada visitante
app.set('trust proxy', 1);

// CORS: si defines FRONTEND_URL en el .env (varias direcciones separadas por coma),
// solo esas páginas pueden usar la API. Si no lo defines, cualquiera puede (ideal para desarrollar).
const origenesPermitidos = (process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors());

app.use(express.json());

// Límites contra abusos
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});
const limiteSugerencias = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Has enviado muchas sugerencias. Inténtalo más tarde.' }
});
app.use('/api/auth/login', limiteAuth);
app.use('/api/auth/registro', limiteAuth);
app.use('/api/sugerencias', (req, res, next) => (req.method === 'POST' ? limiteSugerencias(req, res, next) : next()));

// Ruta de prueba para verificar que conecta con Neon
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ mensaje: '¡Conexión exitosa a Neon! 🚀', fecha: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

const idValido = (valor) => Number.isInteger(Number(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;

// ===================== SERVICIOS =====================

// Leer todos los servicios (público)
app.get('/api/servicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servicios ORDER BY id_servicios ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los servicios' });
  }
});

// Leer un servicio (público)
app.get('/api/servicios/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('SELECT * FROM servicios WHERE id_servicios = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar el servicio' });
  }
});

// Crear un servicio (solo administrador)
app.post('/api/servicios', exigirRol('administrador'), async (req, res) => {
  const { titulo, descripcion } = req.body || {};
  if (!titulo || !descripcion || !String(titulo).trim() || !String(descripcion).trim()) {
    return res.status(400).json({ error: 'El título y la descripción son obligatorios' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO servicios (titulo, descripcion) VALUES ($1, $2) RETURNING *',
      [String(titulo).trim(), String(descripcion).trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el servicio' });
  }
});

// Editar un servicio (solo administrador)
app.put('/api/servicios/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const { titulo, descripcion } = req.body || {};
  if (!titulo || !descripcion || !String(titulo).trim() || !String(descripcion).trim()) {
    return res.status(400).json({ error: 'El título y la descripción son obligatorios' });
  }
  try {
    const result = await pool.query(
      'UPDATE servicios SET titulo = $1, descripcion = $2 WHERE id_servicios = $3 RETURNING *',
      [String(titulo).trim(), String(descripcion).trim(), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar el servicio' });
  }
});

// Borrar un servicio (solo administrador)
app.delete('/api/servicios/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('DELETE FROM servicios WHERE id_servicios = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json({ mensaje: 'Servicio eliminado', servicio: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
});

// ===================== CATEGORIAS =====================

// Leer categorías (público)
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY id_categorias ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las categorías' });
  }
});

app.get('/api/categorias/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE id_categorias = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar la categoría' });
  }
});

// Crear categoría (solo administrador)
app.post('/api/categorias', exigirRol('administrador'), async (req, res) => {
  const { nombre, descripcion } = req.body || {};
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [String(nombre).trim(), descripcion ? String(descripcion).trim() : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
});

// Editar categoría (solo administrador)
app.put('/api/categorias/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const { nombre, descripcion } = req.body || {};
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const result = await pool.query(
      'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id_categorias = $3 RETURNING *',
      [String(nombre).trim(), descripcion ? String(descripcion).trim() : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al editar la categoría' });
  }
});

// Borrar categoría (solo administrador)
app.delete('/api/categorias/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('DELETE FROM categorias WHERE id_categorias = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ mensaje: 'Categoría eliminada', categoria: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
});

// ===================== PRODUCTOS =====================

// Revisa los datos de un producto y los deja listos para guardar
function validarProducto(body) {
  const { id_categorias, nombre, descripcion, precio, stock, imagen_url } = body || {};
  if (!nombre || !String(nombre).trim()) return { error: 'El nombre es obligatorio' };
  const precioNum = Number(precio);
  if (precio === undefined || precio === null || precio === '' || !Number.isFinite(precioNum) || precioNum < 0 || precioNum > 99999999) {
    return { error: 'El precio debe ser un número válido mayor o igual a 0' };
  }
  const stockNum = (stock === undefined || stock === null || stock === '') ? 0 : Number(stock);
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    return { error: 'El stock debe ser un número entero mayor o igual a 0' };
  }
  let categoria = null;
  if (id_categorias !== undefined && id_categorias !== null && id_categorias !== '') {
    if (!idValido(id_categorias)) return { error: 'La categoría no es válida' };
    categoria = Number(id_categorias);
  }
  return {
    datos: [
      categoria,
      String(nombre).trim(),
      descripcion ? String(descripcion).trim() : null,
      precioNum,
      stockNum,
      imagen_url ? String(imagen_url).trim() : null
    ]
  };
}

// Leer productos (público, con filtros opcionales: ?categoria=Camas&buscar=perro)
app.get('/api/productos', async (req, res) => {
  const { categoria, buscar } = req.query;
  const condiciones = [];
  const valores = [];
  if (categoria && categoria !== 'Todos') {
    valores.push(categoria);
    condiciones.push(`LOWER(c.nombre) = LOWER($${valores.length})`);
  }
  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(p.nombre ILIKE $${valores.length} OR p.descripcion ILIKE $${valores.length})`);
  }
  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  try {
    const result = await pool.query(
      `SELECT p.*, c.nombre AS categoria
       FROM productos p
       LEFT JOIN categorias c ON c.id_categorias = p.id_categorias
       ${where}
       ORDER BY p.id_productos ASC`,
      valores
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los productos' });
  }
});

// Leer un producto (público)
app.get('/api/productos/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query(
      `SELECT p.*, c.nombre AS categoria
       FROM productos p
       LEFT JOIN categorias c ON c.id_categorias = p.id_categorias
       WHERE p.id_productos = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar el producto' });
  }
});

// Crear un producto (solo administrador)
app.post('/api/productos', exigirRol('administrador'), async (req, res) => {
  const revisado = validarProducto(req.body);
  if (revisado.error) return res.status(400).json({ error: revisado.error });
  try {
    const result = await pool.query(
      `INSERT INTO productos (id_categorias, nombre, descripcion, precio, stock, imagen_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      revisado.datos
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23503') return res.status(400).json({ error: 'La categoría no existe' });
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// Editar un producto (solo administrador)
app.put('/api/productos/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const revisado = validarProducto(req.body);
  if (revisado.error) return res.status(400).json({ error: revisado.error });
  try {
    const result = await pool.query(
      `UPDATE productos
       SET id_categorias = $1, nombre = $2, descripcion = $3, precio = $4, stock = $5, imagen_url = $6
       WHERE id_productos = $7 RETURNING *`,
      [...revisado.datos, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23503') return res.status(400).json({ error: 'La categoría no existe' });
    res.status(500).json({ error: 'Error al editar el producto' });
  }
});

// Borrar un producto (solo administrador)
app.delete('/api/productos/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('DELETE FROM productos WHERE id_productos = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0] });
  } catch (error) {
    console.error(error);
    // Si el producto ya está en un pedido, la base no deja borrarlo
    if (error.code === '23503') {
      return res.status(409).json({ error: 'No se puede borrar: el producto ya aparece en pedidos' });
    }
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// ===================== CUENTAS (registro y login) =====================

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

// Registrarse: siempre crea una cuenta con rol 'cliente'
// Reglas de contraseña para cuentas NUEVAS (son las mismas que muestra el formulario de registro).
// Devuelve el mensaje de error, o null si la contraseña es segura.
const CLAVES_COMUNES = ['password', 'contrasena', 'qwerty', '123456', 'abc123', 'admin', 'petlove', 'iloveyou', 'letmein', 'welcome'];
const sinTildes = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function errorDeClave(clave, nombre, correo) {
  if (clave.length < 8 || Buffer.byteLength(clave) > 72) return 'La contraseña debe tener entre 8 y 72 caracteres';
  if (/\s/.test(clave)) return 'La contraseña no puede tener espacios';
  if (!/\p{Ll}/u.test(clave)) return 'La contraseña debe incluir una letra minúscula';
  if (!/\p{Lu}/u.test(clave)) return 'La contraseña debe incluir una letra mayúscula';
  if (!/[0-9]/.test(clave)) return 'La contraseña debe incluir un número';
  if (!/[^\p{L}\p{N}\s]/u.test(clave)) return 'La contraseña debe incluir un carácter especial (por ejemplo ! @ # $ %)';
  const minus = sinTildes(clave);
  const palabrasPersonales = [sinTildes(correo).split('@')[0], ...sinTildes(nombre).split(/\s+/)].filter((p) => p.length >= 3);
  if (palabrasPersonales.some((p) => minus.includes(p))) return 'La contraseña no debe contener tu nombre ni la parte de tu correo antes de la @';
  if (CLAVES_COMUNES.some((c) => minus.includes(c))) return 'La contraseña es demasiado común';
  if (/(.)\1\1/u.test(clave)) return 'La contraseña no debe repetir el mismo carácter 3 veces seguidas';
  return null;
}

app.post('/api/auth/registro', async (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const correo = String(body.correo || '').trim().toLowerCase();
  const clave = String(body.contraseña ?? body.password ?? '');

  if (nombre.length < 2 || nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
  }
  if (!correoValido(correo) || correo.length > 150) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  const errorClave = errorDeClave(clave, nombre, correo);
  if (errorClave) {
    return res.status(400).json({ error: errorClave });
  }

  try {
    const claveProtegida = await bcrypt.hash(clave, 10);
    // OJO: no se recibe el rol desde el formulario; la base pone 'cliente' sola
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, correo, "contraseña")
       VALUES ($1, $2, $3)
       RETURNING id_usuarios, nombre, correo, rol, fecha_registro`,
      [nombre, correo, claveProtegida]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// Iniciar sesión: devuelve un token y los datos básicos del usuario
app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {};
  const correo = String(body.correo || '').trim().toLowerCase();
  const clave = String(body.contraseña ?? body.password ?? '');

  if (!correo || !clave) {
    return res.status(400).json({ error: 'Escribe tu correo y tu contraseña' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
    const usuario = result.rows[0];
    // Mismo mensaje si falla el correo o la contraseña, para no dar pistas
    const claveCorrecta = usuario ? await bcrypt.compare(clave, usuario['contraseña']) : false;
    if (!claveCorrecta) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    res.json({
      token: crearToken(usuario),
      usuario: {
        id_usuarios: usuario.id_usuarios,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Ver los datos de quien tiene la sesión iniciada
app.get('/api/auth/yo', exigirLogin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_usuarios, nombre, correo, rol, fecha_registro FROM usuarios WHERE id_usuarios = $1',
      [req.usuario.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar tu cuenta' });
  }
});


// ===================== MI CUENTA =====================

// Editar mis datos (cualquier usuario con sesión)
app.put('/api/auth/yo', exigirLogin, async (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const correo = String(body.correo || '').trim().toLowerCase();
  if (nombre.length < 2 || nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
  }
  if (!correoValido(correo) || correo.length > 150) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  try {
    const result = await pool.query(
      `UPDATE usuarios SET nombre = $1, correo = $2 WHERE id_usuarios = $3
       RETURNING id_usuarios, nombre, correo, rol, fecha_registro`,
      [nombre, correo, req.usuario.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar tu cuenta' });
  }
});

// Cambiar mi contraseña. Body: { "actual": "...", "nueva": "..." }
app.put('/api/auth/clave', exigirLogin, async (req, res) => {
  const actual = String(req.body?.actual ?? '');
  const nueva = String(req.body?.nueva ?? '');
  if (nueva.length < 6 || nueva.length > 72) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 72 caracteres' });
  }
  try {
    const result = await pool.query(
      'SELECT "contraseña" FROM usuarios WHERE id_usuarios = $1',
      [req.usuario.id]
    );
    const guardada = result.rows[0] && result.rows[0]['contraseña'];
    if (!guardada || !(await bcrypt.compare(actual, guardada))) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }
    await pool.query(
      'UPDATE usuarios SET "contraseña" = $1 WHERE id_usuarios = $2',
      [await bcrypt.hash(nueva, 10), req.usuario.id]
    );
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ===================== USUARIOS (solo administrador) =====================

// Ver todos los usuarios (sin contraseñas). Filtro opcional: ?rol=empleado
app.get('/api/usuarios', exigirRol('administrador'), async (req, res) => {
  const { rol } = req.query;
  if (rol && !ROLES.includes(rol)) {
    return res.status(400).json({ error: `El rol debe ser uno de: ${ROLES.join(', ')}` });
  }
  try {
    const result = rol
      ? await pool.query(
          'SELECT id_usuarios, nombre, correo, rol, fecha_registro FROM usuarios WHERE rol = $1 ORDER BY id_usuarios',
          [rol]
        )
      : await pool.query(
          'SELECT id_usuarios, nombre, correo, rol, fecha_registro FROM usuarios ORDER BY id_usuarios'
        );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los usuarios' });
  }
});

// Cambiar el rol de un usuario. Body: { "rol": "empleado" }
app.put('/api/usuarios/:id/rol', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const rol = req.body?.rol;
  if (!ROLES.includes(rol)) {
    return res.status(400).json({ error: `El rol debe ser uno de: ${ROLES.join(', ')}` });
  }
  if (Number(req.params.id) === req.usuario.id) {
    return res.status(409).json({ error: 'No puedes cambiar tu propio rol' });
  }
  try {
    const result = await pool.query(
      `UPDATE usuarios SET rol = $1 WHERE id_usuarios = $2
       RETURNING id_usuarios, nombre, correo, rol, fecha_registro`,
      [rol, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar el rol' });
  }
});

// Borrar un usuario (no se puede si tiene pedidos)
app.delete('/api/usuarios/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  if (Number(req.params.id) === req.usuario.id) {
    return res.status(409).json({ error: 'No puedes borrar tu propia cuenta' });
  }
  try {
    const pedidos = await pool.query(
      'SELECT 1 FROM pedidos WHERE id_usuarios = $1 LIMIT 1',
      [req.params.id]
    );
    if (pedidos.rows.length > 0) {
      return res.status(409).json({ error: 'No se puede borrar: el usuario tiene pedidos' });
    }
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id_usuarios = $1 RETURNING id_usuarios, nombre, correo, rol',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado', usuario: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});


// ===================== SOLICITUDES DE SERVICIO =====================

const ESTADOS_SOLICITUD = ['pendiente', 'contestado'];

// Trae solicitudes con el nombre del cliente y el título del servicio
function consultarSolicitudes(condicion, valores) {
  return pool.query(
    `SELECT s.id_solicitud_servicios, s.id_usuarios, u.nombre AS cliente, u.correo,
            s.id_servicios, sv.titulo AS servicio, s.descripcion, s.estado, s.respuesta, s.fecha
     FROM solicitud_servicios s
     JOIN usuarios u ON u.id_usuarios = s.id_usuarios
     JOIN servicios sv ON sv.id_servicios = s.id_servicios
     ${condicion ? 'WHERE ' + condicion : ''}
     ORDER BY s.fecha DESC, s.id_solicitud_servicios DESC`,
    valores
  );
}

// Crear una solicitud (solo cliente). Body: { "id_servicios": 1, "descripcion": "..." }
app.post('/api/solicitudes', exigirRol('cliente'), async (req, res) => {
  const idServicio = Number(req.body?.id_servicios);
  const descripcion = String(req.body?.descripcion || '').trim();
  if (!idValido(idServicio)) {
    return res.status(400).json({ error: 'Elige un servicio válido' });
  }
  if (descripcion.length < 10 || descripcion.length > 2000) {
    return res.status(400).json({ error: 'La descripción debe tener entre 10 y 2000 caracteres' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO solicitud_servicios (id_usuarios, id_servicios, descripcion)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.usuario.id, idServicio, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') return res.status(400).json({ error: 'El servicio no existe' });
    console.error(error);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
});

// Ver MIS solicitudes con su respuesta (solo cliente)
app.get('/api/solicitudes/mias', exigirRol('cliente'), async (req, res) => {
  try {
    const result = await consultarSolicitudes('s.id_usuarios = $1', [req.usuario.id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar tus solicitudes' });
  }
});

// Ver todas las solicitudes (empleado y administrador). Filtro opcional: ?estado=pendiente
app.get('/api/solicitudes', exigirRol('empleado', 'administrador'), async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS_SOLICITUD.includes(estado)) {
    return res.status(400).json({ error: 'El estado no es válido' });
  }
  try {
    const result = estado
      ? await consultarSolicitudes('s.estado = $1', [estado])
      : await consultarSolicitudes('', []);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las solicitudes' });
  }
});

// Contestar una solicitud (empleado y administrador). Body: { "respuesta": "..." }
app.put('/api/solicitudes/:id/respuesta', exigirRol('empleado', 'administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const respuesta = String(req.body?.respuesta || '').trim();
  if (respuesta.length < 2 || respuesta.length > 2000) {
    return res.status(400).json({ error: 'La respuesta debe tener entre 2 y 2000 caracteres' });
  }
  try {
    const result = await pool.query(
      `UPDATE solicitud_servicios SET respuesta = $1, estado = 'contestado'
       WHERE id_solicitud_servicios = $2 RETURNING *`,
      [respuesta, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al contestar la solicitud' });
  }
});

// ----- Seguimiento de una solicitud: nuevas dudas del cliente y respuestas del equipo -----
// (usa la tabla solicitud_mensajes)

// Ver los mensajes de seguimiento. El cliente solo ve los de SUS solicitudes; empleado y administrador ven todos.
app.get('/api/mensajes-solicitudes', exigirLogin, async (req, res) => {
  const esEquipo = req.usuario.rol === 'empleado' || req.usuario.rol === 'administrador';
  try {
    const result = await pool.query(
      `SELECT m.id_mensajes, m.id_solicitud_servicios, m.autor, m.mensaje, m.fecha
       FROM solicitud_mensajes m
       JOIN solicitud_servicios s ON s.id_solicitud_servicios = m.id_solicitud_servicios
       ${esEquipo ? '' : 'WHERE s.id_usuarios = $1'}
       ORDER BY m.fecha ASC, m.id_mensajes ASC`,
      esEquipo ? [] : [req.usuario.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los mensajes de seguimiento' });
  }
});

// Agregar un mensaje de seguimiento. Body: { "mensaje": "..." }
// - Cliente (dueño de la solicitud): pide más respuestas. Solo si la solicitud ya fue contestada; vuelve a "pendiente".
// - Empleado o administrador: responde la nueva duda. Solo si la solicitud está pendiente y ya tenía una respuesta; pasa a "contestado".
app.post('/api/solicitudes/:id/mensajes', exigirLogin, async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const mensaje = String(req.body?.mensaje || '').trim();
  if (mensaje.length < 5 || mensaje.length > 2000) {
    return res.status(400).json({ error: 'El mensaje debe tener entre 5 y 2000 caracteres' });
  }
  const esCliente = req.usuario.rol === 'cliente';

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const actual = await conexion.query(
      'SELECT id_usuarios, estado, respuesta FROM solicitud_servicios WHERE id_solicitud_servicios = $1 FOR UPDATE',
      [req.params.id]
    );
    const solicitud = actual.rows[0];
    if (!solicitud || (esCliente && Number(solicitud.id_usuarios) !== Number(req.usuario.id))) {
      await conexion.query('ROLLBACK');
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (esCliente && solicitud.estado !== 'contestado') {
      await conexion.query('ROLLBACK');
      return res.status(409).json({ error: 'Espera la respuesta del equipo antes de enviar otra consulta' });
    }
    if (!esCliente && solicitud.estado !== 'pendiente') {
      await conexion.query('ROLLBACK');
      return res.status(409).json({ error: 'Esta solicitud ya está contestada' });
    }
    if (!esCliente && !solicitud.respuesta) {
      await conexion.query('ROLLBACK');
      return res.status(409).json({ error: 'Primero envía la respuesta inicial de la solicitud' });
    }

    const nuevo = await conexion.query(
      `INSERT INTO solicitud_mensajes (id_solicitud_servicios, autor, mensaje)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, esCliente ? 'cliente' : 'equipo', mensaje]
    );
    await conexion.query(
      'UPDATE solicitud_servicios SET estado = $1 WHERE id_solicitud_servicios = $2',
      [esCliente ? 'pendiente' : 'contestado', req.params.id]
    );
    await conexion.query('COMMIT');
    res.status(201).json(nuevo.rows[0]);
  } catch (error) {
    try { await conexion.query('ROLLBACK'); } catch (e) { /* ya estaba cerrado */ }
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  } finally {
    conexion.release();
  }
});

// ===================== SUGERENCIAS =====================

// Enviar una sugerencia (cualquier visitante). Body: { "nombre": "...", "correo": "...", "sugerencia": "..." }
app.post('/api/sugerencias', loginOpcional, async (req, res) => {
  const body = req.body || {};
  const nombre = String(body.nombre || '').trim();
  const correo = String(body.correo || '').trim().toLowerCase();
  const sugerencia = String(body.sugerencia || '').trim();
  if (nombre.length < 2 || nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
  }
  if (!correoValido(correo) || correo.length > 150) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  if (sugerencia.length < 5 || sugerencia.length > 2000) {
    return res.status(400).json({ error: 'El mensaje debe tener entre 5 y 2000 caracteres' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO sugerencias (id_usuarios, nombre, correo, sugerencia)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.usuario ? req.usuario.id : null, nombre, correo, sugerencia]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar la sugerencia' });
  }
});

// Leer las sugerencias (empleado y administrador)
app.get('/api/sugerencias', exigirRol('empleado', 'administrador'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sugerencias ORDER BY id_sugerencias DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar las sugerencias' });
  }
});

// Borrar una sugerencia (solo administrador)
app.delete('/api/sugerencias/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await pool.query('DELETE FROM sugerencias WHERE id_sugerencias = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sugerencia no encontrada' });
    res.json({ mensaje: 'Sugerencia eliminada', sugerencia: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la sugerencia' });
  }
});


// ===================== PEDIDOS =====================

const ESTADOS_PEDIDO = ['pendiente', 'en preparacion', 'empaquetado', 'enviado', 'entregado', 'cancelado'];

// Trae pedidos con el nombre del cliente y sus productos
function consultarPedidos(condicion, valores) {
  return pool.query(
    `SELECT p.id_pedidos, p.id_usuarios, u.nombre AS cliente, u.correo,
            p.total, p.estado, p.fecha,
            COALESCE(
              json_agg(
                json_build_object(
                  'id_productos', d.id_productos,
                  'nombre', pr.nombre,
                  'cantidad', d.cantidad,
                  'precio_unitario', d.precio_unitario
                ) ORDER BY d.id_detalle_pedido
              ) FILTER (WHERE d.id_detalle_pedido IS NOT NULL),
              '[]'::json
            ) AS items
     FROM pedidos p
     JOIN usuarios u ON u.id_usuarios = p.id_usuarios
     LEFT JOIN detalle_pedido d ON d.id_pedidos = p.id_pedidos
     LEFT JOIN productos pr ON pr.id_productos = d.id_productos
     ${condicion ? 'WHERE ' + condicion : ''}
     GROUP BY p.id_pedidos, u.nombre, u.correo
     ORDER BY p.fecha DESC, p.id_pedidos DESC`,
    valores
  );
}

// Crear un pedido (solo cliente). Body: { "items": [ { "id_productos": 1, "cantidad": 2 } ] }
app.post('/api/pedidos', exigirRol('cliente'), async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Debes enviar entre 1 y 50 productos' });
  }

  // Junta las cantidades por producto (si un producto viene repetido, se suman)
  const cantidades = new Map();
  for (const item of items) {
    const id = Number(item?.id_productos);
    const cantidad = Number(item?.cantidad);
    if (!idValido(id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
      return res.status(400).json({ error: 'Cada producto necesita un id válido y una cantidad entera entre 1 y 99' });
    }
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }
  for (const total of cantidades.values()) {
    if (total > 99) return res.status(400).json({ error: 'No puedes pedir más de 99 unidades del mismo producto' });
  }

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');

    // Bloquea los productos mientras se arma el pedido, para que el stock no se cruce con otro pedido
    const ids = [...cantidades.keys()];
    const productos = await conexion.query(
      'SELECT id_productos, nombre, precio, stock FROM productos WHERE id_productos = ANY($1::int[]) ORDER BY id_productos FOR UPDATE',
      [ids]
    );
    if (productos.rows.length !== ids.length) {
      await conexion.query('ROLLBACK');
      return res.status(400).json({ error: 'Uno de los productos no existe' });
    }

    let subtotal = 0;
    for (const p of productos.rows) {
      const cantidad = cantidades.get(p.id_productos);
      if (p.stock < cantidad) {
        await conexion.query('ROLLBACK');
        return res.status(409).json({ error: `No hay suficiente stock de "${p.nombre}"` });
      }
      subtotal += Number(p.precio) * cantidad;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const envio = subtotal >= 100000 ? 0 : 8000;
    const total = subtotal + envio;

    const pedido = await conexion.query(
      'INSERT INTO pedidos (id_usuarios, total) VALUES ($1, $2) RETURNING *',
      [req.usuario.id, total]
    );
    const idPedido = pedido.rows[0].id_pedidos;

    for (const p of productos.rows) {
      const cantidad = cantidades.get(p.id_productos);
      await conexion.query(
        'INSERT INTO detalle_pedido (id_productos, id_pedidos, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
        [p.id_productos, idPedido, cantidad, p.precio]
      );
      await conexion.query(
        'UPDATE productos SET stock = stock - $1 WHERE id_productos = $2',
        [cantidad, p.id_productos]
      );
    }

    await conexion.query('COMMIT');
    res.status(201).json({ ...pedido.rows[0], subtotal, envio });
  } catch (error) {
    try { await conexion.query('ROLLBACK'); } catch (e) { /* ya estaba cerrado */ }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el pedido' });
  } finally {
    conexion.release();
  }
});

// Ver MIS pedidos (solo cliente)
app.get('/api/pedidos/mios', exigirRol('cliente'), async (req, res) => {
  try {
    const result = await consultarPedidos('p.id_usuarios = $1', [req.usuario.id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar tus pedidos' });
  }
});

// Ver todos los pedidos (empleado y administrador). Filtro opcional: ?estado=pendiente
app.get('/api/pedidos', exigirRol('empleado', 'administrador'), async (req, res) => {
  const { estado } = req.query;
  if (estado && !ESTADOS_PEDIDO.includes(estado)) {
    return res.status(400).json({ error: 'El estado no es válido' });
  }
  try {
    const result = estado
      ? await consultarPedidos('p.estado = $1', [estado])
      : await consultarPedidos('', []);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar los pedidos' });
  }
});

// Ver un pedido (el cliente solo ve los suyos; empleado y administrador ven todos)
app.get('/api/pedidos/:id', exigirLogin, async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  try {
    const result = await consultarPedidos('p.id_pedidos = $1', [req.params.id]);
    const pedido = result.rows[0];
    if (!pedido || (req.usuario.rol === 'cliente' && pedido.id_usuarios !== req.usuario.id)) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(pedido);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar el pedido' });
  }
});

// Cambiar el estado de un pedido (empleado y administrador). Body: { "estado": "enviado" }
app.put('/api/pedidos/:id/estado', exigirRol('empleado', 'administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });
  const estado = req.body?.estado;
  if (!ESTADOS_PEDIDO.includes(estado)) {
    return res.status(400).json({ error: 'El estado no es válido' });
  }

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const actual = await conexion.query('SELECT * FROM pedidos WHERE id_pedidos = $1 FOR UPDATE', [req.params.id]);
    if (actual.rows.length === 0) {
      await conexion.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const pedido = actual.rows[0];
    if (pedido.estado === 'cancelado' && estado !== 'cancelado') {
      await conexion.query('ROLLBACK');
      return res.status(409).json({ error: 'Un pedido cancelado no se puede reactivar' });
    }

    // Si se cancela, los productos vuelven al stock
    if (estado === 'cancelado' && pedido.estado !== 'cancelado') {
      await conexion.query(
        `UPDATE productos p SET stock = p.stock + d.cantidad
         FROM detalle_pedido d
         WHERE d.id_productos = p.id_productos AND d.id_pedidos = $1`,
        [pedido.id_pedidos]
      );
    }

    const result = await conexion.query(
      'UPDATE pedidos SET estado = $1 WHERE id_pedidos = $2 RETURNING *',
      [estado, pedido.id_pedidos]
    );
    await conexion.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    try { await conexion.query('ROLLBACK'); } catch (e) { /* ya estaba cerrado */ }
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar el estado del pedido' });
  } finally {
    conexion.release();
  }
});


// Borrar un pedido (solo administrador).
// Si el pedido no estaba cancelado, los productos vuelven al inventario antes de borrarlo.
app.delete('/api/pedidos/:id', exigirRol('administrador'), async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no válido' });

  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    const actual = await conexion.query('SELECT * FROM pedidos WHERE id_pedidos = $1 FOR UPDATE', [req.params.id]);
    if (actual.rows.length === 0) {
      await conexion.query('ROLLBACK');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const pedido = actual.rows[0];

    if (pedido.estado !== 'cancelado') {
      await conexion.query(
        `UPDATE productos p SET stock = p.stock + d.cantidad
         FROM detalle_pedido d
         WHERE d.id_productos = p.id_productos AND d.id_pedidos = $1`,
        [pedido.id_pedidos]
      );
    }

    await conexion.query('DELETE FROM detalle_pedido WHERE id_pedidos = $1', [pedido.id_pedidos]);
    await conexion.query('DELETE FROM pedidos WHERE id_pedidos = $1', [pedido.id_pedidos]);
    await conexion.query('COMMIT');
    res.json({ mensaje: 'Pedido eliminado', pedido });
  } catch (error) {
    try { await conexion.query('ROLLBACK'); } catch (e) { /* ya estaba cerrado */ }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  } finally {
    conexion.release();
  }
});

// ===================== MANEJO DE ERRORES Y ARRANQUE =====================
// IMPORTANTE: Estas líneas siempre deben ir al final, después de todas las rutas.

// Si ninguna ruta coincide
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Errores generales (por ejemplo, un JSON mal escrito)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Arrancar el servidor AL FINAL de todo
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});