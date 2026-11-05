// App de prueba local: sin dependencias. Uso: node app/server.js  ->  http://localhost:3100
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3100;
const crypto = require('crypto');
const USER = { username: 'qa_user', password: 'Secret123!' };

const products = [
  { id: 1, name: 'Teclado mecánico', price: 45, category: 'perifericos' },
  { id: 2, name: 'Mouse inalámbrico', price: 20, category: 'perifericos' },
  { id: 3, name: 'Monitor 24"', price: 150, category: 'pantallas' },
  { id: 4, name: 'Webcam HD', price: 35, category: 'perifericos' },
  { id: 5, name: 'Soporte para laptop', price: 25, category: 'accesorios' },
];
const sessions = new Map(); // token -> { cart: [] }  (cada login = sesión aislada)

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve(null); } });
  });
const getSession = (req) => sessions.get((req.headers.authorization || '').replace('Bearer ', ''));
const cartView = (cart) => ({
  items: cart.map((i) => ({ ...i })),
  total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (pathname.startsWith('/api/')) {
    if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok' });

    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await readBody(req);
      if (body && body.username === USER.username && body.password === USER.password)
{
        const token = 'tok-' + crypto.randomUUID();
        sessions.set(token, { cart: [] });
        return send(res, 200, { token, user: { username: USER.username } });
      }
      return send(res, 401, { error: 'Credenciales inválidas' });
    }

    if (req.method === 'GET' && pathname === '/api/products') {
      const category = url.searchParams.get('category');
      return send(res, 200, category ? products.filter((p) => p.category === category) : products);
    }

    const m = pathname.match(/^\/api\/products\/(\d+)$/);
    if (req.method === 'GET' && m) {
      const product = products.find((p) => p.id === Number(m[1]));
      return product ? send(res, 200, product) : send(res, 404, { error: 'Producto no encontrado' });
    }

    if (pathname === '/api/cart') {
      const session = getSession(req);
      if (!session) return send(res, 401, { error: 'No autorizado' });
      const cart = session.cart;
      if (req.method === 'GET') return send(res, 200, cartView(cart));
      if (req.method === 'DELETE') { session.cart = []; return send(res, 204); }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const qty = body && body.quantity;
        if (!body || !Number.isInteger(qty) || qty < 1) return send(res, 400, { error: 'Cantidad inválida' });
        const product = products.find((p) => p.id === body.productId);
        if (!product) return send(res, 404, { error: 'Producto no encontrado' });
        const existing = cart.find((i) => i.productId === product.id);
        if (existing) existing.quantity += qty;
        else cart.push({ productId: product.id, name: product.name, price: product.price, quantity: qty });
        return send(res, 201, cartView(cart));
      }
    }
    return send(res, 404, { error: 'Ruta no encontrada' });
  }

  // Archivos estáticos
  const file = pathname === '/' ? '/login.html' : pathname;
  const filePath = path.join(__dirname, 'public', path.normalize(file));
  if (!filePath.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, () => console.log(`App de prueba en http://localhost:${PORT}`));
